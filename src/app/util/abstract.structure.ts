import { BehaviorSubject } from 'rxjs';
import type { DataService } from 'src/app/service/data.service';

export abstract class Structure<T extends DataService.StructureType> {
	protected pushed = false;
	protected data = new BehaviorSubject<DataService.StructureData<T> | null>(null) as BehaviorSubject<DataService.StructureData<T> | null>;
	protected snapshot: Partial<DataService.StructureData<T>> | null = null;

	constructor(protected dataService: DataService) {}

	abstract pushData(data: DataService.StructureData<T>): DataService.Structure<T>;
	abstract getSnapshot(): DataService.StructureData<T> | null;
}

export namespace Structure {
	export interface Data {
		id: string;
	}

	export function toDot(obj: any, target: any, prefix?: string): any {
		target = target || {};
		prefix = prefix || '';

		Object.keys(obj).forEach((key) => {
			if (typeof (obj[key]) === 'object' && obj[key] !== null) {
				toDot(obj[key], target, prefix + key + '.');
			} else {
				return target[prefix + key] = obj[key];
			}
		});

		return target;
	}
}
