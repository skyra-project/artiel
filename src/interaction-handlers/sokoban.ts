import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import {
	buildGameControls,
	checkPotentialMoves,
	coordinateComponents,
	Direction,
	EmojiGameComponents as EGC,
	encodeLevel,
	encodeResolvableLevel,
	getPlayer,
	parseGameComponents,
	parseLevel,
	peekNextComponent,
	type CoordinateGameComponent
} from '#lib/utilities/sokoban';
import { ActionRowBuilder, ButtonBuilder } from '@discordjs/builders';
import { Option, Result } from '@sapphire/result';
import { InteractionHandler } from '@skyra/http-framework';
import { getSupportedLanguageT } from '@skyra/http-framework-i18n';
import { ButtonStyle, MessageFlags, type APIButtonComponentWithCustomId } from 'discord-api-types/v10';

const Root = LanguageKeys.Commands.Sokoban;

export class UserHandler extends InteractionHandler {
	// TODO: figure out why the interaction instantly fails for the retry button
	public async run(interaction: InteractionHandler.ButtonInteraction, [directionOrRetry, startTimestampOrEncodedLevel, moves]: Parameters) {
		const t = getSupportedLanguageT(interaction);
		console.log(directionOrRetry, startTimestampOrEncodedLevel, moves);
		// if the restart button is pressed, reset the current level
		if (directionOrRetry === 'retry') {
			const encodedLevel = startTimestampOrEncodedLevel!.replaceAll('-', '.');
			console.log(encodedLevel);
			const levelResult = parseLevel(t, encodedLevel);
			if (levelResult.isErr()) return interaction.update({ content: levelResult.unwrapErr(), flags: MessageFlags.Ephemeral });
			const level = levelResult.unwrap();
			const coordinatedGameComponents = coordinateComponents(level);
			const player = getPlayer(coordinatedGameComponents);

			return interaction.update({
				content: encodeLevel(level),
				components: buildGameControls(encodeResolvableLevel(level), checkPotentialMoves(player, coordinatedGameComponents)),
				flags: MessageFlags.Ephemeral
			});
		}

		const startTimestamp = Number(startTimestampOrEncodedLevel);

		// parse components from the emojis in the interaction's message
		const gameComponentsResult = parseGameComponents(t, interaction.message.content);
		if (gameComponentsResult.isErr())
			return interaction.update({ content: gameComponentsResult.unwrapErr(), components: [], flags: MessageFlags.Ephemeral });

		// coordinate the components
		const gameComponents = gameComponentsResult.unwrap();
		const coordinatedGameComponents = coordinateComponents(gameComponents);
		const player = getPlayer<CoordinateGameComponent>(coordinatedGameComponents);

		// execute the user's move
		const moveExecutionResult = this.executeMove(player, directionOrRetry, coordinatedGameComponents);
		if (moveExecutionResult.isErr())
			return interaction.update({ content: moveExecutionResult.unwrapErr(), components: [], flags: MessageFlags.Ephemeral });
		const postMoveComponents = moveExecutionResult.unwrap();
		const updatedLevel = encodeLevel(postMoveComponents.components.map((c) => c.component));

		// check win condition, if met, send victory message
		if (this.checkWinCondition(postMoveComponents.components)) {
			return interaction.update({
				content: `${t(Root.Victory, { seconds: ((Date.now() - startTimestamp) / 1000).toFixed(2), moves })}\n${updatedLevel}`,
				components: [],
				flags: MessageFlags.Ephemeral
			});
		}

		const encodedLevelFromLevelComponent = (interaction.message.components?.[0].components[0] as APIButtonComponentWithCustomId).custom_id;

		// check lose condition, if met, send defeat message
		if (postMoveComponents.pushedBox.isSome() && this.checkLoseCondition(postMoveComponents.components, postMoveComponents.pushedBox.unwrap())) {
			const retryButton = new ButtonBuilder()
				.setCustomId(`retry.${encodedLevelFromLevelComponent.replaceAll('.', '-')}`)
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
				checkPotentialMoves(getPlayer<CoordinateGameComponent>(coordinatedGameComponents), coordinatedGameComponents),
				startTimestamp === 0 ? Date.now() : startTimestamp,
				(moves ? Number(moves) : 0) + 1
			),
			flags: MessageFlags.Ephemeral
		});
	}

	private executeMove(
		player: CoordinateGameComponent,
		direction: Direction,
		coordinatedGameComponents: CoordinateGameComponent[]
	): Result<{ components: CoordinateGameComponent[]; pushedBox: Option<CoordinateGameComponent> }, string> {
		const nextComponent = peekNextComponent(player, direction, coordinatedGameComponents).unwrap();
		const pushedBoxOption = this.moveComponents(coordinatedGameComponents, direction, player, nextComponent);
		return Result.ok({ components: coordinatedGameComponents, pushedBox: pushedBoxOption });
	}

	private moveComponents(
		coordinatedGameComponents: CoordinateGameComponent[],
		direction: Direction,
		player: CoordinateGameComponent,
		possibleBox: CoordinateGameComponent
	): Option<CoordinateGameComponent> {
		const playerIndex = coordinatedGameComponents.indexOf(player);
		const boxIndex = coordinatedGameComponents.indexOf(possibleBox);

		coordinatedGameComponents[playerIndex] = { ...player, component: player.component === EGC.PlayerTarget ? EGC.FloorTarget : EGC.Floor };
		if ([EGC.BoxTarget, EGC.Box].includes(possibleBox.component)) {
			coordinatedGameComponents[boxIndex] = {
				...possibleBox,
				component: possibleBox.component === EGC.BoxTarget ? EGC.PlayerTarget : EGC.Player
			};

			const nextBoxPosition = {
				x: possibleBox.x + (direction === Direction.Left ? -1 : direction === Direction.Right ? 1 : 0),
				y: possibleBox.y + (direction === Direction.Up ? -1 : direction === Direction.Down ? 1 : 0)
			};
			const nextBoxData = coordinatedGameComponents
				.map((c, index) => ({ component: c, index }))
				.filter((c) => c.component.x === nextBoxPosition.x && c.component.y === nextBoxPosition.y)[0];

			coordinatedGameComponents[nextBoxData.index] = {
				...coordinatedGameComponents[nextBoxData.index],
				component: nextBoxData.component.component === EGC.FloorTarget ? EGC.BoxTarget : EGC.Box
			};
			return Option.some(coordinatedGameComponents[nextBoxData.index]);
		}
		if (possibleBox.component === EGC.FloorTarget) {
			coordinatedGameComponents[boxIndex] = { ...possibleBox, component: EGC.PlayerTarget };
			return Option.none;
		}
		coordinatedGameComponents[boxIndex] = { ...possibleBox, component: EGC.Player };
		return Option.none;
	}

	/** are all targets covered by boxes */
	private checkWinCondition(gameComponents: CoordinateGameComponent[]) {
		return !gameComponents.some((c) => [EGC.FloorTarget, EGC.Box, EGC.PlayerTarget].includes(c.component));
	}

	/**
	 * did a box get pushed into a corner
	 *
	 * Possible cases for the box being cornered are:
	 * - top and left
	 * - top and right
	 * - bottom and left
	 * - bottom and right
	 *
	 * # Note:
	 * The box can get stuck between boxes too but that gets a lot more complicated to check
	 * whether the boxes/walls it's stuck between are in an unreachable spot (i.e. accidentally blocking off a path)
	 */
	private checkLoseCondition(gameComponents: CoordinateGameComponent[], pushedBox: CoordinateGameComponent) {
		if (pushedBox.component !== EGC.Box) return false;

		const top = gameComponents.find((c) => c.x === pushedBox.x && c.y === pushedBox.y - 1);
		const bottom = gameComponents.find((c) => c.x === pushedBox.x && c.y === pushedBox.y + 1);
		const left = gameComponents.find((c) => c.x === pushedBox.x - 1 && c.y === pushedBox.y);
		const right = gameComponents.find((c) => c.x === pushedBox.x + 1 && c.y === pushedBox.y);

		return (
			(top?.component === EGC.Wall && left?.component === EGC.Wall) ||
			(top?.component === EGC.Wall && right?.component === EGC.Wall) ||
			(bottom?.component === EGC.Wall && left?.component === EGC.Wall) ||
			(bottom?.component === EGC.Wall && right?.component === EGC.Wall)
		);
	}
}

type Parameters = [directionOrRetry: Direction | 'retry', startTimestampOrEncodedLevel?: string, moves?: number];
