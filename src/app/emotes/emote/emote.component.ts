import { animate, keyframes, style, transition, trigger } from '@angular/animations';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { Constants } from '@typings/src/Constants';
import { asyncScheduler, BehaviorSubject, EMPTY, from, iif, Observable, of, scheduled, Subject, throwError, timer } from 'rxjs';
import { catchError, filter, map, mapTo, mergeAll, mergeMap, switchMap, take, takeUntil, tap, toArray } from 'rxjs/operators';
import { EmoteRenameDialogComponent } from 'src/app/emotes/emote/rename-emote-dialog.component';
import { ClientService } from 'src/app/service/client.service';
import { RestService } from 'src/app/service/rest.service';
import { ThemingService } from 'src/app/service/theming.service';
import { EmoteStructure } from 'src/app/util/emote.structure';
import { format } from 'date-fns';
import { HttpErrorResponse } from '@angular/common/http';
import { UserStructure } from 'src/app/util/user.structure';
import { ErrorDialogComponent } from 'src/app/util/dialog/error-dialog/error-dialog.component';
import { AppService } from 'src/app/service/app.service';
import { DataStructure } from '@typings/typings/DataStructure';
import { Meta } from '@angular/platform-browser';
import { AppComponent } from 'src/app/app.component';
import { DOCUMENT } from '@angular/common';
import { EmoteListService } from 'src/app/emotes/emote-list/emote-list.service';
import { BitField } from '@typings/src/BitField';
import { DataService } from 'src/app/service/data.service';
import { EmoteOverridesDialogComponent } from 'src/app/emotes/emote/overrides-emote-dialog.component';
import { ContextMenuComponent } from 'src/app/util/ctx-menu/ctx-menu.component';
import { AuditLogEntry } from 'src/app/util/audit.structure';
import { EmoteWarningDialogComponent } from 'src/app/emotes/emote/warning-dialog.component';
import { environment } from 'src/environments/environment';

