
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DataStructure } from '@typings/typings/DataStructure';
import { asapScheduler, asyncScheduler, BehaviorSubject, from, iif, noop, Observable, of, scheduled, Subject } from 'rxjs';
import { concatAll, filter, map, mapTo, mergeMap, switchMap, take, takeUntil, tap, toArray } from 'rxjs/operators';
import { ClientService } from 'src/app/service/client.service';
import { ThemingService } from 'src/app/service/theming.service';
import { UserComponent } from 'src/app/user/user.component';
import { AuditLogEntry } from 'src/app/util/audit.structure';
import { EmoteStructure } from 'src/app/util/emote.structure';
import { UserStructure } from 'src/app/util/user.structure';

@Component({
	selector: 'app-user-home',
	templateUrl: 'user-home.component.html',
	styleUrls: ['user-home.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush
})

export class UserHomeComponent implements OnInit, OnDestroy {
	private destroyed = new Subject<void>();
	channelEmotes = new BehaviorSubject<EmoteStructure[]>([]);
	channelCount = new BehaviorSubject(0);
	channelShown = 50;
	ownedEmotes = new BehaviorSubject<EmoteStructure[]>([]);
	ownedShown = 50;
	ownedCount = new BehaviorSubject(0);
	isLive = new BehaviorSubject(false);
	broadcast = new BehaviorSubject<DataStructure.Broadcast | null>(null);

	auditEntries = [] as AuditLogEntry[];

	blurred = new Set<string>();

	constructor(
		@Inject(UserComponent) private parent: UserComponent,
		private cdr: ChangeDetectorRef,
		private clientService: ClientService,
		private router: Router,
		public themingService: ThemingService
	) { }

	// tslint:disable-next-line:typedef
	get user(): Observable<UserStructure> {
		return this.parent.user.asObservable() as Observable<UserStructure>;
	}

	private shouldBlurEmote(emote: EmoteStructure): Observable<boolean> {
		return scheduled([
			emote.hasVisibility('HIDDEN'),
			emote.hasVisibility('PRIVATE')
		], asyncScheduler).pipe(
			concatAll(),
			toArray(),
			mergeMap(b => iif(() => b[0] === true || b[1] === true,
				this.clientService.hasPermission('EDIT_EMOTE_ALL').pipe(
					take(1),
					switchMap(bypass => iif(() => bypass,
						of(false),
						emote.getOwnerID().pipe(
							map(ownerID => ownerID !== this.clientService.id)
						)
					))
				),
				of(false)
			)),
			take(1)
		);
	}

	showMoreOf(setName: 'channel' | 'owned'): void {
		switch (setName) {
			case 'channel':
				this.channelShown += 50;
				break;

			case 'owned':
				this.ownedShown += 50;
				break;

			default:
				break;
		}
		this.cdr.markForCheck();
		console.log(this.channelShown, this.ownedShown, setName);
	}

	isBlurred(emote: EmoteStructure): boolean {
		return this.blurred.has(emote.getID());
	}

	trackBy(_: number, e: EmoteStructure): any {
		return e.getID();
	}

	/**
	 * Called when the user clicks on an emote card.
	 *
	 * Prevent the normal link href event from occuring
	 */
	onClickCard(ev: Event, emote: EmoteStructure): void {
		ev.preventDefault();

		if (typeof emote?.getID() === 'string') {
			this.router.navigate(['/emotes', emote.getID()]);
		}
	}

	ngOnInit(): void {
		this.user.pipe(
			filter(user => !!user),
			takeUntil(this.destroyed),

			switchMap(user => user.getAuditEntries().pipe(
				tap(entries => this.auditEntries = entries),
				mapTo(user)
			)),
			switchMap(user => user.isLive().pipe(
				map(live => this.isLive.next(live)),
				switchMap(() => user.getBroadcast()),
				map(broadcast => this.broadcast.next(broadcast)),
				mapTo(user)
			)),
			switchMap(user => scheduled([
				user.getEmotes().pipe(map(emotes => ({ type: 'channel', emotes }))),
				user.getOwnedEmotes().pipe(map(emotes => ({ type: 'owned', emotes })))
			], asapScheduler).pipe(
				concatAll(),
				mergeMap(s => from(s.emotes).pipe(
					mergeMap(em => this.shouldBlurEmote(em).pipe(map(blur => ({ blur, emote: em })))),
					map(x => x.blur ? this.blurred.add(x.emote.getID()) : noop()),
					toArray(),
					mapTo(s)
				)),
				take(2),
			))
		).subscribe({
			next: set => {
				switch (set.type) {
					case 'channel':
						this.channelEmotes.next(set.emotes);
						this.channelCount.next(set.emotes.length);
						break;
					case 'owned':
						this.ownedEmotes.next(set.emotes);
						this.ownedCount.next(set.emotes.length);
						break;
				}
			}
		});
	}

	ngOnDestroy(): void {
		this.destroyed.next(undefined);
		this.destroyed.complete();
	}
}
