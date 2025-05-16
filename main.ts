import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import {
	ViewUpdate,
	PluginValue,
	EditorView,
	ViewPlugin,
	Decoration,
	DecorationSet
} from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

interface SentenceRhythmPluginSettings {
	xsColor: string,
	smColor: string;
	mdColor: string,
	lgColor: string,
	xlColor: string,
	textColor: string,
	enabled: boolean,
	xsThreshold: number,
	smThreshold: number,
	mdThreshold: number,
	lgThreshold: number,
	treatLineBreakAsSentenceEnd: boolean,
}

const DEFAULT_SETTINGS: SentenceRhythmPluginSettings = {
	xsColor: '#fff2c8',
	smColor: '#eadbf6',
	mdColor: '#c5f2cd',
	lgColor: '#f9caca',
	xlColor: '#d1f6f4',
	textColor: '#222222',
	enabled: false,
	xsThreshold: 2,
	smThreshold: 5,
	mdThreshold: 10,
	lgThreshold: 20,
	treatLineBreakAsSentenceEnd: false,
}

export default class SentenceRhythmPlugin extends Plugin {
	settings: SentenceRhythmPluginSettings;
	forceViewUpdate: boolean;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'toggle-sentence-highlighting',
			name: 'Toggle highlighting',
			callback: () => {
				this.settings.enabled = !this.settings.enabled;
				this.saveSettings();
				new Notice(`Sentence highlighting ${this.settings.enabled ? 'enabled' : 'disabled'}`);
			}
		});

		this.addSettingTab(new SetenceLengthSettingsTab(this.app, this));
		this.registerEditorExtension(this.createViewPlugin());
		this.updateStyles();
	}

	updateStyles() {
		document.documentElement.style.setProperty("--sentence-length-highlight-color-xs", this.settings.xsColor);
		document.documentElement.style.setProperty("--sentence-length-highlight-color-sm", this.settings.smColor);
		document.documentElement.style.setProperty("--sentence-length-highlight-color-md", this.settings.mdColor);
		document.documentElement.style.setProperty("--sentence-length-highlight-color-lg", this.settings.lgColor);
		document.documentElement.style.setProperty("--sentence-length-highlight-color-xl", this.settings.xlColor);
		document.documentElement.style.setProperty("--sentence-length-highlight-text-color", this.settings.textColor);
	}

	onunload() {
		document.documentElement.style.removeProperty("--sentence-length-highlight-color-xs");
		document.documentElement.style.removeProperty("--sentence-length-highlight-color-sm");
		document.documentElement.style.removeProperty("--sentence-length-highlight-color-md");
		document.documentElement.style.removeProperty("--sentence-length-highlight-color-lg");
		document.documentElement.style.removeProperty("--sentence-length-highlight-color-xl");
	}



	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.forceViewUpdate = true;
		document.body.classList.toggle('sentence-length-highlighting-active', this.settings.enabled);
		this.app.workspace.updateOptions();
	}

	createViewPlugin() {
		const plugin = this;

		class SentenceLengthViewPlugin implements PluginValue {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = this.buildDecorations(view);
			}

			update(update: ViewUpdate) {
				
				if (update.docChanged || update.viewportChanged || plugin.forceViewUpdate) {
					this.decorations = this.buildDecorations(update.view);
					plugin.forceViewUpdate = false;
				}
			}

			buildDecorations(view: EditorView): DecorationSet {

				if (!plugin.settings.enabled) {
					return Decoration.none;
				}

				const builder = new RangeSetBuilder<Decoration>();
				const text = view.state.doc.toString();

				// Skip highlighting inside code blocks, comments, etc.

				interface NumberRange {
					min: number;
					max: number;
				}
				const skipRanges: NumberRange[] = [];

				for (let { from, to } of view.visibleRanges) {
					syntaxTree(view.state).iterate({
						from,
						to,
						enter(node) {
							if (node.name.includes("code") || node.name.includes("comment") || node.name.includes("link") || node.name.includes("url") || node.name.includes("header")) {
								skipRanges.push({ min: node.from, max: node.to });
							}
						},
					});
				}
				
				let sentenceEndChars = '.!?:。…·';
				let ignoreChars = sentenceEndChars + '\\n';
				if(plugin.settings.treatLineBreakAsSentenceEnd) {
					sentenceEndChars += '\\n';
					ignoreChars.replace('\\n', '');
				}
				
				const sentenceRegexString = `(?:^|\n|.|。)(?: {0,1})[^${ignoreChars}]+[${sentenceEndChars}]+["”“」'’]*[ ]{0,1}`;
				const sentenceRegex = new RegExp(sentenceRegexString, 'g');
				let match;

				while ((match = sentenceRegex.exec(text)) !== null) {					
					// Don't highlight:
					// - Leading whitespace
					// - Quote indentation (indicated by the > in markdown) 
					let startOffset = match[0].length - match[0].replace(/^[\s>]*/, '').length;

					let start = match.index + startOffset;
					let endOffset = 0 - startOffset;

					if(match[0].endsWith(' ')) {
						endOffset--;
					}

					const end = start + match[0].length + endOffset;

					if (skipRanges.some(range => start <= range.max && end > range.min)) {
						continue;
					}

					const sentence = match[0].trim();
					//const wordCount = sentence.split(/\s+/).filter(word => word.length > 0).length;

					const latinAndNumbers = 'a-zA-Z0-9\\u00C0-\\u00FF\\u0100-\\u017F';
					const baseLatinWord = `[${latinAndNumbers}]+`;
					const latinWordWithApostrophe = `${baseLatinWord}(?:['’]${baseLatinWord})*`;

					// Regular Expression Breakdown:
					// ${latinWordWithApostrophe} : Matches one or more Latin/number chars, optionally followed by
					//                              an apostrophe and more Latin/number chars (handles "it's", "O'Malley").
					//                              (?:...) is a non-capturing group.
					//                              * means the apostrophe part can appear zero or more times (handles "rock'n'roll").
					// | : OR
					// [\u4E00-\u9FFF] : Matches a CJK Unified Ideograph (most common Chinese, Japanese Kanji, Korean Hanja)
					// | : OR
					// [\u3040-\u309F] : Matches a Hiragana character (Japanese)
					// | : OR
					// [\u30A0-\u30FF] : Matches a Katakana character (Japanese)
					// | : OR
					// [\uAC00-\uD7A3] : Matches a Hangul Syllable (Korean)
					// | : OR
					// [\uF900-\uFAFF] : Matches a CJK Compatibility Ideograph
					// | : OR
					// [\uFF66-\uFF9F] : Matches Halfwidth Katakana (Japanese)
					//
					// Flags:
					// g: Global match (find all occurrences)
					// u: Unicode support (essential for matching characters outside the Basic Multilingual Plane and proper range interpretation)

					const wordRegex = new RegExp(
						`${latinWordWithApostrophe}|[\\u4E00-\\u9FFF]|[\\u3040-\\u309F]|[\\u30A0-\\u30FF]|[\\uAC00-\\uD7A3]|[\\uF900-\\uFAFF]|[\\uFF66-\\uFF9F]`,
						'gu'
					);
					const matches = sentence.match(wordRegex);
					const wordCount = matches ? matches.length : 0;

					let category = '';
					if (wordCount <= plugin.settings.xsThreshold) {
						category = 'xs';
					} else if (wordCount <= plugin.settings.smThreshold) {
						category = 'sm';
					} else if (wordCount <= plugin.settings.mdThreshold) {
						category = 'md';
					} else if (wordCount <= plugin.settings.lgThreshold) {
						category = 'lg';
					} else {
						category = 'xl';
					}


					builder.add(start, end, Decoration.mark({
						class: `sentence-length-${category}`,
					}));
				}

				return builder.finish();
			}
		}

		return ViewPlugin.fromClass(SentenceLengthViewPlugin, {
			decorations: (value: SentenceLengthViewPlugin) => value.decorations,
		});
	}
}

