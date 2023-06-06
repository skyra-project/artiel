import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { getAvatar, getTag } from '#lib/utilities/discord';
import { bold } from '@discordjs/builders';
import type { RawFile } from '@discordjs/rest';
import { Result, err, ok } from '@sapphire/result';
import { Command, RegisterCommand, type TransformedArguments } from '@skyra/http-framework';
import { applyLocalizedBuilder, createSelectMenuChoiceName, resolveKey, resolveUserKey } from '@skyra/http-framework-i18n';
import { isAbortError } from '@skyra/safe-fetch';
import { Canvas, Image, Path2D, filter, loadImage } from 'canvas-constructor/napi-rs';
import { MessageFlags, type APIUser } from 'discord-api-types/v10';

const Root = LanguageKeys.Commands.Ship;

@RegisterCommand((builder) =>
	applyLocalizedBuilder(builder, Root.RootName, Root.RootDescription) //
		.addUserOption((builder) => applyLocalizedBuilder(builder, Root.OptionsTarget).setRequired(true))
		.addUserOption((builder) => applyLocalizedBuilder(builder, Root.OptionsAuthor))
		.addStringOption((builder) =>
			applyLocalizedBuilder(builder, Root.OptionsTheme).addChoices(
				createSelectMenuChoiceName(Root.ThemeLight, { value: 'light' }),
				createSelectMenuChoiceName(Root.ThemeDark, { value: 'dark' }),
				createSelectMenuChoiceName(Root.ThemeTransRights, { value: 'trans-rights' })
			)
		)
)
export class UserCommand extends Command {
	private heartFill: Path2D = null!;
	private heartBorder: Path2D = null!;

	public override async chatInputRun(interaction: Command.ChatInputInteraction, options: Options) {
		const author = options.author?.user ?? interaction.user;
		const target = options.target.user;
		const result = await this.loadAvatars(author, target);
		return result.match({
			ok: (avatars) => this.handleOk(interaction, author, target, avatars, options.theme ?? 'dark'),
			err: (error) => this.handleErr(interaction, error)
		});
	}

	public override onLoad() {
		super.onLoad();

		this.heartBorder = this.generateHeart(140, 30, 80, 80);
		this.heartFill = this.generateHeart(146, 36, 68, 68);
	}

	private async handleOk(interaction: Command.ChatInputInteraction, author: APIUser, target: APIUser, avatars: Avatars, theme: Theme) {
		const response = await interaction.defer();

		const colors = UserCommand.Themes[theme];
		const name = this.generateName(author.username, target.username);
		const canvas = new Canvas(360, 140)
			// Background
			.setColor(colors.background)
			.setFilter(filter('drop-shadow', '0px', '0px', '10px', '#1c1917'))
			.printRoundedRectangle(10, 10, 340, 120, 20)
			.resetFilters()

			// Heart
			.setColor(colors.border)
			.fill(this.heartBorder)
			.setColor(colors.heart)
			.fill(this.heartFill)

			// Avatars
			.printRoundedImage(avatars[0], 25, 25, 90, 90, 20)
			.printRoundedImage(avatars[1], 245, 25, 90, 90, 20);

		const authorTag = getTag(author);
		const targetTag = getTag(target);
		const file = { name: 'ship.png', data: await canvas.pngAsync(), contentType: 'image/png' } satisfies RawFile;
		return response.update({
			files: [file],
			attachments: [{ id: '0', description: resolveKey(interaction, Root.AltText, { author: authorTag, target: targetTag, name }) }],
			content: resolveKey(interaction, Root.Content, { author: bold(authorTag), target: bold(targetTag), name: bold(name) }),
			allowed_mentions: { roles: [], users: [] }
		});
	}

	private handleErr(interaction: Command.ChatInputInteraction, error: Error) {
		if (isAbortError(error)) {
			const content = resolveUserKey(interaction, Root.AbortError);
			return interaction.reply({ content, flags: MessageFlags.Ephemeral });
		}

		this.container.logger.error('[SHIP]', error);
		const content = resolveUserKey(interaction, Root.UnknownError);
		return interaction.reply({ content, flags: MessageFlags.Ephemeral });
	}

	private async loadAvatars(author: APIUser, target: APIUser): Promise<Result<Avatars, Error>> {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 2000);

		try {
			const avatars = await Promise.all([
				loadImage(getAvatar(author), { requestOptions: { signal: controller.signal } }), //
				loadImage(getAvatar(target), { requestOptions: { signal: controller.signal } })
			]);
			clearTimeout(timer);
			return ok(avatars);
		} catch (error) {
			return err(error as Error);
		}
	}

	private generateName(author: string, target: string) {
		const charactersAuthor = [...author];
		const charactersTarget = [...target];

		const sliceA = charactersAuthor.slice(0, Math.min(charactersAuthor.length, charactersAuthor.length * Math.random() * 0.8 + 2));
		const sliceB = charactersTarget.slice(-Math.min(charactersTarget.length, charactersTarget.length * Math.random() * 0.8 + 2));
		return sliceA.concat(sliceB).join('');
	}

	private generateHeart(x: number, y: number, width: number, height: number) {
		// Reference: https://andbin.dev/java/drawing-heart-shape-java2d
		const beX = x + width / 2; // bottom endpoint X
		const beY = y + height; //    bottom endpoint Y

		const c1DX = width * 0.968; //  delta X of control point 1
		const c1DY = height * 0.672; // delta Y of control point 1
		const c2DX = width * 0.281; //  delta X of control point 2
		const c2DY = height * 1.295; // delta Y of control point 2
		const teDY = height * 0.85; //  delta Y of top endpoint

		const path = new Path2D();
		path.moveTo(beX, beY);
		// Left side of heart:
		path.bezierCurveTo(
			beX - c1DX, // control point 1
			beY - c1DY,
			beX - c2DX, // control point 2
			beY - c2DY,
			beX, //        top endpoint
			beY - teDY
		);
		// Right side of heart:
		path.bezierCurveTo(
			beX + c2DX, // control point 2
			beY - c2DY,
			beX + c1DX, // control point 1
			beY - c1DY,
			beX, // bottom endpoint
			beY
		);

		return path;
	}

	private static readonly Themes = {
		light: { background: '#f5f5f4', heart: '#dc2626', border: '#fca5a5' },
		dark: { background: '#1c1917', heart: '#e11d48', border: '#fb7185' },
		'trans-rights': { background: '#5bcffa', heart: '#f5abb9', border: '#f5f5f4' }
	} satisfies Record<Theme, { background: string; heart: string; border: string }>;
}

type Avatars = [author: Image, target: Image];

interface Options {
	target: TransformedArguments.User;
	author?: TransformedArguments.User;
	theme?: Theme;
}

type Theme = 'light' | 'dark' | 'trans-rights';
