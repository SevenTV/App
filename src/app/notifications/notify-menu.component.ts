import { Component, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';
import { DataStructure } from '@typings/typings/DataStructure';
import { BehaviorSubject, Subject } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';
import { ClientService } from 'src/app/service/client.service';
import { DataService } from 'src/app/service/data.service';
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
	notifications = new BehaviorSubject<NotificationStructure[]>([]);

	loaded = false;

	constructor(
		public themingService: ThemingService,
		private el: ElementRef<HTMLDivElement>,
		private dataService: DataService,
		private restService: RestService,
		private clientService: ClientService
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

	ngOnInit(): void {
		this.restService.v2.gql.query<{ user: DataStructure.TwitchUser; }>({
			query: `
				query GetUserNotifications($id: String!) {
					user(id: $id) {
						notifications {
							id, read, title, announcement,
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
			tap(x => this.notifications.next(x)),
			delay(0)
		).subscribe({
			complete: () => this.loaded = true
		});
	}

	ngOnDestroy(): void {
		this.closed.complete();
		this.notifications.complete();
	}
}
