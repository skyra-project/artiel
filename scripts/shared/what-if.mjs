// / <reference lib="ES2022" />

import { bold, hyperlink, italic, spoiler, strikethrough, underscore } from '@discordjs/builders';
import { load } from 'cheerio';
import { hash, render } from './svg.mjs';
import { toSVG } from './tex.mjs';

export const outputFile = new URL('../../src/generated/data/what-if.json', import.meta.url);

/**
 * @typedef {Object} WhatIf
 * @property {number} id
 * @property {string} title
 * @property {WhatIfQuestion[]} questions
 * @property {WhatIfLine[]} lines
 */

/**
 * @typedef {Object} WhatIfQuestion
 * @property {string} question
 * @property {string} author
 */

/**
 * @typedef {WhatIfLineParagraph|WhatIfLineFormula|WhatIfLineImage} WhatIfLine
 */

/**
 * @typedef {Object} WhatIfLineParagraph
 * @property {'p'} type
 * @property {string} text
 * @property {WhatIfLineFormula|WhatIfLineImage?} image
 */

/**
 * @typedef {Object} WhatIfLineFormula
 * @property {'formula'} type
 * @property {string} text
 * @property {string} hash
 */

/**
 * @typedef {Object} WhatIfLineImage
 * @property {'img'} type
 * @property {string} src
 * @property {string} alt
 */

export async function fetchLatest() {
	const result = await fetchAndParseEntryFromURL('https://what-if.xkcd.com');
	if (!result) return null;

	const { $, ...data } = result;
	// @ts-expect-error Cannot assert non-null in JavaScript
	const id = Number($('.main-nav').children().first().attr('href').match(/\d+/)[0]) + 1;
	return { id, ...data };
}

/**
 * @param {number} id
 * @returns {Promise<WhatIf | null>}
 */
export async function fetchEntry(id) {
	const result = await fetchAndParseEntryFromURL(`https://what-if.xkcd.com/${id}`);
	if (!result) return null;

	const { $, ...data } = result;
	void $;
	return { id, ...data };
}

/**
 * @typedef {Object} InternalWhatIf
 * @property {string} title
 * @property {WhatIfQuestion[]} questions
 * @property {WhatIfLine[]} lines
 * @property {import('cheerio').CheerioAPI} $
 */

/**
 * @param {string} url
 * @returns {Promise<InternalWhatIf | null>}
 */
async function fetchAndParseEntryFromURL(url) {
	const response = await fetch(url);
	if (!response.ok || !response.body) {
		console.error(`Failed to read the what-if data from ${url}, see response:`);
		console.error(await response.text());
		return null;
	}

	const source = await response.text();
	const $ = load(source);
	const title = $('#title').text();
	/** @type {WhatIfLine[]} */
	const lines = [];
	/** @type {WhatIfQuestion[]} */
	const questions = [];
	/** @type {string} */
	let question;
	for (const element of $('#entry').children()) {
		if (element.name === 'p') {
			const text = $(element).text();
			if (element.attribs.id === 'question') {
				question = text;
			} else if (element.attribs.id === 'attribute') {
				// @ts-ignore False Positives
				questions.push({ question, author: text.replace(/^[—–]\s*/, '') });
			} else if (text.startsWith('\\[') && text.endsWith('\\]')) {
				updateLastOrAppend(lines, await extractFormula(text));
			} else {
				lines.push(await extractParagraph(element));
			}
		} else if (element.name === 'img') {
			updateLastOrAppend(lines, {
				type: 'img',
				src: element.attribs.src,
				alt: element.attribs.title
			});
		}
	}

	return { title, questions, lines, $ };
}

/**
 * @param {WhatIfLine[]} lines
 * @param {WhatIfLineImage|WhatIfLineFormula} value
 */
function updateLastOrAppend(lines, value) {
	const last = lines.at(-1);
	if (!last || last.type !== 'p' || last.image !== null) {
		lines.push(value);
		return;
	}

	last.image = value;
}

/**
 * @param {string} value
 * @returns {Promise<WhatIfLineFormula>}
 */
async function extractFormula(value) {
	const text = value.slice(2, -2).trim();
	const svg = toSVG(text);
	const name = hash(text);
	await render(svg, name);
	return { type: 'formula', text, hash: name };
}

/**
 * @returns {Promise<WhatIfLineParagraph>}
 */
async function extractParagraph(element) {
	let text = extractParagraphString(element);
	let image = null;

	let formulaStartIndex;
	if (text.endsWith('\\]') && (formulaStartIndex = text.lastIndexOf('\\[')) !== -1) {
		const formula = text.slice(formulaStartIndex);
		image = await extractFormula(formula);
		text = text.slice(0, formulaStartIndex).trim();
	}

	return { type: 'p', text, image };
}

