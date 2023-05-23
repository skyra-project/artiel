export const PathRoot = new URL('../../..', import.meta.url);
export const PathAssets = new URL('./assets/', PathRoot);
export const PathSrc = new URL('./src/', PathRoot);

export const enum BrandingColors {
	Primary = 0xebb971,
	Secondary = 0xed917d
}

export const enum Fonts {
	ImpactMedium = 'Impact-Medium, Impact-Unicode-Medium, NotoSans-Bold, NotoEmoji-Bold',
	ArialMedium = 'Arial-Medium, NotoSans-Medium, NotoEmoji-Medium'
}
