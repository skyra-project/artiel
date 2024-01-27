import { BrandingColors } from '#lib/common/constants';
import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { getImageUrl } from '#lib/utilities/image';
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder } from '@discordjs/builders';
import { Time } from '@sapphire/duration';
import { isNullishOrEmpty } from '@sapphire/utilities';
import { Command, RegisterCommand } from '@skyra/http-framework';
import { applyLocalizedBuilder, resolveKey } from '@skyra/http-framework-i18n';
import { Json, isAbortError, safeTimedFetch, type FetchError } from '@skyra/safe-fetch';
import { ButtonStyle } from 'discord-api-types/v10';

const url = new URL('https://api.bunnies.io/v2/loop/random/?media=gif,png');
const Root = LanguageKeys.Commands.Bunny;
const FallbackImageUrl = 'https://i.imgur.com/FnAPcxj.jpg';

@RegisterCommand((builder) => applyLocalizedBuilder(builder, Root.RootName, Root.RootDescription))
export class UserCommand extends Command {
	public override async chatInputRun(interaction: Command.ChatInputInteraction) {
		const result = await Json<BunnyResultOk>(safeTimedFetch(url, Time.Second * 2));

		const data = result.match({
			ok: (value) => this.makeData(interaction, getImageUrl(value.media.gif), this.getSource(value.source)),
			err: (error) => this.handleError(interaction, error)
		});

		return interaction.reply({ embeds: [data.embed.toJSON()], components: [data.row.toJSON()] });
	}

	private makeData(interaction: Command.ChatInputInteraction, url = FallbackImageUrl, source?: string | null) {
		const embed = new EmbedBuilder().setImage(url).setColor(BrandingColors.Primary);

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder() //
				.setStyle(ButtonStyle.Link)
				.setLabel(resolveKey(interaction, Root.ButtonLinkToImage))
				.setURL(url)
		);

		// If there is a source, add it to the row:
		if (source) {
			row.addComponents(
				new ButtonBuilder() //
					.setStyle(ButtonStyle.Link)
					.setLabel(resolveKey(interaction, Root.ButtonSource))
					.setURL(source)
			);
		}
		return { embed, row };
	}

	private handleError(interaction: Command.ChatInputInteraction, error: FetchError) {
		if (!isAbortError(error)) this.container.logger.error(error);

		const data = this.makeData(interaction);
		data.embed.setDescription(resolveKey(interaction, Root.Error));
		return data;
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
