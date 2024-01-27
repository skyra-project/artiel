import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { arrayWith } from '#lib/utilities/array';
import { isAny } from '#lib/utilities/operators';
import { HeadingLevel, bold, heading, underscore } from '@discordjs/builders';
import { Command, RegisterCommand } from '@skyra/http-framework';
import { applyLocalizedBuilder, createSelectMenuChoiceName, resolveKey } from '@skyra/http-framework-i18n';
import { randomInt } from 'node:crypto';

const Root = LanguageKeys.Commands.Dice;

@RegisterCommand((builder) =>
	applyLocalizedBuilder(builder, Root.RootName, Root.RootDescription) //
		.addIntegerOption((builder) => applyLocalizedBuilder(builder, Root.OptionsRolls).setMinValue(1).setMaxValue(10))
		.addIntegerOption((builder) => applyLocalizedBuilder(builder, Root.OptionsFaces).setMinValue(1).setMaxValue(100))
		.addIntegerOption((builder) => applyLocalizedBuilder(builder, Root.OptionsModifier))
		.addStringOption((builder) =>
			applyLocalizedBuilder(builder, Root.OptionsPreset).addChoices(
				createSelectMenuChoiceName(Root.PresetDnD5e, { value: 'dnd5e' }),
				createSelectMenuChoiceName(Root.PresetCthulhu, { value: 'cthulhu' }),
				createSelectMenuChoiceName(Root.PresetFate, { value: 'fate' })
			)
		)
)
export class UserCommand extends Command {
	private readonly Dice10 = '<:d10:1200786415005483018>';
	private readonly Dice12 = '<:d12:1200786447049957457>';
	private readonly Dice20 = '<:d20:1200786564914085978>';
	private readonly Dice4 = '<:d4:1200786491492802681>';
	private readonly Dice8 = '<:d8:1200786525634437190>';
	private readonly DicePlus = '<:dice_plus:1200790107893022740>';
	private readonly DiceMinus = '<:dice_minus:1200790383903375430>';
	private readonly DiceNeutral = '<:dice_neutral:1200790382540226570>';
	private readonly RollingDiceCup = '<:rolling_dice_cup:1200786597105377290>';

	public override async chatInputRun(interaction: Command.ChatInputInteraction, options: Options) {
		const { faces, rolls, modifier = 0, template } = options;

		const { results, render, dice, complex } = this.runTemplate(faces, rolls, template);

		const lines = [heading(resolveKey(interaction, Root.Title, { dice }), HeadingLevel.Three)] as string[];
		if (!(results.length === 1 && !complex)) {
			lines.push(render);
		}

		let result = heading((results.reduce((acc, curr) => acc + curr, 0) + modifier).toString(), HeadingLevel.One);
		if (modifier) result += ` (${modifier > 0 ? '+' : '-'}${modifier})`;
		lines.push(result);

		return interaction.reply({ content: lines.join('\n') });
	}

	private runTemplate(faces?: number, rolls?: number, template?: Template) {
		switch (template) {
			case 'dnd5e':
				return this.runTemplateDnD5e(rolls);
			case 'cthulhu':
				return this.runTemplateCthulhu(rolls);
			case 'fate':
				return this.runTemplateFate(rolls);
			default:
				return this.runTemplateUndefined(faces, rolls);
		}
	}

	private runTemplateUndefined(faces = 6, rolls = 1) {
		const results = arrayWith(rolls, () => this.runSingleDice(1, faces + 1));
		const render = results.map((roll) => underscore(roll.toString())).join(' ');
		return { results, render, dice: this.renderDice(faces), complex: false };
	}

	private runTemplateDnD5e(rolls = 1) {
		const results = arrayWith(rolls, () => this.runSingleDice(1, 21));
		const render = results.map((dice) => this.renderDnD5eDice(dice)).join(' ');
		return { results, render, dice: this.Dice20, complex: false };
	}

	private runTemplateCthulhu(rolls = 1) {
		const results = arrayWith(rolls, () => this.runSingleDice(1, 101));
		const render = results.map((dice) => this.renderCthulhuDice(dice)).join(' ');
		return { results, render, dice: `${this.Dice10}${this.Dice10}`, complex: true };
	}

	private runTemplateFate(rolls = 4) {
		const results = arrayWith(rolls, () => this.runSingleDice(-1, 2));
		const render = results.map((dice) => this.renderFateDice(dice)).join(' ');
		return { results, render, dice: this.RollingDiceCup, complex: true };
	}

	private runSingleDice(min: number, max: number) {
		return randomInt(min, max);
	}

	private renderDice(faces: number) {
		switch (faces) {
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
}

interface Options {
	faces?: number;
	rolls?: number;
	modifier?: number;
	template?: Template;
}

type Template = 'dnd5e' | 'cthulhu' | 'fate';
