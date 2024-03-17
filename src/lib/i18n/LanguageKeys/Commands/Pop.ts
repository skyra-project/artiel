import { FT, T, type Value } from '@skyra/http-framework-i18n';

// Root
export const RootName = T('commands/pop:name');
export const PopDescription = T('commands/pop:description');

// Titles
export const Title = T('commands/pop:title');
export const TitleLost = T('commands/pop:titleLost');
export const TitleWinner = FT<Value<string>>('commands/pop:titleWinner');
