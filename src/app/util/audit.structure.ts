import { DataStructure } from '@typings/typings/DataStructure';
import { format } from 'date-fns';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { AppInjector } from 'src/app/service/app.injector';
import { DataService } from 'src/app/service/data.service';
import { RestService } from 'src/app/service/rest.service';
import { Structure } from 'src/app/util/abstract.structure';
import { EmoteStructure } from 'src/app/util/emote.structure';
import { UserStructure } from 'src/app/util/user.structure';

export class AuditLogEntry extends Structure<'audit'> {
	restService: RestService | null = null;

	id = '';
	type = -1;
	actionUser: UserStructure | null = null;
	targetUser: UserStructure | null = null;
	targetEmote: EmoteStructure | null = null;

	actionUserID = '';
	targetType = '';
	targetID = '';

	changes = [] as AuditLogEntry.Change[];

	constructor(dataService: DataService) {
		super(dataService);
	}

	pushData(data: DataStructure.AuditLog.Entry): this {
		this.id = String(data._id);
		this.type = data.type;
		this.actionUserID = data.action_user_id;
		this.targetType = data.target?.type ?? '';
		this.targetID = typeof data.target?.id === 'string' ? data.target.id : '';
		if (Array.isArray(data.changes)) {
			this.changes = [];
			for (const c of data.changes) {
				this.changes.push(new AuditLogEntry.Change(this, c));
			}

		}
		if (!!data.action_user) {
			this.actionUser = this.dataService.add('user', data.action_user)[0];
		}

		if (!!data.target) {
			let tgt: any;
			try {
				tgt = JSON.parse(data.target.data);
			} catch (e) { console.error('Could not parse audit target:', e); }

			if (!!tgt) {
				switch (data.target.type) {
					case 'users':
						this.targetUser = this.dataService.add('user', tgt)[0];
						break;
					case 'emotes':
						this.targetEmote = this.dataService.add('emote', tgt)[0];
						break;
				}
			}
		}

		this.pushed = true;
		this.snapshot = data;
		if (!!data.id) {
			this.data.next(data);
		}
		return this;
	}

	getDescription(): string {
		let value = 'Error: Unknown Action Type';

		switch (this.type) {
			case DataStructure.AuditLog.Entry.Type.EMOTE_CREATE:
				value = 'created this emote';
				break;
			case DataStructure.AuditLog.Entry.Type.EMOTE_EDIT:
				value = 'edited this emote';
				break;
			case DataStructure.AuditLog.Entry.Type.EMOTE_DELETE:
				value = 'deleted this emote';
				break;
			case DataStructure.AuditLog.Entry.Type.USER_CHANNEL_EMOTE_ADD:
				value = `enabled an emote`;
				break;
			case DataStructure.AuditLog.Entry.Type.USER_CHANNEL_EMOTE_REMOVE:
				value = `disabled an emote`;
				break;
			case DataStructure.AuditLog.Entry.Type.USER_CHANNEL_EDITOR_ADD:
				value = 'added a user as an editor';
				break;
			case DataStructure.AuditLog.Entry.Type.USER_CHANNEL_EDITOR_REMOVE:
				value = 'revoked a user\'s editor privileges';
				break;
			case DataStructure.AuditLog.Entry.Type.USER_CHANNEL_EMOTE_EDIT:
				value = 'edited channel emote properties';
				break;
			case DataStructure.AuditLog.Entry.Type.USER_EDIT:
				value = 'edited this user';
				break;
			default:
				break;
		}

		return value;
	}

	resolveUser(id: string): Observable<UserStructure> {
		return this.getRestService().v2.GetUser(id).pipe(
			map(usr => this.dataService.add('user', usr.user)[0])
		);
	}

	private createMention(objectID: string, tag: string): string {
		return `${objectID}=${tag.toUpperCase()}%%`;
	}

	setActionUser(user: UserStructure): this {
		this.actionUser = user;

		return this;
	}

	getActionUser(): UserStructure | null {
		return this.actionUser;
	}

	getTimestamp(): Observable<string> {
		return this.data.pipe(
			map(d => new Date(d?.timestamp ?? Date.now())),
			map(date => format(date, 'dd/MM/yy hh:mm'))
		);
	}
	getReason(): Observable<string> {
		return this.data.pipe(
			map(d => d?.reason ?? '')
		);
	}

	getChanges(): Observable<AuditLogEntry.Change[]> {
		return of(this.changes);
	}

	getSnapshot(): DataStructure.AuditLog.Entry {
		return {} as any;
	}

	getRestService(): RestService {
		if (!this.restService) {
			try {
				this.restService = AppInjector.get(RestService);
			} catch (_) {}
		}

		return this.restService as any;
	}
}

export namespace AuditLogEntry {
	export interface Mention {
		type: string;
		id: string;
	}

	export class Change {
		key = '';
		values: any[] = [];

		constructor(public log: AuditLogEntry, readonly change: DataStructure.AuditLog.Entry.Change) {
			this.key = change.key;

			this.values = [
				JSON.parse(change.values?.[0] || '""'),
				JSON.parse(change.values?.[1] || '""')
			];
		}

		getOldValue(): string {
			return this.values[0];
		}

		getNewValue(): string {
			return this.values[1];
		}
	}

	export const USER_PLACEHODLER = '%%USR';
	export const USER_MENTION = /([0-9a-z]{24})(?==USER%%)/g;

	export const EMOTE_PLACEHOLDER = '%%EMOTE';
	export const EMOTE_MENTION = /([0-9a-z]{24})(?==EMOTE%%)/g;
}
