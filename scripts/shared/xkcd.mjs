import { strikethrough } from '@discordjs/builders';
import { isNullishOrEmpty } from '@sapphire/utilities';
import TurndownService from 'turndown';

export const outputFile = new URL('../../src/generated/data/xkcd.json', import.meta.url);

const service = new TurndownService();
service.addRule('strikethrough', {
	filter: ['del', 's'],
	replacement: (content) => strikethrough(content)
});

export async function fetchLatest() {
	const response = await fetch('https://xkcd.com/info.0.json');
	if (!response.ok || !response.body) {
		console.error('Failed to read the xkcd data, see response:');
		console.error(await response.text());
		return null;
	}

	return transform(await response.json());
}

/**
 * @param {number} id
 */
export async function fetchEntry(id) {
	const response = await fetch(`https://xkcd.com/${id}/info.0.json`);
	if (!response.ok || !response.body) {
		console.error(`Failed to read the xkcd data for ${id}, see response:`);
		console.error(await response.text());
		return null;
	}

	return transform(await response.json());
}

/**
 * @typedef {Object} XKCD
 * @property {number} id
 * @property {number} date
 * @property {string} title
 * @property {string} image
 * @property {string} alt
 * @property {?string} transcript
 * @property {?string} news
 */

/**
 * @returns {XKCD}
 */
function transform(entry) {
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
