import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { asyncScheduler, BehaviorSubject, Observable, of, scheduled, Subject, throwError } from 'rxjs';
import { concatAll, filter, map, mapTo, switchMap, take, takeUntil, tap } from 'rxjs/operators';
import { AppComponent } from 'src/app/app.component';
import { AppService } from 'src/app/service/app.service';
import { ClientService } from 'src/app/service/client.service';
import { DataService } from 'src/app/service/data.service';
import { LoggerService } from 'src/app/service/logger.service';
import { RestService } from 'src/app/service/rest.service';
import { RestV2 } from 'src/app/service/rest/rest-v2.structure';
import { ThemingService } from 'src/app/service/theming.service';
import { RoleStructure } from 'src/app/util/role.structure';
import { UserStructure } from 'src/app/util/user.structure';
import { environment } from 'src/environments/environment';

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
		@Inject(DOCUMENT) private document: Document,
		private router: Router,
		private route: ActivatedRoute,
		private appService: AppService,
		private loggerService: LoggerService,
		private restService: RestService,
		private metaService: Meta,
		private dataService: DataService,
		private cdr: ChangeDetectorRef,
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
			}, ['banned']).pipe(
				map(res => this.dataService.add('user', res.user)[0])
			)),
			tap(user => this.user.next(user)),
			switchMap(user => scheduled([
				user.getEditors().pipe(map(editors => this.editors.next(editors))),
				user.getEditorIn().pipe(map(edited => this.edited.next(edited)))
			], asyncScheduler).pipe(concatAll(), mapTo(user))),
			tap(user => {
				const appURL = this.document.location.host + this.router.serializeUrl(this.router.createUrlTree(['/users', String(user.id)]));

				this.appService.pageTitleAttr.next([ // Update page title
					{ name: 'User', value: user.getSnapshot()?.display_name ?? '' }
				]);
				const roleName = user.getSnapshot()?.role?.name;
				const roleColor = user.getSnapshot()?.role?.color;
				const emoteCount = user.getSnapshot()?.emotes.length;
				const maxEmoteCount = user.getSnapshot()?.emote_slots;
				const displayName = user.getSnapshot()?.display_name ?? '';
				this.metaService.addTags([
					// { name: 'og:title', content: this.appService.pageTitle },
					// { name: 'og:site_name', content: this.appService.pageTitle },
					{ name: 'og:description', content: `${displayName} is${!!roleName ? ` ${roleName}` : ''} on 7TV with ${emoteCount}/${maxEmoteCount} emotes enabled`},
					{ name: 'og:image', content: user.getSnapshot()?.profile_image_url ?? '' },
					{ name: 'og:image:type', content: 'image/png' },
					{ name: 'theme-color', content: '#' + (roleColor?.toString(16) ?? 'fff') }
				]);

				if (!AppComponent.isBrowser.getValue()) {
					const link = this.document.createElement('link');
					link.setAttribute('type', 'application/json+oembed');

					const query = new URLSearchParams();
					query.append('object', Buffer.from(JSON.stringify({
						title: this.appService.pageTitle,
						author_name: displayName,
						author_url: `https://${appURL}`,
						provider_name: `7TV.APP - It's like a third party thing`,
						provider_url: 'https://7tv.app'
					})).toString('base64'));
					link.setAttribute('href', `http://${environment.origin}/services/oembed?` + query.toString());
					this.document.head.appendChild(link);
				}
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
