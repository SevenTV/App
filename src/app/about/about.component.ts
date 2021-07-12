import { Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AppService } from 'src/app/service/app.service';
import { RestService } from 'src/app/service/rest.service';
import { ThemingService } from 'src/app/service/theming.service';

@Component({
	selector: 'app-about',
	templateUrl: './about.component.html',
	styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit, OnDestroy {
	featureList = [
		'All core functionality is free to use',
		'Up to 200 channel emote slots by default, free forever',
		'Support for wide and animated wide emotes (3:1 ratio)',
		'Monthly Community Events & Contests',
		'Downloadable for Chrome and Chromium-based browsers, Firefox, Chatterino & more',
		'Seamlessly integrates with your other Twitch extensions',
		'Uses the newer WebP image format, resulting in much lighter images',
		'Transparency: all moderator actions are recorded and visible publicly. No cheating involved.',
		'Active Development & Open Source'
	] as string[];

	// Work in progress
	faq = [
		{
			question: 'Can you get more emote slots by paying?',
			answer: 'We believe there is no excuse to paywall slots, as the impact of high slot count is extremely small. As such, we do not charge money to get more, and have no plan to do so.'
		},
		{
			question: 'I\'ve reached my maximum amount of channel emotes, can I get more?',
			answer: 'Extra channel slots can be earned by participating in community events, contests or completing certain actions.'
		}
	] as AboutComponent.QuestionAnswer[];

	discordInvite = new BehaviorSubject('');

	constructor(
		private restService: RestService,
		public appService: AppService,
		public themingService: ThemingService
	) { }

	ngOnInit(): void {
		this.restService.Discord.Widget().pipe(
			RestService.onlyResponse()
		).subscribe({
			next: (res) => this.discordInvite.next(res.body?.instant_invite ?? '')
		});
	}

	ngOnDestroy(): void {
		this.discordInvite.complete();
	}

}

export namespace AboutComponent {
	export interface QuestionAnswer {
		question: string;
		answer: string;
	}
}
