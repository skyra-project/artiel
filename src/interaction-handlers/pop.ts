import { Colors } from '#lib/common/constants';
import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { getTag } from '#lib/utilities/discord';
import { popGames } from '#lib/utilities/pop';
import { ActionRowBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder } from '@discordjs/builders';
import { InteractionHandler } from '@skyra/http-framework';
import { getSupportedLanguageT } from '@skyra/http-framework-i18n';
import { InteractionType, MessageFlags, TextInputStyle } from 'discord-api-types/v10';

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
								.setStyle(TextInputStyle.Short)
								.setLabel(t(Root.ButtonsInputSolution))
								.setMinLength(3)
								.setMaxLength(5)
								.setRequired(true)
						)
					])
					.toJSON()
			);

		const [solution, gameKeyString, timestamp] = parameters;
		const gameKey = BigInt(gameKeyString);

		if (Date.now() > timestamp) {
			popGames.delete(gameKey);
			const embed = new EmbedBuilder(interaction.message?.embeds[0]);
			embed.setColor(Colors.Red).setTitle(t(Root.TitleLost));

			embed.setDescription(embed.data.description!.replaceAll('||', '').replaceAll('``', ''));
			return interaction.update({ embeds: [embed.toJSON()], components: [] });
		}

		if (!popGames.has(gameKey)) return interaction.reply({ content: t(Root.NonexistentGame), flags: MessageFlags.Ephemeral });

		const popGame = popGames.get(gameKey)!;
		const { response, timer } = popGame;
		if (interaction.data.components[0].components[0].value !== solution)
			return interaction.reply({ content: t(Root.WrongSolution), flags: MessageFlags.Ephemeral });

		clearTimeout(timer);
		popGames.delete(gameKey);

		const embed = new EmbedBuilder(interaction.message?.embeds[0]);
		const value = getTag(interaction.user);
		embed
			.setColor(Colors.Green)
			.setTitle(t(Root.TitleWinner, { value }))
			.setDescription(embed.data.description!.replaceAll('||', '').replaceAll('``', ''));

		await response.update({ embeds: [embed.toJSON()], components: [] });

		return interaction.reply({ content: t(Root.TitleWinner, { value }), flags: MessageFlags.Ephemeral });
	}
}

type Parameters = [solution: string, gameKey: bigint, timestamp: number];
