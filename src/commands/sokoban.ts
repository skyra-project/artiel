import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import {
	buildGameControls,
	checkPotentialMoves,
	coordinateComponents,
	EmojiGameComponents as EGC,
	getPlayer,
	parseGameComponents
} from '#lib/utilities/sokoban';
import { Command, RegisterCommand } from '@skyra/http-framework';
import { applyLocalizedBuilder, getSupportedLanguageT } from '@skyra/http-framework-i18n';
import { MessageFlags } from 'discord-api-types/v10';

const Root = LanguageKeys.Commands.Sokoban;

@RegisterCommand((builder) => applyLocalizedBuilder(builder, Root.RootName, Root.RootDescription))
export class UserCommand extends Command {
	public override async chatInputRun(interaction: Command.ChatInputInteraction, _options: Options) {
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

// TODO: potentially add option for choosing levels, defaulting to a random level
interface Options {}
