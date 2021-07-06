
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MaterialModule } from 'src/app/material.module';
import { NotifyMenuComponent } from 'src/app/notifications/notify-menu.component';

@NgModule({
	imports: [
		CommonModule,
		MaterialModule
	],
	exports: [],
	declarations: [
		NotifyMenuComponent
	],
	providers: [],
})
export class NotificationModule { }
