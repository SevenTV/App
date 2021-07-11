import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { BehaviorSubject, interval, } from 'rxjs';
import { switchMap, take, tap } from 'rxjs/operators';

@Component({
	selector: 'app-update-dialog',
	template: `
		<h1 mat-dialog-title> Update Available </h1>

		<div mat-dialog-content>
			<p>An update for 7tv.app is available. The page will refresh automatically in a few seconds</p>
		</div>

		<div mat-dialog-actions>
			<button mat-raised-button color="accent" [matDialogClose]="true">
				UPDATE ({{ autoSeconds | async }})
			</button>
			<button mat-flat-button [matDialogClose]="false">NOT NOW</button>
		<div>
	`
})

export class UpdateDialogComponent implements OnInit {
	autoSeconds = new BehaviorSubject<number>(AUTO_UPDATE_SECONDS);

	constructor(dialogRef: MatDialogRef<UpdateDialogComponent>) {
		interval(1e3).pipe(
			take(AUTO_UPDATE_SECONDS),
			switchMap(() => this.autoSeconds.pipe(take(1))),
			tap(n => this.autoSeconds.next(n - 1))
		).subscribe({
			complete: () => {
				dialogRef.close(true);
			}
		});
	}

	ngOnInit(): void { }
}

const AUTO_UPDATE_SECONDS = 3;
