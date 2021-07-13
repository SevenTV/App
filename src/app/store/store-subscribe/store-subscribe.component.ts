import { Component, OnInit } from '@angular/core';
import { ThemingService } from 'src/app/service/theming.service';

@Component({
	selector: 'app-store-subscribe',
	templateUrl: 'store-subscribe.component.html',
	styleUrls: ['store-subscribe.component.scss']
})

export class StoreSubscribeComponent implements OnInit {
	constructor(
		public themingService: ThemingService
	) { }

	ngOnInit(): void { }
}

export namespace StoreSubscribeComponent {
	export interface PerkList {
		name: string;
		checked: boolean;
	}
}
