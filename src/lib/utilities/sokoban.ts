import { PathSrc } from '#lib/common/constants';
import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { ActionRowBuilder, ButtonBuilder } from '@discordjs/builders';
import { Collection } from '@discordjs/collection';
import { err, none, ok, some, type Option, type Result } from '@sapphire/result';
import { cutText } from '@sapphire/utilities';
import type { TFunction } from '@skyra/http-framework-i18n';
import { ButtonStyle, type APIApplicationCommandOptionChoice } from 'discord-api-types/v10';
import { readFile } from 'fs/promises';
import { getEmojiData } from './discord.js';

export enum EmojiGameComponent {
	Empty = '<:ske:1231690574504001649>',
	Wall = '<:skw:1231690589737582602>',
	Floor = '<:skf:1231690590853529742>',
	FloorTarget = '<:skft:1231690591692390443>',
	Player = '<:skp:1231690593189629992>',
	PlayerTarget = '<:skpt:1231708040785428641>',
	Box = '<:skb:1231690582972170270>',
	BoxTarget = '<:skbt:1231693431718412288>',
	NewLine = '\n',
	Null = 'null'
}

export interface GameComponent {
	component: EmojiGameComponent;
	x: number;
	y: number;
}

export enum Direction {
	Up = 'up',
	Down = 'down',
	Left = 'left',
	Right = 'right'
}

export class SokobanGame {
	public rows: number;
	public columns: number;
	public player: GameComponent;

	/**
	 * Constructs a new game.
	 *
	 * @param components the game components to build the matrix from.
	 *
	 * @example
	 * ```typescript
	 * // create the sokoban game
	 * const gameBoardResult = buildSokobanGameFromVisualLevel(interaction.message.content);
	 * if (gameBoardResult.isErr())
	 *  return interaction.update({ content: "invalid components", flags: MessageFlags.Ephemeral });
	 * const level = gameBoardResult.unwrap();
	 *
	 * // execute the user's move
	 * const pushedBoxOption = level.executeMove(directionOrRetry);
	 * const updatedLevel = encodeLevel(level.gameComponents);
	 *
	 * // check win condition, if met, send victory message
	 * if (level.checkWinCondition()) {
	 *	return interaction.update({ content: "victory!!", components: [], flags: MessageFlags.Ephemeral });
	 * }
	 *
	 * // grab the encoded resolvable level from the first discord component within the game controls
	 * const encodedLevelFromLevelComponent = (interaction.message.components?.[0].components[0] as APIButtonComponentWithCustomId).custom_id;
	 *
	 * // check lose condition, if met, send defeat message
	 * if (pushedBoxOption.isSome() && level.checkLoseCondition(pushedBoxOption.unwrap())) {
	 *	const retryButton = new ButtonBuilder()
	 *  	.setCustomId(`sokoban.retry.${encodedLevelFromLevelComponent.replaceAll('.', '-')}`)
	 *		.setLabel(t(Root.Retry))
	 *		.setStyle(ButtonStyle.Danger);
	 *  const components = [new ActionRowBuilder<ButtonBuilder>().addComponents(retryButton).toJSON()];
	 *	return interaction.update({ content: `Failure! Unlike your cousin who has 3 PhDs!\n${updatedLevel}`, components, flags: MessageFlags.Ephemeral });
	 * }
	 *
	 * // update message
	 * return interaction.update({
	 *  content: updatedLevel,
	 *	components: buildGameControls(
	 *		encodedLevelFromLevelComponent,
	 *    level.checkNonviableMoves(),
	 *		startTimestamp === 0 ? Date.now() : startTimestamp,
	 *		(moves ? Number(moves) : 0) + 1
	 *  ),
	 *	flags: MessageFlags.Ephemeral
	 * });
	 * ```
	 */
	public constructor(public readonly components: EmojiGameComponent[]) {
		let maxColumnIndice = 0;
		let maxRowIndice = 0;
		let currentRowStartIndex = 0;
		// get the max indices for rows and columns
		for (let i = 0; i < components.length; i++) {
			const component = components[i];
			if (component === EmojiGameComponent.NewLine) {
				maxColumnIndice = Math.max(maxColumnIndice, i - currentRowStartIndex);
				currentRowStartIndex = i + 1;
				maxRowIndice++;
				continue;
			}
			if (i === components.length - 1) maxColumnIndice = Math.max(maxColumnIndice, i - currentRowStartIndex);
		}
		this.rows = maxRowIndice + 1;
		this.columns = maxColumnIndice + 1;

		// fill the game with empty components to make it a perfect rectangle
		for (let i = 0; i < components.length; i++) {
			if (components[i] === EmojiGameComponent.NewLine) {
				const x = i % this.columns;
				const gap = maxColumnIndice - x;
				components.splice(i, 0, ...Array(gap).fill(EmojiGameComponent.Null));
				i += gap;
			}
		}

		this.components = components;
		this.player = this.getPlayer();
	}

