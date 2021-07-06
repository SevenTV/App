import { Component, OnInit } from '@angular/core';

@Component({
	selector: 'app-notify-button',
	template: `
		<button mat-icon-button>
			<mat-icon [matBadge]="'4'" matBadgeSize="small" matBadgeColor="warn">notifications</mat-icon>
		</button>
	`
})

export class NotifyButtonComponent implements OnInit {
	constructor() { }

	ngOnInit(): void { }
}
