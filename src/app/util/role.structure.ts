import { DataStructure } from '@typings/typings/DataStructure';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

export class RoleStructure {
	id: string | undefined;
	private data = new BehaviorSubject<DataStructure.Role | (null | undefined)>(undefined);

	constructor() {

	}


	/**
	 * Add data to this emote
	 */
	 pushData(data: DataStructure.Role | (null | undefined)): RoleStructure {
		this.id = String(data?.id);
		this.data.next(data);

		return this;
	}

	getName(): Observable<string> {
		return this.data.pipe(
			take(1),
			map(d => d?.name ?? '')
		);
	}

	getColor(): Observable<number> {
		return this.data.pipe(
			take(1),
			map(d => d?.color ?? 0)
		);
	}

	getHexColor(): Observable<string> {
		return this.getColor().pipe(
			take(1),
			map(c => `#${c.toString(16)}`)
		);
	}

	getAllowed(): Observable<bigint> {
		return this.data.pipe(
			take(1),
			map(d => BigInt(String(d?.allowed ?? 0)))
		);
	}

	getPosition(): number {
		return this.data.getValue()?.position ?? 0;
	}

	getSnapshot(): DataStructure.Role | null | undefined {
		return this.data.getValue();
	}
}
