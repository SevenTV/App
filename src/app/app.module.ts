import { Injector, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from 'src/app/material.module';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { HttpClientModule } from '@angular/common/http';
import { CallbackGuard } from './navigation/callback.guard';
import { UtilModule } from 'src/app/util/util.module';
import { TwitchButtonComponent } from 'src/app/util/twitch-button/twitch-button.component';
import { CookieService } from 'ngx-cookie-service';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { NavigationComponent } from 'src/app/navigation/navigation.component';
import { setAppInjector } from 'src/app/service/app.injector';
import { EditorDialogComponent } from 'src/app/navigation/editor-dialog.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { UpdateDialogComponent } from 'src/app/update-dialog.component.';
import { MarkdownModule } from 'ngx-markdown';
import { ChangelogDialogComponent } from 'src/app/util/dialog/changelog/changelog-dialog.component';
import { NotificationModule } from 'src/app/notifications/notifications.module';
import { NotifyButtonComponent } from 'src/app/notifications/notify-button.component';

@NgModule({
	declarations: [
		AppComponent,
		NavigationComponent,
		EditorDialogComponent,
		TwitchButtonComponent,
		UpdateDialogComponent,
		ChangelogDialogComponent,
		NotifyButtonComponent
	],
	imports: [
		BrowserModule.withServerTransition({ appId: 'serverApp' }),
		AppRoutingModule,
		BrowserAnimationsModule,
		HttpClientModule,
		MaterialModule,
		UtilModule,
		NgbModule,
		MatSnackBarModule,
		NotificationModule,
		MarkdownModule.forRoot(),
		ServiceWorkerModule.register('ngsw-worker.js', {
			enabled: environment.serviceWorker,
			// Register the ServiceWorker as soon as the app is stable
			// or after 30 seconds (whichever comes first).
			registrationStrategy: 'registerImmediately',
		})
	],
	providers: [
		CallbackGuard,
		CookieService
	],
	bootstrap: [AppComponent]
})
export class AppModule {
	constructor(
		injector: Injector
	) {
		setAppInjector(injector);
	}
}