@Component({
	selector: 'app-emote',
	templateUrl: './emote.component.html',
	styleUrls: ['./emote.component.scss'],
	animations: [
		trigger('open', [
			transition(':enter', [
				animate(500, keyframes([
					style({ opacity: 0, offset: 0 }),
					style({ opacity: 0, offset: .75 }),
					style({ opacity: 1, offset: 1 })
				]))
			])
		])
	],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmoteComponent implements OnInit {
	/** The maximum height an emote can be. This tells where the scope text should be placed */
	MAX_HEIGHT = 128;

	channels = new BehaviorSubject<UserStructure[]>([]);
	channelPage = 1;

	emote: EmoteStructure | undefined;
	disableNotices = false;
	blurred = new BehaviorSubject<boolean>(true);
	sizes = new BehaviorSubject<EmoteComponent.SizeResult[]>([]);
	audit = new BehaviorSubject<AuditLogEntry[]>([]);
	interactError = new Subject<string>().pipe(
		mergeMap(x => scheduled([
			of(!!x ? 'ERROR: ' + x : ''),
			timer(5000).pipe(
				takeUntil(this.interactError),
				mapTo('')
			)
		], asyncScheduler).pipe(mergeAll()))
	) as Subject<string>;

	constructor(
		@Inject(DOCUMENT) private document: Document,
		private metaService: Meta,
		private restService: RestService,
		private route: ActivatedRoute,
		private router: Router,
		private cdr: ChangeDetectorRef,
		private dialog: MatDialog,
		private appService: AppService,
		private emoteListService: EmoteListService,
		private dataService: DataService,
		public themingService: ThemingService,
		public clientService: ClientService
	) { }

	/**
	 * Get all sizes of the current emote
	 */
	getSizes(): Observable<EmoteComponent.SizeResult[]> {
		return from([1, 2, 3, 4]).pipe(
			map(s => ({
				scope: s,
				url: this.restService.CDN.Emote(String(this.emote?.getID()), s),
				width: this.emote?.width[s - 1],
				height: this.emote?.height[s - 1]
			} as EmoteComponent.SizeResult)),
			toArray()
		);
	}

	/**
	 * Method called when the client user interacts with a button
	 */
	onInteract(interaction: ContextMenuComponent.InteractButton): void {
		if (typeof interaction.click === 'function' && !!this.emote) {
			interaction.click(this.emote).pipe(
				switchMap(() => iif(() => interaction.label === 'add to channel' || interaction.label === 'remove from channel',
					this.readChannels().pipe(mapTo(undefined)),
					of(undefined)
				))
			).subscribe({
				complete: () => this.interactError.next(''),
				error: (err: HttpErrorResponse) => this.interactError.next(this.restService.formatError(err))
			});
		}
	}

	get interactions(): ContextMenuComponent.InteractButton[] {
		return this.emoteListService.interactions;
	}

	/**
	 * Bring up a dialog to rename the current emote
	 */
	rename(): void {
		const dialogRef = this.dialog.open(EmoteRenameDialogComponent, {
			data: { emote: this.emote, happening: 'Rename' },
		});

		dialogRef.afterClosed().pipe(
			filter(data => !!data && data.name !== null),
			switchMap(data => this.emote?.edit({ name: data.name }, data.reason) ?? EMPTY),
		).subscribe();
	}

	/**
	 * Bring up a dialog to define overrides for the current emote
	 */
	setOverrides(): void {
		const dialogRef = this.dialog.open(EmoteOverridesDialogComponent, {
			data: { emote: this.emote, happening: 'set-overrides' },
		});

		dialogRef.afterClosed().pipe(
			filter(data => typeof data?.value === 'number'),
			switchMap(data => this.emote?.edit({ visibility: data.value }, data.reason) ?? EMPTY),
		).subscribe();
	}

	/**
	 * Get the channels that this emote is added to
	 */
	readChannels(): Observable<UserStructure[]> {
		if (!this.emote) return of([]);

		return this.emote.getChannels().pipe(
			take(1),
			tap(users => this.channels.next(users))
		);
	}

	readAuditActivity(): Observable<AuditLogEntry[]> {
		return this.emote?.getAuditActivity().pipe(
			toArray(),
			map(a => a.reverse())
		) ?? of([]);
	}

	formatCreationDate(): Observable<string> {
		return this.emote?.getCreatedAt().pipe(
			map(d => !!d ? format(d, 'Pp') : '')
		) ?? of('');
	}

	hasTags(): Observable<boolean> {
		if (!this.emote) return of(false);

		return this.emote.getTags().pipe(
			map(a => (a ?? []).length > 0)
		);
	}

	isProcessing(): Observable<boolean> {
		return this.emote?.getStatus().pipe(
			map(status => status === Constants.Emotes.Status.PROCESSING)
		) ?? of(true);
	}

	isPendingOrDisabled(): Observable<boolean> {
		return this.emote?.getStatus().pipe(
			map(status => status === Constants.Emotes.Status.PENDING || status === Constants.Emotes.Status.DISABLED)
		) ?? of(false);
	}

	getAliasName(): Observable<string> {
		return this.emote?.getAlias().pipe(
			map(a => a.length > 0 ? `(${a})` : '')
		) ?? of('');
	}

	/**
	 * Query the emote's channels by page & update the current set
	 *
	 * @param page the channels page
	 */
	queryChannels(page: number): void {
		if (!this.emote) {
			return undefined;
		}

		this.restService.v2.gql.query<{ emote: DataStructure.Emote }>({
			query: `
				query PaginateEmoteChannels($id: String!, $page: Int) {
					emote(id: $id) {
						channels(page: $page) {
							id, login, display_name, profile_image_url
						}
					}
				}
			`,
			variables: {
				id: this.emote.getID(),
				page
			},
			auth: true
		}).pipe(
			map(res => res?.body?.data.emote.channels ?? []),
			map(chans => this.dataService.add('user', ...chans as DataStructure.TwitchUser[]))
		).subscribe({
			next: channels => this.channels.next(channels),
			complete: () => this.channelPage = page
		});
	}

	getTotalChannelPages(): Observable<number> {
		return this.emote?.getChannelCount().pipe(
			map(n => n ?? 0),
			map(n => Math.floor(n / 20) + 1)
		) ?? of(0);
	}

	ngOnInit(): void {
		const emoteGetter = this.route.snapshot.paramMap.has('emote')
			? this.restService.v2.GetEmote(this.route.snapshot.paramMap.get('emote') as string, true).pipe(
				catchError(err => throwError(this.restService.formatError(err))),
				filter(res => res.emote !== null), // Initiate a new emote structure instance

				tap(res => this.appService.pageTitleAttr.next([ // Update page title
					{ name: 'EmoteName', value: res.emote?.name ?? '' },
					{ name: 'OwnerName', value: `by ${res.emote?.owner?.display_name ?? ''}` }
				])),
				map(res => this.emote = this.dataService.add('emote', res.emote)[0]),
				switchMap(emote => this.readChannels().pipe(mapTo(emote)))
			)
			: !!this.emote ? of(this.emote) : throwError(Error('Unknown Emote'));
		// Look up requested emote from route uri

		emoteGetter.pipe(
			// Update meta
			// Show this emote in discord etc!
			switchMap(emote => emote.getURL(4).pipe(
				tap(url => {
					const appURL = this.document.location.host + this.router.serializeUrl(this.router.createUrlTree(['/emotes', String(emote.getID())]));
					const emoteData = emote.getSnapshot();
					this.metaService.addTags([
						// { name: 'og:title', content: this.appService.pageTitle },
						// { name: 'og:site_name', content: this.appService.pageTitle },
						{ name: 'og:description', content: `uploaded by ${emoteData?.owner?.display_name}` },
						{ name: 'og:image', content: url ?? '' },
						{ name: 'og:image:type', content: emote.getSnapshot()?.mime ?? 'image/png' },
						{ name: 'theme-color', content: this.themingService.primary.hex() }
					]);

					// Discord OEmbed
					// TODO: Make this a proper service so it can be applied to other pages
					if (AppComponent.isBrowser.getValue() !== true) {
						const link = this.document.createElement('link');
						link.setAttribute('type', 'application/json+oembed');

						const query = new URLSearchParams();
						query.append('object', Buffer.from(JSON.stringify({
							title: this.appService.pageTitle ?? 'Unknown Page',
							author_name: ''.concat(
								`${emoteData?.name} by ${emoteData?.owner?.display_name ?? 'Unknown User'} `,
								`${BitField.HasBits(emoteData?.visibility ?? 0, DataStructure.Emote.Visibility.GLOBAL) ? '(Global Emote)' : `(${emote.getSnapshot()?.channel_count ?? 0} Channels)`}`
							),
							author_url: `https://${appURL}`,
							provider_name: `7TV.APP - It's like a third party thing`,
							provider_url: 'https://7tv.app',
							type: 'photo',
							url,
							width: emote.width,
							height: emote.height
						})).toString('base64'));
						link.setAttribute('href', `http://${environment.origin}/services/oembed?` + query.toString());
						this.document.head.appendChild(link);
					}
					return undefined;
				})
			)),

			// Set emote sizes
			switchMap(() => this.getSizes().pipe(
				tap(result => this.sizes.next(result))
			)),

			// Add audit logs
			switchMap(() => this.readAuditActivity().pipe(
				tap(entries => this.audit.next(entries)),
				catchError(err => of(undefined))
			)),

			tap(() => this.cdr.markForCheck()),

			// Show warning dialog for hidden emote?
			switchMap(() => (this.emote as EmoteStructure).hasVisibility('HIDDEN').pipe(
				switchMap(isHidden => iif(() => !isHidden || this.disableNotices,
					of(true),
					new Observable<boolean>(observer => {
						const dialogRef = this.dialog.open(EmoteWarningDialogComponent, {
							maxWidth: 300,
							disableClose: true
						});

						dialogRef.afterClosed().subscribe({
							next(ok): void {
								observer.next(ok);
								observer.complete();
							} // Send the result of the user either going ahead or going back
						});
					})
				)),
				tap(canShow => this.blurred.next(!canShow))
			))
		).subscribe({
			error: (err: HttpErrorResponse) => {
				this.dialog.open(ErrorDialogComponent, {
					data: {
						errorName: 'Cannot View Emote',
						errorMessage: err.error?.error ?? err.error ?? err,
						errorCode: String(err.status)
					} as ErrorDialogComponent.Data
				});
				this.router.navigate(['/emotes']);
			}
		});
	}
}

export namespace EmoteComponent {
	export interface SizeResult {
		scope: number;
		url: string;
		width: number;
		height: number;
	}

	export type AuditEntry = DataStructure.AuditLog.Entry & { action_user_instance?: UserStructure };
}
