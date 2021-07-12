import { BitField } from '@typings/src/BitField';
import { Constants } from '@typings/src/Constants';
import { DataStructure } from '@typings/typings/DataStructure';
import { EMPTY, from, iif, Observable, of, throwError } from 'rxjs';
import { defaultIfEmpty, filter, map, mapTo, mergeAll, switchMap, take, tap } from 'rxjs/operators';
import { AppInjector } from 'src/app/service/app.injector';
import { DataService } from 'src/app/service/data.service';
import { RestService } from 'src/app/service/rest.service';
import { Structure } from 'src/app/util/abstract.structure';
import { AuditLogEntry } from 'src/app/util/audit.structure';
import { UserStructure } from 'src/app/util/user.structure';
import { environment } from 'src/environments/environment';

export class EmoteStructure extends Structure<'emote'> {
	private id = '';
	restService: RestService | null = null;

	constructor(dataService: DataService) {
		super(dataService);
	}

	/**
	 * Add data to this emote
	 */
	pushData(data: DataStructure.Emote): EmoteStructure {
		this.id = String(data?.id);
		this.data.next(data);

		if (!!data?.owner) {
			this.dataService.add('user', data.owner);
		}
		if (Array.isArray(data?.channels)) {
			this.dataService.add('user', ...data.channels as DataStructure.TwitchUser[]);
		}

		return this;
	}

	mergeData(data: Partial<DataStructure.Emote>): EmoteStructure {
		const d = { ...this.getSnapshot(), ...data } as DataStructure.Emote;

		return this.pushData(d);
	}

	getID(): string { return this.id; }

	getName(): Observable<string | undefined> {
		return this.dataOnce().pipe(
			take(1),
			map(d => d?.name)
		);
	}

	getOwnerID(): Observable<string | undefined> {
		return this.dataOnce().pipe(
			take(1),
			map(d => !!d?.owner ? String(d.owner) : undefined)
		);
	}

	getOwnerName(): Observable<string> {
		return this.dataOnce().pipe(
			take(1),
			map(d => d?.owner?.display_name ?? '')
		);
	}

	getOwner(): Observable<UserStructure | undefined> {
		return this.dataOnce().pipe(
			take(1),
			map(d => !!d?.owner ? this.dataService.get('user', d.owner as DataStructure.TwitchUser)[0] : undefined)
		);
	}

	getChannels(): Observable<UserStructure[]> {
		return this.dataOnce().pipe(
			take(1),
			map(d => {
				const users = [] as UserStructure[];
				for (const ch of d?.channels ?? []) {
					const found = this.dataService.get('user', ch);
					users.push(...found);
				}

				return users;
			})
		);
	}

	getChannelCount(): Observable<number> {
		return this.dataOnce().pipe(
			map(d => d?.channel_count ?? 0)
		);
	}

	getURL(size = 3): Observable<string | undefined> {
		return this.dataOnce().pipe(
			take(1),
			map(() => `${environment.cdnUrl}/emote/${this.id}/${size}x`)
		);
	}

	getTags(): Observable<string[] | undefined> {
		return this.dataOnce().pipe(
			take(1),
			map(d => d?.tags)
		);
	}

	getStatus(): Observable<Constants.Emotes.Status | undefined> {
		return this.dataOnce().pipe(
			take(1),
			map(d => d?.status)
		);
	}

	getStatusName(): Observable<(keyof typeof Constants.Emotes.Status) | undefined> {
		return this.getStatus().pipe(
			take(1),
			map(status => !!status ? Constants.Emotes.Status[status] as (keyof typeof Constants.Emotes.Status) : undefined)
		);
	}

	/**
	 * Get the emote's alias, per the client user or the user they are editing
	 */
	getAlias(): Observable<string> {
		const client = this.getRestService()?.clientService;
		if (!client) {
			return of('');
		}

		return of(client.isImpersonating).pipe(
			switchMap(isEditor => iif(() => isEditor === true,
				client.impersonating.pipe(take(1)),
				of(client)
			)),
			map(usr => usr as UserStructure),
			switchMap(usr => from(usr.getEmoteAliases())),
			mergeAll(),
			filter(alias => alias.emoteID === this.id),
			map(alias => alias.name),
			defaultIfEmpty('')
		);
	}

	/**
	 * Whether or not the emote is deleted
	 */
	isDeleted(): Observable<boolean> {
		return this.getStatus().pipe(
			map(s => s === Constants.Emotes.Status.DELETED)
		);
	}

	/**
	 * Whether or not the emote is private
	 */
	isPrivate(): Observable<boolean> {
		return this.hasVisibility('PRIVATE');
	}

	/**
	 * Whether or not the emote is unlisted
	 */
	isUnlisted(): Observable<boolean> {
		return this.hasVisibility('HIDDEN');
	}

	/**
	 * Whether or not the emote is global
	 */
	isGlobal(): Observable<boolean> {
		return this.hasVisibility('GLOBAL');
	}

