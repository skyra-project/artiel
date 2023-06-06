import type { ImageSize } from '@discordjs/rest';
import { isNullishOrEmpty } from '@sapphire/utilities';
import { container } from '@skyra/http-framework';
import type { APIUser } from 'discord-api-types/v10';

/**
 * Checks whether or not the user uses the new username change, defined by the
 * `discriminator` being `'0'` or in the future, no discriminator at all.
 * @see {@link https://dis.gd/usernames}
 * @param user The user to check.
 */
export function usesPomelo(user: APIUser) {
	return isNullishOrEmpty(user.discriminator) || user.discriminator === '0';
}

export function getAvatar(user: APIUser, size: ImageSize = 128) {
	return user.avatar
		? container.rest.cdn.avatar(user.id, user.avatar, { extension: 'png', forceStatic: true, size })
		: container.rest.cdn.defaultAvatar(usesPomelo(user) ? Number(BigInt(user.id) % 5n) : Number(user.discriminator) % 5);
}

export function getTag(user: APIUser) {
	return usesPomelo(user) ? `@${user.username}` : `${user.username}#${user.discriminator}`;
}
