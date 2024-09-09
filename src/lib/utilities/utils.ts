import { objectValues, pickRandom } from '@sapphire/utilities';

export const random = (max: number) => Math.floor(Math.random() * max);

export function randomEnum<T extends object>(anEnum: T): T[keyof T] {
	return pickRandom(objectValues(anEnum));
}