function extractParagraphString(element) {
	let output = '';

	for (const child of element.children) {
		if (child.type === 'text') {
			output += child.data.replaceAll('\n', ' ');
			continue;
		}

		if (child.type !== 'tag') continue;

		if (child.name === 'a') {
			const text = extractParagraphString(child).trim();
			const url = child.attribs.href;
			if (text) {
				output += url ? hyperlink(text, escapeUrl(url)) : text;
			} else {
				output += url;
			}
		} else if (child.name === 'span') {
			if (!child.attribs.class && child.attribs.style) {
				let out = extractParagraphString(child);
				if (/font-style:\s*italic/.test(child.attribs.style)) out = italic(out);
				if (/font-weight:\s*bold/.test(child.attribs.style)) out = bold(out);
				if (/text-decoration:\s*line-through/.test(child.attribs.style)) out = strikethrough(out);
				output += out;
			} else if (child.attribs.class === 'ref') {
				const [refnum, refbody] = child.children;
				output += `${toSuperScript(extractParagraphString(refnum))}${spoiler(extractParagraphString(refbody))}`;
			} else {
				console.warn('Unknown span class:', child.attribs.class);
			}
		} else if (child.name === 'strong') {
			output += bold(extractParagraphString(child));
		} else if (child.name === 'u') {
			output += underscore(extractParagraphString(child));
		} else if (child.name === 's' || child.name === 'strike') {
			output += strikethrough(extractParagraphString(child));
		} else if (child.name === 'em') {
			output += italic(bold(extractParagraphString(child)));
		} else if (child.name === 'sup') {
			output += normalizeSuperscriptElement(child);
		} else if (child.name === 'sub') {
			output += toSubScript(extractParagraphString(child));
		} else if (child.name === 'br') {
			output += '\n';
		} else if (child.name === 'img') {
			output += hyperlink(child.attribs.alt, escapeUrl(child.attribs.src));
		} else {
			console.warn('Unknown tag:', child.name, 'with attributes:', child.attribs);
		}
	}

	return output;
}

const ExtractMarkdownHyperlink = /\[([\w\[\]\d ]+)\]\((.+?)\)/g;
function normalizeSuperscriptElement(element) {
	const extracted = extractParagraphString(element);

	let start = 0;
	let output = '';
	let result;
	while ((result = ExtractMarkdownHyperlink.exec(extracted)) !== null) {
		if (result.index > start) {
			output += toSuperScript(extracted.slice(start, result.index));
		}

		output += hyperlink(toSuperScript(result[1]), escapeUrl(result[2]));
		start = result.index + result[0].length;
	}

	if (start < extracted.length) {
		output += toSuperScript(extracted.slice(start));
	}

	return output;
}

function escapeUrl(url) {
	return url.replaceAll(' ', '%20').replaceAll('(', '%28').replaceAll(')', '%29');
}

function toSuperScript(value) {
	let output = '';
	for (const char of value) {
		const lower = char.toLowerCase();
		if (lower in SuperScriptMap) {
			output += SuperScriptMap[lower];
		} else if (FormatCharacters.includes(char)) {
			output += char;
		} else {
			output += `^${char}`;
		}
	}

	return output;
}

function toSubScript(value) {
	let output = '';
	for (const char of value) {
		const lower = char.toLowerCase();
		if (lower in SubScriptMap) {
			output += SubScriptMap[lower];
		} else if (FormatCharacters.includes(char)) {
			output += char;
		} else {
			output += `_${char}`;
		}
	}

	return output;
}

const FormatCharacters = [' ', '*', '_'];

const SuperScriptMap = {
	' ': ' ',
	'-': '⁻',
	'–': '⁻',
	'−': '⁻',
	a: 'ᵃ',
	b: 'ᵇ',
	c: 'ᶜ',
	d: 'ᵈ',
	e: 'ᵉ',
	f: 'ᶠ',
	g: 'ᵍ',
	h: 'ʰ',
	i: 'ⁱ',
	j: 'ʲ',
	k: 'ᵏ',
	l: 'ˡ',
	m: 'ᵐ',
	n: 'ⁿ',
	o: 'ᵒ',
	p: 'ᵖ',
	q: '𐞥',
	r: 'ʳ',
	s: 'ˢ',
	t: 'ᵗ',
	u: 'ᵘ',
	v: 'ᵛ',
	w: 'ʷ',
	x: 'ˣ',
	y: 'ʸ',
	z: 'ᶻ',
	'[': '⁽',
	']': '⁾',
	0: '⁰',
	1: '¹',
	2: '²',
	3: '³',
	4: '⁴',
	5: '⁵',
	6: '⁶',
	7: '⁷',
	8: '⁸',
	9: '⁹'
};

const SubScriptMap = {
	' ': ' ',
	a: 'ₐ',
	e: 'ₑ',
	h: 'ₕ',
	i: 'ᵢ',
	j: 'ⱼ',
	k: 'ₖ',
	l: 'ₗ',
	m: 'ₘ',
	n: 'ₙ',
	o: 'ₒ',
	p: 'ₚ',
	r: 'ᵣ',
	s: 'ₛ',
	t: 'ₜ',
	u: 'ᵤ',
	v: 'ᵥ',
	x: 'ₓ',
	'[': '₍',
	']': '₎',
	0: '₀',
	1: '₁',
	2: '₂',
	3: '₃',
	4: '₄',
	5: '₅',
	6: '₆',
	7: '₇',
	8: '₈',
	9: '₉'
};
