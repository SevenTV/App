import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ThemingService } from 'src/app/service/theming.service';

@Component({
	selector: 'app-store',
	templateUrl: 'store.component.html',
	styleUrls: ['store.component.scss']
})

export class StoreComponent implements OnInit {
	@ViewChild('gradient', { static: true }) gradient: ElementRef<HTMLDivElement> | undefined;
	constructor(
		public themingService: ThemingService
	) { }

	get bannerHeight(): number {
		return (this.gradient?.nativeElement.scrollHeight ?? 0) - 96;
	}

	ngOnInit(): void {}
}
