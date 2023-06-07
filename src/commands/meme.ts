import { Fonts } from '#lib/common/constants';
import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { getAvatar } from '#lib/utilities/discord';
import {
	getMaximumMemeNameLength,
	getMeme,
	getMinimumMemeNameLength,
	makeMemeChoices,
	searchMeme,
	type Entry,
	type EntryAvatarPosition,
	type EntryBox,
	type EntryBoxModifiers,
	type EntryBoxModifiersOutlineType,
	type HexadecimalColor
} from '#lib/utilities/meme';
import { userMention } from '@discordjs/builders';
import { Collection } from '@discordjs/collection';
import type { RawFile } from '@discordjs/rest';
import { isNullish, isNullishOrEmpty } from '@sapphire/utilities';
import { Command, RegisterCommand, type AutocompleteInteractionArguments, type TransformedArguments } from '@skyra/http-framework';
import { applyLocalizedBuilder, resolveKey, resolveUserKey } from '@skyra/http-framework-i18n';
import { Canvas, Image, filter, loadImage } from 'canvas-constructor/napi-rs';
import { MessageFlags, type APIUser } from 'discord-api-types/v10';

const Root = LanguageKeys.Commands.Meme;

@RegisterCommand((builder) =>
	applyLocalizedBuilder(builder, Root.RootName, Root.RootDescription) //
		.addStringOption((builder) =>
			applyLocalizedBuilder(builder, Root.OptionsName)
				.setMinLength(getMinimumMemeNameLength())
				.setMaxLength(getMaximumMemeNameLength() + 2)
				.setAutocomplete(true)
				.setRequired(true)
		)
		.addStringOption((builder) => applyLocalizedBuilder(builder, Root.OptionsContent).setMaxLength(512).setRequired(true))
		.addUserOption((builder) => applyLocalizedBuilder(builder, Root.OptionsTarget))
)
export class UserCommand extends Command {
	public override async autocompleteRun(interaction: Command.AutocompleteInteraction, options: AutocompleteOptions) {
		const results = searchMeme(options.name);
		return interaction.reply({ choices: makeMemeChoices(results) });
	}

	public override async chatInputRun(interaction: Command.ChatInputInteraction, options: Options) {
		const entry = getMeme(options.name);
		if (isNullish(entry)) {
			const content = resolveUserKey(interaction, Root.NoEntryFound);
			return interaction.reply({ content, flags: MessageFlags.Ephemeral });
		}

		const parts = options.content.split('|', entry.boxes.length);
		const response = await interaction.defer();

		const image = await loadImage(entry.url);
		const width = 400;
		const height = 400 * (image.height / image.width);
		const canvas = new Canvas(width, height) //
			.setTextBaseline('middle')
			.printImage(image, 0, 0, width, height);

		for (let i = 0; i < parts.length; ++i) {
			this.drawBox(canvas, entry.boxes[i], parts[i]);
		}

		const target = options.target?.user ?? null;
		await Promise.allSettled([
			this.drawAvatars(canvas, interaction.user, entry.avatars.author),
			this.drawAvatars(canvas, target, entry.avatars.target)
		]);

		const file = { name: 'meme.png', data: await canvas.pngAsync(), contentType: 'image/png' } satisfies RawFile;
		return response.update({
			files: [file],
			attachments: [{ id: '0', description: this.generateAlt(interaction, entry, parts) }],
			content: target ? userMention(target.id) : undefined,
			allowed_mentions: { roles: [], users: target ? [target.id] : [] }
		});
	}

