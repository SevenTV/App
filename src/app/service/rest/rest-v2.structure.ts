import { HttpErrorResponse, HttpProgressEvent, HttpResponse } from '@angular/common/http';
import { DataStructure } from '@typings/typings/DataStructure';
import { Observable } from 'rxjs';
import { map, mapTo } from 'rxjs/operators';
import { RestService } from 'src/app/service/rest.service';
import { GQLFragments } from 'src/app/service/rest/gql-fragments.structure';
import { GraphQL } from 'src/app/service/rest/graphql.structure';

export class RestV2 {
	gql = new GraphQL(this.restService);

	constructor(private restService: RestService) {

	}

	GetUser(id: string, opt?: Partial<RestV2.GetUserOptions>, extraFields?: string[]): Observable<{ user: DataStructure.TwitchUser }> {
		return this.gql.query<{ user: DataStructure.TwitchUser }>({
			query: `
				query GetUser($id: String!) {
					user(id: $id) {
						...FullUser,
						${Array.isArray(extraFields) && extraFields.length > 0
							? ', ' + extraFields.join(', ')
							: ''}
					}
				}

				${GQLFragments.FullUser(opt?.includeFullEmotes, opt?.includeOwnedEmotes, opt?.includeEditors, opt?.includeEditorIn, opt?.includeAuditLogs, opt?.includeStreamData)}
			`,
			variables: {
				id
			},
			auth: true
		}).pipe(
			map(res => ({
				user: res?.body?.data.user as DataStructure.TwitchUser
			}))
		);
	}

	SearchEmotes(page = 1, pageSize = 16, options?: Partial<RestV2.GetEmotesOptions>): Observable<{ emotes: DataStructure.Emote[]; total_estimated_size: number; }> {
		return this.gql.query<{ search_emotes: DataStructure.Emote[] }>({
			query: `
				{
					search_emotes(
						query: "${options?.query ?? ''}",
						limit: ${pageSize},
						page: ${page},
						pageSize: ${pageSize}
						${(options?.globalState && `, globalState: "${options.globalState}"`) ?? ''}
						${(options?.sortBy && `, sortBy: "${options.sortBy}"`) ?? ''}
						${typeof options?.sortOrder === 'number' ? `, sortOrder: ${options.sortOrder}` : ''}
						${(options?.channel && `, channel: "${options.channel}"`) ?? ''}
						${(options?.filter && `, filter: {
							visibility: ${options.filter.visibility}
						}`) ?? ''}
					) {
						id,
						visibility,
						owner {
							id,
							display_name,
							role {
								id,
								name,
								color
							},
							banned
						}
						name
					}
				}
			`,
			auth: true
		}).pipe(
			map(res => ({
				emotes: res?.body?.data.search_emotes ?? [],
				total_estimated_size: Number(res?.headers.get('x-collection-size'))
			}))
		);
	}

	SearchUsers(query = ''): Observable<{ users: DataStructure.TwitchUser[], total_size: number; }> {
		return this.gql.query<{ search_users: DataStructure.TwitchUser[]; }>({
			query: `
				query SearchUsers($query: String!) {
					search_users(query: $query) {
						id, login, display_name,
						twitch_id,
						profile_image_url,
						created_at,
						role {
							id,
							name,
							color
						}
					}
				}
			`,
			variables: {
				query
			},
			auth: true
		}).pipe(
			map(res => {
				return {
					users: res?.body?.data.search_users ?? [],
					total_size: Number(res?.headers.get('x-collection-size'))
				};
			})
		);
	}

	GetEmote(id: string, includeActivity = false, filterFields?: string[]): Observable<{ emote: DataStructure.Emote }> {
		const isFiltered = Array.isArray(filterFields) && filterFields.length > 0;

		return this.gql.query<{ emote: DataStructure.Emote }>({
			query: `
				{
					emote(id: "${id}") {
						${isFiltered
							? (filterFields as string[]).join(', ')
							: '...FullEmote'}
					}
				}

				${isFiltered ? '' : GQLFragments.FullEmote(includeActivity)}
			`,
			auth: true
		}).pipe(
			map(res => ({ emote: res?.body?.data.emote as DataStructure.Emote }))
		);
	}

