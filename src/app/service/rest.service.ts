import { HttpClient, HttpHeaders, HttpProgressEvent, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DataStructure } from '@typings/typings/DataStructure';
import { iif, Observable, of } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';
import { ClientService } from 'src/app/service/client.service';
import { environment } from 'src/environments/environment';

@Injectable({
	providedIn: 'root'
})
export class RestService {
	private BASE = environment.apiUrl;
	private CDN_BASE = environment.cdnUrl;

	constructor(
		private httpService: HttpClient,
		private clientService: ClientService
	) { }

	// tslint:disable:typedef
	get Auth() {
		return {
			GetURL: () => this.createRequest<RestService.Result.GetURLResult>('get', '/auth', { auth: false })
		};
	}

	get Users() {
		return {
			GetCurrent: () => this.createRequest<DataStructure.TwitchUser>('get', '/users/@me', { auth: true })
		};
	}

	get Emotes() {
		return {
			List: (page = 1, pageSize = 16) =>
				this.createRequest<{ emotes: DataStructure.Emote[]; total_estimated_size: number; }>('get', `/emotes?page=${page}&pageSize=${pageSize}`, { auth: true }),
			Get: (id: string) => this.createRequest<DataStructure.Emote>('get', `/emotes/${id}`),
			Upload: (data: FormData, length: number) => this.createRequest<DataStructure.Emote>('post', '/emotes', {
				body: data,
				auth: true
			}),
			Edit: (id: string, body: any) => this.createRequest<DataStructure.Emote>('patch', `/emotes/${id}`, {
				auth: true,
				body
			}),
			Delete: (id: string) => this.createRequest<void>('delete', `/emotes/${id}`, { auth: true })
		};
	}

	get CDN() {
		return {
			Emote: (id: string, size: number) => `${this.CDN_BASE}/emote/${id}/${size}x`
		};
	}
	// tslint:enable:typedef

	private createRequest<T>(method: RestService.Method, route: string, options?: Partial<RestService.CreateRequestOptions>): Observable<HttpResponse<T> | HttpProgressEvent> {
		const uri = this.BASE + route;
		const opt = {
			observe: 'events',
			headers: {
				...(options?.headers ?? {}),
				Authorization: (options?.auth && this.clientService.getToken()?.length > 0) ? `Bearer ${this.clientService.getToken()}` : ''
			},
			reportProgress: true
		} as any;

		return of(method).pipe(
			switchMap(m => iif(() => (m === 'get') || (m === 'delete'),
				this.httpService[m](uri, opt),
				this.httpService[m as RestService.BodyMethod](uri, options?.body ?? {}, opt)
			))
		).pipe(map((x: any) => x as (HttpResponse<T> | HttpProgressEvent)));
	}
}

export namespace RestService {
	export type Method = 'get' | 'patch' | 'post' | 'put' | 'delete';
	export type BodyMethod = 'patch' | 'post' | 'put';

	export const onlyResponse = () => <T>(source: Observable<HttpResponse<T> | HttpProgressEvent>) => source.pipe(
		filter(x => x instanceof HttpResponse)
	) as Observable<HttpResponse<T>>;

	export interface CreateRequestOptions {
		headers: { [key: string]: string };
		auth: boolean;
		body?: any;
	}

	export namespace Result {
		/** GET /auth  */
		export interface GetURLResult {
			url?: string;
		}
	}
}