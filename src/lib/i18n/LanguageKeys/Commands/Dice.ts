import { FT, T } from '@skyra/http-framework-i18n';

// Root
export const RootName = T('commands/dice:name');
export const RootDescription = T('commands/dice:description');

export const OptionsFaces = 'commands/dice:optionsFaces';
export const OptionsRolls = 'commands/dice:optionsRolls';
export const OptionsModifier = 'commands/dice:optionsModifier';
export const OptionsTemplate = 'commands/dice:optionsTemplate';

export const Title = FT<{ dice: string }>('commands/dice:title');

export const TemplateDnD5e = T('commands/dice:templateDnD5e');
export const TemplateCthulhu = T('commands/dice:templateCthulhu');
export const TemplateFate = T('commands/dice:templateFate');
