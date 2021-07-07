import { Component, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';
import { DataStructure } from '@typings/typings/DataStructure';
import { BehaviorSubject, from, noop, Subject } from 'rxjs';
import { delay, filter, map, mergeMap, switchMap, tap, toArray } from 'rxjs/operators';
import { ClientService } from 'src/app/service/client.service';
import { DataService } from 'src/app/service/data.service';
import { LoggerService } from 'src/app/service/logger.service';
import { RestService } from 'src/app/service/rest.service';
import { ThemingService } from 'src/app/service/theming.service';
import { NotificationStructure } from 'src/app/util/notification.structure';

@Component({
	selector: 'app-notify-menu',
	templateUrl: 'notify-menu.component.html',
	styleUrls: ['notify-menu.component.scss']
})

export class NotifyMenuComponent implements OnInit, OnDestroy {
	closed = new Subject<void>();
	unreadNotifications = new BehaviorSubject<NotificationStructure[]>([]);

	allClear = false;
	loaded = false;

	constructor(
		public themingService: ThemingService,
		private el: ElementRef<HTMLDivElement>,
		public clientService: ClientService,
		private logger: LoggerService,
		private dataService: DataService,
		private restService: RestService
	) { }

	// Handle outside click: close the menu
	@HostListener('document:click', ['$event'])
	onOutsideClick(ev: MouseEvent): void {
		if (!this.loaded) {
			return;
		}
		if (this.el.nativeElement.contains(ev.target as Node)) {
			return;
		}

		this.close();
	}

	/**
	 * Close this menu
	 */
	close(): void {
		this.closed.next(undefined);
	}

	markAllRead(): void {
		this.restService.v2.gql.query<void>({
			query: `
				mutation MarkAllAsRead($ids: [String!]!) {
					markNotificationsRead(notification_ids: $ids) {
						message
					}
				}
			`,
			variables: {
				ids: this.unreadNotifications.getValue().map(n => n.id)
			},
			auth: true
		}).subscribe({
			next: () => {
				this.unreadNotifications.next([]);
			},
			error: err => this.logger.error('Couldn\'t mark notifications read', err)
		});
	}

	ngOnInit(): void {
		this.restService.v2.gql.query<{ user: DataStructure.TwitchUser; }>({
			query: `
				query GetUserNotifications($id: String!) {
					user(id: $id) {
						notifications {
							id, read, title, announcement,
							timestamp,
							read_at,
							users {
								id, login, display_name,
								profile_image_url,
								role { id, color }
							},
							emotes {
								id, name
							},
							message_parts {
								type, data
							}
						}
					}
				}
			`,
			variables: {
				id: this.clientService.impersonating.getValue()?.id ?? '@me'
			},
			auth: true
		}).pipe(
			map(res => res?.body?.data.user.notifications ?? []),
			map(x => this.dataService.add('notification', ...x)),

			switchMap(all => from(all).pipe(
				mergeMap(n => n.isRead().pipe(map(read => ({ n, read })))),
				filter(({ read }) => read === false),
				map(x => x.n),
				toArray(),
				tap(arr => arr.length === 0 ? this.allClear = true : noop())
			)),
			tap(x => this.unreadNotifications.next(x)),
			delay(0)
		).subscribe({
			complete: () => this.loaded = true
		});
	}

	ngOnDestroy(): void {
		this.closed.complete();
		this.unreadNotifications.complete();
	}
}
