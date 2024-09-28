import { BrandingColors } from '#lib/common/constants';
import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import {
	getArticle,
	getArticleLineOptionEmoji,
	getArticleLineOptionName,
	makeArticleChoice,
	makeArticleChoices,
	searchArticle
} from '#lib/utilities/what-if';
import { fetchComic, makeComicChoice, makeComicChoices, searchComic } from '#lib/utilities/xkcd';
import {
	ActionRowBuilder,
	ButtonBuilder,
	EmbedBuilder,
	SelectMenuBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	heading
} from '@discordjs/builders';
import { isNullish } from '@sapphire/utilities';
import { Command, RegisterCommand, RegisterSubcommand, type AutocompleteInteractionArguments } from '@skyra/http-framework';
import { applyLocalizedBuilder, getSupportedLanguageT, resolveUserKey } from '@skyra/http-framework-i18n';
import { ApplicationIntegrationType, ButtonStyle, InteractionContextType, MessageFlags } from 'discord-api-types/v10';

const Root = LanguageKeys.Commands.XKCD;

@RegisterCommand((builder) =>
	applyLocalizedBuilder(builder, Root.RootName, Root.RootDescription)
		.setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
		.setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
)
export class UserCommand extends Command {
	public override async autocompleteRun(interaction: Command.AutocompleteInteraction, options: AutocompleteOptions) {
		const number = Number(options.id);

		if (options.subCommand === 'comic') {
			if (Number.isInteger(number)) {
				const entry = await fetchComic(number);
				if (entry !== null) return interaction.reply({ choices: [makeComicChoice(1, entry)] });
			}

			const results = await searchComic(options.id);
			return interaction.reply({ choices: makeComicChoices(results) });
		}

		if (Number.isInteger(number)) {
			const entry = getArticle(number);
			if (entry !== null) return interaction.reply({ choices: [makeArticleChoice(1, entry)] });
		}

		const results = await searchArticle(options.id);
		return interaction.reply({ choices: makeArticleChoices(results) });
	}

	@RegisterSubcommand((builder) =>
		applyLocalizedBuilder(builder, Root.Comic) //
			.addIntegerOption((builder) => applyLocalizedBuilder(builder, Root.OptionsId).setMinValue(1).setAutocomplete(true).setRequired(true))
	)
	public async comic(interaction: Command.ChatInputInteraction, options: Options) {
		const comic = await fetchComic(options.id);
		if (isNullish(comic)) {
			const content = resolveUserKey(interaction, Root.NoComicFound, { value: options.id });
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

	@RegisterSubcommand((builder) =>
		applyLocalizedBuilder(builder, Root.WhatIf) //
			.addIntegerOption((builder) => applyLocalizedBuilder(builder, Root.OptionsId).setMinValue(1).setAutocomplete(true).setRequired(true))
	)
	public async whatIf(interaction: Command.ChatInputInteraction, options: Options) {
		const article = getArticle(options.id);
		if (isNullish(article)) {
			const content = resolveUserKey(interaction, Root.NoComicFound, { value: options.id });
			return interaction.reply({ content, flags: MessageFlags.Ephemeral });
		}

		const embed = new EmbedBuilder()
			.setColor(BrandingColors.Primary)
			.setTitle(article.title)
			.setURL(`https://what-if.xkcd.com/${article.id}`)
			.setDescription(article.questions.map((question) => `${heading(question.question, 3)}\n— ${question.author}`).join('\n\n'))
			.setFooter({ text: article.id.toString() });

		const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder() //
				.setCustomId(`what-if.${article.id}.${interaction.user.id}.previous.0`)
				.setEmoji({ name: '⬅️' })
				.setStyle(ButtonStyle.Primary)
				.setDisabled(true),
			new ButtonBuilder() //
				.setCustomId(`what-if.${article.id}.${interaction.user.id}.next.0`)
				.setEmoji({ name: '➡️' })
				.setStyle(ButtonStyle.Primary)
		);

		const selector = new ActionRowBuilder<SelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder() //
				.setCustomId(`what-if.${article.id}.${interaction.user.id}.select`)
				.addOptions(
					article.lines.map((line, index) =>
						new StringSelectMenuOptionBuilder() //
							.setLabel(getArticleLineOptionName(line))
							.setEmoji({ name: getArticleLineOptionEmoji(line) })
							.setValue(index.toString())
					)
				)
		);

		// Reply with the embed and buttons:
		const response = await interaction.reply({ embeds: [embed.toJSON()], components: [buttons.toJSON(), selector.toJSON()] });

		// Increase the comic's usage count:
		await this.container.prisma.whatIf.upsert({
			where: { id: article.id },
			update: { uses: { increment: 1 } },
			create: { id: article.id, uses: 1 }
		});

		return response;
	}
}

type AutocompleteOptions = AutocompleteInteractionArguments<{ id: string }>;

interface Options {
	id: number;
}
