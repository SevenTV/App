import { OverlayContainer } from '@angular/cdk/overlay';
import { isPlatformBrowser, Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { ActivationStart, Router } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { BehaviorSubject, defer, iif } from 'rxjs';
import { delay, filter, map, switchMap, tap } from 'rxjs/operators';
import { iconList } from 'src/app/icons-register';
import { AppService } from 'src/app/service/app.service';
import { LocalStorageService } from 'src/app/service/localstorage.service';
import { ViewportService } from 'src/app/service/viewport.service';
import { WindowRef } from 'src/app/service/window.service';
import { UpdateDialogComponent } from 'src/app/update-dialog.component.';
import { ChangelogDialogComponent } from 'src/app/util/dialog/changelog/changelog-dialog.component';
import { environment } from 'src/environments/environment';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
	static isBrowser = new BehaviorSubject<boolean>(true);

	title = 'seventv-app';
	layoutDisabled = false;

	constructor(
		@Inject(PLATFORM_ID) platformId: any,
		iconRegistry: MatIconRegistry,
		sanitizer: DomSanitizer,
		appService: AppService,
		titleService: Title,
		localStorageSvc: LocalStorageService,
		private windowRef: WindowRef,
		private sw: SwUpdate,
		private dialog: MatDialog,
		private location: Location,
		private router: Router,
		private overlayRef: OverlayContainer,
		public viewportService: ViewportService
	) {
		// Check if platform is browser
		AppComponent.isBrowser.next(isPlatformBrowser(platformId));

		for (const iconRef of iconList) {
			iconRegistry.addSvgIcon(
				iconRef[0],
				sanitizer.bypassSecurityTrustResourceUrl(`assets/${iconRef[1]}`)
			);
		}

		// Set page title
		{
			router.events.pipe( // Handle "ActivationStart" router event
				filter(ev => ev instanceof ActivationStart),
				map(ev => ev as ActivationStart),

				// Find variables and omit them from the title.
				// Components can call AppService.pushTitleAttributes() to update them
				tap(ev => {
					const title: string = '7TV - ' + (ev.snapshot.data?.title ?? 'Untitled Page' as string);

					appService.pageTitleSnapshot = String(title);
					titleService.setTitle(`${title?.replace(AppService.PAGE_ATTR_REGEX, '')}`);
				})
			).subscribe();
		}

		this.setTheme();

		if (isPlatformBrowser(platformId)) {
			localStorageSvc.storage = localStorage;
		}
	}

	async ngOnInit(): Promise<void> {
		// Navigate to current URL in order to trigger a routing event and update the page title
		this.router.navigateByUrl(this.location.path(true));

		if (!environment.disableChangelog && 'localStorage' in (this.windowRef.getNativeWindow() ?? {}) && !localStorage.getItem('changelog_read')) {
			this.dialog.open(ChangelogDialogComponent, {
				disableClose: true
			});
		}

		// Handle SW Update
		if (AppComponent.isBrowser.getValue()) {
			this.sw.checkForUpdate();
			this.sw.available.pipe(
				switchMap(() => this.sw.activateUpdate()),
				tap(() => localStorage.removeItem('changelog_read')),
				map(_ => this.dialog.open(UpdateDialogComponent, {
					disableClose: true
				})),
				switchMap(dialogRef => dialogRef.afterClosed()),
				switchMap(accepted => iif(() => accepted === true,
					defer(() => this.updateSW()).pipe(
						tap(() => window.location.reload()),
						tap(() => console.log('Updating app...'))
					),
					defer(() => console.log('Client did not accept the update.'))
				))
			).subscribe();
		}

	}

	updateSW(): void {
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.getRegistrations().then((registrations) => {
				for (const registration of registrations) {
					registration.update().then(() => document.location.reload());
				}
			});
		}
	}

	setTheme(): void {
		this.overlayRef.getContainerElement().classList.add('theme-dark');
	}
}
