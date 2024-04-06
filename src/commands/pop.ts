import { Colors } from '#lib/common/constants';
import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { popGames } from '#lib/utilities/pop';
import { random } from '#lib/utilities/utils';
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder } from '@discordjs/builders';
import { Time } from '@sapphire/duration';
import { DiscordSnowflake } from '@sapphire/snowflake';
import { Command, RegisterCommand } from '@skyra/http-framework';
import { applyLocalizedBuilder, getSupportedLanguageT } from '@skyra/http-framework-i18n';
import { ButtonStyle } from 'discord-api-types/v10';

const Root = LanguageKeys.Commands.Pop;

@RegisterCommand((builder) =>
	applyLocalizedBuilder(builder, Root.RootName, Root.RootDescription)
		.addIntegerOption((builder) => applyLocalizedBuilder(builder, Root.OptionsTimeSpan))
		.addIntegerOption((builder) => applyLocalizedBuilder(builder, Root.OptionsWidth))
		.addIntegerOption((builder) => applyLocalizedBuilder(builder, Root.OptionsHeight))
		.addIntegerOption((builder) => applyLocalizedBuilder(builder, Root.OptionsLength))
)
export class UserCommand extends Command {
	private readonly characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

	public override async chatInputRun(interaction: Command.ChatInputInteraction, options: Options) {
		const t = getSupportedLanguageT(interaction);
		const [time, width, height, length] = [
			this.parseOption(options.timespan ? options.timespan * Time.Second : undefined, Time.Second * 30, Time.Second * 10, Time.Minute * 2),
			this.parseOption(options.width, 8, 1, 10),
			this.parseOption(options.height, 3, 1, 8),
			this.parseOption(options.length, 3, 3, 5)
		];

		const pop = this.generatePop(length);
		const solution = this.generateSolution(length);
		const gameKey = DiscordSnowflake.generate();

		const board = [...this.generateBoard(width, height, pop, solution)].join('\n');
		const embed = new EmbedBuilder() //
			.setColor(Colors.Indigo)
			.setTitle(t(Root.Title))
			.setDescription(board)
			.setTimestamp();
		const components = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder() //
				.setCustomId(`pop.${solution}.${gameKey}.${Date.now() + time + Time.Second}`)
				.setLabel(t(Root.ButtonsInputSolution))
				.setStyle(ButtonStyle.Secondary)
		);

		const response = await interaction.defer();
		await response.update({ embeds: [embed.toJSON()], components: [components.toJSON()] });

		popGames.set(gameKey, {
			response,
			timer: setTimeout(async () => {
				embed.setColor(Colors.Red).setTitle(t(Root.TitleLost));

				embed.setDescription(board.replaceAll('||', '').replaceAll('``', ''));
				await response.update({ embeds: [embed.toJSON()], components: [] });
			}, time)
		});
	}

	private generatePop(length: number) {
		if (length <= 3) return 'pop';
		return `p${'o'.repeat(length - 2)}p`;
	}

	private generateSolution(length: number) {
		let output = '';
		for (let i = 0; i < length; ++i) {
			output += this.characters[random(this.characters.length)];
		}

		return output;
	}

	private *generateBoard(width: number, height: number, pop: string, solution: string): IterableIterator<string> {
		const wrappedPop = `||\`${pop}\`||`;
		const wrappedSolution = `||\`${solution}\`||`;
		if (height === 0) {
			return yield this.generateBoardLineWithSolution(wrappedPop, wrappedSolution, width);
		}

		const solutionY = random(height);
		const fullPops = this.generateBoardLineFullPops(wrappedPop, width);

		let y = 0;
		for (; y < solutionY; ++y) yield fullPops;

		yield this.generateBoardLineWithSolution(wrappedPop, wrappedSolution, width);
		++y;

		for (; y < height; ++y) yield fullPops;
	}

	private generateBoardLineFullPops(pop: string, width: number) {
		return pop.repeat(width);
	}

	private generateBoardLineWithSolution(pop: string, solution: string, width: number) {
		const solutionX = random(width);
		return pop.repeat(solutionX) + solution + pop.repeat(width - solutionX - 1);
	}

	private parseOption(option: number | undefined, defaultValue: number, minimum: number, maximum: number) {
		if (option === undefined) return defaultValue;
		return Math.max(minimum, Math.min(maximum, option));
	}
}

interface Options {
	width?: number;
	height?: number;
	length?: number;
	timespan?: number;
}
