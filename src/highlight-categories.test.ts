import * as assert from 'assert';
import {
	categoryForWordCount,
	getSentenceHighlights,
	HighlightCategorySettings,
	SentenceHighlightSettings,
} from './highlight-categories';

const defaultCategorySettings: HighlightCategorySettings = {
	xsThreshold: 2,
	smThreshold: 5,
	mdThreshold: 10,
	lgThreshold: 20,
};

const defaultHighlightSettings: SentenceHighlightSettings = {
	...defaultCategorySettings,
	enabled: true,
	treatLineBreakAsSentenceEnd: false,
	periodExclusionsEnabled: false,
	periodExclusions: [],
};

assert.strictEqual(categoryForWordCount(2, defaultCategorySettings), 'xs');
assert.strictEqual(categoryForWordCount(3, defaultCategorySettings), 'sm');
assert.strictEqual(categoryForWordCount(5, defaultCategorySettings), 'sm');
assert.strictEqual(categoryForWordCount(6, defaultCategorySettings), 'md');
assert.strictEqual(categoryForWordCount(10, defaultCategorySettings), 'md');
assert.strictEqual(categoryForWordCount(11, defaultCategorySettings), 'lg');
assert.strictEqual(categoryForWordCount(20, defaultCategorySettings), 'lg');
assert.strictEqual(categoryForWordCount(21, defaultCategorySettings), 'xl');

assert.strictEqual(
	categoryForWordCount(4, {
		xsThreshold: 1,
		smThreshold: 3,
		mdThreshold: 4,
		lgThreshold: 8,
	}),
	'md'
);

assert.strictEqual(
	categoryForWordCount(7, {
		xsThreshold: 10,
		smThreshold: 5,
		mdThreshold: 20,
		lgThreshold: 30,
	}),
	'xs'
);

assert.strictEqual(
	categoryForWordCount(11, {
		xsThreshold: 10,
		smThreshold: 5,
		mdThreshold: 20,
		lgThreshold: 30,
	}),
	'md'
);

assert.strictEqual(
	categoryForWordCount(1, {
		xsThreshold: Number.NaN,
		smThreshold: 5,
		mdThreshold: 10,
		lgThreshold: 20,
	}),
	'sm'
);

assert.deepStrictEqual(
	getSentenceHighlights('One sentence. Another sentence.', {
		...defaultHighlightSettings,
		enabled: false,
	}),
	[]
);

assert.deepStrictEqual(
	getSentenceHighlights('One sentence. Another sentence.', defaultHighlightSettings),
	[
		{ start: 0, end: 13, className: 'sentence-length-xs' },
		{ start: 14, end: 31, className: 'sentence-length-xs' },
	]
);

assert.deepStrictEqual(
	getSentenceHighlights('Tiny. Medium sized sentence here. A much longer sentence has more than five words.', defaultHighlightSettings),
	[
		{ start: 0, end: 5, className: 'sentence-length-xs' },
		{ start: 6, end: 33, className: 'sentence-length-sm' },
		{ start: 34, end: 82, className: 'sentence-length-md' },
	]
);

assert.deepStrictEqual(
	getSentenceHighlights(
		'Code sentence. Good sentence. Link sentence.',
		defaultHighlightSettings,
		[
			{ min: 0, max: 14 },
			{ min: 30, max: 44 },
		],
	),
	[
		{ start: 15, end: 29, className: 'sentence-length-xs' },
	]
);

assert.deepStrictEqual(
	getSentenceHighlights(
		'Before sentence. Middle sentence. After sentence.',
		defaultHighlightSettings,
		[
			{ min: 17, max: 33 },
		],
	),
	[
		{ start: 0, end: 16, className: 'sentence-length-xs' },
		{ start: 34, end: 49, className: 'sentence-length-xs' },
	]
);

assert.deepStrictEqual(
	getSentenceHighlights('Fortunately, Dr. Smith is here.', {
		...defaultHighlightSettings,
		periodExclusionsEnabled: true,
		periodExclusions: ['Dr'],
	}),
	[
		{ start: 0, end: 31, className: 'sentence-length-sm' },
	]
);
