import { DataStructure } from '@typings/typings/DataStructure';
import { Structure } from 'src/app/util/abstract.structure';

export class NotificationStructure extends Structure<'notification'> {
	id = '';

	pushData(data: DataStructure.Notification): this {
		if (!data) {
			return this;
		}

		if (typeof data.id === 'string') {
			this.id = data.id;
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

	getSnapshot(): any {
		return undefined;
	}
}

export namespace NotificationStructure {

}
