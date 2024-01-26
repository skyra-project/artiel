import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { getImageUrl } from '#lib/utilities/image';
import { EmbedBuilder, hyperlink } from '@discordjs/builders';
import { Time } from '@sapphire/time-utilities';
import { isNullishOrEmpty } from '@sapphire/utilities';
import { Command, RegisterCommand } from '@skyra/http-framework';
import { applyLocalizedBuilder, getSupportedLanguageT, resolveUserKey } from '@skyra/http-framework-i18n';
import { Json, isAbortError, safeTimedFetch, type FetchError } from '@skyra/safe-fetch';
import { MessageFlags } from 'discord-api-types/v10';

const url = new URL('https://api.bunnies.io/v2/loop/random/?media=gif,png');
const Root = LanguageKeys.Commands.Bunny;

@RegisterCommand((builder) => applyLocalizedBuilder(builder, Root.RootName, Root.RootDescription))
export class UserCommand extends Command {
	public override async chatInputRun(interaction: Command.ChatInputInteraction) {
		const result = await Json<BunnyResultOk>(safeTimedFetch(url, Time.Second * 2));

		return result.match({
			ok: (value) => this.handleOk(interaction, value),
			err: (error) => this.handleError(interaction, error)
		});
	}

	private handleOk(interaction: Command.ChatInputInteraction, value: BunnyResultOk) {
		const imageUrl = getImageUrl(value.media.gif) ?? 'https://i.imgur.com/FnAPcxj.jpg';
		const t = getSupportedLanguageT(interaction);
		const source = this.getSource(value.source);

		const embed = new EmbedBuilder() //
			.setURL(imageUrl)
			.setTitle(t(Root.EmbedTitle))
			.setImage(imageUrl)
			.setTimestamp();

		if (source) {
			embed.setDescription(hyperlink(t(Root.EmbedSource), source));
		}

		return interaction.reply({ embeds: [embed.toJSON()] });
	}

	private handleError(interaction: Command.ChatInputInteraction, error: FetchError) {
		const key = isAbortError(error) ? Root.AbortError : Root.UnknownError;
		return interaction.reply({ content: resolveUserKey(interaction, key), flags: MessageFlags.Ephemeral });
	}

	private getSource(bunnySource: string): string | null {
		if (isNullishOrEmpty(bunnySource) || bunnySource.toLowerCase() === 'unknown') return null;
		return bunnySource;
	}
}

interface BunnyResultOk {
	id: string;
	media: {
		gif: string;
		poster: string;
	};
	source: string;
	thisServed: number;
	totalServed: number;
}
