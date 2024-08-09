import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import {
	buildGameControls,
	buildSokobanGameFromResolvableLevel,
	encodeResolvableLevel,
	getLevel,
	makeLevelChoices,
	searchLevels
} from '#lib/utilities/sokoban';
import {
	Command,
	RegisterCommand,
	RegisterSubcommand,
	type AutocompleteInteractionArguments,
	type MessageResponseOptions
} from '@skyra/http-framework';
import { applyLocalizedBuilder, getSupportedUserLanguageT } from '@skyra/http-framework-i18n';
import { MessageFlags } from 'discord-api-types/v10';

const Root = LanguageKeys.Commands.Sokoban;

@RegisterCommand((builder) => applyLocalizedBuilder(builder, Root.RootName, Root.RootDescription))
export class UserCommand extends Command {
	@RegisterSubcommand((builder) =>
		applyLocalizedBuilder(builder, Root.PlayLevel) //
			.addStringOption((builder) => applyLocalizedBuilder(builder, Root.OptionChooseLevel).setAutocomplete(true))
	)
	public async playLevel(interaction: Command.ChatInputInteraction, options: PlayLevelOptions) {
		const t = getSupportedUserLanguageT(interaction);
		const resolvableLevel = getLevel(options.level);
		if (!resolvableLevel) {
			return interaction.reply({
				content: t(LanguageKeys.Commands.Sokoban.InvalidLevel),
				flags: MessageFlags.Ephemeral
			});
		}
		return this.prepareLevel(interaction, resolvableLevel.data);
	}

	public override autocompleteRun(interaction: Command.AutocompleteInteraction, options: AutocompleteOptions) {
		const results = searchLevels(options.level!);
		return interaction.reply({
			choices: makeLevelChoices(results)
		});
	}

	@RegisterSubcommand((builder) =>
		applyLocalizedBuilder(builder, Root.CustomLevel) //
			.addStringOption((builder) => applyLocalizedBuilder(builder, Root.OptionImportCustomLevel).setRequired(true))
	)
	public async customLevel(interaction: Command.ChatInputInteraction, options: CustomLevelOptions) {
		return this.prepareLevel(interaction, options.import);
	}

	private prepareLevel(interaction: Command.ChatInputInteraction, level: string) {
		const t = getSupportedUserLanguageT(interaction);
		const levelResult = buildSokobanGameFromResolvableLevel(level, t);

		const data: MessageResponseOptions = levelResult.match({
			ok: (level) => ({
				content: level.toString(),
				components: buildGameControls(encodeResolvableLevel(level.components), level.checkPossibleMoves()),
				flags: MessageFlags.Ephemeral
			}),
			err: (error) => ({
				content: error,
				flags: MessageFlags.Ephemeral
			})
		});

		return interaction.reply(data);
	}
}

interface PlayLevelOptions {
	level?: string;
}

type AutocompleteOptions = AutocompleteInteractionArguments<PlayLevelOptions>;

interface CustomLevelOptions {
	import: string;
}
