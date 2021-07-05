import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { asyncScheduler, BehaviorSubject, Observable, of, scheduled, Subject, throwError } from 'rxjs';
import { filter, map, mapTo, mergeAll, switchMap, take, takeUntil, tap } from 'rxjs/operators';
import { AppService } from 'src/app/service/app.service';
import { ClientService } from 'src/app/service/client.service';
import { DataService } from 'src/app/service/data.service';
import { LoggerService } from 'src/app/service/logger.service';
import { RestService } from 'src/app/service/rest.service';
import { RestV2 } from 'src/app/service/rest/rest-v2.structure';
import { ThemingService } from 'src/app/service/theming.service';
import { UserRoleDialogComponent } from 'src/app/user/dialog/user-role-dialog.component';
import { RoleStructure } from 'src/app/util/role.structure';
import { UserStructure } from 'src/app/util/user.structure';

@Component({
	selector: 'app-user',
	templateUrl: './user.component.html',
	styleUrls: ['./user.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserComponent implements OnInit, OnDestroy {
	destroyed = new Subject<any>().pipe(take(1)) as Subject<void>;
	user = new BehaviorSubject<UserStructure | null>(null);
	editors = new BehaviorSubject<UserStructure[]>([]);
	edited = new BehaviorSubject<UserStructure[]>([]);

	addingEditor = false;
	editorControl = new FormControl('');

	constructor(
		private route: ActivatedRoute,
		private appService: AppService,
		private loggerService: LoggerService,
		private restService: RestService,
		private dataService: DataService,
		private cdr: ChangeDetectorRef,
		private dialog: MatDialog,
		public clientService: ClientService,
		public themingService: ThemingService
	) { }

	getRole(): Observable<RoleStructure> {
		return this.user.pipe(
			switchMap(user => !user ? throwError(Error('Missing User')) : of(user)),
			switchMap(user => (user as UserStructure).getRole())
		);
	}

	openTwitchChannel(): void {
		window.open(`https://twitch.tv/${this.user.getValue()?.getSnapshot()?.login}`, '_blank');
	}

	canEdit(): Observable<boolean> {
		return this.user.pipe(
			filter(user => !!user),
			take(1),
			switchMap(user => (this.clientService.hasPermission('MANAGE_USERS')).pipe(
				map(isMod => ({ isMod, user }))
			)),
			map(({ isMod, user }) => isMod || (!!user && user.getSnapshot()?.id === this.clientService.getSnapshot()?.id))
		);
	}

	canChangeRole(): Observable<boolean> {
		return this.user.pipe(
			filter(user => !!user),
			take(1),
			switchMap(user => this.clientService.hasPermission('MANAGE_ROLES'))
		);
	}

	/**
	 * This method makes the editor addition box appear
	 */
	addEditor(): void {
		const channelID = this.user.getValue()?.id;
		if (!channelID) return;

		this.addingEditor = false;
		this.user.getValue()?.addChannelEditor(this.editorControl.value).subscribe({
			complete: () => {
				this.updateEditors();
				this.cdr.markForCheck();
				this.editorControl.reset();
			},
			error: (err: RestV2.ErrorGQL) => this.clientService.openSnackBar(this.restService.formatError(err), '', {
				verticalPosition: 'top', horizontalPosition: 'left'
			})
		});
	}

	removeEditor(user: UserStructure): void {
		const channelID = this.user.getValue()?.id;
		if (!channelID) return;

		this.user.getValue()?.removeChannelEditor(user.id).subscribe({
			complete: () => {
				this.updateEditors();
				this.cdr.markForCheck();
			}
		});
	}

	updateEditors(): void {
		this.user.pipe(
			switchMap(user => user?.getEditors() ?? []),
		).subscribe({
			next: (editors) => this.editors.next(editors)
		});
	}

	changeRole(): void {
		this.canChangeRole().pipe(
			filter(ok => ok === true),
			switchMap(() => this.user),
			map(user => ({
				dialogRef: this.dialog.open(UserRoleDialogComponent, { data: { user } }),
				user: user as UserStructure
			})),
			switchMap(({ dialogRef, user }) => dialogRef.afterClosed().pipe(
				filter(value => typeof value === 'string'),
				switchMap((roleID: string) => user.changeRole(roleID ?? '', ''))
			))
		).subscribe();
	}

	ngOnInit(): void {
		this.route.paramMap.pipe(
			takeUntil(this.destroyed),
			map(params => params.get('user') as string),
			switchMap(id => this.restService.v2.GetUser(id, {
				includeEditors: true,
				includeEditorIn: true,
				includeOwnedEmotes: true,
				includeFullEmotes: true,
				includeAuditLogs: true,
				includeStreamData: true
			}).pipe(
				map(res => this.dataService.add('user', res.user)[0])
			)),
			tap(user => this.user.next(user)),
			switchMap(user => scheduled([
				user.getEditors().pipe(map(editors => this.editors.next(editors))),
				user.getEditorIn().pipe(map(edited => this.edited.next(edited)))
			], asyncScheduler).pipe(mergeAll(), mapTo(user))),
			tap(user => {
				this.appService.pageTitleAttr.next([ // Update page title
					{ name: 'User', value: user.getSnapshot()?.display_name ?? '' }
				]);
			})
		).subscribe({
			error: (err) => this.loggerService.error('Couldn\'t fetch user', err)
		});
	}

	ngOnDestroy(): void {
		this.destroyed.next();
		this.destroyed.complete();
	}
}
