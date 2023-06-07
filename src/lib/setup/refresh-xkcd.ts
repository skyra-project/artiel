import { refreshComicsFromRemote } from '#lib/utilities/xkcd';
import { job } from 'cron';

export const xkcdRefresh = job({
	cronTime: '0 0 12,13 * * 1-5',
	onTick: refreshComicsFromRemote,
	start: true,
	unrefTimeout: true,
	timeZone: 'Etc/UTC'
});
