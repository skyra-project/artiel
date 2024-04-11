import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { escapeMarkdown } from '@discordjs/builders';
import { envParseArray } from '@skyra/env-utilities';
import { Command, RegisterCommand } from '@skyra/http-framework';
import { applyLocalizedBuilder, getT } from '@skyra/http-framework-i18n';

const Root = LanguageKeys.Commands.Rate;

@RegisterCommand((builder) =>
	applyLocalizedBuilder(builder, Root.RootName, Root.RootDescription) //
		.addStringOption((builder) => applyLocalizedBuilder(builder, Root.OptionsRateableTarget).setRequired(true))
)
export class UserCommand extends Command {
	private readonly oneToTenMap = new Map<number, UtilOneToTenEntry>([
		[0, { emoji: '😪', color: 0x5b1100 }],
		[1, { emoji: '😪', color: 0x5b1100 }],
		[2, { emoji: '😫', color: 0xab1100 }],
		[3, { emoji: '😔', color: 0xff2b00 }],
		[4, { emoji: '😒', color: 0xff6100 }],
		[5, { emoji: '😌', color: 0xff9c00 }],
		[6, { emoji: '😕', color: 0xb4bf00 }],
		[7, { emoji: '😬', color: 0x84fc00 }],
		[8, { emoji: '🙂', color: 0x5bf700 }],
		[9, { emoji: '😃', color: 0x24f700 }],
		[10, { emoji: '😍', color: 0x51d4ef }]
	]);

	private readonly devRegex = new RegExp(
		`^(kyra|favna|${envParseArray('OWNER_IDS')
			.map((owner) => `<@!?${owner}>`)
			.join('|')})$`,
		'i'
	);

	private readonly botRegex = new RegExp(`^(you|yourself|artiel|<@!?${process.env.CLIENT_ID}>)$`, 'i');

	private readonly myselfRegex = new RegExp(`^(myself|me)$`, 'i');

	private readonly myToYourRegex = new RegExp(`\bmy\b`, 'g');

	public override async chatInputRun(interaction: Command.ChatInputInteraction, options: Options) {
		let rateableThing = options.target;

		let ratewaifu: string;
		let rate: number;

		const t = getT(interaction.locale);

		if (this.botRegex.test(rateableThing)) {
			rate = 100;
			[ratewaifu, rateableThing] = t(Root.Myself);
		} else if (this.devRegex.test(rateableThing)) {
			rate = 101;
			[ratewaifu, rateableThing] = t(Root.MyOwners);
		} else {
			rateableThing = this.myselfRegex.test(rateableThing)
				? interaction.user.global_name || interaction.user.username
				: escapeMarkdown(rateableThing.replace(this.myToYourRegex, 'your'));

			const rng = Math.round(Math.random() * 100);
			[ratewaifu, rate] = [this.oneToTen((rng / 10) | 0)!.emoji, rng];
		}

		const content = t(Root.Output, {
			author: interaction.user.global_name,
			userToRate: rateableThing,
			rate,
			emoji: ratewaifu
		});
		return interaction.reply({ content, allowed_mentions: { users: [], roles: [] } });
	}

	private oneToTen(level: number): UtilOneToTenEntry | undefined {
		return this.oneToTenMap.get(Math.min(Math.max(0, level), 10));
	}
}

interface Options {
	target: string;
}

interface UtilOneToTenEntry {
	emoji: string;
	color: number;
}