class SetenceLengthSettingsTab extends PluginSettingTab {
	plugin: SentenceRhythmPlugin;

	constructor(app: App, plugin: SentenceRhythmPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Enable highlighting')
			.setDesc('You can also toggle on and off from the command palette')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enabled) // Set the initial state of the toggle from loaded settings
				.onChange(async (value) => { // This function runs whenever the toggle is changed
					this.plugin.settings.enabled = value;
					await this.plugin.saveSettings();
				}));



		new Setting(containerEl).setName('Colors').setHeading();

		const colors: Record<string, string> = {
			"xsColor": 'Extra short',
			"smColor": 'Short',
			"mdColor": 'Medium',
			"lgColor": 'Long',
			"xlColor": 'Extra long',
			"textColor": 'Text color'
		}

		for (let key in colors) {
			let typedKey = key as keyof SentenceRhythmPluginSettings;

			// Make sure TypeScript knows this is a number property
			if (typeof this.plugin.settings[typedKey] === 'string') {
				new Setting(containerEl)
					.setName(colors[key])
					.setDesc(`(Default: ${DEFAULT_SETTINGS[typedKey]})`)

					.addColorPicker(cp => cp
						.setValue(this.plugin.settings[typedKey] as string)
						.onChange(async (value) => {
							(this.plugin.settings[typedKey] as string) = value;
							this.plugin.updateStyles();
							await this.plugin.saveSettings();
						}));
			}
		}



		new Setting(containerEl).setName('Lengths').setDesc('Less than or equal to').setHeading();

		const thresholds: Record<string, string> = {
			"xsThreshold": 'Extra short',
			"smThreshold": 'Short',
			"mdThreshold": 'Medium',
			"lgThreshold": 'Long'
		}

		for (let key in thresholds) {
			let typedKey = key as keyof SentenceRhythmPluginSettings;

			// Make sure TypeScript knows this is a number property
			if (typeof this.plugin.settings[typedKey] === 'number') {
				new Setting(containerEl)
					.setName(thresholds[key])
					.setDesc(`(Default: ${DEFAULT_SETTINGS[typedKey]})`)
					.addText(text => text
						.setValue(String(this.plugin.settings[typedKey]))
						.onChange(async (value) => {
							const numValue = Number(value);
							(this.plugin.settings[typedKey] as number) = numValue;
							this.plugin.updateStyles();
							await this.plugin.saveSettings();
						}));
			}
		}

		new Setting(containerEl).setName('Advanced settings').setHeading();

		new Setting(containerEl)
			.setName('Treat line break as sentence boundary')
			.setDesc('Disabled by default. When disabled lines require a distinct end-of-sentence punctuation character to be highlighted')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.treatLineBreakAsSentenceEnd) 
				.onChange(async (value) => { 
					this.plugin.settings.treatLineBreakAsSentenceEnd = value;
					await this.plugin.saveSettings();
				}));


	}
}