	private drawBox(canvas: Canvas, box: EntryBox, part: string) {
		canvas.save().setTextFont(this.getFont(box.modifiers)).setTextAlign(box.modifiers.textAlign).setGlobalAlpha(box.modifiers.opacity);
		if (box.modifiers.allCaps) part = part.toUpperCase();

		const space = canvas.measureText(' ').width;
		const words = part.trim().split(/\s+/);
		const wordSizes = new Collection<string, number>();
		const sizes = words.map((word) => wordSizes.ensure(word, () => canvas.measureText(word).width));
		const total = sizes.reduce((acc, size) => acc + size, 0) + (words.length - 1) * space;
		if (total === 0) {
			canvas.restore();
			return;
		}

		const { outlineType, outlineColor, outlineWidth, fontSize: FontSize } = box.modifiers;
		canvas
			.translate(box.x, box.y)
			.rotate(box.rotation * (Math.PI / 180))
			.setColor(box.textColor)
			.process(() => this.setOutlineWidth(canvas, outlineType, outlineColor, outlineWidth));

		const x = this.getBoxX(box);
		if (total <= box.width) {
			const y = this.getBoxY(box, FontSize * 1.2, 1);
			if (outlineType === 'outline') canvas.printStrokeText(part, x, y);
			canvas.printText(part, x, y);
		} else {
			let fontSize = FontSize;
			let fontScale = 1.0;
			let fontHeight!: number;

			tryNewSize: while (fontSize > 1) {
				fontHeight = fontSize * 1.2;

				let lines = 0;
				let current = 0;
				let leftWordPadding = 0;
				const maximumLines = Math.floor(box.height / fontHeight) - 1;
				for (const fullSize of sizes) {
					const size = fullSize * fontScale;

					// If the current word is larger than the box's width, try
					// a smaller font size:
					if (size > box.width) {
						--fontSize;
						fontScale = fontSize / FontSize;
						continue tryNewSize;
					}

					// If adding the current word doesn't exceed the box's width,
					// add it:
					if (current + leftWordPadding + size <= box.width) {
						current += leftWordPadding + size;
					} else {
						current = size;
						++lines;

						// If the amount of lines surpasses the maximum amount
						// of drawable lines, try a smaller font size:
						if (lines > maximumLines) {
							--fontSize;
							fontScale = fontSize / FontSize;
							continue tryNewSize;
						}
					}

					// The first word has been added, set the left word padding
					// to the space to "prepend" a space before each word:
					leftWordPadding = space;
				}

				break;
			}

			this.setOutlineWidth(canvas, outlineType, outlineColor, Math.max(2, outlineWidth * fontScale));
			canvas.setTextSize(fontSize);
			const lines = [] as string[];
			const line = [] as string[];
			for (let i = 0, current = 0, leftWordPadding = 0; i < sizes.length; ++i) {
				const size = sizes[i] * fontScale;
				if (current + leftWordPadding + size > box.width) {
					current = size;
					lines.push(line.join(' '));
					line.length = 0;
				} else {
					current += leftWordPadding + size;
				}

				line.push(words[i]);

				// The first word has been added, set the left word padding
				// to the space to "prepend" a space before each word:
				leftWordPadding = space;
			}

			if (line.length) lines.push(line.join(' '));

			// `y = 0` is the middle of the box:
			let yOffset = this.getBoxY(box, fontHeight, lines.length);
			for (const line of lines) {
				if (outlineType === 'outline') canvas.printStrokeText(line, x, yOffset);
				canvas.printText(line, x, yOffset);
				yOffset += fontHeight;
			}
		}

		canvas.restore();
	}

	private setOutlineWidth(canvas: Canvas, type: EntryBoxModifiersOutlineType, color: HexadecimalColor, width: number) {
		switch (type) {
			case 'outline':
				canvas.setStrokeWidth(width).setStroke(color);
				break;
			case 'shadow':
				canvas.setFilter(filter('drop-shadow', '0px', '0px', `${width}px`, color));
				break;
			case 'none':
				break;
		}
	}

	private getFont(modifiers: EntryBoxModifiers) {
		return `${this.getFontStyle(modifiers)}${modifiers.fontSize}px ${this.getFontFamily(modifiers)}`;
	}

	private getFontStyle(modifiers: EntryBoxModifiers) {
		return modifiers.bold //
			? modifiers.italic
				? 'italic bold '
				: 'bold '
			: modifiers.italic
			? 'italic '
			: '';
	}

	private getFontFamily(modifiers: EntryBoxModifiers) {
		return modifiers.font === 'impact' ? Fonts.ImpactMedium : Fonts.ArialMedium;
	}

	private getBoxX(box: EntryBox) {
		// `x = 0` is the center of the box:
		switch (box.modifiers.textAlign) {
			case 'left':
				return -box.width / 2;
			case 'center':
				return 0;
			case 'right':
				return box.width / 2;
		}
	}

	private getBoxY(box: EntryBox, fontHeight: number, lines: number) {
		// `y = 0` is the middle of the box:
		switch (box.modifiers.verticalAlign) {
			case 'top':
				return fontHeight / 2 - box.height / 2;
			case 'middle':
				return 0 - fontHeight * ((lines - 1) / 2);
			case 'bottom':
				return box.height / 2 - fontHeight * lines + fontHeight / 2;
		}
	}

	private async drawAvatars(canvas: Canvas, user: APIUser | null, positions: readonly EntryAvatarPosition[]) {
		if (isNullish(user)) return;
		if (isNullishOrEmpty(positions)) return;

		const avatar = await loadImage(getAvatar(user));
		for (const position of positions) {
			this.drawAvatar(canvas, position, avatar);
		}
	}

	private drawAvatar(canvas: Canvas, position: EntryAvatarPosition, image: Image) {
		const halfSize = Math.floor(position.size / 2);
		canvas
			.save()
			.translate(position.x, position.y)
			.rotate(position.rotation * (Math.PI / 180))
			.process(() =>
				position.style === 'circle' //
					? canvas.printCircularImage(image, 0, 0, halfSize)
					: canvas.printImage(image, -halfSize, -halfSize)
			)
			.restore();
	}

	private generateAlt(interaction: Command.ChatInputInteraction, entry: Entry, parts: readonly string[]) {
		return resolveKey(interaction, Root.AltText, {
			template: entry.name,
			parts: parts.map((part, index) => `${index + 1}. ${part.trim()}`).join(' | ')
		});
	}
}

type AutocompleteOptions = AutocompleteInteractionArguments<{ name: string }>;

interface Options {
	name: string;
	content: string;
	target?: TransformedArguments.User;
}
