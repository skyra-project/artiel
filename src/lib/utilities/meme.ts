import { PathSrc } from '#lib/common/constants';
import { Collection } from '@discordjs/collection';
import { cutText } from '@sapphire/utilities';
import { envParseString } from '@skyra/env-utilities';
import { container } from '@skyra/http-framework';
import { Json, safeFetch } from '@skyra/safe-fetch';
import type { APIApplicationCommandOptionChoice } from 'discord-api-types/v10';
import { readFile } from 'node:fs/promises';

let MinimumLength = 100;
let MaximumLength = 0;
const entries = new Collection<string, Entry>();
{
	let rawEntries: readonly Entry[];
	try {
		const url = new URL('https://memes.skyra.pw/api/entries');
		url.searchParams.append('limit', '1000');
		const result = await Json<Entry[]>(safeFetch(url, { headers: { authorization: envParseString('MEME_TEMPLATE_DATABASE_TOKEN') } }));
		rawEntries = result.unwrap();
		container.logger.debug(`Successfully downloaded ${rawEntries.length} from the database.`);
	} catch {
		const PathFile = new URL('./generated/data/memes.json', PathSrc);
		rawEntries = JSON.parse(await readFile(PathFile, 'utf8')) as Entry[];
		container.logger.debug(`Successfully loaded ${rawEntries.length} from the local fallback.`);
	}

	for (const entry of rawEntries) {
		entries.set(entry.name.toLocaleLowerCase(), entry);
		if (entry.name.length > MaximumLength) MaximumLength = entry.name.length;
		if (entry.name.length < MinimumLength) MinimumLength = entry.name.length;
	}
}

const defaults = entries.first(25).map((value) => ({ score: 1, value }) satisfies MemeSearchResult);

export function getMinimumMemeNameLength() {
	return MinimumLength;
}

export function getMaximumMemeNameLength() {
	return MaximumLength;
}

export function getMeme(name: string) {
	return entries.get(name.toLowerCase()) ?? null;
}

export async function increaseUseCount(name: string) {
	const url = new URL(name, 'https://memes.skyra.pw/api/entries/');
	const result = await Json<{ uses: number }>(
		safeFetch(url, { method: 'PUT', headers: { authorization: envParseString('MEME_TEMPLATE_DATABASE_TOKEN', '') } })
	);
	result.inspectErr((error) => container.logger.error(`[MEME] Failed to update ${name}'s usage count`, error));
}

export function searchMeme(name: string): readonly MemeSearchResult[] {
	if (name.length === 0) return defaults;
	if (name.length > MaximumLength) return [];

	name = name.toLowerCase();
	const results = [] as MemeSearchResult[];
	for (const [key, value] of entries.entries()) {
		const score = getSearchScore(name, key);
		if (score !== 0) results.push({ score, value });
	}

	return results.sort((a, b) => b.score - a.score).slice(0, 25);
}

function getSearchScore(id: string, key: string) {
	if (key === id) return 1;
	return key.includes(id) ? id.length / key.length : 0;
}

export function makeMemeChoice(score: number, entry: Entry): APIApplicationCommandOptionChoice<string> {
	return {
		name: cutText(`${score === 1 ? '⭐' : '📄'} ${entry.name}`, 100),
		value: entry.name
	};
}

export function makeMemeChoices(results: readonly MemeSearchResult[]): APIApplicationCommandOptionChoice<string>[] {
	return results.map((result) => makeMemeChoice(result.score, result.value));
}

export interface MemeSearchResult {
	score: number;
	value: Entry;
}

export interface Entry {
	readonly name: string;
	readonly url: string;
	readonly avatars: EntryAvatars;
	readonly boxes: readonly EntryBox[];
}

export interface EntryBox {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly rotation: number;
	readonly textColor: HexadecimalColor;
	readonly modifiers: EntryBoxModifiers;
}

export interface EntryBoxModifiers {
	readonly font: 'impact' | 'arial';
	readonly fontSize: number;
	readonly allCaps: boolean;
	readonly bold: boolean;
	readonly italic: boolean;
	readonly outlineType: EntryBoxModifiersOutlineType;
	readonly outlineWidth: number;
	readonly outlineColor: HexadecimalColor;
	readonly textAlign: 'left' | 'center' | 'right';
	readonly verticalAlign: 'top' | 'middle' | 'bottom';
	readonly opacity: number;
}

export type EntryBoxModifiersOutlineType = 'shadow' | 'outline' | 'none';

export interface EntryAvatars {
	readonly author: readonly EntryAvatarPosition[];
	readonly target: readonly EntryAvatarPosition[];
}

export interface EntryAvatarPosition {
	readonly x: number;
	readonly y: number;
	readonly size: number;
	readonly style: 'circle' | 'square';
	readonly rotation: number;
}

export type HexadecimalColor = `#${string}`;
