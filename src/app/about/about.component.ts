import { Component, OnInit } from '@angular/core';
import { ThemingService } from 'src/app/service/theming.service';

@Component({
	selector: 'app-about',
	templateUrl: './about.component.html',
	styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit {
	featureList = [
		'All core functionality is free to use',
		'Up to 200 channel emote slots by default, free forever',
		'Support for wide and animated wide emotes (3:1 ratio)',
		'Downloadable for Chrome and Chromium-based browsers, Firefox, Chatterino & more',
		'In use currently by over 8,000 channels and climbing',
		'Less opinionated guidelines',
		'Active Development & Open Source',
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

	constructor(
		public themingService: ThemingService
	) { }

	ngOnInit(): void {
	}

}

export namespace AboutComponent {
	export interface QuestionAnswer {
		question: string;
		answer: string;
	}
}
