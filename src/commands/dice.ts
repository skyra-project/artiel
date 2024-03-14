import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { arrayWith } from '#lib/utilities/array';
import { isAny } from '#lib/utilities/operators';
import { HeadingLevel, bold, heading, underscore } from '@discordjs/builders';
import { Command, RegisterCommand } from '@skyra/http-framework';
import { applyLocalizedBuilder, createSelectMenuChoiceName, resolveKey } from '@skyra/http-framework-i18n';
import { MessageFlags } from 'discord-api-types/v10';
import { randomInt } from 'node:crypto';

const Root = LanguageKeys.Commands.Dice;

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
		.addBooleanOption((builder) => applyLocalizedBuilder(builder, Root.OptionsHide))
)
export class UserCommand extends Command {
	private readonly Dice4 = '<:d4:1200786491492802681>';
	private readonly Dice8 = '<:d8:1200786525634437190>';
	private readonly Dice10 = '<:d10:1200786415005483018>';
	private readonly Dice12 = '<:d12:1200786447049957457>';
	private readonly Dice20 = '<:d20:1200786564914085978>';
	private readonly DicePlus = '<:dice_plus:1200790107893022740>';
	private readonly DiceMinus = '<:dice_minus:1200790383903375430>';
	private readonly DiceNeutral = '<:dice_neutral:1200790382540226570>';
	private readonly CoinHeads = '<:coin_heads:1205271732747894795>';
	private readonly CoinTails = '<:coin_tails:1205438570576355338>';
	private readonly CoinFlip = '<:coinflip:1205271734052196402>';
	private readonly RollingDiceCup = '<:rolling_dice_cup:1200786597105377290>';

	public override async chatInputRun(interaction: Command.ChatInputInteraction, options: Options) {
		const { faces, rolls, modifier = 0, preset } = options;

		const { results, render, dice, complex } = this.runPreset(faces, rolls, preset);

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

	private runPreset(faces?: number, rolls?: number, preset?: Preset) {
		switch (preset) {
			case 'd2':
				return this.runPresetCoin(rolls);
			case 'd4':
				return this.runPresetUndefined(4, rolls);
			case 'd6':
				return this.runPresetUndefined(6, rolls);
			case 'd8':
				return this.runPresetUndefined(8, rolls);
			case 'd10':
				return this.runPresetUndefined(10, rolls);
			case 'd10:ren':
				return this.runPresetRen10();
			case 'd12':
				return this.runPresetUndefined(12, rolls);
			case 'd20:dnd5e':
				return this.runPresetDnD5e(rolls);
			case 'd100':
				return this.runPresetCthulhu(rolls);
			case 'fate':
				return this.runPresetFate();
			default:
				return this.runPresetUndefined(faces, rolls);
		}
	}

	private runPresetUndefined(faces = 6, rolls = 1) {
		const results = arrayWith(rolls, () => this.runSingleDice(1, faces + 1));
		const render = results.map((roll) => underscore(roll.toString())).join(' ');
		return { results, render, dice: this.renderDice(faces), complex: false };
	}

	private runPresetCoin(rolls = 1) {
		const results = arrayWith(rolls, () => this.runSingleDice(1, 3));
		const render = results.map((roll) => (roll === 1 ? this.CoinHeads : this.CoinTails)).join(' ');
		return { results, render, dice: this.CoinFlip, complex: true };
	}

	private runPresetDnD5e(rolls = 1) {
		const results = arrayWith(rolls, () => this.runSingleDice(1, 21));
		const render = results.map((dice) => this.renderDnD5eDice(dice)).join(' ');
		return { results, render, dice: this.Dice20, complex: false };
	}

	private runPresetCthulhu(rolls = 1) {
		const results = arrayWith(rolls, () => this.runSingleDice(1, 101));
		const render = results.map((dice) => this.renderCthulhuDice(dice)).join(' ');
		return { results, render, dice: `${this.Dice10}${this.Dice10}`, complex: true };
	}

	/**
	 * The Fate system is a system that uses exclusively 4d6, where the faces are:
	 * - -1: Minus
	 * -  0: Neutral
	 * - +1: Plus
	 */
	private runPresetFate() {
		const results = arrayWith(4, () => this.runSingleDice(-1, 2));
		const render = results.map((dice) => this.renderFateDice(dice)).join(' ');
		return { results, render, dice: this.RollingDiceCup, complex: true };
	}

	/**
	 * The REN system is a system that uses exclusively d10s, but with two special rules:
	 * - Rolling a 1 is a botch, and the player must roll another d10 and subtract it from the total.
	 * - Rolling a 10 allows the player to roll another d10 and add it to the total, repeating as many times as they roll a 10.
	 *
	 * This system is used in Regnum Ex Nihilo (REN).
	 */
	private runPresetRen10() {
		const first = this.runSingleDice(1, 11);

		// Case for a 1, we roll a single dice which negates the 1, e.g. 1 then 7 = -6
		if (first === 1) {
			const second = this.runSingleDice(1, 11);
			return {
				results: [first, -second],
				render: `${bold(underscore(first.toString()))} ${underscore(second.toString())}`,
				dice: this.Dice10,
				complex: true
			};
		}

		const results = [first];

		// Case for a 10, we roll more dice until we get a non-10:
		while (results.at(-1) === 10) {
			results.push(this.runSingleDice(1, 11));
		}

		const render = results.map((dice, index) => this.renderRen10Dice(dice, index)).join(' ');
		return { results, render, dice: this.Dice10, complex: false };
	}

	private runSingleDice(min: number, max: number) {
		return randomInt(min, max);
	}

	private renderDice(faces: number) {
		switch (faces) {
			case 2:
				return this.CoinFlip;
			case 4:
				return this.Dice4;
			case 8:
				return this.Dice8;
			case 10:
				return this.Dice10;
			case 12:
				return this.Dice12;
			case 20:
				return this.Dice20;
			case 100:
				return `${this.Dice10}${this.Dice10}`;
			default:
				return this.RollingDiceCup;
		}
	}

	private renderDnD5eDice(dice: number) {
		const styled = underscore(dice.toString());
		return isAny(dice, 1, 20) ? bold(styled) : styled;
	}

	private renderCthulhuDice(dice: number) {
		const tens = Math.floor((dice % 100) / 10) * 10;
		const units = dice % 10;
		return underscore(`${tens.toString().padStart(2, '0')} ${units.toString()}`);
	}

	private renderFateDice(dice: number) {
		switch (dice) {
			case -1:
				return this.DiceMinus;
			case 0:
				return this.DiceNeutral;
			case 1:
				return this.DicePlus;
			default:
				return '';
		}
	}

	private renderRen10Dice(dice: number, index: number) {
		const styled = underscore(dice.toString());
		return index === 0 ? bold(styled) : styled;
	}
}

interface Options {
	faces?: number;
	rolls?: number;
	modifier?: number;
	preset?: Preset;
	selection?: Selection;
	hide?: boolean;
}

type Preset = 'd2' | 'd4' | 'd6' | 'd8' | 'd10' | 'd10:ren' | 'd12' | 'd20:dnd5e' | 'd100' | 'fate';
type Selection = 'addition' | 'greatest' | 'least';