	/**
	 * Gets a component at the given position.
	 *
	 * @param x x-axis position.
	 * @param y y-axis position.
	 * @returns the component at the given position.
	 */
	public get(x: number, y: number): GameComponent {
		return { component: this.components[y * this.columns + x], x, y };
	}

	/**
	 * Sets a component at the given position.
	 *
	 * @param x x-axis position.
	 * @param y y-axis position.
	 * @param component the component to set the position to.
	 */
	public set(x: number, y: number, component: EmojiGameComponent) {
		this.components[y * this.columns + x] = component;
	}

	/**
	 * Gets the player component.
	 *
	 * @returns the player component.
	 */
	public getPlayer(): GameComponent {
		const index = this.components.findIndex((component) => [EmojiGameComponent.Player, EmojiGameComponent.PlayerTarget].includes(component));
		if (index === -1) throw new RangeError('Unreachable, could not find a Player');
		return {
			component: this.components[index],
			x: index % this.columns,
			y: Math.floor(index / this.columns)
		};
	}

	/**
	 * Peeks the next component for a viable move in the given direction.
	 *
	 * @param precedingComponent the component to peek around.
	 * @param direction the direction to peek in.
	 * @param boxRecurse whether the function is being recursed by a box.
	 * @returns the next component if it's a viable move.
	 */
	public peekNextComponent(precedingComponent: GameComponent, direction: Direction, boxRecurse = false): Option<GameComponent> {
		const nextX = precedingComponent.x + (direction === Direction.Left ? -1 : direction === Direction.Right ? 1 : 0);
		const nextY = precedingComponent.y + (direction === Direction.Up ? -1 : direction === Direction.Down ? 1 : 0);

		const nextComponent = this.get(nextX, nextY);
		if (!nextComponent.component) return none;
		if ([EmojiGameComponent.Wall, EmojiGameComponent.Empty, EmojiGameComponent.Null].includes(nextComponent.component)) return none;
		if ([EmojiGameComponent.Box, EmojiGameComponent.BoxTarget].includes(nextComponent.component)) {
			if (boxRecurse) return none;
			const nextNextComponent = this.peekNextComponent(nextComponent, direction, true);
			if (nextNextComponent.isNone()) return none;
		}

		return some(nextComponent);
	}

	/**
	 * Checks for possible moves.
	 *
	 * @returns the directions the player can move in.
	 */
	public checkPossibleMoves(): Direction[] {
		const directions: Direction[] = [];
		for (const direction of [Direction.Up, Direction.Down, Direction.Left, Direction.Right]) {
			const nextComponent = this.peekNextComponent(this.player, direction);
			if (nextComponent.isSome()) directions.push(direction);
		}
		return directions;
	}

