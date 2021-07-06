import { NgModule } from '@angular/core';

// Import angular material
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatNativeDateModule, MatRippleModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatRadioModule } from '@angular/material/radio';
import { ColorDirective } from 'src/app/directive/color.directive';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSelectModule } from '@angular/material/select';
import { MatBadgeModule } from '@angular/material/badge';

const modules = [
	MatToolbarModule,
	MatRippleModule,
	MatIconModule,
	MatTooltipModule,
	MatButtonModule,
	MatDividerModule,
	MatFormFieldModule,
	MatInputModule,
	MatCheckboxModule,
	MatProgressSpinnerModule,
	MatProgressBarModule,
	MatPaginatorModule,
	MatDialogModule,
	MatMenuModule,
	MatRadioModule,
	MatDatepickerModule,
	MatNativeDateModule,
	MatExpansionModule,
	MatSelectModule,
	MatBadgeModule
];

@NgModule({
	declarations: [
		ColorDirective
	],
	imports: [...modules],
	exports: [
		...modules,
		ColorDirective
	]
})

export class MaterialModule { }
