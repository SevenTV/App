

import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { ClientService } from 'src/app/service/client.service';
import { DataService } from 'src/app/service/data.service';
import { RoleStructure } from 'src/app/util/role.structure';
import { UserStructure } from 'src/app/util/user.structure';

@Component({
	selector: 'app-user-role-dialog',
	template: `
		<h3 mat-dialog-title> Change {{ data.user.getUsername() | async }}'s Role </h3>

		<form [formGroup]="form" mat-dialog-content>
			<mat-form-field appearance="outline">
				<mat-label> Role </mat-label>
				<mat-select formControlName="role">
					<mat-option *ngFor="let role of roles | async" [value]="role" [class.d-none]="(editable(role) | async) === false || (role.getName() | async) == ''">
						<span [style.color]="role.getHexColor() | async"> {{ (role.getName() | async) || 'No Role' }} </span>
					</mat-option>
				</mat-select>
			</mat-form-field>
		</form>

		<div mat-dialog-actions>
			<button mat-stroked-button color="accent" [mat-dialog-close]="form.get('role')?.value?.id">
				SET ROLE
			</button>

			<button mat-stroked-button color="warn" [mat-dialog-close]="''">
				REVOKE ROLE
			</button>

			<button mat-flat-button mat-dialog-close>
				CANCEL
			</button>
		</div>
	`
})

export class UserRoleDialogComponent implements OnInit, OnDestroy {
	form = new FormGroup({
		role: new FormControl('', [Validators.required]),
		reason: new FormControl('')
	});

	roles = new BehaviorSubject<RoleStructure[]>([]);

	constructor(
		private dataService: DataService,
		private clientService: ClientService,
		public dialogRef: MatDialogRef<UserRoleDialogComponent, UserRoleDialogComponent.Data>,
		@Inject(MAT_DIALOG_DATA) public data: UserRoleDialogComponent.Data
	) { }

	editable(role: RoleStructure): Observable<boolean> {
		return this.clientService.getRole().pipe(
			map(clientRole => clientRole.getPosition() > role.getPosition())
		);
	}

	ngOnInit(): void {
		const roles = this.dataService.getAll('role').sort((a, b) => b.getPosition() - a.getPosition());
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
