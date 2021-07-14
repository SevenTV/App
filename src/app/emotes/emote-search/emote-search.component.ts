import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { asyncScheduler, BehaviorSubject, EMPTY, scheduled } from 'rxjs';
import { map, mergeAll, mergeMap, take, tap, throttleTime } from 'rxjs/operators';
import { EmoteListService } from 'src/app/emotes/emote-list/emote-list.service';
import { ClientService } from 'src/app/service/client.service';
import { RestV2 } from 'src/app/service/rest/rest-v2.structure';
import { ThemingService } from 'src/app/service/theming.service';

@Component({
	selector: 'app-emote-search',
	templateUrl: './emote-search.component.html',
	styleUrls: ['./emote-search.component.scss'],
	encapsulation: ViewEncapsulation.None,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmoteSearchComponent implements OnInit {
	@Output() searchChange = new EventEmitter<Partial<RestV2.GetEmotesOptions>>();
	@Input() defaultSearchOptions: Partial<RestV2.GetEmotesOptions> | undefined;

	get form(): FormGroup {
		return this.emoteListService.searchForm;
	}
	nameSearchBox: string | undefined;
	current: Partial<RestV2.GetEmotesOptions> = {};

	/**
	 * A list of options for changing what the text input does
	 */
	modeMenuOptions = [
		{ // Search emote names
			label: 'Emote Name',
			id: 'query'
		},
		{ // Search by submitter name
			label: 'Submitter Name',
			id: 'submitter'
		}
	] as EmoteSearchComponent.ModeMenuOption[];

	globalStateButtons = [
		{ label: 'Include', value: 'include' },
		{ label: 'Hide', value: 'hide' },
		{ label: 'Only', value: 'only' }
	] as EmoteSearchComponent.RadioOption[];

	sortOptions = [
		{ label: 'Total Channels', value: 'popularity' },
		{ label: 'Date Created', value: 'age' }
	] as EmoteSearchComponent.RadioOption[];

	get sortOrder(): number { return this.form.get('sortOrder')?.value ?? 0; }
	selectedSearchMode = new BehaviorSubject<EmoteSearchComponent.ModeMenuOption>(this.modeMenuOptions[0]);

	constructor(
		private emoteListService: EmoteListService,
		private clientService: ClientService,
		public themingService: ThemingService
	) { }

	/**
	 * Change the current search mode
	 *
	 * This method is used by the mode menu
	 */
	changeSearchMode(opt: EmoteSearchComponent.ModeMenuOption): void {
		this.selectedSearchMode.pipe(
			take(1),
			tap(mode => this.form.get(mode.id)?.reset()),
			tap(mode => { delete this.current[mode.id as keyof RestV2.GetEmotesOptions]; }),

			tap(() => this.selectedSearchMode.next(opt))
		).subscribe();
	}

	toggleSortDirection(): void {
		this.form.get('sortOrder')?.patchValue(this.sortOrder >= 1 ? 0 : 1);
	}

	getSortDirectionLabel(): string {
		return this.sortOrder >= 1 ? 'Ascending' : 'Descending';
	}

	handleEnterPress(ev: KeyboardEvent | Event): void {
		ev.preventDefault();

		(ev.target as HTMLInputElement).blur();
		this.form.get('query')?.patchValue((ev.target as HTMLInputElement).value);
	}

	ngOnInit(): void {
		scheduled([
			this.form.get('query')?.valueChanges.pipe( // Look for changes to the name input form field
				mergeMap((value: string) => this.selectedSearchMode.pipe(take(1), map(mode => ({ mode, value })))),
				map(({ value, mode }) => ({ [mode.id]: value })) // Map SearchMode to value
			) ?? EMPTY,

			this.form.get('globalState')?.valueChanges.pipe( // Look for changes to the "show global"
				map((value: string) => ({ globalState: value }))
			) ?? EMPTY,

			this.form.get('channel')?.valueChanges.pipe(
				map((value: boolean) => ({ channel: value ? this.clientService.getSnapshot()?.login : '' }))
			) ?? EMPTY,

			this.form.get('sortBy')?.valueChanges.pipe(
				map((value: string) => ({ sortBy: value }))
			) ?? EMPTY,

			this.form.get('sortOrder')?.valueChanges.pipe(
				map((value: RestV2.GetEmotesOptions['sortOrder']) => ({ sortOrder: value }))
			) ?? EMPTY
		], asyncScheduler).pipe(
			mergeAll(),
			map(v => this.current = { ...this.current, ...v } as any),
			throttleTime(250)
		).subscribe({
			next: (v) => this.searchChange.next(v) // Emit the change
		});

		setTimeout(() => {
			if (!!this.defaultSearchOptions) {
				for (const k of Object.keys(this.form.getRawValue())) {
					const v = (this.defaultSearchOptions as any)[k as any];
					if (!v) {
						continue;
					}

					this.form.get(k)?.patchValue(v);
				}
			}
		}, 0);
	}

}

export namespace EmoteSearchComponent {
	export interface ModeMenuOption {
		label: string;
		id: string;
	}

	export interface RadioOption {
		label: string;
		value: string;
	}
}
