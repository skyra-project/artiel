import { strikethrough } from '@discordjs/builders';
import { isNullishOrEmpty } from '@sapphire/utilities';
import TurndownService from 'turndown';
import type { Comic, RawComic } from '../../src/lib/utilities/xkcd.js';

export type { Comic };

export const outputFile = new URL('../../src/generated/data/xkcd.json', import.meta.url);

const service = new TurndownService();
service.addRule('strikethrough', {
	filter: ['del', 's'],
	replacement: (content) => strikethrough(content)
});

export async function fetchLatest(): Promise<Comic | null> {
	const response = await fetch('https://xkcd.com/info.0.json');
	if (!response.ok || !response.body) {
		console.error('Failed to read the xkcd data, see response:');
		console.error(await response.text());
		return null;
	}

	return transform(await response.json());
}

export async function fetchEntry(id: number): Promise<Comic | null> {
	const response = await fetch(`https://xkcd.com/${id}/info.0.json`);
	if (!response.ok || !response.body) {
		console.error(`Failed to read the xkcd data for ${id}, see response:`);
		console.error(await response.text());
		return null;
	}

	return transform(await response.json());
}

function transform(entry: RawComic): Comic {
	return {
		id: entry.num,
		date: Date.UTC(entry.year, entry.month - 1, entry.day, 12, 0, 0, 0),
		title: entry.safe_title || entry.title,
		image: entry.img,
		alt: entry.alt,
		transcript: entry.transcript || null,
		news: isNullishOrEmpty(entry.news) ? null : service.turndown(entry.news)
	};
}
