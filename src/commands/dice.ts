import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { isAny } from '#lib/utilities/operators';
import { HeadingLevel, bold, heading, underscore } from '@discordjs/builders';
import { Command, RegisterCommand } from '@skyra/http-framework';
import { applyLocalizedBuilder, createSelectMenuChoiceName, resolveKey } from '@skyra/http-framework-i18n';
import { MessageFlags } from 'discord-api-types/v10';
import { randomInt } from 'node:crypto';

const Root = LanguageKeys.Commands.Dice;

enum OnCriticalReroll {
	Nothing,
	RerollOnce,
	RerollTwice,
	RerollThrice,
	RerollIndefinitely
}

@RegisterCommand((builder) =>
	applyLocalizedBuilder(builder, Root.RootName, Root.RootDescription) //
		.addStringOption((builder) =>
			applyLocalizedBuilder(builder, Root.OptionsPreset).addChoices(
				createSelectMenuChoiceName(Root.PresetD2, { value: 'd2' }),
				createSelectMenuChoiceName(Root.PresetD4, { value: 'd4' }),
				createSelectMenuChoiceName(Root.PresetD6, { value: 'd6' }),
				createSelectMenuChoiceName(Root.PresetD8, { value: 'd8' }),
				createSelectMenuChoiceName(Root.PresetD10, { value: 'd10' }),
				createSelectMenuChoiceName(Root.PresetD10Ren, { value: 'd10:ren' }),
				createSelectMenuChoiceName(Root.PresetD12, { value: 'd12' }),
				createSelectMenuChoiceName(Root.PresetD20, { value: 'd20:dnd5e' }),
				createSelectMenuChoiceName(Root.PresetD100, { value: 'd100' }),
				createSelectMenuChoiceName(Root.PresetFate, { value: 'fate' })
			)
		)
		.addIntegerOption((builder) => applyLocalizedBuilder(builder, Root.OptionsRolls).setMinValue(1).setMaxValue(10))
		.addIntegerOption((builder) => applyLocalizedBuilder(builder, Root.OptionsFaces).setMinValue(2).setMaxValue(100))
		.addIntegerOption((builder) => applyLocalizedBuilder(builder, Root.OptionsModifier))
		.addStringOption((builder) =>
			applyLocalizedBuilder(builder, Root.OptionsSelection).addChoices(
				createSelectMenuChoiceName(Root.SelectionAddition, { value: 'addition' }),
				createSelectMenuChoiceName(Root.SelectionGreatest, { value: 'greatest' }),
				createSelectMenuChoiceName(Root.SelectionLeast, { value: 'least' })
			)
		)
		.addIntegerOption((builder) =>
			applyLocalizedBuilder(builder, Root.OptionsOnCriticalSuccess).addChoices(
				createSelectMenuChoiceName(Root.OnCriticalNothing, { value: OnCriticalReroll.Nothing }),
				createSelectMenuChoiceName(Root.OnCriticalRerollOnce, { value: OnCriticalReroll.RerollOnce }),
				createSelectMenuChoiceName(Root.OnCriticalRerollTwice, { value: OnCriticalReroll.RerollTwice }),
				createSelectMenuChoiceName(Root.OnCriticalRerollThrice, { value: OnCriticalReroll.RerollThrice }),
				createSelectMenuChoiceName(Root.OnCriticalRerollIndefinitely, { value: OnCriticalReroll.RerollIndefinitely })
			)
		)
		.addIntegerOption((builder) =>
			applyLocalizedBuilder(builder, Root.OptionsOnCriticalFailure).addChoices(
				createSelectMenuChoiceName(Root.OnCriticalNothing, { value: OnCriticalReroll.Nothing }),
				createSelectMenuChoiceName(Root.OnCriticalRerollOnce, { value: OnCriticalReroll.RerollOnce }),
				createSelectMenuChoiceName(Root.OnCriticalRerollTwice, { value: OnCriticalReroll.RerollTwice }),
				createSelectMenuChoiceName(Root.OnCriticalRerollThrice, { value: OnCriticalReroll.RerollThrice }),
				createSelectMenuChoiceName(Root.OnCriticalRerollIndefinitely, { value: OnCriticalReroll.RerollIndefinitely })
			)
		)
		.addBooleanOption((builder) => applyLocalizedBuilder(builder, Root.OptionsHide))
)
export class UserCommand extends Command {
	public override async chatInputRun(interaction: Command.ChatInputInteraction, options: Options) {
		const { faces, rolls, modifier = 0, preset } = options;

		const { results, render, dice, complex } = this.runPreset(
			faces,
			rolls,
			preset,
			options['on-critical-success'],
			options['on-critical-failure']
		);

		const lines = [heading(resolveKey(interaction, Root.Title, { dice }), HeadingLevel.Three)] as string[];
		if (!(results.length === 1 && !complex)) {
			lines.push(render);
		}

		let result = heading(this.getResult(results, options.selection).toString(), HeadingLevel.One);
		if (modifier) result += ` (${modifier > 0 ? '+' : '-'}${modifier})`;
		lines.push(result);

		return interaction.reply({ content: lines.join('\n'), flags: options.hide ? MessageFlags.Ephemeral : undefined });
	}

