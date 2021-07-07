import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { asapScheduler, BehaviorSubject, interval, noop, scheduled, Subject } from 'rxjs';
import { delay, filter, mapTo, mergeAll, switchMap, take, takeUntil, takeWhile, tap } from 'rxjs/operators';
import { ClientService } from 'src/app/service/client.service';

@Component({
	selector: 'app-notify-button',
	template: `
		<button mat-icon-button>
			<mat-icon [matBadgeHidden]="(count | async) === 0" [matBadge]="count | async" matBadgeSize="small" matBadgeColor="warn">notifications</mat-icon>
		</button>
	`
})

export class NotifyButtonComponent implements OnInit, OnDestroy {
	destroyed = new Subject<void>();
	count = new BehaviorSubject(0);

	focus = new BehaviorSubject(true);

	constructor(
		private clientService: ClientService
	) { }

	beginPolling(): void {
		const poll = new Subject<void>();

		poll.pipe(
			takeUntil(this.destroyed),
			switchMap(() => this.focus.pipe(filter(f => f === true), take(1))),

			switchMap(() => this.clientService.getActorUser().pipe(
				switchMap(actor => actor.fetchNotificationCount()),
				tap(nCount => this.count.getValue() !== nCount
					? this.clientService.openSnackBar(`You have ${nCount} unread notification${nCount > 1 ? 's' : ''}`, 'OK', { verticalPosition: 'top', horizontalPosition: 'right' })
					: noop()
				),

				tap(nCount => this.count.next(nCount))
			)),
			delay(45 * 1000),
		).subscribe({
			next: () => {
				poll.next(undefined);
			}
		});

		setTimeout(() => poll.next(undefined), 0);
	}

	@HostListener('window:visibilitychange', ['$event'])
	onTabChange(ev: FocusEvent): void {
		if (document.visibilityState === 'hidden') {
			this.focus.next(false);
		} else {
			this.focus.next(true);
		}
	}

	@HostListener('window:focus')
	onFocus(): void {
		this.focus.next(true);
	}

	@HostListener('window:blur')
	onBlur(): void {
		this.focus.next(false);
	}

	ngOnInit(): void {
		scheduled([
			this.clientService.isAuthenticated().pipe(filter(ok => ok === true)),
			this.clientService.impersonating.pipe(mapTo(true))
		], asapScheduler).pipe(
			mergeAll(),
			switchMap(() => this.clientService.getActorUser()),
			switchMap(actor => actor.fetchNotificationCount()),
			tap(nCount => this.count.next(nCount))
		).subscribe();

		this.beginPolling();
	}

	ngOnDestroy(): void {
		this.destroyed.next(undefined);
		this.destroyed.complete();

		this.count.complete();
	}
}
