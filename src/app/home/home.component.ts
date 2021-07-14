import { animate, state, style, transition, trigger } from '@angular/animations';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { BehaviorSubject, throwError } from 'rxjs';
import { filter, map, mergeAll, switchMap, take, tap } from 'rxjs/operators';
import { AppComponent } from 'src/app/app.component';
import { ChatterinoDialogComponent } from 'src/app/home/chatterino-dialog/chatterino-dialog.component';
import { AppService } from 'src/app/service/app.service';
import { DataService } from 'src/app/service/data.service';
import { LoggerService } from 'src/app/service/logger.service';
import { RestService } from 'src/app/service/rest.service';
import { ThemingService } from 'src/app/service/theming.service';
import { ViewportService } from 'src/app/service/viewport.service';
import { UserStructure } from 'src/app/util/user.structure';

@Component({
	selector: 'app-home',
	templateUrl: './home.component.html',
	styleUrls: ['./home.component.scss'],
	animations: [
		trigger('browserIcon', [
			transition(':enter', [
				style({ transform: 'scale(0)' }),
				animate('100ms', style({ transform: 'scale(1)' }))
			]),
			transition(':leave', [
				style({ transform: 'scale(1)' }),
				animate('100ms', style({ transform: 'scale(0)' }))
			])
		]),

		trigger('variantsPanel', [
			state('opened', style({ transform: 'translateY(0)' })),
			state('closed', style({ transform: 'translateY(200vh)' })),

			transition('* => opened', animate('300ms')),
			transition('* => closed', animate('300ms'))
		])
	]
})
export class HomeComponent implements OnInit {
	browserIcons = [
		{
			id: 'chrome',
			icon: 'chrome',
			tooltip: 'Get Extension for Chrome & other browsers',
			svgIcon: true,
			click: () => {
				this.viewOtherPlatforms.next(false);
				window.open('https://chrome.google.com/webstore/detail/7tv/ammjkodgmmoknidbanneddgankgfejfh', '_blank');
			},
			tag: {
				label: '???',
				color: this.themingService.primary.darken(.2).opaquer(1).hex()
			}
		},
		{
			id: 'firefox',
			icon: 'firefox',
			tooltip: 'Get Add-On for Firefox',
			svgIcon: true,
			click: () => {
				this.viewOtherPlatforms.next(false);
				window.open('https://addons.mozilla.org/en-US/firefox/addon/7tv/', '_blank');
			},
			tag: {
				label: '???',
				color: this.themingService.primary.darken(.2).opaquer(1).hex()
			}
		},
		{
			id: 'chatterino',
			icon: 'chatterino',
			tooltip: 'Download Chatterino7 (Desktop Chat App)',
			svgIcon: true,
			click: () => {
				this.viewOtherPlatforms.next(false);
				this.openChatterinoDownloadsMenu();
			},
			tag: {
				label: '???',
				color: this.themingService.primary.darken(.2).opaquer(1).hex()
			}
		},
		{
			id: 'mobile',
			icon: 'smartphone',
			tooltip: 'Get 7TV-supported mobile apps',
			svgIcon: false,
			click: () => {
				this.viewOtherPlatforms.next(true);
				this.platformVariants.next(this.browserIcons[3].variants ?? []);
			},
			tag: {
				label: 'MOBILE',
				color: this.themingService.accent.darken(.75)
			}
		},
		{
			id: 'tools',
			icon: 'code',
			tooltip: 'Stream tools, addons, bots & more by other developers',
			svgIcon: false,
			click: () => {
				this.viewOtherPlatforms.next(true);
				this.platformVariants.next(this.browserIcons[4].variants ?? []);
			},
			tag: {
				label: 'MORE'
			}
		}
	] as HomeComponent.BrowserIcon[];

	footerOptions = [
		{
			name: 'Contact',
			path: 'mailto:kathy@7tv.app'
		},
		{
			name: 'GitHub',
			path: 'https://github.com/SevenTV'
		},
		{
			name: 'Privacy Policy',
			route: ['/legal', 'privacy']
		},
		{
			name: 'Terms of Service',
			route: ['/legal', 'tos']
		}
	] as HomeComponent.FooterOptions[];

