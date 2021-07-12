import { HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RestService } from 'src/app/service/rest.service';

export class GraphQL {
	constructor(private restService: RestService) { }

	public query<T>(options: GraphQL.QueryOptions & GraphQL.WithVar): Observable<HttpResponse<GraphQL.QueryResult<T>> | null> {
		return this.restService.createRequest<GraphQL.QueryResult<T>>('post', '/gql', {
			body: {
				query: options.query.replace(/\s{2,}/g, ''),
				variables: options.variables
			},
			auth: options.auth,
			runOnSSR: options.runOnSSR
		}, 'v2').pipe(
			RestService.onlyResponse()
		);
	}
}

export namespace GraphQL {
	export interface QueryOptions {
		query: string;
		auth?: boolean;
		variables?: { [key: string]: any };
		runOnSSR?: boolean;
	}
	export interface QueryResult<T> {
		data: T;
	}

	export interface MutationOptions {
		mutation: string;
	}

	export type WithVar = { [key: string]: any; };
}
