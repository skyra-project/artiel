import { FT, T } from '@skyra/http-framework-i18n';

// Root
export const RootName = T('commands/ship:name');
export const RootDescription = T('commands/ship:description');

export const OptionsTarget = 'commands/ship:optionsTarget';
export const OptionsAuthor = 'commands/ship:optionsAuthor';
export const OptionsTheme = 'commands/ship:optionsTheme';
export const ThemeLight = T('commands/ship:themeLight');
export const ThemeDark = T('commands/ship:themeDark');
export const ThemeTransPride = T('commands/ship:themeTransPride');
export const ThemeNonBinaryPride = T('commands/ship:themeNonBinaryPride');
export const AbortError = T('commands/ship:abortError');
export const UnknownError = T('commands/ship:unknownError');
export const Content = FT<{ author: string; target: string; name: string }>('commands/ship:content');
export const AltText = FT<{ author: string; target: string; name: string }>('commands/ship:altText');
