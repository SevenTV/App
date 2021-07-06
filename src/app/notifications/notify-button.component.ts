import { Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { filter, switchMap, tap } from 'rxjs/operators';
import { ClientService } from 'src/app/service/client.service';

@Component({
	selector: 'app-notify-button',
	template: `
		<button mat-icon-button>
			<mat-icon [matBadge]="count | async" matBadgeSize="small" matBadgeColor="warn">notifications</mat-icon>
		</button>
	`
})

export class NotifyButtonComponent implements OnInit, OnDestroy {
	destroyed = new Subject<void>();
	count = new BehaviorSubject(0);

	constructor(
		private clientService: ClientService
	) { }

	ngOnInit(): void {
		this.clientService.isAuthenticated().pipe(
			filter(ok => ok === true),
			switchMap(() => this.clientService.getNotificationCount()),
			tap(nCount => this.count.next(nCount))
		).subscribe();
	}

	ngOnDestroy(): void {
		this.destroyed.next(undefined);
		this.destroyed.complete();

		this.count.complete();
	}
}
