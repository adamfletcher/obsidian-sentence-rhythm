import * as assert from 'assert';
import { findSentenceRanges, SentenceBoundaryOptions, SentenceRange } from './sentence-boundaries';

const defaultOptions: SentenceBoundaryOptions = {
	treatLineBreakAsSentenceEnd: false,
	periodExclusionsEnabled: false,
	periodExclusions: [],
};

function sentenceTexts(text: string, options = defaultOptions): string[] {
	return findSentenceRanges(text, options).map(sentence => sentence.text);
}

function sentenceSummaries(text: string, options = defaultOptions): Array<Pick<SentenceRange, 'start' | 'end' | 'text' | 'wordCount'>> {
	return findSentenceRanges(text, options).map(sentence => ({
		start: sentence.start,
		end: sentence.end,
		text: sentence.text,
		wordCount: sentence.wordCount,
	}));
}

assert.deepStrictEqual(
	sentenceSummaries('One sentence. Another sentence.'),
	[
		{ start: 0, end: 13, text: 'One sentence.', wordCount: 2 },
		{ start: 14, end: 31, text: 'Another sentence.', wordCount: 2 },
	]
);

assert.deepStrictEqual(
	sentenceTexts('One sentence. Another sentence.'),
	['One sentence.', 'Another sentence.']
);

assert.deepStrictEqual(
	sentenceTexts('Question? Exclaim! Colon: Full stop。 Ellipsis… Middle· Dot.'),
	['Question?', 'Exclaim!', 'Colon:', 'Full stop。', 'Ellipsis…', 'Middle·', 'Dot.']
);

assert.deepStrictEqual(
	sentenceSummaries('  > *Quoted line. '),
	[
		{ start: 5, end: 17, text: 'Quoted line.', wordCount: 2 },
	]
);

assert.deepStrictEqual(
	sentenceSummaries('Trim trailing.  Next sentence.'),
	[
		{ start: 0, end: 14, text: 'Trim trailing.', wordCount: 2 },
		{ start: 16, end: 30, text: 'Next sentence.', wordCount: 2 },
	]
);

assert.deepStrictEqual(
	sentenceTexts(''),
	[]
);

assert.deepStrictEqual(
	sentenceTexts('   \n\t'),
	[]
);

assert.deepStrictEqual(
	sentenceTexts('?! .'),
	[]
);

assert.deepStrictEqual(
	sentenceSummaries('She said "Done." Next sentence.'),
	[
		{ start: 0, end: 16, text: 'She said "Done."', wordCount: 3 },
		{ start: 17, end: 31, text: 'Next sentence.', wordCount: 2 },
	]
);

assert.deepStrictEqual(
	sentenceTexts('Pi is 3.14 today.'),
	['Pi is 3.14 today.']
);

assert.deepStrictEqual(
	sentenceTexts('A bare line\nNext sentence.'),
	['Next sentence.']
);

assert.deepStrictEqual(
	sentenceTexts('A bare line\nNext sentence.', {
		...defaultOptions,
		treatLineBreakAsSentenceEnd: true,
	}),
	['A bare line', 'Next sentence.']
);

assert.deepStrictEqual(
	sentenceTexts('A punctuated line.\nNext sentence.'),
	['A punctuated line.', 'Next sentence.']
);

assert.deepStrictEqual(
	sentenceTexts('Fortunately, Dr. Smith is here.'),
	['Fortunately, Dr.', 'Smith is here.']
);

assert.deepStrictEqual(
	sentenceTexts('Fortunately, Dr. Smith is here.', {
		...defaultOptions,
		periodExclusionsEnabled: false,
		periodExclusions: ['Dr'],
	}),
	['Fortunately, Dr.', 'Smith is here.']
);

assert.deepStrictEqual(
	sentenceTexts('Fortunately, Dr. Smith is here.', {
		...defaultOptions,
		periodExclusionsEnabled: true,
		periodExclusions: ['Dr'],
	}),
	['Fortunately, Dr. Smith is here.']
);

assert.deepStrictEqual(
	sentenceTexts('Fortunately, dr. Smith is here.', {
		...defaultOptions,
		periodExclusionsEnabled: true,
		periodExclusions: ['Dr'],
	}),
	['Fortunately, dr.', 'Smith is here.']
);

assert.deepStrictEqual(
	sentenceTexts('Please dismiss. Next sentence.', {
		...defaultOptions,
		periodExclusionsEnabled: true,
		periodExclusions: ['miss'],
	}),
	['Please dismiss.', 'Next sentence.']
);

assert.deepStrictEqual(
	sentenceTexts('Ahoy, Capt. Smith is here.', {
		...defaultOptions,
		periodExclusionsEnabled: true,
		periodExclusions: ['Capt'],
	}),
	['Ahoy, Capt. Smith is here.']
);

assert.deepStrictEqual(
	sentenceTexts('Dr? Smith is here.', {
		...defaultOptions,
		periodExclusionsEnabled: true,
		periodExclusions: ['Dr'],
	}),
	['Dr?', 'Smith is here.']
);
