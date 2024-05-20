import { hash as h } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const GeneratedOutput = fileURLToPath(new URL('../../src/generated/images', import.meta.url));

/**
 * @param {string} svg
 * @param {string} hash
 */
export async function render(svg, hash) {
	await sharp(Buffer.from(svg, 'utf-8')) //
		.resize({ height: 80 })
		.webp({ quality: 100 })
		.toFile(join(GeneratedOutput, `${hash}.webp`));
}

/**
 * @param {string} value
 */
export function hash(value) {
	return h('sha1', value, 'hex').slice(0, 8);
}
