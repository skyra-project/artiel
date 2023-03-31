import { FT, T, Value } from '@skyra/http-framework-i18n';

// Root
export const RootName = T('commands/xkcd:name');
export const RootDescription = T('commands/xkcd:description');

export const OptionsId = 'commands/xkcd:optionsId';
export const NoComicFound = FT<Value<number>>('commands/xkcd:noComicFound');
export const ButtonsTranscript = T('commands/xkcd:buttonsTranscript');
export const ButtonsNews = T('commands/xkcd:buttonsNews');
