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
import { DEFAULT_PERIOD_EXCLUSIONS, formatPeriodExclusions, parsePeriodExclusions } from './src/exclusion-settings';
import { findSentenceRanges } from './src/sentence-boundaries';

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
	periodExclusionsEnabled: boolean,
	periodExclusions: string[],
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
	periodExclusionsEnabled: false,
	periodExclusions: DEFAULT_PERIOD_EXCLUSIONS,
}

export default class SentenceRhythmPlugin extends Plugin {
	settings: SentenceRhythmPluginSettings;
	forceViewUpdate: boolean;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'toggle-sentence-highlighting',
			name: 'Toggle highlighting',
			callback: async () => {
				this.settings.enabled = !this.settings.enabled;
				await this.saveSettings();
				new Notice(`Sentence highlighting ${this.settings.enabled ? 'enabled' : 'disabled'}`);
			}
		});

		this.addSettingTab(new SetenceLengthSettingsTab(this.app, this));
		this.registerEditorExtension(this.createViewPlugin());
		this.updateStyles();
	}

	updateStyles() {
		activeDocument.documentElement.style.setProperty("--sentence-length-highlight-color-xs", this.settings.xsColor);
		activeDocument.documentElement.style.setProperty("--sentence-length-highlight-color-sm", this.settings.smColor);
		activeDocument.documentElement.style.setProperty("--sentence-length-highlight-color-md", this.settings.mdColor);
		activeDocument.documentElement.style.setProperty("--sentence-length-highlight-color-lg", this.settings.lgColor);
		activeDocument.documentElement.style.setProperty("--sentence-length-highlight-color-xl", this.settings.xlColor);
		activeDocument.documentElement.style.setProperty("--sentence-length-highlight-text-color", this.settings.textColor);
	}

	onunload() {
		activeDocument.documentElement.style.removeProperty("--sentence-length-highlight-color-xs");
		activeDocument.documentElement.style.removeProperty("--sentence-length-highlight-color-sm");
		activeDocument.documentElement.style.removeProperty("--sentence-length-highlight-color-md");
		activeDocument.documentElement.style.removeProperty("--sentence-length-highlight-color-lg");
		activeDocument.documentElement.style.removeProperty("--sentence-length-highlight-color-xl");
	}



	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.forceViewUpdate = true;
		activeDocument.body.classList.toggle('sentence-length-highlighting-active', this.settings.enabled);
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

				const sentences = findSentenceRanges(text, {
					treatLineBreakAsSentenceEnd: plugin.settings.treatLineBreakAsSentenceEnd,
					periodExclusionsEnabled: plugin.settings.periodExclusionsEnabled,
					periodExclusions: plugin.settings.periodExclusions,
				});

				for (const sentence of sentences) {
					const start = sentence.start;
					const end = sentence.end;

					if (skipRanges.some(range => start <= range.max && end > range.min)) {
						continue;
					}

					const wordCount = sentence.wordCount;

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
						class: `sentence-length-${category}`
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

	async hide(): Promise<void> {
		await this.plugin.saveSettings();
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

		new Setting(containerEl).setName('Advanced').setHeading();

		new Setting(containerEl)
			.setName('Treat line break as sentence boundary')
			.setDesc('Disabled by default. When disabled lines require a distinct end-of-sentence punctuation character to be highlighted')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.treatLineBreakAsSentenceEnd) 
				.onChange(async (value) => { 
					this.plugin.settings.treatLineBreakAsSentenceEnd = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Exclusions')
			.setDesc('Words that should not be treated as a sentence boundary. For example "Mrs."')
			.setHeading();

		new Setting(containerEl)
			.setName('Enable exclusions')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.periodExclusionsEnabled)
				.onChange(async (value) => {
					this.plugin.settings.periodExclusionsEnabled = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Exclusions')
			.setDesc('One word per line, without the trailing period. Matching is case sensitive.')
			.addTextArea(text => text
				.setValue(formatPeriodExclusions(this.plugin.settings.periodExclusions))
				.then(textArea => {
					textArea.inputEl.addClass('sentence-length-period-exclusions');
				})
				.onChange(async (value) => {
					this.plugin.settings.periodExclusions = parsePeriodExclusions(value);
					await this.plugin.saveSettings();
				}));

			
		}
}


