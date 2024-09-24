import { FT, T } from '@skyra/http-framework-i18n';

// Root
export const RootName = T('commands/feed:name');
export const RootDescription = T('commands/feed:description');

// Options
export const OptionsTarget = 'commands/feed:optionsTarget';
export const OptionsType = 'commands/feed:optionsType';

// Embed
export const Content = FT<{ target: string; type: string }>('commands/feed:content');

// Components
export const ButtonSource = T('commands/feed:buttonSource');

// Errors
export const Error = T('commands/feed:error');

export const PizzaKey = T('commands/feed:pizza');
export const BurgerKey = T('commands/feed:burger');
export const RiceKey = T('commands/feed:rice');
export const DessertKey = T('commands/feed:dessert');
export const DosaKey = T('commands/feed:dosa');
export const PastaKey = T('commands/feed:pasta');
export const SamosaKey = T('commands/feed:samosa');
export const BiryaniKey = T('commands/feed:biryani');

export const FoodKey = (key: FoodType) => T(`commands/feed:${key}`);
export type FoodType = 'pizza' | 'burger' | 'rice' | 'dessert' | 'dosa' | 'pasta' | 'samosa' | 'biryani';