	logoSize = 64 * 3;
	discordWidget = new BehaviorSubject<RestService.Result.GetDiscordWidget | null>(null);

	featuredUser = new BehaviorSubject<UserStructure | null>(null);

	viewOtherPlatforms = new BehaviorSubject(false);
	platformVariants = new BehaviorSubject<HomeComponent.PlatformVariant[]>([]);

	constructor(
		private restService: RestService,
		private dataService: DataService,
		private dialog: MatDialog,
		private cdr: ChangeDetectorRef,
		private router: Router,
		private logger: LoggerService,
		public themingService: ThemingService,
		public vp: ViewportService,
		public appService: AppService
	) { }

	openChatterinoDownloadsMenu(): void {
		this.dialog.open(ChatterinoDialogComponent);
	}

	openDiscordInvite(): void {
		this.discordWidget.pipe(
			take(1),
			map(w => window.open(w?.instant_invite, 'Discord', 'width=630,height=530'))
		).subscribe();
	}

	openTwitterLink(): void {
		setTimeout(() => {
			const handle = window.open(this.appService.twitterURL);
			handle?.blur();
			window.focus();
		}, 200);
	}

	openGitHubLink(): void {
		setTimeout(() => {
			const handle = window.open(this.appService.githubURL);
			handle?.blur();
			window.focus();
		}, 200);
	}

	openThirdPartyAppLink(platform: HomeComponent.Platform, v: HomeComponent.PlatformVariant): void {
		window.open(`${this.restService.BASE.v2}/platforms/${platform.id}/${v.id}`, '_blank');
	}

	ngOnInit(): void {
		// Get Discord Widget
		this.restService.Discord.Widget().pipe(
			RestService.onlyResponse(),
			tap(res => this.discordWidget.next(res.body))
		).subscribe({
			error(): void {}
		});

		// Get extension versions
		this.restService.createRequest<HomeComponent.Platform[]>('get', '/webext').pipe(
			RestService.onlyResponse(),
			map(res => res.body as HomeComponent.Platform[]),
			mergeAll(),
			map(p => ({
				icon: this.browserIcons.filter(v => v.id === p.id)[0],
				platform: p
			})),
			filter(({ icon }) => !!icon && typeof icon.tag !== 'undefined'),
			map(({ icon, platform }) => {
				if (!icon.tag) {
					icon.tag = { };
				}

				icon.tag.new = platform.new;
				icon.tag.label = platform.version_tag;
				icon.variants = platform.variants?.map(v => {
					v.platform = platform;

					return v;
				});
			})
		).subscribe({
			complete: () => this.cdr.markForCheck()
		});

		// Get featured channel
		AppComponent.isBrowser.pipe(
			take(1),
			filter(b => b === true),

			switchMap(() => this.restService.v2.gql.query<{ featured_broadcast: string; }>({
				query: `
					query GetFeaturedBroadcast() {
						featured_broadcast()
					}
				`
			})),
			map(res => res?.body?.data.featured_broadcast),
			switchMap(login => !!login ? this.restService.v2.GetUser(login) : throwError('No Featured Broadcast')),
			map(res => this.dataService.add('user', res.user)[0])
		).subscribe({
			next: usr => {
				this.featuredUser.next(usr);
			},
			error: err => {
				this.logger.warn('No featured broadcast active: ', err);
			}
		});
	}

}

export namespace HomeComponent {
	export interface BrowserIcon {
		id: string;
		icon: string;
		svgIcon: boolean;
		tooltip?: string;
		click: (ev: MouseEvent) => void;
		disabled?: boolean;
		tag?: {
			label?: string;
			color?: string;
			new?: boolean;
		};
		variants?: PlatformVariant[] | null;
	}

	export interface Platform {
		id: string;
		version_tag: string;
		new: boolean;
		variants: PlatformVariant[] | null;
	}
	export interface PlatformVariant {
		id: string;
		name: string;
		author: string;
		description: string;
		version: string;
		url: string;

		platform: Platform;
	}

	export interface FooterOptions {
		name: string;
		path?: string;
		route?: string[];
	}
}
