import { BrandingColors } from '#lib/common/constants';
import { getArticle, getArticleLineOptionEmoji, getArticleLineOptionName, getFormulaImageURL, type WhatIf } from '#lib/utilities/what-if';
import {
	ActionRowBuilder,
	ButtonBuilder,
	EmbedBuilder,
	SelectMenuBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder
} from '@discordjs/builders';
import { InteractionHandler, type Interactions, type MessageResponseOptions } from '@skyra/http-framework';
import { ButtonStyle, MessageFlags } from 'discord-api-types/v10';

export class UserHandler extends InteractionHandler {
	public async run(
		interaction: InteractionHandler.ButtonInteraction | Interactions.MessageComponentStringSelect,
		[id, userId, action, page]: Parameters
	) {
		const entry = getArticle(Number(id))!;
		const pageId = this.#getPageId(interaction, action, page);
		const body = this.#renderPage(entry, interaction.user.id, pageId);

		return userId === interaction.user.id //
			? interaction.update(body)
			: interaction.reply({ ...body, flags: MessageFlags.Ephemeral });
	}

	#getPageId(
		interaction: InteractionHandler.ButtonInteraction | Interactions.MessageComponentStringSelect,
		action: 'previous' | 'next' | 'select',
		page: `${bigint}` | undefined
	): number {
		if (action === 'previous') return Number(page) - 1;
		if (action === 'next') return Number(page) + 1;

		const [value] = (interaction as Interactions.MessageComponentStringSelect).values;
		return Number(value);
	}

	#renderPage(entry: WhatIf, userId: string, lineId: number): MessageResponseOptions {
		const embed = new EmbedBuilder()
			.setColor(BrandingColors.Primary)
			.setTitle(entry.title)
			.setURL(`https://what-if.xkcd.com/${entry.id}`)
			.setFooter({ text: entry.id.toString() });

		const line = entry.lines[lineId];
		if (line.type === 'p') {
			embed.setDescription(line.text);
			if (line.image) {
				if (line.image.type === 'img') embed.setImage(line.image.src);
				else if (line.image.type === 'formula') embed.setImage(getFormulaImageURL(line.image.hash));
			}
		} else if (line.type === 'img') {
			embed.setDescription(line.alt).setImage(line.src);
		} else {
			embed.setImage(getFormulaImageURL(line.hash));
		}

		const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder() //
				.setCustomId(`what-if.${entry.id}.${userId}.previous.${lineId}`)
				.setEmoji({ name: '⬅️' })
				.setStyle(ButtonStyle.Primary)
				.setDisabled(lineId === 0),
			new ButtonBuilder() //
				.setCustomId(`what-if.${entry.id}.${userId}.next.${lineId}`)
				.setEmoji({ name: '➡️' })
				.setStyle(ButtonStyle.Primary)
				.setDisabled(lineId === entry.lines.length - 1)
		);

		const selector = new ActionRowBuilder<SelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder() //
				.setCustomId(`what-if.${entry.id}.${userId}.select`)
				.addOptions(
					entry.lines.map((line, index) =>
						new StringSelectMenuOptionBuilder() //
							.setLabel(getArticleLineOptionName(line))
							.setEmoji({ name: getArticleLineOptionEmoji(line) })
							.setValue(index.toString())
							.setDefault(index === lineId)
					)
				)
		);

		return { embeds: [embed.toJSON()], components: [buttons.toJSON(), selector.toJSON()] };
	}
}

type Parameters =
	| [id: `${bigint}`, userId: `${bigint}`, action: 'select']
	| [id: `${bigint}`, userId: `${bigint}`, action: 'previous' | 'next', page: `${bigint}`];
