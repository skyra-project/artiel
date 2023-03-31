import { setup } from '#lib/setup/all';
import { registerCommands } from '#lib/utilities/register-commands';
import { envParseInteger, envParseString } from '@skyra/env-utilities';
import { Client, container } from '@skyra/http-framework';
import { init, load } from '@skyra/http-framework-i18n';
import { createBanner } from '@skyra/start-banner';
import gradient from 'gradient-string';

setup();

await load(new URL('../src/locales', import.meta.url));
await init({
	fallbackLng: 'en-US',
	returnNull: false,
	returnEmptyString: false,
	returnObjects: true
});

const client = new Client();
await client.load();

void registerCommands();

const address = envParseString('HTTP_ADDRESS', '0.0.0.0');
const port = envParseInteger('HTTP_PORT', 3000);
await client.listen({ address, port });

console.log(
	gradient.atlas.multiline(
		createBanner({
			name: [
				String.raw`          :::     ::::::::: ::::::::::: ::::::::::: :::::::::: :::`,
				String.raw`       :+: :+:   :+:    :+:    :+:         :+:     :+:        :+:`,
				String.raw`     +:+   +:+  +:+    +:+    +:+         +:+     +:+        +:+`,
				String.raw`   +#++:++#++: +#++:++#:     +#+         +#+     +#++:++#   +#+`,
				String.raw`  +#+     +#+ +#+    +#+    +#+         +#+     +#+        +#+`,
				String.raw` #+#     #+# #+#    #+#    #+#         #+#     #+#        #+#`,
				String.raw`###     ### ###    ###    ###     ########### ########## ##########`
			],
			extra: [
				'',
				`Loaded: ${container.stores.get('commands').size} commands`,
				`      : ${container.stores.get('interaction-handlers').size} interaction handlers`,
				`Listening: ${address}:${port}`
			]
		})
	)
);
