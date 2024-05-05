import { PathSrc } from '#lib/common/constants';
import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { buildGameControls, buildSokobanGameFromResolvableLevel, encodeResolvableLevel } from '#lib/utilities/sokoban';
import { Command, RegisterCommand, RegisterSubcommand, type AutocompleteInteractionArguments } from '@skyra/http-framework';
import { applyLocalizedBuilder, getSupportedLanguageT } from '@skyra/http-framework-i18n';
import { MessageFlags } from 'discord-api-types/v10';
import { readFile } from 'fs/promises';
import { URL } from 'url';

const Root = LanguageKeys.Commands.Sokoban;
const Levels: Level[] = JSON.parse(await readFile(new URL('lib/common/levels.json', PathSrc), { encoding: 'utf-8' }));

@RegisterCommand((builder) => applyLocalizedBuilder(builder, Root.RootName, Root.RootDescription))
export class UserCommand extends Command {
	@RegisterSubcommand((builder) =>
		applyLocalizedBuilder(builder, Root.OptionPlayLevel) //
			.addStringOption((builder) => applyLocalizedBuilder(builder, Root.OptionChooseLevel).setAutocomplete(true).setRequired(true))
	)
	public async level(interaction: Command.ChatInputInteraction, options: LoadLevelOptions) {
		const t = getSupportedLanguageT(interaction);
		const resolvableLevel = Levels.find((level) => level.name === (options.level ?? 'default'));
		if (!resolvableLevel) {
			return interaction.reply({
				content: t(LanguageKeys.Commands.Sokoban.SokobanInvalidLevel),
				flags: MessageFlags.Ephemeral
			});
		}
		const levelResult = buildSokobanGameFromResolvableLevel(resolvableLevel.data);

		if (levelResult.isErr()) {
			return interaction.reply({
				content: t(LanguageKeys.Commands.Sokoban.SokobanInvalidComponent, { value: levelResult.unwrapErr() }),
				flags: MessageFlags.Ephemeral
			});
		}

		const level = levelResult.unwrap();

		return interaction.reply({
			content: level.toString(),
			components: buildGameControls(encodeResolvableLevel(level.components), level.checkPossibleMoves()),
			flags: MessageFlags.Ephemeral
		});
	}

	public override autocompleteRun(interaction: Command.AutocompleteInteraction, options: AutocompleteOptions) {
		const levelChoices = Levels.map(({ name }) => ({ name, value: name }));
		if (options.level === null) {
			return interaction.reply({
				choices: levelChoices.slice(0, 25)
			});
		}
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
		const levelResult = buildSokobanGameFromResolvableLevel(options.import);
		if (levelResult.isErr()) {
			return interaction.reply({
				content: t(LanguageKeys.Commands.Sokoban.SokobanInvalidComponent, { value: levelResult.unwrapErr() }),
				flags: MessageFlags.Ephemeral
			});
		}
		const level = levelResult.unwrap();

		return interaction.reply({
			content: level.toString(),
			components: buildGameControls(encodeResolvableLevel(level.components), level.checkPossibleMoves()),
			flags: MessageFlags.Ephemeral
		});
	}
}

interface Level {
	name: string;
	data: string;
	difficulty: number;
}

interface LoadLevelOptions {
	level?: string;
}

type AutocompleteOptions = AutocompleteInteractionArguments<Required<LoadLevelOptions>>;

interface ImportCustomLevelOptions {
	import: string;
}
