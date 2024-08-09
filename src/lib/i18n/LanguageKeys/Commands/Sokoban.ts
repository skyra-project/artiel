import { FT, T, type Value } from '@skyra/http-framework-i18n';

// Root
export const RootName = T('commands/sokoban:name');
export const RootDescription = T('commands/sokoban:description');

// Subcommmands
export const PlayLevel = 'commands/sokoban:playLevel';
export const CustomLevel = 'commands/sokoban:customLevel';

// Options
export const OptionChooseLevel = 'commands/sokoban:optionChooseLevel';
export const OptionImportCustomLevel = 'commands/sokoban:optionImportCustomLevel';

// Errors
export const NoPlayerFound = T('commands/sokoban:noPlayerFound');
export const MultiplePlayersFound = T('commands/sokoban:multiplePlayersFound');
export const InvalidComponent = FT<Value>('commands/sokoban:invalidComponent');
export const InvalidLevel = T('commands/sokoban:invalidLevel');

// Game
export const Victory = FT<Value<{ seconds: string; moves: number }>>('commands/sokoban:victory');
export const Defeat = T('commands/sokoban:defeat');
export const Retry = T('commands/sokoban:retry');
