import { FT, T, type Value } from '@skyra/http-framework-i18n';

// Root
export const RootName = T('commands/meme:name');
export const RootDescription = T('commands/meme:description');

export const OptionsName = 'commands/meme:optionsName';
export const OptionsContent = 'commands/meme:optionsContent';
export const OptionsTarget = 'commands/meme:optionsTarget';
export const NoEntryFound = FT<Value>('commands/meme:noEntryFound');
export const AltText = FT<{ template: string; parts: string }>('commands/meme:altText');
