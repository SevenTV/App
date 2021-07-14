import { animate, state, style, transition, trigger } from '@angular/animations';
import { AfterViewChecked } from '@angular/core';
import { AfterContentInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { MatMenu, MatMenuTrigger } from '@angular/material/menu';
import { Router } from '@angular/router';
import { Constants } from '@typings/src/Constants';
import * as Color from 'color';
import { asapScheduler, BehaviorSubject, EMPTY, Observable, of, scheduled, Subject, timer } from 'rxjs';
import { defaultIfEmpty, delay, filter, map, switchMap, take, takeUntil, tap } from 'rxjs/operators';
import { ClientService } from 'src/app/service/client.service';
import { RestService } from 'src/app/service/rest.service';
import { ThemingService } from 'src/app/service/theming.service';
import { WindowRef } from 'src/app/service/window.service';
import { EmoteStructure } from 'src/app/util/emote.structure';

@Component({
	selector: 'app-emote-card',
	templateUrl: './emote-card.component.html',
	styleUrls: ['./emote-card.component.scss'],
	animations: [
		trigger('hovering', [
			state('true', style({ 'border-color': 'currentColor' })),
			state('false', style({ 'border-color': '{{borderColor}}'} ), { params: { borderColor: 'none' } }),

			transition('true => false', animate(500)),
			transition('false => true', animate(100))
		])
	],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmoteCardComponent implements OnInit, AfterViewChecked, OnDestroy {
	@Input() size = 10;
	@Input() emote: EmoteStructure | null = null;
	@Input() contextMenu: MatMenu | null = null;
	@Output() openContext = new EventEmitter<EmoteStructure>();
	@Input() blur = false;
	@ViewChild(MatMenuTrigger) contextMenuTrigger: MatMenuTrigger | undefined;

	blurChange = new BehaviorSubject<boolean>(false);
	borderColor = this.themingService.bg.lighten(.2);
	globalBorderColor = this.themingService.accent;
	channelBorderColor = this.themingService.colors.twitch_purple;
	currentBorderColor = new BehaviorSubject<string>('');
	hover = new BehaviorSubject<boolean | null>(false);

	// Listen for hover states
	@HostListener('mouseenter')
	onMouseEnter(): void {
		this.hover.next(true);

		if (this.blur) {
			timer(400).pipe(
				takeUntil(this.hover.pipe(filter(h => h === false), take(1))),
				take(1),
				tap(() => {
					this.blurChange.next(false);
					this.cdr.markForCheck();
				})
			).subscribe();
		}
	}

	@HostListener('mouseleave')
	onMouseLeave(): void {
		this.hover.next(false);

		if (this.blur) {
			this.blur = true;
		}
	}

	/**
	 * Middle Mouse Click: open in new tab
	 */
	@HostListener('auxclick', ['$event'])
	onMiddleClick(ev: MouseEvent): void {
		if (ev.button === 1) {
			const url = this.router.serializeUrl(this.router.createUrlTree(['/emotes', String(this.emote?.getID())]));

			this.windowRef.getNativeWindow()?.open(url, '_blank');
		}
	}

	/**
	 * On Right Click: open quick actions menu
	 */
	@HostListener('contextmenu', ['$event'])
	onRightClick(ev: MouseEvent): void {
		ev.preventDefault(); // Stop the default context menu from opening

		if (!!this.emote) this.openContext.next(this.emote);
		this.contextMenuTrigger?.openMenu();

		this.contextMenuTrigger?.menuClosed.pipe(
			take(1),
			delay(50),
			tap(() => this.updateBorderColor())
		).subscribe();
	}

	constructor(
		private cdr: ChangeDetectorRef,
		private restService: RestService,
		private clientService: ClientService,
		private router: Router,
		private windowRef: WindowRef,
		public themingService: ThemingService
	) { }

	updateBorderColor(): void {
		this.getBorderColor().pipe(
			map(color => this.currentBorderColor.next(color?.hex() ?? ''))
		).subscribe();
	}

	getEmoteURL(): string {
		return this.restService.CDN.Emote(String(this.emote?.getID()), 3);
	}

	getTooltip(): Observable<string | undefined> {
		return this.emote?.getName().pipe(
			map(name => (name?.length ?? 0) >= 14 ? name : '')
		) ?? EMPTY;
	}

	isProcessing(): Observable<boolean> {
		return this.emote?.getStatus().pipe(
			map(status => status === Constants.Emotes.Status.PROCESSING)
		) ?? of(false);
	}

	getBorderColor(): Observable<Color> {
		return scheduled([
			this.emote?.isGlobal().pipe(map(b => ({ b, type: 'global' }))),
			this.emote?.isChannel().pipe(map(b => ({ b, type: 'channel' }))),
		], asapScheduler).pipe(
			switchMap(value => value ?? EMPTY),
			filter(({ b }) => b === true),
			defaultIfEmpty({ b: false, type: 'none' }),
			take(1),
			map(o => o.type as 'global' | 'channel'),
			map(type => (type !== null ? ({
				global: this.globalBorderColor,
				channel: this.channelBorderColor
			})[type] as Color : this.borderColor))
		);
	}


	ngOnInit(): void {
		this.updateBorderColor();
		this.clientService.impersonating.subscribe({ next: () => this.cdr.markForCheck() });
	}

	ngAfterViewChecked(): void {
		this.blurChange.next(this.blur);
	}

	ngOnDestroy(): void {
		this.hover.next(false);
	}

}
