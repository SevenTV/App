import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Constants } from '@typings/src/Constants';
import { Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { ThemingService } from 'src/app/service/theming.service';
import { EmoteStructure } from 'src/app/util/emote.structure';

@Component({
	selector: 'app-emote-merge-dialog',
	template: `
		<h3 mat-dialog-title>Merge {{data.emote.getName() | async}} </h3>

		<form [formGroup]="form" mat-dialog-content class="d-flex flex-column">
			<p>
				This will merge {{data.emote.getName() | async}} into another emote.
				Channels who enabled this emote will be moved over to the new one, alongside any alias they set.
				<span class="text-danger">This emote will be deleted, merging is a destructive action and cannot be fully undone.</span>
			</p>

			<mat-form-field appearance="outline">
				<mat-label>Merge Into (New Emote ID)</mat-label>
				<input formControlName="merge_into" matInput cdkFocusInitial [value]="data.emote.getName() | async">
			</mat-form-field>

			<mat-form-field appearance="outline">
				<mat-label>Reason</mat-label>
				<input formControlName="reason" matInput>
			</mat-form-field>
		</form>

		<div mat-dialog-actions>
			<button [disabled]="!form.valid || form.value === originalValue" mat-button color="warn" (click)="confirm()">CONFIRM MERGE</button>
			<button mat-button [mat-dialog-close]="null">CANCEL</button>
		</div>
	`
})

export class EmoteMergeDialogComponent implements OnInit, OnDestroy {
	destroyed = new Subject<void>().pipe(take(1)) as Subject<void>;
	form = new FormGroup({
		merge_into: new FormControl('', [Validators.required, Validators.minLength(24), Validators.maxLength(24)]),
		reason: new FormControl('', [Validators.required])
	});
	originalValue = '';

	constructor(
		public dialogRef: MatDialogRef<EmoteMergeDialogComponent, EmoteMergeDialogComponent.Output>,
		public themingService: ThemingService,
		@Inject(MAT_DIALOG_DATA) public data: EmoteMergeDialogComponent.Data
	) { }

	confirm(): void {
		this.dialogRef.close({
			id: this.form.get('merge_into')?.value as string,
			reason: this.form.get('reason')?.value as string
		});
	}

	ngOnInit(): void {}

	ngOnDestroy(): void { this.destroyed.next(); }
}

export namespace EmoteMergeDialogComponent {
	export interface Data {
		emote: EmoteStructure;
	}

	export interface Output {
		id: string;
		reason: string;
	}
}
