import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import {
	buildGameControls,
	checkPotentialMoves,
	coordinateComponents,
	EmojiGameComponents as EGC,
	encodeLevel,
	getPlayer,
	parseGameComponents,
	parseLevel
} from '#lib/utilities/sokoban';
import { Command, RegisterCommand, RegisterSubcommand, type AutocompleteInteractionArguments } from '@skyra/http-framework';
import { applyLocalizedBuilder, getSupportedLanguageT } from '@skyra/http-framework-i18n';
import { MessageFlags } from 'discord-api-types/v10';

const Root = LanguageKeys.Commands.Sokoban;

@RegisterCommand((builder) => applyLocalizedBuilder(builder, Root.RootName, Root.RootDescription))
export class UserCommand extends Command {
	/** TODO: import json file and parse the levels into  game components */
	private readonly Levels = { default: '00#####.###   #.#TPB  #.### BT#.#T##B #.# # T ##.#B ZBBT#.#   T  #.########' };

	@RegisterSubcommand((builder) =>
		applyLocalizedBuilder(builder, Root.OptionPlayLevel) //
			.addStringOption((builder) => applyLocalizedBuilder(builder, Root.OptionChooseLevel).setAutocomplete(true).setRequired(true))
	)
	// TODO: actually load a level from the options utilizing the levels json file
	public async level(interaction: Command.ChatInputInteraction, _options: LoadLevelOptions) {
		const t = getSupportedLanguageT(interaction);
		const level = this.buildDefaultLevel();
		const coordinatedGameComponents = coordinateComponents(parseGameComponents(t, level).unwrap());
		const player = getPlayer(coordinatedGameComponents);

		await interaction.reply({
			content: level,
			components: buildGameControls(checkPotentialMoves(player, coordinatedGameComponents)),
			flags: MessageFlags.Ephemeral
		});
	}

	public override autocompleteRun(interaction: Command.AutocompleteInteraction, options: AutocompleteOptions) {
		const levelChoices = (Reflect.ownKeys(this.Levels) as string[]).map((name) => ({ name, value: name }));
		if (options.level === null)
			return interaction.reply({
				choices: levelChoices.slice(0, 25)
			});
		return interaction.reply({
			choices: levelChoices.filter((choice) => choice.name.toLowerCase().includes(options.level.toLowerCase())).slice(0, 25)
		});
	}

	@RegisterSubcommand((builder) =>
		applyLocalizedBuilder(builder, Root.OptionPlayCustomLevel) //
			.addStringOption((builder) => applyLocalizedBuilder(builder, Root.OptionImportCustomLevel).setRequired(true))
	)
	public async customLevel(interaction: Command.ChatInputInteraction, options: ImportCustomLevelOptions) {
		const t = getSupportedLanguageT(interaction);
		const levelResult = parseLevel(t, options.import);
		if (levelResult.isErr()) return interaction.reply({ content: levelResult.unwrapErr(), flags: MessageFlags.Ephemeral });
		const level = levelResult.unwrap();
		const coordinatedGameComponents = coordinateComponents(level);
		const player = getPlayer(coordinatedGameComponents);

		return interaction.reply({
			content: encodeLevel(level),
			components: buildGameControls(checkPotentialMoves(player, coordinatedGameComponents)),
			flags: MessageFlags.Ephemeral
		});
	}

	private buildDefaultLevel() {
		return [
			EGC.Empty + EGC.Empty + EGC.Wall + EGC.Wall + EGC.Wall + EGC.Wall + EGC.Wall,
			EGC.Wall + EGC.Wall + EGC.Wall + EGC.Floor + EGC.Floor + EGC.Floor + EGC.Wall,
			EGC.Wall + EGC.FloorTarget + EGC.Player + EGC.Box + EGC.Floor + EGC.Floor + EGC.Wall,
			EGC.Wall + EGC.Wall + EGC.Wall + EGC.Floor + EGC.Box + EGC.FloorTarget + EGC.Wall,
			EGC.Wall + EGC.FloorTarget + EGC.Wall + EGC.Wall + EGC.Box + EGC.Floor + EGC.Wall,
			EGC.Wall + EGC.Floor + EGC.Wall + EGC.Floor + EGC.FloorTarget + EGC.Floor + EGC.Wall + EGC.Wall,
			EGC.Wall + EGC.Box + EGC.Floor + EGC.BoxTarget + EGC.Box + EGC.Box + EGC.FloorTarget + EGC.Wall,
			EGC.Wall + EGC.Floor + EGC.Floor + EGC.Floor + EGC.FloorTarget + EGC.Floor + EGC.Floor + EGC.Wall,
			EGC.Wall + EGC.Wall + EGC.Wall + EGC.Wall + EGC.Wall + EGC.Wall + EGC.Wall + EGC.Wall
		].join(EGC.NewLine);
	}
}

interface LoadLevelOptions {
	level?: string;
}

type AutocompleteOptions = AutocompleteInteractionArguments<Required<LoadLevelOptions>>;

interface ImportCustomLevelOptions {
	import: string;
}
