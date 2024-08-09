import { PathSrc } from '#lib/common/constants';
import { strikethrough } from '@discordjs/builders';
import { cutText, isNullishOrEmpty, regExpEsc } from '@sapphire/utilities';
import { container } from '@skyra/http-framework';
import { Json, safeFetch, safeTimedFetch } from '@skyra/safe-fetch';
import type { APIApplicationCommandOptionChoice } from 'discord-api-types/v10';
import { readFile } from 'fs/promises';
import TurndownService from 'turndown';

let Maximum = 0;
const comics = new Map<number, Comic>();
{
	const PathXKCD = new URL('./generated/data/xkcd.json', PathSrc);
	for (const entry of JSON.parse(await readFile(PathXKCD, 'utf8')) as Comic[]) {
		comics.set(entry.id, entry);
		Maximum = Math.max(Maximum, entry.id);
	}
}

export async function refreshComicsFromRemote() {
	const result = await Json<Comic[]>(safeFetch('https://raw.githubusercontent.com/skyra-project/artiel/main/src/generated/data/xkcd.json'));
	result.match({
		ok(entries) {
			for (const entry of entries) {
				comics.set(entry.id, entry);
				Maximum = Math.max(Maximum, entry.id);
			}
			container.logger.debug('Successfully refreshed the local database. Latest comic:', Maximum);
		},
		err(error) {
			container.logger.error('Failed to refresh the local comic database:', error);
		}
	});
}

export function getComic(id: number) {
	return comics.get(id) ?? null;
}

export async function fetchComic(id: number) {
	if (!Number.isSafeInteger(id) || id < 0) return null;
	if (id <= Maximum) return getComic(id);
	if (id === Maximum + 1) return tryFetchComic(id);
	return null;
}

const service = new TurndownService();
service.addRule('strikethrough', {
	filter: ['del', 's'],
	replacement: (content) => strikethrough(content)
});

async function tryFetchComic(id: number) {
	const result = await Json<RawComic>(safeTimedFetch(`https://xkcd.com/${id}/info.0.json`, 2000));
	if (result.isErr()) return null;

	const entry = result.unwrap();
	const data = {
		id: entry.num,
		date: Date.UTC(entry.year, entry.month - 1, entry.day, 12, 0, 0, 0),
		title: entry.safe_title || entry.title,
		image: entry.img,
		alt: entry.alt,
		transcript: entry.transcript || null,
		news: isNullishOrEmpty(entry.news) ? null : service.turndown(entry.news)
	} satisfies Comic;
	comics.set(data.id, data);
	Maximum = data.id;
	return data;
}

export async function searchComic(id: string): Promise<readonly ComicSearchResult[]> {
	const entries = [] as ComicSearchResult[];
	if (id.length === 0) {
		const scores = await container.prisma.comic.findMany({ orderBy: { uses: 'desc' }, take: 25, select: { id: true } });
		for (const entry of scores) entries.push({ score: 1, value: comics.get(entry.id)! });
		for (let i = Maximum; entries.length < 25 && i >= 0; --i) {
			// If already included, skip:
			if (scores.some((entry) => entry.id === i)) continue;

			// Add default entry:
			entries.push({ score: 1, value: comics.get(i)! });
		}

		return entries;
	}

	const query = new RegExp(regExpEsc(id), 'i');
	for (const value of comics.values()) {
		const score = getSearchScore(id, query, value);
		if (score !== 0) entries.push({ score, value });
	}

	return entries.sort((a, b) => b.score - a.score).slice(0, 25);
}

function getSearchScore(id: string, query: RegExp, value: Comic) {
	let score = 0;
	if (query.test(value.title)) {
		if (id.length === value.title.length) return 1;
		score = id.length / value.title.length;
	}

	if (query.test(value.alt)) {
		if (id.length === value.alt.length) return 1;
		score = Math.max(score, id.length / value.alt.length);
	}

	if (value.transcript && query.test(value.transcript)) {
		if (id.length === value.transcript.length) return 1;
		score = Math.max(score, id.length / value.transcript.length);
	}

	return score;
}

export function makeComicChoice(score: number, comic: Comic): APIApplicationCommandOptionChoice<number> {
	return {
		name: cutText(`${score === 1 ? '⭐' : '📄'} ${comic.id} — ${comic.title} — ${comic.alt}`, 100),
		value: comic.id
	};
}

export function makeComicChoices(results: readonly ComicSearchResult[]): APIApplicationCommandOptionChoice<number>[] {
	return results.map((result) => makeComicChoice(result.score, result.value));
}

export interface RawComic {
	num: number;
	year: number;
	month: number;
	day: number;
	safe_title: string;
	title: string;
	img: string;
	alt: string;
	transcript: string;
	news: string;
}

export interface Comic {
	id: number;
	date: number;
	title: string;
	image: string;
	alt: string;
	transcript: string | null;
	news: string | null;
}

export interface ComicSearchResult {
	score: number;
	value: Comic;
}
