import { Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ClientService } from 'src/app/service/client.service';
import { ThemingService } from 'src/app/service/theming.service';
import { Notification } from 'src/app/util/notification.structure';

@Component({
	selector: 'app-notify-menu',
	templateUrl: 'notify-menu.component.html',
	styleUrls: ['notify-menu.component.scss']
})

export class NotifyMenuComponent implements OnInit, OnDestroy {
	closed = new Subject<void>();
	notifications = new BehaviorSubject<Notification[]>([]);

	constructor(
		public themingService: ThemingService,
		private clientService: ClientService
	) { }

	close(): void {
		this.closed.next(undefined);
	}

	ngOnInit(): void {
		this.clientService.getNotifications().pipe(
			tap(x => this.notifications.next(x))
		).subscribe();
	}

	ngOnDestroy(): void {
		this.closed.complete();
		this.notifications.complete();
	}
}
