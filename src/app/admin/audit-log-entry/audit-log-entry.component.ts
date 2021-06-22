import { Component, Input, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { ClientService } from 'src/app/service/client.service';
import { AuditLogEntry } from 'src/app/util/audit.structure';

@Component({
	selector: 'app-audit-log-entry',
	templateUrl: 'audit-log-entry.component.html',
	styleUrls: ['audit-log-entry.component.scss']
})

export class AuditLogEntryComponent implements OnInit {
	@Input() entry: AuditLogEntry | null = null;

	constructor(
		public clientService: ClientService
	) { }

	hasReason(): Observable<boolean> {
		if (!this.entry) {
			return of(false);
		} else {
			return this.entry.getReason().pipe(
				map(r => r.length > 0)
			);
		}
	}

	ngOnInit(): void {
		if (!this.entry) throw new Error('No Entry Given');
	}
}
