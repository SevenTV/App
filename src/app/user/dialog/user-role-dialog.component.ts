

import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { DataService } from 'src/app/service/data.service';
import { RoleStructure } from 'src/app/util/role.structure';
import { UserStructure } from 'src/app/util/user.structure';

@Component({
	selector: 'app-user-role-dialog',
	template: `
		<h3 mat-dialog-title> Editing {{ data.user.getUsername() | async }} </h3>

		<form [formGroup]="form">
			<mat-form-field appearance="outline">
				<mat-label> Role </mat-label>
				<mat-select>
					<mat-option *ngFor="let role of roles | async">
						<span [style.color]="role.getHexColor() | async"> {{ role.getName() | async }} </span>
					</mat-option>
				</mat-select>
			</mat-form-field>
		</form>
	`
})

export class UserRoleDialogComponent implements OnInit, OnDestroy {
	form = new FormGroup({
		role: new FormControl('', [Validators.required]),
		reason: new FormControl('')
	});

	roles = new Subject<RoleStructure[]>();

	constructor(
		private dataService: DataService,
		public dialogRef: MatDialogRef<UserRoleDialogComponent, UserRoleDialogComponent.Data>,
		@Inject(MAT_DIALOG_DATA) public data: UserRoleDialogComponent.Data
	) { }

	ngOnInit(): void {
		const roles = this.dataService.getAll('role');
		if (roles.length > 0) {
			this.roles.next(roles);
		}
	}

	ngOnDestroy(): void {
		this.roles.complete();
	}
}

export namespace UserRoleDialogComponent {
	export interface Data {
		user: UserStructure;
	}
}
