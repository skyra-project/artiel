import type { ArrayString, IntegerString } from '@skyra/env-utilities';

declare module '@skyra/env-utilities' {
	interface Env {
		CLIENT_NAME: string;
		CLIENT_VERSION: string;

		OWNER_IDS: ArrayString;

		HTTP_ADDRESS: string;
		HTTP_PORT: IntegerString;

		REGISTRY_GUILD_ID: string;
		MEME_TEMPLATE_DATABASE_TOKEN: string;

		CAT_API_TOKEN: string;
		DOG_API_TOKEN: string;
	}
}
