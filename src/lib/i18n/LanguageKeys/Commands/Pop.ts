import { FT, T, type Value } from '@skyra/http-framework-i18n';

// Root
export const RootName = T('commands/pop:name');
export const RootDescription = T('commands/pop:description');

// Options
export const OptionsDuration = 'commands/pop:optionsDuration';
export const OptionsWidth = 'commands/pop:optionsWidth';
export const OptionsHeight = 'commands/pop:optionsHeight';
export const OptionsLength = 'commands/pop:optionsLength';

// Components
export const ButtonsInputSolution = T('commands/pop:buttonsInputSolution');
export const ModalTitle = T('commands/pop:modalTitle');
export const ModalInputPlaceholder = T('commands/pop:modalInputPlaceholder');

// Game
export const NonexistentGame = T('commands/pop:nonexistentGame');
export const WrongSolution = T('commands/pop:wrongSolution');

// Titles
export const Title = T('commands/pop:title');
export const TitleLost = T('commands/pop:titleLost');
export const TitleWinner = FT<Value<string>>('commands/pop:titleWinner');
