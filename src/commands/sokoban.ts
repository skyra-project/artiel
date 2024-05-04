import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { buildGameControls, buildMatrixFromResolvableLevel, encodeLevel, encodeResolvableLevel } from '#lib/utilities/sokoban';
import { Command, RegisterCommand, RegisterSubcommand, type AutocompleteInteractionArguments } from '@skyra/http-framework';
import { applyLocalizedBuilder, getSupportedLanguageT } from '@skyra/http-framework-i18n';
import { MessageFlags } from 'discord-api-types/v10';
import { readFile } from 'fs/promises';

const Root = LanguageKeys.Commands.Sokoban;
const Levels: Record<string, string> = JSON.parse(await readFile('src/lib/common/levels.json', { encoding: 'utf-8' }));

@RegisterCommand((builder) => applyLocalizedBuilder(builder, Root.RootName, Root.RootDescription))
export class UserCommand extends Command {
	@RegisterSubcommand((builder) =>
		applyLocalizedBuilder(builder, Root.OptionPlayLevel) //
			.addStringOption((builder) => applyLocalizedBuilder(builder, Root.OptionChooseLevel).setAutocomplete(true).setRequired(true))
	)
	public async level(interaction: Command.ChatInputInteraction, options: LoadLevelOptions) {
		const t = getSupportedLanguageT(interaction);
		const resolvableLevel = Levels[options.level ?? 'default'];
		if (!resolvableLevel)
			return interaction.reply({
				content: t(LanguageKeys.Commands.Sokoban.SokobanInvalidLevel),
				flags: MessageFlags.Ephemeral
			});
		const levelResult = buildMatrixFromResolvableLevel(resolvableLevel);

		if (levelResult.isErr())
			return interaction.reply({
				content: t(LanguageKeys.Commands.Sokoban.SokobanInvalidComponent, { value: levelResult.unwrapErr() }),
				flags: MessageFlags.Ephemeral
			});

		const level = levelResult.unwrap();

		return interaction.reply({
			content: encodeLevel(level.gameComponents),
			components: buildGameControls(encodeResolvableLevel(level.gameComponents), level.checkNonviableMoves()),
			flags: MessageFlags.Ephemeral
		});
	}

	public override autocompleteRun(interaction: Command.AutocompleteInteraction, options: AutocompleteOptions) {
		const levelChoices = (Reflect.ownKeys(Levels) as string[]).map((name) => ({ name, value: name }));
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
		const levelResult = buildMatrixFromResolvableLevel(options.import);
		if (levelResult.isErr())
			return interaction.reply({
				content: t(LanguageKeys.Commands.Sokoban.SokobanInvalidComponent, { value: levelResult.unwrapErr() }),
				flags: MessageFlags.Ephemeral
			});
		const level = levelResult.unwrap();

		return interaction.reply({
			content: encodeLevel(level.gameComponents),
			components: buildGameControls(encodeResolvableLevel(level.gameComponents), level.checkNonviableMoves()),
			flags: MessageFlags.Ephemeral
		});
	}
}

interface LoadLevelOptions {
	level?: keyof typeof Levels;
}

type AutocompleteOptions = AutocompleteInteractionArguments<Required<LoadLevelOptions>>;

interface ImportCustomLevelOptions {
	import: string;
}
