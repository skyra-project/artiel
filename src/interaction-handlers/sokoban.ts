import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import {
	buildGameControls,
	buildSokobanGameFromResolvableLevel,
	buildSokobanGameFromVisualLevel,
	Direction,
	encodeResolvableLevel
} from '#lib/utilities/sokoban';
import { ActionRowBuilder, ButtonBuilder } from '@discordjs/builders';
import { InteractionHandler } from '@skyra/http-framework';
import { getSupportedUserLanguageT } from '@skyra/http-framework-i18n';
import { ButtonStyle, MessageFlags, type APIButtonComponentWithCustomId } from 'discord-api-types/v10';

const Root = LanguageKeys.Commands.Sokoban;

export class UserHandler extends InteractionHandler {
	public async run(interaction: InteractionHandler.ButtonInteraction, [directionOrRetry, startTimestampOrEncodedLevel, moves]: Parameters) {
		const t = getSupportedUserLanguageT(interaction);
		// if the restart button is pressed, reset the current level
		if (directionOrRetry === 'retry') {
			const encodedLevel = startTimestampOrEncodedLevel!.replaceAll('-', '.');
			const level = buildSokobanGameFromResolvableLevel(encodedLevel, t).unwrap();

			return interaction.update({
				content: level.toString(),
				components: buildGameControls(encodeResolvableLevel(level.components), level.checkPossibleMoves()),
				flags: MessageFlags.Ephemeral
			});
		}

		const startTimestamp = Number(startTimestampOrEncodedLevel);

		// parse components from the emojis in the interaction's message
		const gameBoardResult = buildSokobanGameFromVisualLevel(interaction.message.content);
		if (gameBoardResult.isErr()) {
			return interaction.update({
				content: t(LanguageKeys.Commands.Sokoban.InvalidComponent, { value: gameBoardResult.unwrapErr() }),
				components: [],
				flags: MessageFlags.Ephemeral
			});
		}
		const level = gameBoardResult.unwrap();

		// execute the user's move
		const pushedBoxOption = level.executeMove(directionOrRetry);
		const updatedLevel = level.toString();

		// check win condition, if met, send victory message
		if (level.checkWinCondition()) {
			return interaction.update({
				// We use `round(ms / 1000 * 100) / 100` to convert ms to seconds and round to 2 digits, which can be simplified to `round(ms / 10) / 100`.
				content: `${t(Root.Victory, { seconds: Math.round((Date.now() - startTimestamp) / 10) / 100, moves })}\n${updatedLevel}`,
				components: [],
				flags: MessageFlags.Ephemeral
			});
		}

		const encodedLevelFromLevelComponent = (interaction.message.components?.[0].components[0] as APIButtonComponentWithCustomId).custom_id;

		// check lose condition, if met, send defeat message
		if (pushedBoxOption.isSomeAnd((box) => level.checkLoseCondition(box))) {
			const retryButton = new ButtonBuilder()
				.setCustomId(`sokoban.retry.${encodedLevelFromLevelComponent.replaceAll('.', '-')}`)
				.setLabel(t(Root.Retry))
				.setStyle(ButtonStyle.Danger);
			const components = [new ActionRowBuilder<ButtonBuilder>().addComponents(retryButton).toJSON()];
			return interaction.update({ content: `${t(Root.Defeat)}\n${updatedLevel}`, components, flags: MessageFlags.Ephemeral });
		}

		// update message
		return interaction.update({
			content: updatedLevel,
			components: buildGameControls(
				encodedLevelFromLevelComponent,
				level.checkPossibleMoves(),
				startTimestamp === 0 ? Date.now() : startTimestamp,
				(moves ? Number(moves) : 0) + 1
			),
			flags: MessageFlags.Ephemeral
		});
	}
}

type Parameters = [directionOrRetry: Direction | 'retry', startTimestampOrEncodedLevel?: string, moves?: number];
