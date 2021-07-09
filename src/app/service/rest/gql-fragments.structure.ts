

export namespace GQLFragments {
	export const FullEmote = (includeActivity = false) => `
		fragment FullEmote on Emote {
			id,
			created_at,
			name,
			width, height,
			channel_count,
			channels {
				id, login, display_name, role {
					id, name, color, allowed, denied, position
				}, profile_image_url
			},
			owner {
				id,
				display_name, created_at, profile_image_url,
				role {
					id, name, color, allowed, denied, position
				}
			},
			visibility,
			mime,
			status,
			tags,
			${includeActivity ? `audit_entries { ${ShorthandAudit()} }` : ''}
		}
	`;

	export const ShorthandPartialUser = () => `
		id, display_name, login,
		role { id, name, position, color, allowed, denied },
		profile_image_url,
		emote_ids
	`;

	export const ShortHandRole = () => `
		role {
			id, name, color, allowed, denied, position
		}
	`;

	export const ShorthandAudit = () => `
		id,
		type,
		timestamp,
		action_user_id,
		action_user {
			${ShorthandPartialUser()}
		},
		changes {
			key, values
		},
		target {
			type,
			data,
			id
		},
		reason
	`;

	export const FullUser = (
		includeFullEmotes = false,
		includeOwnedEmotes = false,
		includeEditors = false,
		includeEditorIn = false,
		includeAuditEntries = false,
		includeStreamData = false
	) => `
		fragment FullUser on User {
			id,  email, display_name, login,
			description,
			role {
				id,
				name,
				position,
				color,
				allowed,
				denied
			},
			emote_aliases,
			${includeFullEmotes
				? 'emotes { id, name, status, visibility, width, height },'
				: ''
			}
			${includeOwnedEmotes
				? 'owned_emotes { id, name, status, visibility, width, height },'
				: ''
			}
			emote_ids,
			editor_ids,
			${includeEditors
				? `editors { ${ShorthandPartialUser()} },`
				: ''
			}
			${includeEditorIn
				? `editor_in { ${ShorthandPartialUser()} },`
				: ''
			}
			${includeStreamData
				? `
					follower_count,
					broadcast {
						type,
						title,
						game_name,
						viewer_count,
					},`
				: ''
			}
			twitch_id,
			broadcaster_type,
			profile_image_url,
			created_at,
			emote_slots,
			${includeAuditEntries ? `audit_entries { ${ShorthandAudit()} }`  : ''}
		}
	`;
}

