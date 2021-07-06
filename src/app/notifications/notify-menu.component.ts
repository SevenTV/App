import { Component, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { delay, tap } from 'rxjs/operators';
import { ClientService } from 'src/app/service/client.service';
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
		this.clientService.getNotifications().pipe(
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
