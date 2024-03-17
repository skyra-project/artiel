import { FT, T } from '@skyra/http-framework-i18n';

// Root
export const RootName = T('commands/rate:name');
export const RootDescription = T('commands/rate:description');
export const OptionsRateableTarget = 'commands/rate:optionsRateableTarget';

// Rates
export const MyOwners = T<[string, string]>('commands/rate:owners');
export const Myself = T<[string, string]>('commands/rate:myself');
export const Output = FT<{ author: string; userToRate: string; rate: number; emoji: string }>('commands/rate:output');
