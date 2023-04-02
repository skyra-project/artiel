import { BrandingColors } from '#lib/common/constants';
import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { getComic, makeComicChoice, makeComicChoices, searchComic } from '#lib/utilities/xkcd';
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder } from '@discordjs/builders';
import { isNullish } from '@sapphire/utilities';
import { Command, RegisterCommand, type AutocompleteInteractionArguments } from '@skyra/http-framework';
import { applyLocalizedBuilder, getSupportedLanguageT, resolveUserKey } from '@skyra/http-framework-i18n';
import { ButtonStyle, MessageFlags } from 'discord-api-types/v10';

const Root = LanguageKeys.Commands.XKCD;

@RegisterCommand((builder) =>
	applyLocalizedBuilder(builder, Root.RootName, Root.RootDescription) //
		.addNumberOption((builder) => applyLocalizedBuilder(builder, Root.OptionsId).setMinValue(1).setAutocomplete(true).setRequired(true))
)
export class UserCommand extends Command {
	public override async autocompleteRun(interaction: Command.AutocompleteInteraction, options: AutocompleteOptions) {
		const number = Number(options.id);
		if (Number.isInteger(number)) {
			const comic = getComic(number);
			if (comic !== null) return interaction.reply({ choices: [makeComicChoice(1, comic)] });
		}

		const results = await searchComic(options.id);
		return interaction.reply({ choices: makeComicChoices(results) });
	}

	public override async chatInputRun(interaction: Command.ChatInputInteraction, options: Options) {
		const comic = getComic(options.id);
		if (isNullish(comic)) {
			const content = resolveUserKey(interaction, Root.NoComicFound);
			return interaction.reply({ content, flags: MessageFlags.Ephemeral });
		}

		const embed = new EmbedBuilder()
			.setColor(BrandingColors.Primary)
			.setTitle(comic.title)
			.setURL(`https://xkcd.com/${comic.id}`)
			.setImage(comic.image)
			.setFooter({ text: comic.id.toString() })
			.setTimestamp(comic.date);
		if (comic.alt) embed.setDescription(comic.alt);

		let hasButtons = false;
		const t = getSupportedLanguageT(interaction);
		const components = new ActionRowBuilder<ButtonBuilder>();
		if (comic.transcript) {
			const button = new ButtonBuilder() //
				.setCustomId(`xkcd.${comic.id}.transcript`)
				.setLabel(t(Root.ButtonsTranscript))
				.setStyle(ButtonStyle.Secondary);
			components.addComponents(button);
			hasButtons = true;
		}

		if (comic.news) {
			const button = new ButtonBuilder() //
				.setCustomId(`xkcd.${comic.id}.news`)
				.setLabel(t(Root.ButtonsNews))
				.setStyle(ButtonStyle.Secondary);
			components.addComponents(button);
			hasButtons = true;
		}

		// Reply with the embed and buttons:
		const response = await interaction.reply({ embeds: [embed.toJSON()], components: hasButtons ? [components.toJSON()] : undefined });

		// Increase the comic's usage count:
		await this.container.prisma.comic.upsert({ where: { id: comic.id }, update: { uses: { increment: 1 } }, create: { id: comic.id, uses: 1 } });

		return response;
	}
}

type AutocompleteOptions = AutocompleteInteractionArguments<{ id: string }>;

interface Options {
	id: number;
}
