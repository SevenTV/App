

import { Injectable } from '@angular/core';
import { DataStructure } from '@typings/typings/DataStructure';
import { asapScheduler, BehaviorSubject, defer, Observable, of, scheduled } from 'rxjs';
import { filter, map, switchMap, take, tap, zipAll } from 'rxjs/operators';
import { DataService } from 'src/app/service/data.service';
import { LocalStorageService } from 'src/app/service/localstorage.service';
import { LoggerService } from 'src/app/service/logger.service';
import { UserStructure } from 'src/app/util/user.structure';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { CookieService } from 'ngx-cookie-service';
import { ContextMenuComponent } from 'src/app/util/ctx-menu/ctx-menu.component';
import { BanDialogComponent } from 'src/app/util/dialog/error-dialog/ban-dialog/ban-dialog.component';
import { ThemingService } from 'src/app/service/theming.service';
import { MatDialog } from '@angular/material/dialog';
import { UserRoleDialogComponent } from 'src/app/user/dialog/user-role-dialog.component';

@Injectable({ providedIn: 'root' })
export class ClientService extends UserStructure {
	private token = '';
	private authState = new BehaviorSubject<boolean>(false);
	private isAuth = false;

	impersonating = new BehaviorSubject<UserStructure | null>(null);
	get isImpersonating(): boolean {
		return this.impersonating.getValue() !== null;
	}

	userInteractions = [
		{
			label: 'Change Role',
			icon: 'flag',
			click: victim => of(this.dialog.open(UserRoleDialogComponent, { data: { user: victim } })).pipe(
				switchMap((dialogRef => dialogRef.afterClosed().pipe(
					filter(value => typeof value === 'string'),
					switchMap((roleID: string) => victim.changeRole(roleID ?? '', ''))
				))
			)),
			condition: victim => this.hasPermission('MANAGE_ROLES').pipe(
				switchMap(canBan => victim.getRole().pipe(map(role => ({ victimRole: role, canBan })))),
				switchMap(({ canBan, victimRole }) => this.getRole().pipe(map(role => ({ canBan, victimRole, role })))),
				map(({ canBan, victimRole, role }) => canBan && role.getPosition() > victimRole.getPosition())
			)
		},
		{
			label: 'Set as Featured Broadcast',
			icon: 'stars',
			color: '#03fc24',
			condition: () => this.hasPermission('EDIT_APP_META'),
			click: victim => this.getRestService().v2.SetFeaturedBroadcast(victim.getSnapshot()?.login ?? '').pipe(
				tap(() => this.openSnackBar(`Now featuring ${victim.getSnapshot()?.display_name}`, 'OK'))
			)
		},
		{
			label: 'Ban',
			icon: 'gavel',
			color: this.themingService.warning,
			click: victim => new Observable<void>(observer => {
				this.dialog.open(BanDialogComponent, {
					data: { user: victim }
				});

				observer.complete();
			}),
			condition: victim => this.hasPermission('BAN_USERS').pipe(
				switchMap(canBan => victim.getRole().pipe(map(role => ({ victimRole: role, canBan })))),
				switchMap(({ canBan, victimRole }) => this.getRole().pipe(map(role => ({ canBan, victimRole, role })))),
				map(({ canBan, victimRole, role }) => canBan && role.getPosition() > victimRole.getPosition()),
				switchMap(canBan => victim.isBanned().pipe(map(isBanned => ({ isBanned, canBan })))),
				map(({ canBan, isBanned }) => canBan && !isBanned)
			)
		},
		{
			label: 'Unban',
			icon: 'undo',
			color: this.themingService.primary.negate(),
			click: victim => this.getRestService().v2.UnbanUser(victim.id, '').pipe(
				tap(() => {
					victim.pushData({ banned: false } as DataStructure.TwitchUser);
					this.openSnackBar(`${victim.getSnapshot()?.display_name} was unbanned`, '');
				})
			),
			condition: victim => this.hasPermission('BAN_USERS').pipe(
				switchMap(canBan => victim.getRole().pipe(map(role => ({ victimRole: role, canBan })))),
				switchMap(({ canBan, victimRole }) => this.getRole().pipe(map(role => ({ canBan, victimRole, role })))),
				map(({ canBan, victimRole, role }) => canBan && role.getPosition() > victimRole.getPosition()),
				switchMap(canBan => victim.isBanned().pipe(map(isBanned => ({ isBanned, canBan })))),
				map(({ canBan, isBanned }) => canBan && isBanned)
			)
		}
	] as ContextMenuComponent.InteractButton<UserStructure>[];

	/**
	 * Get the current actor user, which is the client user unless they are impersonating somebody
	 */
	getActorUser(): Observable<UserStructure> {
		return this.impersonating.asObservable().pipe(
			take(1),
			map(usr => !!usr ? usr : this),
		) as Observable<UserStructure>;
	}

	constructor(
		public localStorage: LocalStorageService,
		public dataService: DataService,
		private dialog: MatDialog,
		private themingService: ThemingService,
		private cookieService: CookieService,
		private logger: LoggerService,
		private snackBar: MatSnackBar,
	) {
		super(dataService);
	}

	/**
	 * Set User Data onto the client. This will set the client as authenticated
	 * and appear as signed in
	 *
	 * @param data Twitch User data
	 */
	pushData(data: DataStructure.TwitchUser | null): UserStructure {
		super.pushData(data);
		if (!data) {
			return this;
		}

		if (this.isAuth) return this;
		if (!!data?.id) {
			this.setAuthState(!!data);
			this.logger.info(`Signed in as ${data.display_name}.`);
		} else {
			this.logger.info('Signed out.');
		}
		if (Array.isArray(data.editor_in)) {
			this.dataService.add('user', ...data.editor_in);
		}

		return this;
	}

	setToken(token: string | null): void {
		this.localStorage.setItem('access_token', token ?? '');

		this.token = token ?? '';
	}
	getToken(): string {
		return this.token;
	}

	/**
	 * Change the authentication state (if true client will appear as signed in)
	 */
	private setAuthState(state: boolean): void {
		this.isAuth = state;
		this.authState.next(state);
	}
	/**
	 * Whether or not the client is connected
	 */
	isAuthenticated(): Observable<boolean> {
		return this.authState;
	}

	canAccessAdminArea(): Observable<boolean> {
		return scheduled([
			this.hasPermission('MANAGE_REPORTS'),
			this.hasPermission('MANAGE_ROLES'),
			this.hasPermission('MANAGE_STACK'),
			this.hasPermission('MANAGE_USERS'),
			this.hasPermission('BAN_USERS')
		], asapScheduler).pipe(
			zipAll(),
			map(perms => perms.filter(b => b === true).length > 0)
		);
	}

	openSnackBar(message: string, action: string, opt?: MatSnackBarConfig): void {
		this.snackBar.open(message, action, {
			duration: 5000,
			...opt ?? {}
		});
	}

	/**
	 * Log out the current user. This will set the client as unauthenticated
	 * and appear as signed out
	 */
	logout(): void {
		this.localStorage.removeItem('access_token');
		this.token = '';
		this.cookieService.set('auth', '');
		this.cookieService.deleteAll('auth');
		this.data.next(null);
		this.setAuthState(false);
	}
}
