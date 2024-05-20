// LICENSE Apache-2.0 | Copyright 2017 MathJax Consortium
// https://github.com/mathjax/MathJax-demos-node/blob/d9ba8c61e54683efc04d0e11d5812bc974da65db/direct/tex2svg

import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';
import { mathjax } from 'mathjax-full/js/mathjax.js';
import { SVG } from 'mathjax-full/js/output/svg.js';

const CSS = [
	// xkcd's text color
	'*{fill:#000000;stroke:#000000}',
	'svg a{fill:blue;stroke:blue}',
	'[data-mml-node="merror"]>g{fill:red;stroke:red}',
	'[data-mml-node="merror"]>rect[data-background]{fill:yellow;stroke:none}',
	'[data-frame],[data-line]{stroke-width:70px;fill:none}',
	'.mjx-dashed{stroke-dasharray:140}',
	'.mjx-dotted{stroke-linecap:round;stroke-dasharray:0,140}',
	'use[data-c]{stroke-width:3px}'
].join('');

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const tex = new TeX({ packages: AllPackages.sort() });
const svg = new SVG({ fontCache: 'local' });
const html = mathjax.document('', { InputJax: tex, OutputJax: svg });

/**
 * @param {string} value
 */
export function toSVG(value) {
	const node = html.convert(value, {
		display: true,
		em: 16,
		ex: 8,
		containerWidth: 80 * 16
	});

	return adaptor.innerHTML(node).replace(/<defs>/, `<defs><style>${CSS}</style>`);
}
