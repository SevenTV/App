
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MaterialModule } from 'src/app/material.module';
import { NotifyMenuComponent } from 'src/app/notifications/notify-menu.component';
import { NotifyItemComponent } from 'src/app/notifications/notify-item.component';
import { UtilModule } from 'src/app/util/util.module';
import { RouterModule } from '@angular/router';

@NgModule({
	imports: [
		CommonModule,
		MaterialModule,
		UtilModule,
		RouterModule
	],
	exports: [],
	declarations: [
		NotifyMenuComponent,
		NotifyItemComponent
	],
	providers: [],
})
export class NotificationModule { }
