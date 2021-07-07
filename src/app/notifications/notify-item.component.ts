import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ThemingService } from 'src/app/service/theming.service';
import { EmoteStructure } from 'src/app/util/emote.structure';
import { NotificationStructure } from 'src/app/util/notification.structure';

@Component({
	selector: 'app-notify-item',
	templateUrl: 'notify-item.component.html',
	styleUrls: ['notify-item.component.scss']
})

export class NotifyItemComponent implements OnInit {
	@Input() notification: NotificationStructure | null = null;
	parts = new BehaviorSubject<NotificationStructure.MessagePart[]>([]);

	constructor(
		private router: Router,
		public themingService: ThemingService
	) {

	}

	goToEmote(emote: EmoteStructure): void {
		this.router.navigate(['/']);
		setTimeout(() => {
			this.router.navigate(['/emotes', emote.getID()]);
		}, 0);
	}

	ngOnInit(): void {
		this.parts.next(this.notification?.parts ?? [] as NotificationStructure.MessagePart[]);
	}
}