	EditEmote(data: { id: string } & Partial<DataStructure.Emote>, reason?: string, extraFields?: string[]): Observable<{ emote: DataStructure.Emote }> {
		return this.gql.query<{ editEmote: DataStructure.Emote }>({
			query: `
				mutation MutateEmote($em: EmoteInput!, $reason: String!) {
					editEmote(emote: $em, reason: $reason) {
						${Object.keys(data).join(', ')}
						${Array.isArray(extraFields) && extraFields.length > 0
							? ', ' + extraFields.join(', ')
							: ''}
					}
				}
			`,
			variables: {
				em: data,
				reason: reason ?? ''
			},
			auth: true
		}).pipe(
			map(res => ({ emote: res?.body?.data.editEmote as DataStructure.Emote }))
		);
	}

	CreateEmote(data: FormData): Observable<HttpProgressEvent | HttpResponse<DataStructure.Emote>> {
		return this.restService.createRequest('post', '/emotes', {
			body: data,
			auth: true,
			headers: {
				'ngsw-bypass': ''
			}
		}, 'v2');
	}

	DeleteEmote(emoteID: string, reason?: string): Observable<void> {
		return this.gql.query({
			query: `
				mutation DeleteEmote($em: String!, $reason: String!) {
					deleteEmote(id: $em, reason: $reason) {}
				}
			`,
			variables: {
				em: emoteID,
				reason: reason ?? ''
			},
			auth: true
		}).pipe(
			mapTo(undefined)
		);
	}

	AddChannelEmote(emoteID: string, channelID: string, reason = ''): Observable<{ user: DataStructure.TwitchUser }> {
		return this.gql.query<{ addChannelEmote: DataStructure.TwitchUser }>({
			query: `
				mutation AddChannelEmote($ch: String!, $em: String!, $re: String!) {
					addChannelEmote(channel_id: $ch, emote_id: $em, reason: $re) {
						emote_ids
					}
				}
			`,
			variables: {
				ch: channelID,
				em: emoteID,
				re: reason
			},
			auth: true
		}).pipe(
			map(res => ({
				user: res?.body?.data.addChannelEmote as DataStructure.TwitchUser
			}))
		);
	}

	EditChannelEmote(
		emoteID: string,
		channelID: string,
		data: {
			alias: string;
		},
		reason: string
	): Observable<{ user: DataStructure.TwitchUser }> {
		return this.gql.query<{ editChannelEmote: DataStructure.TwitchUser; }>({
			query: `
				mutation EditChannelEmote($ch: String!, $em: String!, $data: ChannelEmoteInput!, $re: String) {
					editChannelEmote(channel_id: $ch, emote_id: $em, data: $data, reason: $re) {
						id,
						emote_aliases
					}
				}
			`,
			variables: {
				ch: channelID,
				em: emoteID,
				data,
				re: reason
			},
			auth: true
		}).pipe(
			map(res => ({
				user: res?.body?.data.editChannelEmote as DataStructure.TwitchUser
			}))
		);
	}

	RemoveChannelEmote(emoteID: string, channelID: string, reason = ''): Observable<{ user: DataStructure.TwitchUser }> {
		return this.gql.query<{ removeChannelEmote: DataStructure.TwitchUser }>({
			query: `
				mutation RemoveChannelEmote($ch: String!, $em: String!, $re: String!) {
					removeChannelEmote(channel_id: $ch, emote_id: $em, reason: $re) {
						emote_ids
					}
				}
			`,
			variables: {
				ch: channelID,
				em: emoteID,
				re: reason
			},
			auth: true
		}).pipe(
			map(res => ({
				user: res?.body?.data.removeChannelEmote as DataStructure.TwitchUser
			}))
		);
	}

