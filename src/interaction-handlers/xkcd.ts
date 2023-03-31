import { getComic } from '#lib/utilities/xkcd';
import { cutText } from '@sapphire/utilities';
import { InteractionHandler } from '@skyra/http-framework';
import { MessageFlags } from 'discord-api-types/v10';

export class UserHandler extends InteractionHandler {
	public run(interaction: InteractionHandler.ButtonInteraction, parameters: Parameters) {
		const comic = getComic(Number(parameters[0]))!;
		const content = cutText(comic[parameters[1]]!, 2000);
		return interaction.reply({ content, flags: MessageFlags.Ephemeral });
	}
}

type Parameters = [id: `${bigint}`, type: 'transcript' | 'news'];
