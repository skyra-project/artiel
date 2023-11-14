import { refreshComicsFromRemote } from '#lib/utilities/xkcd';
import { CronJob } from 'cron';

export const xkcdRefresh = CronJob.from({
	cronTime: '0 0 13 * * 1-5',
	onTick: refreshComicsFromRemote,
	start: true,
	unrefTimeout: true,
	timeZone: 'Etc/UTC'
});