	AddChannelEditor(channelID: string, editorID: string, reason = ''): Observable<{ user: DataStructure.TwitchUser }> {
		return this.gql.query<{ addChannelEditor: DataStructure.TwitchUser }>({
			query: `
				mutation AddChannelEditor($ch: String!, $em: String!, $re: String!) {
					addChannelEditor(channel_id: $ch, editor_id: $em, reason: $re) {
						id,
						editor_ids,
						editors {
							${GQLFragments.ShorthandPartialUser()}
						}
					}
				}
			`,
			variables: {
				ch: channelID,
				em: editorID,
				re: reason
			},
			auth: true
		}).pipe(
			map(res => ({
				user: res?.body?.data.addChannelEditor as DataStructure.TwitchUser
			}))
		);
	}

	RemoveChannelEditor(channelID: string, editorID: string, reason = ''): Observable<{ user: DataStructure.TwitchUser }> {
		return this.gql.query<{ removeChannelEditor: DataStructure.TwitchUser }>({
			query: `
				mutation RemoveChannelEditor($ch: String!, $em: String!, $re: String!) {
					removeChannelEditor(channel_id: $ch, editor_id: $em, reason: $re) {
						id,
						editor_ids,
						editors {
							${GQLFragments.ShorthandPartialUser()}
						}
					}
				}
			`,
			variables: {
				ch: channelID,
				em: editorID,
				re: reason
			},
			auth: true
		}).pipe(
			map(res => ({
				user: res?.body?.data.removeChannelEditor as DataStructure.TwitchUser
			}))
		);
	}

	MergeEmote(oldEmoteID: string, newEmoteID: string, reason: string): Observable<{ emote: DataStructure.Emote; }> {
		return this.gql.query<{ mergeEmote: DataStructure.Emote; }>({
			query: `
				mutation MergeEmote($old: String!, $new: String!, $reason: String!) {
					mergeEmote(old_id: $old, new_id: $new, reason: $reason) {
						...FullEmote
					}
				}

				${GQLFragments.FullEmote()}
			`,
			variables: {
				old: oldEmoteID,
				new: newEmoteID,
				reason
			},
			auth: true
		}).pipe(
			map(res => ({
				emote: res?.body?.data.mergeEmote as DataStructure.Emote
			}))
		);
	}

	BanUser(victimID: string, expireAt: Date, reason = ''): Observable<void> {
		return this.gql.query<{}>({
			query: `
				mutation BanUser($usr: String!, $ex: String, $rsn: String) {
					banUser(victim_id: $usr, expire_at: $ex, reason: $rsn) {
						status, message
					}
				}
			`,
			variables: {
				usr: victimID,
				ex: expireAt.toISOString(),
				rsn: reason
			},
			auth: true
		}).pipe(mapTo(undefined));
	}

	UnbanUser(victimID: string, reason = ''): Observable<void> {
		return this.gql.query<{}>({
			query: `
				mutation UnbanUser($usr: String!, $rsn: String) {
					unbanUser(victim_id: $usr, reason: $rsn) {
						status, message
					}
				}
			`,
			variables: {
				usr: victimID,
				rsn: reason
			},
			auth: true
		}).pipe(mapTo(undefined));
	}

	GetAuthURL(): string {
		return `${this.restService.BASE.v2}/auth`;
	}
}

export namespace RestV2 {
	type KeysEnum<T> = { [P in keyof Required<T>]: true };
	export const FullUser = {
		id: true, email: true, rank: true,
		editor_ids: true, display_name: true,
		broadcaster_type: true, profile_image_url: true,
		created_at: true
	} as KeysEnum<DataStructure.TwitchUser>;

	export interface GetUserOptions {
		includeEditors: boolean;
		includeEditorIn: boolean;
		includeFullEmotes: boolean;
		includeOwnedEmotes: boolean;
		includeAuditLogs: boolean;
		includeStreamData: boolean;
	}

	export interface GetEmotesOptions {
		query: string;
		channel: string;
		submitter: string;
		globalState: 'only' | 'hide';
		sortBy: 'age' | 'popularity';
		sortOrder: 0 | 1;
		filter: Partial<{
			visibility: number;
			width_range: [number, number];
		}>;
	}

	export interface ErrorGQL extends HttpErrorResponse {
		error: {
			errors: {
				message: string;
				path: string[];
			}[];
		};
	}
}
