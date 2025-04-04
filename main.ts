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
	mySetting: string;
	xsColor: string,
	smColor: string;
	mdColor: string,
	lgColor: string,
	xlColor: string,
	enabled: boolean,
	showInRibbon: boolean,
	xsThreshold: number,
	smThreshold: number,
	mdThreshold: number,
	lgThreshold: number,
}

const DEFAULT_SETTINGS: SentenceRhythmPluginSettings = {
	mySetting: 'default',
	xsColor: '#fff2c8',
	smColor: '#eadbf6',
	mdColor: '#c5f2cd',
	lgColor: '#f9caca',
	xlColor: '#d1f6f4',
	enabled: false,
	showInRibbon: false,
	xsThreshold: 2,
	smThreshold: 5,
	mdThreshold: 10,
	lgThreshold: 20,
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
	}

	onunload() {

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
							if ((node.name.includes("code") || node.name.includes("comment") || node.name.includes("link") || node.name.includes("url"))) {
								skipRanges.push({ min: node.from, max: node.to });
							}
						},
					});
				}

				const sentenceRegex = /(?:^|\n| )[^.!?\n]+[.!?]+/g;
				let match;

				while ((match = sentenceRegex.exec(text)) !== null) {

					let start: number;
					if(match[0].startsWith(' ') || match[0].startsWith('\n')) {
						start = match.index + 1;
					} else {
						start = match.index;
					}
					const end = start + match[0].length - 1;

					if (skipRanges.some(range => start >= range.min && start <= range.max)) {
						continue;
					}

					const sentence = match[0].trim();
					const wordCount = sentence.split(/\s+/).filter(word => word.length > 0).length;

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



		new Setting(containerEl).setName('Colors').setDesc('Colors can be any valid CSS value').setHeading();

		const colors: Record<string, string> = {
			"xsColor": 'Extra Short',
			"smColor": 'Short',
			"mdColor": 'Medium',
			"lgColor": 'Long',
			"xlColor": 'Extra Long'
		}

		for (let key in colors) {
			let typedKey = key as keyof SentenceRhythmPluginSettings;

			// Make sure TypeScript knows this is a number property
			if (typeof this.plugin.settings[typedKey] === 'string') {
				new Setting(containerEl)
					.setName(colors[key])
					.setDesc(`(Default: ${DEFAULT_SETTINGS[typedKey]})`)

					.addText(text => text
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
			"xsThreshold": 'Extra Short',
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




	}
}





