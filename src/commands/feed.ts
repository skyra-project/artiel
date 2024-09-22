import { BrandingColors } from '#lib/common/constants';
import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { randomEnum } from '#lib/utilities/utils';
import { EmbedBuilder, userMention } from '@discordjs/builders';
import { Time } from '@sapphire/duration';
import { Command, RegisterCommand } from '@skyra/http-framework';
import { applyLocalizedBuilder, createSelectMenuChoiceName, getSupportedLanguageT, resolveKey } from '@skyra/http-framework-i18n';
import { Json, isAbortError, safeTimedFetch, type FetchError } from '@skyra/safe-fetch';

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

		const url = new URL(`https://foodish-api.com/api/images/${type}`);
		url.searchParams.append('accept', 'application/json');

		const result = await Json<FeedResultOk>(safeTimedFetch(url, Time.Second * 2));

		const embed = result.match({
			ok: (value) => this.handleOk(interaction, value, type),
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

	private handleOk(interaction: Command.ChatInputInteraction, value: FeedResultOk, type: FeedType) {
		const t = getSupportedLanguageT(interaction);

		const description = t(Root.EmbedTitle, {
			type: t(Root.FoodKey(type)),
			target: userMention(interaction.user.id)
		});

		return this.makeEmbed(value.image).setDescription(description);
	}
}

interface Options {
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
