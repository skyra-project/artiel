import { FT, T } from '@skyra/http-framework-i18n';

// Root
export const RootName = T('commands/dice:name');
export const RootDescription = T('commands/dice:description');

export const OptionsFaces = 'commands/dice:optionsFaces';
export const OptionsRolls = 'commands/dice:optionsRolls';
export const OptionsModifier = 'commands/dice:optionsModifier';
export const OptionsPreset = 'commands/dice:optionsPreset';

export const Title = FT<{ dice: string }>('commands/dice:title');

export const PresetDnD5e = T('commands/dice:presetDnD5e');
export const PresetCthulhu = T('commands/dice:presetCthulhu');
export const PresetFate = T('commands/dice:presetFate');