	private getResult(results: number[], selection: Selection = 'addition') {
		switch (selection) {
			case 'addition':
				return results.reduce((acc, curr) => acc + curr, 0);
			case 'greatest':
				return Math.max(...results);
			case 'least':
				return Math.min(...results);
		}
	}

	private runPreset(
		faces: number | undefined,
		rolls: number | undefined,
		preset: Preset | undefined,
		onCriticalSuccess?: OnCriticalReroll,
		onCriticalFailure?: OnCriticalReroll
	) {
		switch (preset) {
			case 'd2':
				return this.throwDice({ faces: 2, rolls, onCriticalSuccess, onCriticalFailure, render: renderCoinDice, complex: true });
			case 'd4':
				return this.throwDice({ faces: 4, rolls, onCriticalSuccess, onCriticalFailure });
			case 'd6':
				return this.throwDice({ faces: 6, rolls, onCriticalSuccess, onCriticalFailure });
			case 'd8':
				return this.throwDice({ faces: 8, rolls, onCriticalSuccess, onCriticalFailure });
			case 'd10':
				return this.throwDice({ faces: 10, rolls, onCriticalSuccess, onCriticalFailure });
			case 'd10:ren':
				return this.throwDice({
					faces: 10,
					rolls,
					onCriticalSuccess: OnCriticalReroll.RerollIndefinitely,
					onCriticalFailure: OnCriticalReroll.RerollOnce,
					render: renderRen10Dice,
					complex: true
				});
			case 'd12':
				return this.throwDice({ faces: 12, rolls, onCriticalSuccess, onCriticalFailure });
			case 'd20:dnd5e':
				return this.throwDice({ faces: 20, rolls, onCriticalSuccess, onCriticalFailure, render: renderDnD5eDice });
			case 'd100':
				return this.throwDice({
					faces: 100,
					rolls,
					onCriticalSuccess,
					onCriticalFailure,
					criticalFailure: 100,
					criticalSuccess: 1,
					render: renderCthulhuDice,
					complex: true
				});
			case 'fate':
				return this.throwDice({
					faces: 3,
					rolls: 4,
					offset: -2,
					onCriticalSuccess: OnCriticalReroll.Nothing,
					onCriticalFailure: OnCriticalReroll.Nothing,
					render: renderFateDice,
					complex: true
				});
			default:
				return this.throwDice({ faces: faces ?? 6, rolls, onCriticalSuccess, onCriticalFailure });
		}
	}

	private throwDice(options: ThrowDiceOptions) {
		const renders = [] as string[];
		const results = [] as number[];
		const offset = options.offset ?? 0;
		const min = 1 + offset;
		const max = options.faces + 1 + offset;
		const rolls = options.rolls ?? 1;
		const criticalFailure = options.criticalFailure ?? min;
		const criticalSuccess = options.criticalSuccess ?? max - 1;
		const onCriticalFailure = options.onCriticalFailure ?? OnCriticalReroll.Nothing;
		const onCriticalSuccess = options.onCriticalSuccess ?? OnCriticalReroll.Nothing;
		const render = options.render ?? renderGenericDice;

		for (let i = 0; i < rolls; i++) {
			const first = randomInt(min, max);
			results.push(first);
			renders.push(render(first, 0));
			if (first === criticalSuccess) {
				const attempts = this.getCriticalRerollAttempts(onCriticalSuccess);
				for (let i = 0; i < attempts; i++) {
					const next = randomInt(min, max);
					results.push(next);
					renders.push(render(next, i + 1));
					if (next !== criticalSuccess) break;
				}
			} else if (first === criticalFailure) {
				const attempts = this.getCriticalRerollAttempts(onCriticalFailure);
				for (let i = 0; i < attempts; i++) {
					const next = randomInt(min, max);
					results.push(-next);
					renders.push(render(next, i + 1));
					if (next !== criticalFailure) break;
				}
			}
		}

		return { results, render: renders.join(' '), dice: getDiceEmoji(options.faces), complex: options.complex ?? false };
	}

