import { hash as h } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const GeneratedOutput = fileURLToPath(new URL('../../src/generated/images', import.meta.url));

export async function render(svg: string, hash: string): Promise<void> {
	await sharp(Buffer.from(svg, 'utf-8')) //
		.resize({ height: 80 })
		.webp({ quality: 100 })
		.toFile(join(GeneratedOutput, `${hash}.webp`));
}

export function hash(value: string): string {
	return h('sha1', value, 'hex').slice(0, 8);
}
