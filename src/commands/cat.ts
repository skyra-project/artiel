import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { getImageUrl } from '#lib/utilities/image';
import { EmbedBuilder } from '@discordjs/builders';
import { Time } from '@sapphire/time-utilities';
import { envParseString } from '@skyra/env-utilities';
import { Command, RegisterCommand } from '@skyra/http-framework';
import { applyLocalizedBuilder, resolveUserKey } from '@skyra/http-framework-i18n';
import { Json, isAbortError, safeTimedFetch, type FetchError } from '@skyra/safe-fetch';
import { MessageFlags } from 'discord-api-types/v10';

const Root = LanguageKeys.Commands.Cat;

@RegisterCommand((builder) => applyLocalizedBuilder(builder, Root.RootName, Root.RootDescription))
export class UserCommand extends Command {
	public override async chatInputRun(interaction: Command.ChatInputInteraction) {
		const url = new URL('https://api.thecatapi.com/v1/images/search');
		url.searchParams.append('size', 'small');
		url.searchParams.append('mime_types', 'jpg,png,gif');
		url.searchParams.append('has_breeds', 'true');
		url.searchParams.append('limit', '1');

		const result = await Json<CatResultOk>(safeTimedFetch(url, Time.Second * 2, { headers: { 'X-API-KEY': envParseString('CAT_API_TOKEN') } }));

		return result.match({
			ok: (value) => this.handleOk(interaction, value),
			err: (error) => this.handleError(interaction, error)
		});
	}

	private handleOk(interaction: Command.ChatInputInteraction, [value]: CatResultOk) {
		const imageUrl = getImageUrl(value.url) ?? 'https://wallpapercave.com/wp/wp3021105.jpg';

		const embed = new EmbedBuilder() //
			.setTitle(value.breeds[0]?.name)
			.setImage(imageUrl)
			.setTimestamp();

		return interaction.reply({ embeds: [embed.toJSON()] });
	}

	private handleError(interaction: Command.ChatInputInteraction, error: FetchError) {
		const key = isAbortError(error) ? Root.AbortError : Root.UnknownError;
		return interaction.reply({ content: resolveUserKey(interaction, key), flags: MessageFlags.Ephemeral });
	}
}

type CatResultOk = [CatResultOkEntry];

interface CatResultOkEntry {
	url: string;
	breeds: {
		name: string;
		temperament: string;
	}[];
}