	/**
	 * Moves the player and potentially a box in the given direction.
	 *
	 * If the player is on a:
	 * - **Target:** the target is set to a floor target.
	 *
	 * If the next position is a:
	 * - **Floor:** the player is moved there as usual.
	 * - **Box** the box is moved in the direction of the player.
	 * - **Floor Target:** the player is set to a player target.
	 * - **Box Target:** the player is set to a player target and the box is moved in the direction of the player.
	 *
	 *
	 * @param direction the direction that the player is moving towards.
	 * @param player the player component.
	 * @returns the pushed box if there was one.
	 */
	public executeMove(direction: Direction): Option<GameComponent> {
		const nextPosition = this.peekNextComponent(this.player, direction).unwrap();

		// Remove the player from its current position
		this.set(
			this.player.x,
			this.player.y,
			this.player.component === EmojiGameComponent.PlayerTarget ? EmojiGameComponent.FloorTarget : EmojiGameComponent.Floor
		);

		// Checks if the next position is a box
		if ([EmojiGameComponent.BoxTarget, EmojiGameComponent.Box].includes(nextPosition.component)) {
			// Set the player to the next position
			const newPlayerComponent =
				nextPosition.component === EmojiGameComponent.BoxTarget ? EmojiGameComponent.PlayerTarget : EmojiGameComponent.Player;
			this.set(nextPosition.x, nextPosition.y, newPlayerComponent);
			this.player = { component: newPlayerComponent, x: nextPosition.x, y: nextPosition.y };

			// Get the next position of the box
			const nextBoxPosition = {
				x: nextPosition.x + (direction === Direction.Left ? -1 : direction === Direction.Right ? 1 : 0),
				y: nextPosition.y + (direction === Direction.Up ? -1 : direction === Direction.Down ? 1 : 0)
			};
			const nextBoxPositionComponent = this.get(nextBoxPosition.x, nextBoxPosition.y);

			// Set the box to the next position
			this.set(
				nextBoxPosition.x,
				nextBoxPosition.y,
				nextBoxPositionComponent.component === EmojiGameComponent.FloorTarget ? EmojiGameComponent.BoxTarget : EmojiGameComponent.Box
			);
			return some(this.get(nextBoxPosition.x, nextBoxPosition.y));
		}

		// Check if the next position is a floor target, if so set the player as a player target
		if (nextPosition.component === EmojiGameComponent.FloorTarget) {
			this.set(nextPosition.x, nextPosition.y, EmojiGameComponent.PlayerTarget);
			this.player = { component: EmojiGameComponent.PlayerTarget, x: nextPosition.x, y: nextPosition.y };
			return none;
		}

		// Set the player to the next position
		this.set(nextPosition.x, nextPosition.y, EmojiGameComponent.Player);
		this.player = { component: EmojiGameComponent.Player, x: nextPosition.x, y: nextPosition.y };
		return none;
	}

	/**
	 * Determines whether the win condition has been met.
	 *
	 * Cases that nullify the win condition:
	 * - A box isn't on a target
	 * - A floor target remains
	 * - The player is on a target
	 */
	public checkWinCondition() {
		return !this.components.some((c) => [EmojiGameComponent.FloorTarget, EmojiGameComponent.Box, EmojiGameComponent.PlayerTarget].includes(c));
	}

	/**
	 * Determines whether the box has been cornered.
	 *
	 * @param pushedBox the box that was pushed.
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
	public checkLoseCondition(pushedBox: GameComponent) {
		if (pushedBox.component !== EmojiGameComponent.Box) return false;

		const [top, bottom, left, right] = [
			this.get(pushedBox.x, pushedBox.y - 1),
			this.get(pushedBox.x, pushedBox.y + 1),
			this.get(pushedBox.x - 1, pushedBox.y),
			this.get(pushedBox.x + 1, pushedBox.y)
		];

		return (
			(top.component === EmojiGameComponent.Wall && left.component === EmojiGameComponent.Wall) ||
			(top.component === EmojiGameComponent.Wall && right.component === EmojiGameComponent.Wall) ||
			(bottom.component === EmojiGameComponent.Wall && left.component === EmojiGameComponent.Wall) ||
			(bottom.component === EmojiGameComponent.Wall && right.component === EmojiGameComponent.Wall)
		);
	}

	/**
	 * Encodes game components into a visual representation of the game.
	 *
	 * @param gameComponents game components to encode.
	 * @returns the encoded level.
	 */
	public toString(): string {
		return this.components.filter((c) => c !== EmojiGameComponent.Null).join('');
	}
}

/** Used to identify the end of a discord emoji/game component. */
export const CLOSE_BRACKET = '>';

/**
 * Builds a sokoban game from a string of emoji components.
 *
 * @param content the content to build the game from.
 * @returns the sokoban game or an error message if the content contains invalid components.
 */
