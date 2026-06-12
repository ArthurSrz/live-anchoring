import { Editor, MarkdownFileInfo, MarkdownView, Notice, Plugin, TFile } from "obsidian";
import { computeClaims } from "./linker";
import { DEFAULT_SETTINGS, LiveAnchoringSettings, LiveAnchoringSettingTab } from "./settings";

export default class LiveAnchoringPlugin extends Plugin {
	settings: LiveAnchoringSettings;
	private debounceTimer: number | null = null;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new LiveAnchoringSettingTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on("editor-change", (editor: Editor, info: MarkdownView | MarkdownFileInfo) => {
				if (!this.settings.autoAnchor) return;
				const file = info.file;
				if (!file || this.isExcluded(file)) return;
				this.scheduleAnchor(editor, file);
			})
		);

		this.addCommand({
			id: "anchor-current-note",
			name: "Anchor current note",
			editorCallback: (editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => {
				if (ctx.file) this.anchor(editor, ctx.file, { skipCursor: false });
			},
		});

		this.addCommand({
			id: "toggle-auto-anchoring",
			name: "Toggle automatic anchoring",
			callback: async () => {
				this.settings.autoAnchor = !this.settings.autoAnchor;
				await this.saveSettings();
				new Notice(`Automatic anchoring ${this.settings.autoAnchor ? "on" : "off"}`);
			},
		});
	}

	onunload() {
		if (this.debounceTimer !== null) window.clearTimeout(this.debounceTimer);
	}

	private scheduleAnchor(editor: Editor, file: TFile) {
		if (this.debounceTimer !== null) window.clearTimeout(this.debounceTimer);
		this.debounceTimer = window.setTimeout(() => {
			this.debounceTimer = null;
			// The user may have switched notes during the pause; re-check.
			const active = this.app.workspace.getActiveFile();
			if (active?.path === file.path) {
				this.anchor(editor, file, { skipCursor: true });
			}
		}, this.settings.debounceMs);
	}

	private anchor(editor: Editor, file: TFile, opts: { skipCursor: boolean }) {
		const content = editor.getValue();
		const titles = this.app.vault.getMarkdownFiles().map((f) => f.basename);

		let claims = computeClaims(content, titles, file.basename, {
			minTitleLength: this.settings.minTitleLength,
			exactCase: this.settings.exactCase,
			firstOccurrenceOnly: this.settings.firstOccurrenceOnly,
		});

		if (opts.skipCursor) {
			// Never wrap the word the cursor is sitting in — the user may
			// still be typing it.
			const cursor = editor.posToOffset(editor.getCursor());
			claims = claims.filter((c) => cursor < c.start || cursor > c.end);
		}

		if (claims.length === 0) return;

		editor.transaction({
			changes: claims.map((c) => ({
				from: editor.offsetToPos(c.start),
				to: editor.offsetToPos(c.end),
				text: `[[${c.text}]]`,
			})),
		});

		if (this.settings.showNotices) {
			new Notice(`Anchored ${claims.length} link${claims.length > 1 ? "s" : ""}`);
		}
	}

	private isExcluded(file: TFile): boolean {
		return this.settings.excludedFolders
			.split("\n")
			.map((f) => f.trim().replace(/^\/+|\/+$/g, ""))
			.filter((f) => f.length > 0)
			.some((f) => file.path.startsWith(f + "/"));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
