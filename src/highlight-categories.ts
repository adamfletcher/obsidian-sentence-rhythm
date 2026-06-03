import { findSentenceRanges, SentenceBoundaryOptions } from './sentence-boundaries';

export type HighlightCategory = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface HighlightCategorySettings {
	xsThreshold: number;
	smThreshold: number;
	mdThreshold: number;
	lgThreshold: number;
}

export interface SentenceHighlightSettings extends SentenceBoundaryOptions, HighlightCategorySettings {
	enabled: boolean;
}

export interface NumberRange {
	min: number;
	max: number;
}

export interface SentenceHighlight {
	start: number;
	end: number;
	className: string;
}

export function categoryForWordCount(wordCount: number, settings: HighlightCategorySettings): HighlightCategory {
	if (wordCount <= settings.xsThreshold) {
		return 'xs';
	}

	if (wordCount <= settings.smThreshold) {
		return 'sm';
	}

	if (wordCount <= settings.mdThreshold) {
		return 'md';
	}

	if (wordCount <= settings.lgThreshold) {
		return 'lg';
	}

	return 'xl';
}

export function getSentenceHighlights(
	text: string,
	settings: SentenceHighlightSettings,
	skipRanges: NumberRange[] = [],
): SentenceHighlight[] {
	if (!settings.enabled) {
		return [];
	}

	return findSentenceRanges(text, settings)
		.filter(sentence => !skipRanges.some(range => sentence.start <= range.max && sentence.end > range.min))
		.map(sentence => ({
			start: sentence.start,
			end: sentence.end,
			className: `sentence-length-${categoryForWordCount(sentence.wordCount, settings)}`,
		}));
}
