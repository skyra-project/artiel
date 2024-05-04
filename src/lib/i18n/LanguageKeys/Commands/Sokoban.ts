import { FT, T, type Value } from '@skyra/http-framework-i18n';

// Root
export const RootName = T('commands/sokoban:name');
export const RootDescription = T('commands/sokoban:description');

// Options
export const OptionPlayLevel = 'commands/sokoban:optionLevel';
export const OptionChooseLevel = 'commands/sokoban:optionChooseLevel';
export const OptionPlayCustomLevel = 'commands/sokoban:optionCustomLevel';
export const OptionImportCustomLevel = 'commands/sokoban:optionImportCustomLevel';

// Errors
export const SokobanInvalidComponent = FT<Value<string>>('commands/sokoban:invalidComponent');
export const SokobanInvalidLevel = T('commands/sokoban:invalidLevel');

// Game
export const Victory = FT<Value<{ seconds: string; moves: number }>>('commands/sokoban:victory');
export const Defeat = T('commands/sokoban:defeat');
export const Retry = T('commands/sokoban:retry');
