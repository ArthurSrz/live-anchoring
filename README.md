# Live Anchoring

**Anchor your writing to your vault.** When you pause typing, any word or phrase that matches the title of an existing note becomes a `[[wikilink]]` — automatically, in place, without moving your cursor.

You write:

> The notion of a contract has never been so important.

Two seconds later:

> The notion of a [[contract]] has never been so important.

…because your vault has a note called `contract.md`.

## How it works

- Listens for editor changes and waits for a configurable typing pause (default 2 s).
- Collects every note title in your vault and finds matches in the current note — longest titles first, so `[[knowledge graph]]` wins over `[[graph]]`.
- Applies all links in a single editor transaction: your cursor and scroll position stay put, and one undo removes them all.
- Never touches YAML frontmatter, code blocks, inline code, existing links, or URLs — and never the word your cursor is in.

## Commands

- **Anchor current note** — run the linker once, on demand (works even with automatic anchoring off).
- **Toggle automatic anchoring** — flip auto mode without opening settings.

## Settings

| Setting | Default | |
|---|---|---|
| Anchor automatically | on | link whenever you pause typing |
| Typing pause | 2000 ms | how long to wait after the last keystroke |
| Minimum title length | 3 | ignore very short note titles |
| Exact case only | off | `Contract` links, `contract` doesn't |
| First occurrence only | off | link once per title instead of every occurrence |
| Excluded folders | — | never auto-anchor notes in these folders |
| Show notices | on | "Anchored 3 links" notification |

## Install

From the community plugin store: search **Live Anchoring**.

Manually: copy `manifest.json` and `main.js` from the latest release into `<vault>/.obsidian/plugins/live-anchoring/`, then enable the plugin in **Settings → Community plugins**.

## Development

```bash
npm install
npm run dev     # esbuild watch mode
npm test        # unit tests for the linking engine
npm run build   # type-check + production bundle
```

The linking engine (`src/linker.ts`) is a pure function with no Obsidian imports — see `test/linker.test.ts` for its specification.

## License

MIT
