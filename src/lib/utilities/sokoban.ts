import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { ActionRowBuilder, ButtonBuilder } from '@discordjs/builders';
import { Result } from '@sapphire/result';
import type { TFunction } from '@skyra/http-framework-i18n';
import { ButtonStyle } from 'discord-api-types/v10';
import { getEmojiData } from './discord.js';

export enum EmojiGameComponents {
	Empty = '<:ske:1231690574504001649>',
	Wall = '<:skw:1231690589737582602>',
	Floor = '<:skf:1231690590853529742>',
	FloorTarget = '<:skft:1231690591692390443>',
	Player = '<:skp:1231690593189629992>',
	PlayerTarget = '<:skpt:1231708040785428641>',
	Box = '<:skb:1231690582972170270>',
	BoxTarget = '<:skbt:1231693431718412288>',
	NewLine = '\n'
}

export enum EmojiAST {
	OpenBracket = '<',
	CloseBracket = '>',
	Colon = ':'
}

export enum Direction {
	Up = 'up',
	Down = 'down',
	Left = 'left',
	Right = 'right'
}

export interface CoordinateGameComponent {
	x: number;
	y: number;
	component: EmojiGameComponents;
}

export function buildGameControls(
	disabledDirections: Direction[] = [],
	startTimestampResult: Result<number | undefined, undefined> = Result.ok(undefined),
	moves = 0
) {
	const startTimestamp = startTimestampResult.isOk() ? startTimestampResult.unwrap() : Date.now();

	const directionalButton = (emoji: string, direction: Direction) =>
		new ButtonBuilder() //
			.setCustomId(`sokoban.${direction}.${Boolean(startTimestamp) ? startTimestamp : undefined}.${moves}`)
			.setEmoji({ name: emoji })
			.setDisabled(disabledDirections.includes(direction))
			.setStyle(disabledDirections.includes(direction) ? ButtonStyle.Danger : ButtonStyle.Primary);

	let uniquePaddingId = 0;
	const paddingButton = () =>
		new ButtonBuilder() //
			.setCustomId(`sokoban.padding${uniquePaddingId++}`)
			.setEmoji(getEmojiData(EmojiGameComponents.Empty)!)
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

export function parseGameComponents(t: TFunction, content: string): Result<EmojiGameComponents[], string> {
	const gameComponents: EmojiGameComponents[] = [];
	let rawComponent = '';
	for (const char of content) {
		switch (char) {
			case EmojiAST.CloseBracket: {
				rawComponent += char;
				const componentResult = parseSingleComponent(t, rawComponent);
				if (componentResult.isOk()) gameComponents.push(componentResult.unwrap());
				else return Result.err(componentResult.unwrapErr());
				rawComponent = '';
				break;
			}
			case EmojiGameComponents.NewLine:
				gameComponents.push(EmojiGameComponents.NewLine);
				break;
			default:
				rawComponent += char;
				break;
		}
	}
	return Result.ok(gameComponents);
}

export function parseSingleComponent(t: TFunction, rawComponent: string): Result<EmojiGameComponents, string> {
	switch (rawComponent) {
		case EmojiGameComponents.Empty:
		case EmojiGameComponents.Wall:
		case EmojiGameComponents.Floor:
		case EmojiGameComponents.FloorTarget:
		case EmojiGameComponents.Player:
		case EmojiGameComponents.PlayerTarget:
		case EmojiGameComponents.Box:
		case EmojiGameComponents.BoxTarget:
			return Result.ok(rawComponent);
		default:
			return Result.err(t(LanguageKeys.Commands.Sokoban.SokobanInvalidComponent, { component: rawComponent }));
	}
}

export function coordinateComponents(gameComponents: EmojiGameComponents[]): CoordinateGameComponent[] {
	const coordinatedGameComponents: CoordinateGameComponent[] = [];
	let x = 0;
	let y = 0;
	for (const component of gameComponents) {
		coordinatedGameComponents.push({ x, y, component });
		if (component === EmojiGameComponents.NewLine) {
			x = 0;
			y++;
		} else {
			x++;
		}
	}
	return coordinatedGameComponents;
}

export function peekNextComponent(
	player: CoordinateGameComponent,
	direction: Direction,
	coordinatedGameComponents: CoordinateGameComponent[],
	boxRecurse = false
): Result<CoordinateGameComponent, unknown> {
	const nextX = player.x + (direction === Direction.Left ? -1 : direction === Direction.Right ? 1 : 0);
	const nextY = player.y + (direction === Direction.Up ? -1 : direction === Direction.Down ? 1 : 0);

	const nextComponent = coordinatedGameComponents.find((c) => c.x === nextX && c.y === nextY);
	if (!nextComponent) return Result.err();
	if (nextComponent.component === EmojiGameComponents.Wall) return Result.err();
	if ([EmojiGameComponents.Box, EmojiGameComponents.BoxTarget].includes(nextComponent.component)) {
		if (boxRecurse) return Result.err();
		const nextNextComponent = peekNextComponent(nextComponent, direction, coordinatedGameComponents, true);
		if (nextNextComponent.isErr()) return Result.err();
	}

	return Result.ok(nextComponent);
}

export function getPlayer<T extends CoordinateGameComponent | EmojiGameComponents>(gameComponents: T[]): T {
	return gameComponents.find((c) =>
		[EmojiGameComponents.Player, EmojiGameComponents.PlayerTarget].includes(typeof c === 'string' ? c : c.component)
	)!;
}

/** Check potential moves in all 4 directions, returning an array with directions that can't be executed */
export function checkPotentialMoves(player: CoordinateGameComponent, coordinatedGameComponents: CoordinateGameComponent[]): Direction[] {
	const directions: Direction[] = [];
	for (const direction of [Direction.Up, Direction.Down, Direction.Left, Direction.Right]) {
		const nextComponent = peekNextComponent(player, direction, coordinatedGameComponents);
		if (nextComponent.isErr()) directions.push(direction);
	}
	return directions;
}
