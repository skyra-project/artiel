import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { getImageUrl } from '#lib/utilities/image';
import { EmbedBuilder } from '@discordjs/builders';
import { Time } from '@sapphire/time-utilities';
import { Command, RegisterCommand } from '@skyra/http-framework';
import { applyLocalizedBuilder, resolveUserKey } from '@skyra/http-framework-i18n';
import { Json, isAbortError, safeTimedFetch, type FetchError } from '@skyra/safe-fetch';
import { MessageFlags } from 'discord-api-types/v10';

const url = new URL('https://randomfox.ca/floof');
const Root = LanguageKeys.Commands.Fox;

@RegisterCommand((builder) => applyLocalizedBuilder(builder, Root.RootName, Root.RootDescription))
export class UserCommand extends Command {
	public override async chatInputRun(interaction: Command.ChatInputInteraction) {
		const result = await Json<FoxResultOk>(safeTimedFetch(url, Time.Second * 2));

		return result.match({
			ok: (value) => this.handleOk(interaction, value),
			err: (error) => this.handleError(interaction, error)
		});
	}

	private handleOk(interaction: Command.ChatInputInteraction, value: FoxResultOk) {
		const imageUrl = getImageUrl(value.image) ?? 'https://i.imgur.com/JCtnTv8.png';

		const embed = new EmbedBuilder() //
			.setImage(imageUrl)
			.setTimestamp();

		return interaction.reply({ embeds: [embed.toJSON()] });
	}

	private handleError(interaction: Command.ChatInputInteraction, error: FetchError) {
		const key = isAbortError(error) ? Root.AbortError : Root.UnknownError;
		return interaction.reply({ content: resolveUserKey(interaction, key), flags: MessageFlags.Ephemeral });
	}
}

export interface FoxResultOk {
	image: string;
	link: string;
}
