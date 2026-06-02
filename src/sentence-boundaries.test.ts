import * as assert from 'assert';
import { findSentenceRanges, SentenceBoundaryOptions } from './sentence-boundaries';

const defaultOptions: SentenceBoundaryOptions = {
	treatLineBreakAsSentenceEnd: false,
	periodExclusionsEnabled: false,
	periodExclusions: [],
};

function sentenceTexts(text: string, options = defaultOptions): string[] {
	return findSentenceRanges(text, options).map(sentence => sentence.text);
}

assert.deepStrictEqual(
	sentenceTexts('One sentence. Another sentence.'),
	['One sentence.', 'Another sentence.']
);

assert.deepStrictEqual(
	sentenceTexts('Question? Exclaim! Colon: Dot.'),
	['Question?', 'Exclaim!', 'Colon:', 'Dot.']
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
