import { Component, Input, OnInit } from '@angular/core';
import { NotificationStructure } from 'src/app/util/notification.structure';

@Component({
	selector: 'app-notify-parts',
	templateUrl: 'notify-parts.component.html'
})

export class NotifyPartsComponent implements OnInit {
	@Input() notification: NotificationStructure | null = null;

	ngOnInit(): void {

	}
}
