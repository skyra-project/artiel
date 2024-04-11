import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { getAvatar, getColor, getTag } from '#lib/utilities/discord';
import { bold, EmbedBuilder, inlineCode } from '@discordjs/builders';
import { Command, RegisterCommand, type TransformedArguments } from '@skyra/http-framework';
import { applyLocalizedBuilder, getSupportedLanguageT } from '@skyra/http-framework-i18n';

const Root = LanguageKeys.Commands.Love;

@RegisterCommand((builder) =>
	applyLocalizedBuilder(builder, Root.RootName, Root.RootDescription) //
		.addUserOption((builder) => applyLocalizedBuilder(builder, Root.OptionsUser).setRequired(true))
)
export class UserCommand extends Command {
	/**
	 * @see {@linkplain https://www.fileformat.info/info/unicode/char/00a0/index.htm}
	 */
	private readonly NonBreakingSpace = '\u00A0';
	private readonly RevolvingHeartTwemoji = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72/1f49e.png';

	public override async chatInputRun(interaction: Command.ChatInputInteraction, options: Options) {
		const isSelf = interaction.user.id === options.user.id;
		const percentage = isSelf ? 1 : Math.random();
		const estimatedPercentage = Math.ceil(percentage * 100);
		const t = getSupportedLanguageT(interaction);

		let result: string;
		if (estimatedPercentage < 45) {
			result = t(Root.Less45);
		} else if (estimatedPercentage < 75) {
			result = t(Root.Less75);
		} else if (estimatedPercentage < 100) {
			result = t(Root.Less100);
		} else {
			result = t(isSelf ? Root.Itself : Root.At100);
		}

		const description = [
			`💗 ${bold(getTag(options.user.user))}`,
			`💗 ${bold(getTag(interaction.user))}\n`,
			`${estimatedPercentage}% ${inlineCode(`[${'█'.repeat(Math.round(percentage * 40)).padEnd(40, this.NonBreakingSpace)}]`)}\n`,
			`${bold(t(Root.Result))}: ${result}`
		].join('\n');
		const embed = new EmbedBuilder()
			.setColor(getColor(interaction))
			.setAuthor({ name: '❤ Love Meter ❤', iconURL: getAvatar(interaction.user, 128) })
			.setThumbnail(this.RevolvingHeartTwemoji)
			.setDescription(description);
		return interaction.reply({ embeds: [embed.toJSON()] });
	}
}

interface Options {
	user: TransformedArguments.User;
}
