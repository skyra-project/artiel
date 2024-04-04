import { Colors } from '#lib/common/constants';
import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { getTag } from '#lib/utilities/discord';
import { ActionRowBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder } from '@discordjs/builders';
import { InteractionHandler } from '@skyra/http-framework';
import { getSupportedLanguageT } from '@skyra/http-framework-i18n';
import { InteractionType, MessageFlags } from 'discord-api-types/v10';
import { popGames } from '../commands/pop.js';

const Root = LanguageKeys.Commands.Pop;

export class UserHandler extends InteractionHandler {
	public async run(interaction: InteractionHandler.ButtonInteraction | InteractionHandler.ModalInteraction, parameters: Parameters) {
		const t = getSupportedLanguageT(interaction);

		if (interaction.type === InteractionType.MessageComponent)
			return interaction.showModal(
				new ModalBuilder()
					.setTitle(t(Root.ModalTitle))
					.setCustomId(interaction.data.custom_id)
					.setComponents([
						new ActionRowBuilder<TextInputBuilder>().addComponents(
							new TextInputBuilder()
								.setCustomId('solution')
								.setPlaceholder(t(Root.ModalInputPlaceholder))
								.setMinLength(3)
								.setMaxLength(5)
								.setRequired(true)
						)
					])
					.toJSON()
			);

		const [solution, gameKey] = parameters;
		const popGame = popGames.get(gameKey);
		if (!popGame) return interaction.reply({ content: t(Root.NonexistentGame), flags: MessageFlags.Ephemeral });

		const { response, timer } = popGame;
		if (interaction.data.components[0].components[0].value !== solution)
			return interaction.reply({ content: t(Root.WrongSolution), flags: MessageFlags.Ephemeral });

		clearTimeout(timer);
		popGames.delete(gameKey);

		const result = await response.get();

		if (result.isErr()) return interaction.reply({ content: t(Root.MessageFetchFailed), flags: MessageFlags.Ephemeral });

		const embed = new EmbedBuilder(result.unwrapRaw().embeds[0]);
		const value = getTag(interaction.user);
		embed
			.setColor(Colors.Green)
			.setTitle(t(Root.TitleWinner, { value }))
			.setDescription(embed.data.description!.replaceAll('||', '').replaceAll('``', ''));

		return response.update({ embeds: [embed.toJSON()], components: [] });
	}
}

type Parameters = [solution: string, gameKey: bigint];
