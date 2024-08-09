import { Collection } from '@discordjs/collection';
import type { ChatInputCommandInteraction, PartialMessage } from '@skyra/http-framework';

export const popGames = new Collection<bigint, { response: PartialMessage<ChatInputCommandInteraction>; timer: NodeJS.Timeout }>();
