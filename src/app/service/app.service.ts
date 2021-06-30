import { Injectable, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { DataStructure } from '@typings/typings/DataStructure';
import { BehaviorSubject, Subject } from 'rxjs';
import { map, mergeAll, tap } from 'rxjs/operators';
import { DataService } from 'src/app/service/data.service';
import { RestService } from 'src/app/service/rest.service';

@Injectable({
	providedIn: 'root'
})

export class AppService {
	title = '7tv.app';
	description = 'It\'s like a third party thing';
	currentView = '';
	devStage = 'beta';
	loading = false;

	pageTitleSnapshot = '';
	pageTitle = '';
	pageTitleAttr = new Subject<AppService.PageTitleAttribute[]>();

	contactEmail = 'kathy@7tv.app';

	featuredBroadcast = new BehaviorSubject<string>('');
	announcement = new BehaviorSubject<string>('');

	constructor(
		titleService: Title,
		restService: RestService,
		private dataService: DataService
	) {
		const attrMap = new Map<string, AppService.PageTitleAttribute>();
		this.pageTitleAttr.pipe(
			// map(attr => lastAttr ? [...lastAttr, ...(lastAttr = attr)] : [...attr]),
			mergeAll(),
			tap(attr => attrMap.set(attr.name, attr)),
			map(attr => [...Array.from(attrMap.values()), attr]),

			map(attr => ({ title: this.pageTitleSnapshot, attributes: attr })),
			map(({ attributes, title }) => {
				attributes.map(attr => title = title.replace(`%${attr.name}`, attr.value));

				titleService.setTitle(title.replace(AppService.PAGE_ATTR_REGEX, ''));
			})
		).subscribe();

		restService.v2.gql.query<{ meta: { featured_broadcast: string; announcement: string; roles: string[]; }; }>({
			query: `
				query GetMeta() {
					meta() {
						announcement,
						featured_broadcast,
						roles
					}
				}
			`
		}).pipe(
			map(res => res?.body?.data.meta)
		).subscribe({
			next: (res) => {
				this.featuredBroadcast.next(res?.featured_broadcast ?? '');
				this.announcement.next(res?.announcement ?? '');

				// Add roles to data service
				if (Array.isArray(res?.roles)) {
					for (const s of res?.roles as string[]) {
						let role: DataStructure.Role;
						try {
							role = JSON.parse(s);
						} catch (err) {
							console.error('could not parse application roles,', err);
							continue;
						}

						this.dataService.add('role', role);
					}
				}
			}
		});
	}

	/**
	 * Set attributes for the page title
	 */
	pushTitleAttributes(...attr: AppService.PageTitleAttribute[]): void {
		this.pageTitleAttr.next(attr);
	}
}

export namespace AppService {
	export interface PageTitleAttribute {
		name: string;
		value: string;
	}

	export const PAGE_ATTR_REGEX = /(%)([A-Za-z]{0,64})/g;
}
