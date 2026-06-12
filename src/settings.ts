import { App, PluginSettingTab, Setting } from "obsidian";
import type LiveAnchoringPlugin from "./main";

export interface LiveAnchoringSettings {
	autoAnchor: boolean;
	debounceMs: number;
	minTitleLength: number;
	exactCase: boolean;
	firstOccurrenceOnly: boolean;
	excludedFolders: string;
	showNotices: boolean;
}

export const DEFAULT_SETTINGS: LiveAnchoringSettings = {
	autoAnchor: true,
	debounceMs: 2000,
	minTitleLength: 3,
	exactCase: false,
	firstOccurrenceOnly: false,
	excludedFolders: "",
	showNotices: true,
};

export class LiveAnchoringSettingTab extends PluginSettingTab {
	plugin: LiveAnchoringPlugin;

	constructor(app: App, plugin: LiveAnchoringPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Anchor automatically")
			.setDesc(
				"Turn words matching existing note titles into wikilinks whenever you pause typing. " +
					"When off, use the \"Anchor current note\" command."
			)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.autoAnchor).onChange(async (value) => {
					this.plugin.settings.autoAnchor = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Typing pause before anchoring")
			.setDesc("How long to wait after your last keystroke, in milliseconds.")
			.addSlider((slider) =>
				slider
					.setLimits(500, 10000, 250)
					.setValue(this.plugin.settings.debounceMs)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.debounceMs = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Minimum title length")
			.setDesc("Ignore note titles shorter than this many characters.")
			.addSlider((slider) =>
				slider
					.setLimits(1, 10, 1)
					.setValue(this.plugin.settings.minTitleLength)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.minTitleLength = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Exact case only")
			.setDesc('Only link text whose case matches the note title exactly ("Contract" but not "contract").')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.exactCase).onChange(async (value) => {
					this.plugin.settings.exactCase = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("First occurrence only")
			.setDesc("Link only the first occurrence of each title instead of every occurrence.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.firstOccurrenceOnly).onChange(async (value) => {
					this.plugin.settings.firstOccurrenceOnly = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Excluded folders")
			.setDesc("Notes in these folders are never auto-anchored. One folder path per line.")
			.addTextArea((text) =>
				text
					.setPlaceholder("templates/\narchive/")
					.setValue(this.plugin.settings.excludedFolders)
					.onChange(async (value) => {
						this.plugin.settings.excludedFolders = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Show notices")
			.setDesc("Show a notification with the number of links anchored.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.showNotices).onChange(async (value) => {
					this.plugin.settings.showNotices = value;
					await this.plugin.saveSettings();
				})
			);
	}
}
