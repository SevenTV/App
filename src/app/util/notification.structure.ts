import { DataStructure } from '@typings/typings/DataStructure';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { DataService } from 'src/app/service/data.service';
import { Structure } from 'src/app/util/abstract.structure';
import { EmoteStructure } from 'src/app/util/emote.structure';
import { UserStructure } from 'src/app/util/user.structure';

export class NotificationStructure extends Structure<'notification'> {
	id = '';
	parts = [] as NotificationStructure.MessagePart[];

	pushData(data: DataStructure.Notification): this {
		if (!data) {
			return this;
		}

		if (typeof data.id === 'string') {
			this.id = data.id;
		}

		// Cache users in the notification data
		if (Array.isArray(data.users) && data.users.length > 0) {
			this.dataService.add('user', ...data.users);
		}
		// Cache emotes in the notification data
		if (Array.isArray(data.emotes) && data.emotes.length > 0) {
			this.dataService.add('emote', ...data.emotes);
		}

		// Add notification parts
		if (Array.isArray(data.message_parts) && data.message_parts.length > 0) {
			this.parts = [];
			for (const p of data.message_parts) {
				this.parts.push(new NotificationStructure.MessagePart(p, this.dataService));
			}
		}

		const newData = { ...this.data.getValue() } as DataStructure.Notification;
		for (const k of Object.keys(data)) {
			const key = k as keyof DataStructure.Notification;

			(newData as any)[key as any] = data[key];
		}

		this.snapshot = data;
		if (!!data.id) {
			this.data.next(newData);
		}
		return this;
	}

	getTitle(): Observable<string> {
		return this.data.pipe(
			take(1),
			map(d => d?.title ?? '')
		);
	}

	getTimestamp(): Observable<Date> {
		return this.data.pipe(
			take(1),
			map(d => !!d?.timestamp ? new Date(d.timestamp) : new Date())
		);
	}

	isRead(): Observable<boolean> {
		return this.data.pipe(
			take(1),
			map(d => d?.read ?? false)
		);
	}

	getSnapshot(): any {
		return undefined;
	}
}

export namespace NotificationStructure {
	export class MessagePart {
		constructor(
			private data: DataStructure.Notification.MessagePart,
			private dataService: DataService
		) {

		}

		/**
		 * Whether the part type is text
		 */
		isText(): boolean {
			return this.data.type === DataStructure.Notification.MessagePartType.TEXT;
		}

		/**
		 * Whether the part type mentions a user
		 */
		isUserMention(): boolean {
			return this.data.type === DataStructure.Notification.MessagePartType.USER_MENTION;
		}

		/**
		 * Whether the part type mentions an emote
		 */
		isEmoteMention(): boolean {
			return this.data.type === DataStructure.Notification.MessagePartType.EMOTE_MENTION;
		}

		getText(): string {
			return this.data.data ?? '';
		}

		/**
		 * Get the mentioned user
		 */
		getUser(): UserStructure {
			return this.dataService.get('user', { id: this.data.data as string })[0];
		}

		/**
		 * Get the mentioned emote
		 */
		getEmote(): EmoteStructure {
			return this.dataService.get('emote', { id: this.data.data as string })[0];
		}
	}
}
