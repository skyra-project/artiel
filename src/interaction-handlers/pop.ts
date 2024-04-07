import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { ActionRowBuilder, ModalBuilder, TextInputBuilder } from '@discordjs/builders';
import { InteractionHandler } from '@skyra/http-framework';
import { getSupportedLanguageT } from '@skyra/http-framework-i18n';
import { TextInputStyle } from 'discord-api-types/v10';

const Root = LanguageKeys.Commands.Pop;

export class UserHandler extends InteractionHandler {
	public async run(interaction: InteractionHandler.ButtonInteraction) {
		const t = getSupportedLanguageT(interaction);

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
	}
}
