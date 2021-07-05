import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UserRoutingModule } from './user-routing.module';
import { UserComponent } from './user.component';
import { MaterialModule } from 'src/app/material.module';
import { UtilModule } from 'src/app/util/util.module';
import { UserHomeComponent } from 'src/app/user/user-home/user-home.component';
import { EmotesModule } from 'src/app/emotes/emotes.module';
import { ReactiveFormsModule } from '@angular/forms';
import { AdminModule } from 'src/app/admin/admin.module';
import { UserRoleDialogComponent } from 'src/app/user/dialog/user-role-dialog.component';

@NgModule({
	declarations: [
		UserComponent,
		UserHomeComponent,
		UserRoleDialogComponent
	],
	imports: [
		CommonModule,
		UserRoutingModule,
		ReactiveFormsModule,
		EmotesModule,
		MaterialModule,
		UtilModule,
		AdminModule
	],
	exports: [
		UserRoleDialogComponent
	]
})
export class UserModule { }
