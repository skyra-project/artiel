import { BrandingColors } from '#lib/common/constants';
import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { EmbedBuilder } from '@discordjs/builders';
import { Time } from '@sapphire/duration';
import { isNullishOrEmpty } from '@sapphire/utilities';
import { envParseString } from '@skyra/env-utilities';
import { Command, RegisterCommand } from '@skyra/http-framework';
import { applyLocalizedBuilder, resolveKey } from '@skyra/http-framework-i18n';
import { Json, isAbortError, safeTimedFetch, type FetchError } from '@skyra/safe-fetch';
import { ApplicationIntegrationType, InteractionContextType } from 'discord-api-types/v10';

const Root = LanguageKeys.Commands.Cat;
const FallbackImageUrl = 'https://wallpapercave.com/wp/wp3021105.jpg';

@RegisterCommand((builder) =>
	applyLocalizedBuilder(builder, Root.RootName, Root.RootDescription)
		.setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
		.setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
)
export class UserCommand extends Command {
	public override async chatInputRun(interaction: Command.ChatInputInteraction) {
		const url = new URL('https://api.thecatapi.com/v1/images/search');
		url.searchParams.append('size', 'small');
		url.searchParams.append('mime_types', 'jpg,png,gif');
		url.searchParams.append('has_breeds', 'true');
		url.searchParams.append('limit', '1');

		const result = await Json<CatResultOk>(safeTimedFetch(url, Time.Second * 2, { headers: { 'X-API-KEY': envParseString('CAT_API_TOKEN') } }));

		const embed = result.match({
			ok: ([value]) =>
				this.makeEmbed(
					value.url,
					value.breeds.map((breed) => breed.name)
				),
			err: (error) => this.handleError(interaction, error)
		});
		return interaction.reply({ embeds: [embed.toJSON()] });
	}

	private makeEmbed(url = FallbackImageUrl, breeds?: readonly string[]) {
		const embed = new EmbedBuilder().setImage(url).setColor(BrandingColors.Primary);

		// Add a title only if there are breeds:
		if (!isNullishOrEmpty(breeds)) {
			embed.setTitle(breeds[0]);
		}

		return embed;
	}

	private handleError(interaction: Command.ChatInputInteraction, error: FetchError) {
		if (!isAbortError(error)) this.container.logger.error(error);
		return this.makeEmbed().setDescription(resolveKey(interaction, Root.Error));
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