	private getCriticalRerollAttempts(type: OnCriticalReroll) {
		switch (type) {
			case OnCriticalReroll.Nothing:
				return 0;
			case OnCriticalReroll.RerollOnce:
				return 1;
			case OnCriticalReroll.RerollTwice:
				return 2;
			case OnCriticalReroll.RerollThrice:
				return 3;
			case OnCriticalReroll.RerollIndefinitely:
				return Infinity;
		}
	}
}

enum DiceEmoji {
	Dice4 = '<:d4:1200786491492802681>',
	Dice8 = '<:d8:1200786525634437190>',
	Dice10 = '<:d10:1200786415005483018>',
	Dice12 = '<:d12:1200786447049957457>',
	Dice20 = '<:d20:1200786564914085978>',
	DicePlus = '<:dice_plus:1200790107893022740>',
	DiceMinus = '<:dice_minus:1200790383903375430>',
	DiceNeutral = '<:dice_neutral:1200790382540226570>',
	CoinHeads = '<:coin_heads:1205271732747894795>',
	CoinTails = '<:coin_tails:1205438570576355338>',
	CoinFlip = '<:coinflip:1205271734052196402>',
	RollingDiceCup = '<:rolling_dice_cup:1200786597105377290>'
}

function getDiceEmoji(faces: number) {
	switch (faces) {
		case 2:
			return DiceEmoji.CoinFlip;
		case 4:
			return DiceEmoji.Dice4;
		case 8:
			return DiceEmoji.Dice8;
		case 10:
			return DiceEmoji.Dice10;
		case 12:
			return DiceEmoji.Dice12;
		case 20:
			return DiceEmoji.Dice20;
		case 100:
			return `${DiceEmoji.Dice10}${DiceEmoji.Dice10}`;
		default:
			return DiceEmoji.RollingDiceCup;
	}
}

function renderFateDice(dice: number) {
	switch (dice) {
		case -1:
			return DiceEmoji.DiceMinus;
		case 0:
			return DiceEmoji.DiceNeutral;
		case 1:
			return DiceEmoji.DicePlus;
		default:
			return '';
	}
}

function renderGenericDice(dice: number) {
	return underscore(dice.toString());
}

function renderCoinDice(dice: number) {
	return dice === 1 ? DiceEmoji.CoinHeads : DiceEmoji.CoinTails;
}

function renderRen10Dice(dice: number, index: number) {
	const styled = underscore(dice.toString());
	return index === 0 ? bold(styled) : styled;
}

function renderDnD5eDice(dice: number) {
	const styled = underscore(dice.toString());
	return isAny(dice, 1, 20) ? bold(styled) : styled;
}

function renderCthulhuDice(dice: number) {
	const tens = Math.floor((dice % 100) / 10) * 10;
	const units = dice % 10;
	return underscore(`${tens.toString().padStart(2, '0')} ${units.toString()}`);
}

interface Options {
	faces?: number;
	rolls?: number;
	modifier?: number;
	preset?: Preset;
	selection?: Selection;
	'on-critical-success'?: OnCriticalReroll;
	'on-critical-failure'?: OnCriticalReroll;
	hide?: boolean;
}

interface ThrowDiceOptions {
	faces: number;
	rolls?: number;
	offset?: number;
	criticalSuccess?: number;
	criticalFailure?: number;
	onCriticalSuccess?: OnCriticalReroll;
	onCriticalFailure?: OnCriticalReroll;
	render?: (dice: number, index: number) => string;
	complex?: boolean;
}

type Preset = 'd2' | 'd4' | 'd6' | 'd8' | 'd10' | 'd10:ren' | 'd12' | 'd20:dnd5e' | 'd100' | 'fate';
type Selection = 'addition' | 'greatest' | 'least';
