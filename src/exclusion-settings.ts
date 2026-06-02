export const DEFAULT_PERIOD_EXCLUSIONS = [
	'Dr',
	'Mr',
	'Mrs',
	'Ms',
	'Mx',
	'Prof',
	'Sr',
	'Jr',
	'St',
];

export function parsePeriodExclusions(value: string): string[] {
	return value
		.split(/\r?\n/)
		.map(entry => entry.trim())
		.filter(entry => entry.length > 0);
}

export function formatPeriodExclusions(exclusions: string[]): string {
	return exclusions.join('\n');
}
