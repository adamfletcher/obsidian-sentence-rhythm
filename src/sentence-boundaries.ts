export interface SentenceBoundaryOptions {
	treatLineBreakAsSentenceEnd: boolean;
	periodExclusionsEnabled?: boolean;
	periodExclusions?: string[];
}

export interface SentenceRange {
	start: number;
	end: number;
	text: string;
	wordCount: number;
}

const sentenceEndChars: string[]  = [
	'.',
	'?',
	':',
	'!',
	'\u3002',
	'\u2026',
	'\u00B7'
];

const quoteEndChars: string[]  = [
	'"',
	"'",
	"`",
	'’',
	'\u201D',
	'\u3002',
];

const latinAndNumbers = 'a-zA-Z0-9\\u00C0-\\u00FF\\u0100-\\u017F';
const baseLatinWord = `[${latinAndNumbers}]+`;
const latinWordWithApostrophe = `${baseLatinWord}(?:['’]${baseLatinWord})*`;
const wordPattern = `${latinWordWithApostrophe}|[\\u4E00-\\u9FFF]|[\\u3040-\\u309F]|[\\u30A0-\\u30FF]|[\\uAC00-\\uD7A3]|[\\uF900-\\uFAFF]|[\\uFF66-\\uFF9F]`;
const wordRegex = new RegExp(wordPattern, 'gu');
const previousWordBeforePeriodRegex = new RegExp(`(${wordPattern})\\.$`, 'u');

let sentenceEndCharsRegex = sentenceEndChars.join("");
sentenceEndCharsRegex = sentenceEndCharsRegex.replace('.', '');

const sentenceRegexString = `.+?(?:\\n|[${sentenceEndCharsRegex}]+[${quoteEndChars.join("")}]{0,1}|[.]+[${quoteEndChars.join("")}]{0,1}(?:[${quoteEndChars.join("")}]|\\s|$))`;

export function findSentenceRanges(text: string, options: SentenceBoundaryOptions): SentenceRange[] {
	const ranges: SentenceRange[] = [];
	const sentenceRegex = new RegExp(sentenceRegexString, 'g');
	const exclusions = new Set(options.periodExclusions ?? []);
	let sentenceStart = 0;
	let match: RegExpExecArray | null;

	while ((match = sentenceRegex.exec(text)) !== null) {
		const candidate = match[0];

		if (candidate.endsWith('\n') && !options.treatLineBreakAsSentenceEnd) {
			if (sentenceEndChars.includes(candidate[candidate.length - 2])) {
				// Keep highlighting when a line break follows sentence-ending punctuation.
			} else if (sentenceEndChars.includes(candidate[candidate.length - 3]) && quoteEndChars.includes(candidate[candidate.length - 2])) {
				// Keep highlighting when a line break follows quoted sentence-ending punctuation.
			} else {
				sentenceStart = sentenceRegex.lastIndex;
				continue;
			}
		}

		if (options.periodExclusionsEnabled && periodCandidateIsExcluded(candidate, exclusions)) {
			continue;
		}

		const rawSentence = text.slice(sentenceStart, sentenceRegex.lastIndex);
		const startOffset = rawSentence.length - rawSentence.replace(/^[\s>*]*/, '').length;
		let endOffset = 0 - startOffset;

		if (rawSentence.endsWith(' ')) {
			endOffset--;
		}

		const start = sentenceStart + startOffset;
		const end = sentenceStart + rawSentence.length + endOffset;
		const sentenceText = rawSentence.trim();
		const wordCount = countWords(sentenceText);

		if (wordCount > 0) {
			ranges.push({
				start,
				end,
				text: sentenceText,
				wordCount,
			});
		}

		sentenceStart = sentenceRegex.lastIndex;
	}

	return ranges;
}

export function countWords(text: string): number {
	const matches = text.match(wordRegex);
	return matches ? matches.length : 0;
}

function periodCandidateIsExcluded(candidate: string, exclusions: Set<string>): boolean {
	const boundary = candidate.trimEnd().replace(new RegExp(`[${quoteEndChars.join("")}]+$`, 'u'), '');
	const match = boundary.match(previousWordBeforePeriodRegex);

	if (!match) {
		return false;
	}

	return exclusions.has(match[1]);
}