export function buildSokobanGameFromVisualLevel(content: string): Result<SokobanGame, string> {
	const gameComponents: EmojiGameComponent[] = [];
	let rawComponent = '';
	for (const char of content) {
		switch (char) {
			case CLOSE_BRACKET: {
				rawComponent += char;
				const componentResult = parseSingleComponent(rawComponent);
				if (componentResult.isOk()) gameComponents.push(componentResult.unwrap());
				else return componentResult;
				rawComponent = '';
				break;
			}
			case EmojiGameComponent.NewLine:
				gameComponents.push(EmojiGameComponent.NewLine);
				break;
			default:
				rawComponent += char;
				break;
		}
	}
	return ok(new SokobanGame(gameComponents));
}

/**
 * Parses a single component of the game.
 *
 * @param rawComponent the raw component to parse.
 * @returns the parsed component or an error message if the component is invalid.
 */
function parseSingleComponent(rawComponent: string): Result<EmojiGameComponent, string> {
	switch (rawComponent) {
		case EmojiGameComponent.Empty:
		case EmojiGameComponent.Wall:
		case EmojiGameComponent.Floor:
		case EmojiGameComponent.FloorTarget:
		case EmojiGameComponent.Player:
		case EmojiGameComponent.PlayerTarget:
		case EmojiGameComponent.Box:
		case EmojiGameComponent.BoxTarget:
			return ok(rawComponent);
		default:
			return err(rawComponent);
	}
}

/** game components as single character resolvables for a small form-factor level storing. */
export enum ResolvableLevelComponent {
	Empty = '0',
	Wall = '#',
	Floor = ' ',
	FloorTarget = 'T',
	Player = 'P',
	PlayerTarget = 'X',
	Box = 'B',
	BoxTarget = 'Z',
	NewLine = '.'
}

/** A mapping of resolvable components to emoji components. */
const GameComponentsMapping: Record<ResolvableLevelComponent, EmojiGameComponent> = {
	[ResolvableLevelComponent.Empty]: EmojiGameComponent.Empty,
	[ResolvableLevelComponent.Wall]: EmojiGameComponent.Wall,
	[ResolvableLevelComponent.Floor]: EmojiGameComponent.Floor,
	[ResolvableLevelComponent.FloorTarget]: EmojiGameComponent.FloorTarget,
	[ResolvableLevelComponent.Player]: EmojiGameComponent.Player,
	[ResolvableLevelComponent.PlayerTarget]: EmojiGameComponent.PlayerTarget,
	[ResolvableLevelComponent.Box]: EmojiGameComponent.Box,
	[ResolvableLevelComponent.BoxTarget]: EmojiGameComponent.BoxTarget,
	[ResolvableLevelComponent.NewLine]: EmojiGameComponent.NewLine
};

/**
 * Encodes game components into a resolvable level.
 *
 * @param gameComponents the game components to encode.
 * @returns the resolvable level.
 */
export function encodeResolvableLevel(gameComponents: EmojiGameComponent[]): string {
	return gameComponents
		.map((c) => {
			switch (c) {
				case EmojiGameComponent.Empty:
					return ResolvableLevelComponent.Empty;
				case EmojiGameComponent.Wall:
					return ResolvableLevelComponent.Wall;
				case EmojiGameComponent.Floor:
					return ResolvableLevelComponent.Floor;
				case EmojiGameComponent.FloorTarget:
					return ResolvableLevelComponent.FloorTarget;
				case EmojiGameComponent.Player:
					return ResolvableLevelComponent.Player;
				case EmojiGameComponent.PlayerTarget:
					return ResolvableLevelComponent.PlayerTarget;
				case EmojiGameComponent.Box:
					return ResolvableLevelComponent.Box;
				case EmojiGameComponent.BoxTarget:
					return ResolvableLevelComponent.BoxTarget;
				case EmojiGameComponent.NewLine:
					return ResolvableLevelComponent.NewLine;
				default:
					return '';
			}
		})
		.join('');
}

/**
 * Parse a resolvable level into sokoban game.
 *
 * @param level resolvable encoded level.
 * @returns the sokoban game or an error message if the level contains invalid components.
 */
