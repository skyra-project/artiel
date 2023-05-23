import { PathSrc } from '#lib/common/constants';
import { cutText } from '@sapphire/utilities';
import type { APIApplicationCommandOptionChoice } from 'discord-api-types/v10';
import { readFile } from 'node:fs/promises';

let MinimumLength = 100;
let MaximumLength = 0;
const entries = new Map<string, Entry>();
{
	const PathFile = new URL('./generated/data/memes.json', PathSrc);
	for (const entry of JSON.parse(await readFile(PathFile, 'utf8')) as Entry[]) {
		entries.set(entry.name.toLocaleLowerCase(), entry);
		if (entry.name.length > MaximumLength) MaximumLength = entry.name.length;
		if (entry.name.length < MinimumLength) MinimumLength = entry.name.length;
	}
}

// TODO: Make this use a database point counter, like XKCD does, but also include a way
// to de-prioritize heavily-used dying memes over time. For now, this will be a manual
// hardcoded list until we figure this out.
const defaults = [
	'drake hotline bling' //
].map((value) => ({ score: 1, value: entries.get(value)! } satisfies MemeSearchResult));

export function getMinimumMemeNameLength() {
	return MinimumLength;
}

export function getMaximumMemeNameLength() {
	return MaximumLength;
}

export function getMeme(name: string) {
	return entries.get(name.toLowerCase()) ?? null;
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
	readonly modifiers: EntryBoxModifiers;
}

export interface EntryBoxModifiers {
	readonly font: 'impact' | 'arial';
	readonly fontSize: number;
	readonly allCaps: boolean;
	readonly bold: boolean;
	readonly italic: boolean;
	readonly outlineType: 'shadow' | 'outline' | 'none';
	readonly outlineWidth: number;
	readonly textAlign: 'left' | 'center' | 'right';
	readonly verticalAlign: 'top' | 'middle' | 'bottom';
	readonly opacity: number;
}

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