	getAuditActivity(): Observable<AuditLogEntry> {
		return this.dataOnce().pipe(
			take(1),
			switchMap(emote => emote?.audit_entries ?? []),
			map(e => this.dataService.add('audit', e)[0])
		);
	}

	getAuditActivityString(): Observable<string> {
		return this.dataOnce().pipe(
			take(1),
			map(emote => (emote?.audit_entries as unknown as string[] ?? []) as string[]),
			mergeAll(),
			filter(entry => typeof entry === 'string')
		);
	}

	/**
	 * Whether a given user can edit this emote
	 */
	canEdit(user: UserStructure): Observable<boolean> {
		return this.getOwner().pipe(
			take(1),
			map(owner => (!!owner?.id && !!user?.id) ? owner.id === user.id : false),
			switchMap(ok => iif(() => ok,
				of(true),
				user.hasPermission('EDIT_EMOTE_ALL')
			))
		);
	}

	/**
	 * Edit this emote with new data, creating a mutation request to the API
	 *
	 * @param data the new emote data
	 * @param reason the reason for the action, which will be added with the audit log entry
	 */
	edit(data: Partial<DataStructure.Emote>, reason?: string, extraFields?: string[]): Observable<EmoteStructure> {
		return this.getRestService().v2.EditEmote({ id: this.id as string, ...data }, reason, extraFields).pipe(
			tap(res => this.mergeData(res.emote)),
			mapTo(this)
		);
	}

	/**
	 * Check whether the emote has a visibility flag
	 *
	 * @param flag the bit flag to test for
	 */
	hasVisibility(flag: keyof typeof DataStructure.Emote.Visibility): Observable<boolean> {
		return this.data.pipe(
			take(1),
			map(d => BitField.HasBits(d?.visibility ?? 0, DataStructure.Emote.Visibility[flag]))
		);
	}

	getVisibility(): number {
		return this.data.getValue()?.visibility ?? 0;
	}

	getVisibilities(): (keyof typeof DataStructure.Emote.Visibility)[] {
		const result = [] as (keyof typeof DataStructure.Emote.Visibility)[];

		const current = this.getVisibility();
		for (const v of Object.keys(DataStructure.Emote.Visibility)) {
			if (typeof v === 'number') continue;
			const sum = Number(DataStructure.Emote.Visibility[v as unknown as DataStructure.Emote.Visibility]);
			if (isNaN(sum)) continue;

			if (BitField.HasBits(current, sum)) {
				result.push(v as unknown as keyof typeof DataStructure.Emote.Visibility);
			}
		}
		return result;
	}

	getCreatedAt(): Observable<Date | null> {
		return this.data.pipe(
			take(1),
			map(d => !!d?.created_at ? new Date(d.created_at) : null)
		);
	}

	/**
	 * Add this emote to the client user's channel
	 */
	addToChannel(user: UserStructure, reason?: string): Observable<void> {
		if (!this.id) return EMPTY;

		return this.getRestService().v2.AddChannelEmote(this.id, user.id, reason).pipe(
			tap(res => {
				const newIDs = res.user.emote_ids as string[];
				user.pushData({ id: user.id, emote_ids: newIDs } as DataStructure.TwitchUser);
			}),
			mapTo(undefined)
		);
	}

	/**
	 * Remove this emote from the client user's channel
	 */
	removeFromChannel(user: UserStructure, reason?: string): Observable<void> {
		if (!this.id) return EMPTY;

		return this.getRestService().v2.RemoveChannelEmote(this.id, user.id, reason).pipe(
			tap(res => {
				const newIDs = res.user.emote_ids;
				user.pushData({ id: user.id, emote_ids: newIDs } as DataStructure.TwitchUser);
			}),
			mapTo(undefined)
		);
	}

	/**
	 * Whether or not the emote is added to the client user's channel
	 */
	isChannel(): Observable<boolean> {
		const rest = this.getRestService();

		return !!rest ? rest.clientService.getActorUser().pipe(
			switchMap(usr => usr.hasEmote(this.id)),
			take(1)
		) : of(false);
	}

	/**
	 * Delete this emote
	 */
	delete(reason?: string): Observable<void> {
		if (!this.id) return throwError(Error('Cannot delete unknown emote'));

		return this.getRestService().v2.DeleteEmote(this.id, reason).pipe(
			mapTo(undefined)
		);
	}

	// tslint:disable-next-line:typedef
	protected dataOnce() {
		return this.data.asObservable().pipe(
			take(1)
		);
	}

	get width(): number[] {
		return this.getSnapshot()?.width ?? [0, 0, 0, 0];
	}

	get height(): number[] {
		return this.getSnapshot()?.height ?? [0, 0, 0, 0];
	}

	getSnapshot(): DataStructure.Emote | null {
		return this.data.getValue();
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