export function buildSokobanGameFromResolvableLevel(level: string, t: TFunction): Result<SokobanGame, string> {
	const gameComponents: EmojiGameComponent[] = [];
	for (const currentComponent of level) {
		const component = GameComponentsMapping[currentComponent as ResolvableLevelComponent];
		if (!component) return err(t(LanguageKeys.Commands.Sokoban.InvalidComponent, { value: currentComponent }));
		gameComponents.push(component);
	}
	if (!gameComponents.includes(EmojiGameComponent.Player)) return err(t(LanguageKeys.Commands.Sokoban.NoPlayerFound));
	if (gameComponents.filter((c) => c === EmojiGameComponent.Player).length > 1) return err(t(LanguageKeys.Commands.Sokoban.MultiplePlayersFound));
	return ok(new SokobanGame(gameComponents));
}

/**
 * builds the controls for the sokoban game.
 *
 * @param resolvableEncodedLevel the chosen level encoded to be stored in a unused button for retrying the level.
 * @param enabledDirections the directions that have been checked to be invalid movements.
 * @param startTimestamp the timestamp when the game started/the first move was made.
 * @param moves the number of moves made in the game.
 * @returns discord message components for the game controls.
 */
export function buildGameControls(resolvableEncodedLevel: string, enabledDirections: Direction[] = [], startTimestamp = 0, moves = 0) {
	const directionalButton = (emoji: string, direction: Direction) =>
		new ButtonBuilder() //
			.setCustomId(`sokoban.${direction}.${startTimestamp}.${moves}`)
			.setEmoji({ name: emoji })
			.setDisabled(!enabledDirections.includes(direction))
			.setStyle(enabledDirections.includes(direction) ? ButtonStyle.Primary : ButtonStyle.Danger);

	let uniquePaddingId = 0;
	const paddingButton = () =>
		new ButtonBuilder() //
			.setCustomId(uniquePaddingId++ === 0 ? resolvableEncodedLevel : `sokoban.padding${uniquePaddingId}`)
			.setEmoji(getEmojiData(EmojiGameComponent.Empty)!)
			.setDisabled(true)
			.setStyle(ButtonStyle.Secondary);

	return [
		new ActionRowBuilder<ButtonBuilder>() //
			.addComponents(paddingButton(), directionalButton('⬆️', Direction.Up), paddingButton())
			.toJSON(),
		new ActionRowBuilder<ButtonBuilder>() //
			.addComponents(directionalButton('⬅️', Direction.Left), paddingButton(), directionalButton('➡️', Direction.Right))
			.toJSON(),
		new ActionRowBuilder<ButtonBuilder>() //
			.addComponents(paddingButton(), directionalButton('⬇️', Direction.Down), paddingButton())
			.toJSON()
	];
}

const Levels: Collection<string, Level> = new Collection(
	JSON.parse(await readFile(new URL('./generated/data/levels.json', PathSrc), { encoding: 'utf-8' })).map(
		(level: Level) => [level.name.toLowerCase(), level] as const
	)
);

export function getLevel(name?: string) {
	return Levels.get(name?.toLowerCase() ?? 'default');
}

export function searchLevels(name: string): readonly LevelSearchResult[] {
	if (name.length === 0) return [];

	name = name.toLowerCase();
	const results: LevelSearchResult[] = [];
	for (const [key, value] of Levels) {
		const score = getSearchScore(name, key);
		if (score !== 0) results.push({ score, value });
	}

	return results.sort((a, b) => b.score - a.score).slice(0, 25);
}

function getSearchScore(id: string, key: string) {
	if (key === id) return 1;
	return key.includes(id) ? id.length / key.length : 0;
}

export function makeLevelChoice(score: number, entry: Level): APIApplicationCommandOptionChoice<string> {
	return {
		name: cutText(`${score === 1 ? '⭐' : '📄'} ${entry.name}`, 100),
		value: entry.name
	};
}

export function makeLevelChoices(results: readonly LevelSearchResult[]): APIApplicationCommandOptionChoice<string>[] {
	return results.map((result) => makeLevelChoice(result.score, result.value));
}

export interface LevelSearchResult {
	score: number;
	value: Level;
}

export interface Level {
	name: string;
	data: string;
	difficulty: number;
}
