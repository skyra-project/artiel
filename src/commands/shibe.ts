import { BrandingColors } from '#lib/common/constants';
import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { EmbedBuilder } from '@discordjs/builders';
import { Time } from '@sapphire/duration';
import { Command, RegisterCommand } from '@skyra/http-framework';
import { applyLocalizedBuilder, resolveKey } from '@skyra/http-framework-i18n';
import { Json, isAbortError, safeTimedFetch, type FetchError } from '@skyra/safe-fetch';
import { ApplicationIntegrationType, InteractionContextType } from 'discord-api-types/v10';

const url = new URL('https://shibe.online/api/shibes?count=1');
const Root = LanguageKeys.Commands.Shibe;
const FallbackImageUrl = 'https://i.imgur.com/JJL4ErN.jpg';

@RegisterCommand((builder) =>
	applyLocalizedBuilder(builder, Root.RootName, Root.RootDescription)
		.setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
		.setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
)
export class UserCommand extends Command {
	public override async chatInputRun(interaction: Command.ChatInputInteraction) {
		const result = await Json<ShibeResultOk>(safeTimedFetch(url, Time.Second * 2));

		const embed = result.match({
			ok: ([value]) => this.makeEmbed(value),
			err: (error) => this.handleError(interaction, error)
		});
		return interaction.reply({ embeds: [embed.toJSON()] });
	}

	private makeEmbed(url = FallbackImageUrl) {
		return new EmbedBuilder().setImage(url).setColor(BrandingColors.Primary);
	}

	private handleError(interaction: Command.ChatInputInteraction, error: FetchError) {
		if (!isAbortError(error)) this.container.logger.error(error);
		return this.makeEmbed().setDescription(resolveKey(interaction, Root.Error));
	}
}

type ShibeResultOk = [string];
