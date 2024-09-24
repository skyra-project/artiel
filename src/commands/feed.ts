import { BrandingColors } from '#lib/common/constants';
import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { randomEnum } from '#lib/utilities/utils';
import { ActionRowBuilder, bold, ButtonBuilder, EmbedBuilder, userMention } from '@discordjs/builders';
import { Time } from '@sapphire/duration';
import { Command, RegisterCommand, type MessageResponseOptions, type TransformedArguments } from '@skyra/http-framework';
import { applyLocalizedBuilder, createSelectMenuChoiceName, getSupportedLanguageT, resolveUserKey } from '@skyra/http-framework-i18n';
import { isAbortError, Json, safeTimedFetch, type FetchError } from '@skyra/safe-fetch';
import { ButtonStyle, MessageFlags } from 'discord-api-types/v10';

const Root = LanguageKeys.Commands.Feed;
const FallbackImageUrl = 'https://foodish-api.com/images/burger/burger82.jpg';

@RegisterCommand((builder) =>
	applyLocalizedBuilder(builder, Root.RootName, Root.RootDescription)
		.addUserOption((option) => applyLocalizedBuilder(option, Root.OptionsTarget).setRequired(true))
		.addStringOption((option) =>
			applyLocalizedBuilder(option, Root.OptionsType).addChoices(
				createSelectMenuChoiceName(Root.PizzaKey, { value: FeedType.Pizza }),
				createSelectMenuChoiceName(Root.BurgerKey, { value: FeedType.Burger }),
				createSelectMenuChoiceName(Root.RiceKey, { value: FeedType.Rice }),
				createSelectMenuChoiceName(Root.DessertKey, { value: FeedType.Dessert }),
				createSelectMenuChoiceName(Root.DosaKey, { value: FeedType.Dosa }),
				createSelectMenuChoiceName(Root.PastaKey, { value: FeedType.Pasta }),
				createSelectMenuChoiceName(Root.SamosaKey, { value: FeedType.Samosa }),
				createSelectMenuChoiceName(Root.BiryaniKey, { value: FeedType.Biryani })
			)
		)
)
export class UserCommand extends Command {
	public override async chatInputRun(interaction: Command.ChatInputInteraction, options: Options) {
		const type = options.type ?? randomEnum(FeedType);

		const url = new URL(type, 'https://foodish-api.com/api/images/');
		url.searchParams.append('accept', 'application/json');

		const result = await Json<FeedResultOk>(safeTimedFetch(url, Time.Second * 2));
		const data = result.match({
			ok: (value) => this.handleOk(interaction, value, { type, user: options.user }),
			err: (error) => this.handleError(interaction, error)
		});

		return interaction.reply(data);
	}

	private handleOk(interaction: Command.ChatInputInteraction, value: FeedResultOk, options: Required<Options>): MessageResponseOptions {
		const t = getSupportedLanguageT(interaction);

		const content = t(Root.Content, {
			type: bold(t(Root.FoodKey(options.type))),
			target: userMention(options.user.id)
		});

		const embed = new EmbedBuilder().setImage(value.image).setColor(BrandingColors.Primary);
		const button = new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(t(Root.ButtonSource)).setURL(value.image);
		return {
			embeds: [embed.toJSON()],
			components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button).toJSON()],
			content,
			allowed_mentions: { users: [options.user.id], roles: [], parse: [] }
		};
	}

	private handleError(interaction: Command.ChatInputInteraction, error: FetchError): MessageResponseOptions {
		if (!isAbortError(error)) this.container.logger.error(error);

		const embed = new EmbedBuilder()
			.setDescription(resolveUserKey(interaction, Root.Error))
			.setImage(FallbackImageUrl)
			.setColor(BrandingColors.Secondary);
		return { embeds: [embed.toJSON()], flags: MessageFlags.Ephemeral };
	}
}

interface Options {
	user: TransformedArguments.User;
	type?: FeedType;
}

interface FeedResultOk {
	image: string;
}

enum FeedType {
	Pizza = 'pizza',
	Burger = 'burger',
	Rice = 'rice',
	Dessert = 'dessert',
	Dosa = 'dosa',
	Pasta = 'pasta',
	Samosa = 'samosa',
	Biryani = 'biryani'
}
