import * as assert from 'assert';
import { DEFAULT_PERIOD_EXCLUSIONS, formatPeriodExclusions, parsePeriodExclusions } from './exclusion-settings';

assert.ok(DEFAULT_PERIOD_EXCLUSIONS.includes('Dr'));
assert.ok(DEFAULT_PERIOD_EXCLUSIONS.includes('Mr'));
assert.ok(DEFAULT_PERIOD_EXCLUSIONS.includes('Mrs'));
assert.ok(DEFAULT_PERIOD_EXCLUSIONS.includes('Ms'));

assert.deepStrictEqual(
	parsePeriodExclusions('Dr\nCapt\nMx'),
	['Dr', 'Capt', 'Mx']
);

assert.deepStrictEqual(
	parsePeriodExclusions('\n  Dr  \n\nCapt\n'),
	['Dr', 'Capt']
);

assert.deepStrictEqual(
	parsePeriodExclusions('Dr\ndr'),
	['Dr', 'dr']
);

assert.strictEqual(
	formatPeriodExclusions(['Dr', 'Capt', 'Mx']),
	'Dr\nCapt\nMx'
);
