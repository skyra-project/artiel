import { PathSrc } from '#lib/common/constants';
import { cutText } from '@sapphire/utilities';
import { container } from '@skyra/http-framework';
import { Json, safeFetch } from '@skyra/safe-fetch';
import type { APIApplicationCommandOptionChoice } from 'discord-api-types/v10';
import MiniSearch from 'minisearch';
import { readFile } from 'node:fs/promises';

const engine = new MiniSearch<{ id: number; title: string; questions: string; lines: string }>({
	fields: ['title', 'questions', 'lines'],
	searchOptions: {
		boost: { title: 2 },
		fields: ['title', 'questions', 'lines'],
		fuzzy: 0.2,
		prefix: true
	}
});

let Maximum = 0;
const articles = new Map<number, WhatIf>();

function add(entry: WhatIf) {
	articles.set(entry.id, entry);
	engine.add({
		id: entry.id,
		title: entry.title,
		questions: entry.questions.map((question) => question.question).join('\n'),
		lines: entry.lines
			.filter((line): line is WhatIfLineParagraph => line.type === 'p')
			.map((line) => line.text)
			.join('\n')
	});
	Maximum = Math.max(Maximum, entry.id);

	return entry;
}

{
	const PathWhatIf = new URL('./generated/data/what-if.json', PathSrc);
	for (const entry of JSON.parse(await readFile(PathWhatIf, 'utf8')) as WhatIf[]) {
		add(entry);
	}
}

export function getArticleLineOptionName(line: WhatIfLine): string {
	if (line.type === 'p') return cutText(line.text, 100);
	if (line.type === 'formula') return cutText(line.text, 100);
	return cutText(line.alt, 100);
}

export function getArticleLineOptionEmoji(line: WhatIfLine): string {
	if (line.type === 'p') return '📄';
	if (line.type === 'formula') return '🧮';
	return '🖼️';
}

export function getArticle(id: number) {
	return articles.get(id) ?? null;
}

export async function searchArticle(id: string): Promise<readonly WhatIfSearchResult[]> {
	const entries = [] as WhatIfSearchResult[];
	if (id.length === 0) {
		const scores = await container.prisma.whatIf.findMany({ orderBy: { uses: 'desc' }, take: 25, select: { id: true } });
		for (const entry of scores) entries.push({ score: 1, value: articles.get(entry.id)! });
		for (let i = Maximum; entries.length < 25 && i >= 0; --i) {
			// If already included, skip:
			if (scores.some((entry) => entry.id === i)) continue;

			// Add default entry:
			entries.push({ score: 1, value: articles.get(i)! });
		}

		return entries;
	}

	return engine
		.search(id)
		.slice(0, 25)
		.map((value) => ({ score: value.score, value: articles.get(value.id)! }));
}

export function makeArticleChoice(score: number, article: WhatIf): APIApplicationCommandOptionChoice<number> {
	return {
		name: cutText(`${score > 10 ? '⭐' : '📄'} ${article.id} — ${article.title}`, 100),
		value: article.id
	};
}

export function makeArticleChoices(results: readonly WhatIfSearchResult[]): APIApplicationCommandOptionChoice<number>[] {
	return results.map((result) => makeArticleChoice(result.score, result.value));
}

export async function refreshArticlesFromRemote() {
	const result = await Json<WhatIf[]>(safeFetch('https://raw.githubusercontent.com/skyra-project/artiel/main/src/generated/data/what-if.json'));
	result.match({
		ok(entries) {
			for (const entry of entries) {
				add(entry);
			}
			container.logger.debug('Successfully refreshed the local database. Latest entry:', Maximum);
		},
		err(error) {
			container.logger.error('Failed to refresh the local entry database:', error);
		}
	});
}

const GitHubBranch = process.env.OVERRIDE_WHAT_IF_PATH_BRANCH ?? 'main';
const GitHubImageBaseURL = `https://raw.githubusercontent.com/skyra-project/artiel/${GitHubBranch}/src/generated/images`;
export function getFormulaImageURL(hash: string) {
	return `${GitHubImageBaseURL}/${hash}.webp`;
}

export interface WhatIf {
	id: number;
	title: string;
	questions: WhatIfQuestion[];
	lines: WhatIfLine[];
}

export interface WhatIfQuestion {
	question: string;
	author: string;
}

export type WhatIfLine = WhatIfLineParagraph | WhatIfLineFormula | WhatIfLineImage;

export interface WhatIfLineParagraph {
	type: 'p';
	text: string;
	image: WhatIfLineImage | WhatIfLineFormula | null;
}

export interface WhatIfLineFormula {
	type: 'formula';
	text: string;
	hash: string;
}

export interface WhatIfLineImage {
	type: 'img';
	src: string;
	alt: string;
}

export interface WhatIfSearchResult {
	score: number;
	value: WhatIf;
}
