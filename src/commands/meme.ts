import { Fonts } from '#lib/common/constants';
import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import {
	getMaximumMemeNameLength,
	getMeme,
	getMinimumMemeNameLength,
	makeMemeChoices,
	searchMeme,
	type Entry,
	type EntryAvatarPosition,
	type EntryBox
} from '#lib/utilities/meme';
import { userMention } from '@discordjs/builders';
import { Collection } from '@discordjs/collection';
import type { RawFile } from '@discordjs/rest';
import { isNullish, isNullishOrEmpty } from '@sapphire/utilities';
import { Command, RegisterCommand, type AutocompleteInteractionArguments, type TransformedArguments } from '@skyra/http-framework';
import { applyLocalizedBuilder, resolveKey, resolveUserKey } from '@skyra/http-framework-i18n';
import { Canvas, Image, color, loadImage } from 'canvas-constructor/napi-rs';
import { MessageFlags, type APIUser } from 'discord-api-types/v10';

const Root = LanguageKeys.Commands.Meme;
const FontSize = 32;

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
	private readonly wordSizes = new Collection<string, number>();
	private spaceWidth = null as null | number;

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
		const canvas = new Canvas(width, height)
			.setColor(color('white'))
			.setStroke(color('black'))
			.setStrokeWidth(4)
			.setTextFont(`${FontSize}px ${Fonts.ImpactMedium}`)
			.setTextAlign('center')
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

	private getAvatar(user: APIUser) {
		return user.avatar
			? this.container.rest.cdn.avatar(user.id, user.avatar, { extension: 'png', forceStatic: true, size: 128 })
			: this.container.rest.cdn.defaultAvatar(Number(BigInt(user.id) % 5n));
	}

	private drawBox(canvas: Canvas, box: EntryBox, part: string) {
		this.spaceWidth ??= canvas.measureText(' ').width;

		const space = this.spaceWidth;
		const words = part.trim().split(/\s+/);
		const sizes = words.map((word) => this.wordSizes.ensure(word, () => canvas.measureText(word).width));
		const total = sizes.reduce((acc, size) => acc + size, 0) + (words.length - 1) * space;
		if (total === 0) return;

		canvas
			.save()
			.translate(box.x, box.y)
			.rotate(box.rotation * (Math.PI / 180));

		if (total <= box.width) {
			canvas.printStrokeText(part, 0, 0).printText(part, 0, 0);
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

			canvas.setTextSize(fontSize).setStrokeWidth(Math.max(2, 4 * fontScale));
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
			let yOffset = 0 - fontHeight * ((lines.length - 1) / 2);
			for (const line of lines) {
				canvas.printStrokeText(line, 0, yOffset).printText(line, 0, yOffset);
				yOffset += fontHeight;
			}
		}

		canvas.restore();
	}

	private async drawAvatars(canvas: Canvas, user: APIUser | null, positions: readonly EntryAvatarPosition[]) {
		if (isNullish(user)) return;
		if (isNullishOrEmpty(positions)) return;

		const avatar = await loadImage(this.getAvatar(user));
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
