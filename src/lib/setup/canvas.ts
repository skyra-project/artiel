import { PathAssets } from '#lib/common/constants';
import { loadFont } from 'canvas-constructor/napi-rs';
import { join } from 'node:path';
import { fileURLToPath } from 'url';

const folder = fileURLToPath(new URL('./fonts/', PathAssets));

loadFont(join(folder, 'Arial-Medium.ttf'), 'Arial-Medium');

loadFont(join(folder, 'Impact-Medium.ttf'), 'Impact-Medium');
loadFont(join(folder, 'Impact-Unicode-Medium.ttf'), 'Impact-Unicode-Medium');

loadFont(join(folder, 'NotoSans-Medium.ttf'), 'NotoSans-Medium');
loadFont(join(folder, 'NotoSans-Bold.ttf'), 'NotoSans-Bold');
loadFont(join(folder, 'NotoEmoji-Medium.ttf'), 'NotoEmoji-Medium');
loadFont(join(folder, 'NotoEmoji-Bold.ttf'), 'NotoEmoji-Bold');
