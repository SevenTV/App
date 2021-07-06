

import { Injectable } from '@angular/core';
import { DataStructure } from '@typings/typings/DataStructure';
import { Structure as AbstractStructure } from 'src/app/util/abstract.structure';
import { AuditLogEntry } from 'src/app/util/audit.structure';
import { EmoteStructure } from 'src/app/util/emote.structure';
import { NotificationStructure } from 'src/app/util/notification.structure';
import { RoleStructure } from 'src/app/util/role.structure';
import { UserStructure } from 'src/app/util/user.structure';

@Injectable({ providedIn: 'root' })
export class DataService {
	private store = {
		user: new Map<string, UserStructure>(),
		emote: new Map<string, EmoteStructure>(),
		role: new Map<string, RoleStructure>(),
		audit: new Map<string, AuditLogEntry>(),
		notification: new Map<string, NotificationStructure>()
	} as { [key in DataService.StructureType]: Map<string, UserStructure | EmoteStructure | RoleStructure | AuditLogEntry | NotificationStructure> };

	constructor() { }

	/**
	 * Get a cached structure of specified type with a query
	 *
	 * @param type the structure's type
	 * @param query query to find the structure
	 * @returns an observable which will emit instances of structures matching the query
	 */
	get<T extends DataService.StructureType>(type: T, query: Partial<DataService.StructureData<T>>): DataService.Structure<T>[] {
		const store = this.store[type];
		const structs = [] as DataService.Structure<T>[];

		// Find structure by ID if it is specified
		if (typeof query.id === 'string' && store.has(query.id)) {
			structs.push(store.get(query.id) as DataService.Structure<T>);
			return structs; // We stop here because there can never be a structure of one type with the same ID
		}

		// Search for structures matching query
		const q = {} as any;
		AbstractStructure.toDot(query, q);
		const keys = new Set([...Object.keys(q)]) as unknown as Set<(keyof AbstractStructure.Data)>;
		for (const [_, struct] of store) { // Iterate structures of type*
			const s = {} as any;
			AbstractStructure.toDot(struct.getSnapshot(), s);

			for (const k of keys.values()) { // For each structure iterate over keys
				const snapshot = struct.getSnapshot();
				if (!snapshot) continue;
				if (s[k] === q[k]) {
					structs.push(struct as DataService.Structure<T>);
				}
			}
		}

		return structs;
	}

	getAll<T extends DataService.StructureType>(type: T, limit?: number): DataService.Structure<T>[] {
		const store = this.store[type];
		const structs = [] as DataService.Structure<T>[];

		let index = 0;
		for (const [_, struct] of store) {
			if (typeof limit === 'number' && index > limit) {
				break;
			}

			structs.push(struct as DataService.Structure<T>);
			index++;
		}

		return structs;
	}

	/**
	 * Create a new Structure from given data
	 *
	 * @param type the structure's type
	 * @param data the data of this structure
	 * @returns an array of structures created
	 */
	add<T extends DataService.StructureType>(type: T, ...data: DataService.StructureData<T>[]): DataService.Structure<T>[] {
		const store = this.store[type];
		const structs = [] as DataService.Structure<T>[];

		for (const d of data) {
			if (!d?.id) {
				continue;
			}

			let struct = store.get(d.id);
			if (!struct) {
				const S = DataService.StructureClass[type];
				struct = new S(this);
			}

			struct.pushData(d as any);
			if (!store.has(d.id)) store.set(d.id, struct);
			structs.push(struct as DataService.Structure<T>);
		}

		return structs;
	}
}

export namespace DataService {
	export type StructureType = 'user' | 'emote' | 'role' | 'audit' | 'notification';

	export type Structure<T extends StructureType> = {
		user: UserStructure;
		emote: EmoteStructure;
		role: RoleStructure;
		audit: AuditLogEntry;
		notification: NotificationStructure;
	}[T];

	export type StructureData<T extends StructureType> = {
		user: DataStructure.TwitchUser;
		emote: DataStructure.Emote;
		role: DataStructure.Role;
		audit: DataStructure.AuditLog.Entry;
		notification: DataStructure.Notification;
	}[T];

	export const StructureClass = {
		user: UserStructure,
		emote: EmoteStructure,
		role: RoleStructure,
		audit: AuditLogEntry,
		notification: NotificationStructure
	};
}
