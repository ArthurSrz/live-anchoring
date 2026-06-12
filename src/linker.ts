/**
 * Pure linking engine — no Obsidian imports, fully unit-testable.
 *
 * Given a note's content and the set of vault note titles, computes the
 * character spans that should be wrapped in [[wikilinks]]. The caller
 * (main.ts) applies them through the editor API; tests apply them with
 * applyClaims().
 */

export interface LinkerOptions {
	minTitleLength: number;
	exactCase: boolean;
	firstOccurrenceOnly: boolean;
}

export interface Claim {
	/** Absolute character offset where the matched text starts. */
	start: number;
	/** Absolute character offset where the matched text ends (exclusive). */
	end: number;
	/** The matched text exactly as it appears in the note. */
	text: string;
	/** The vault note title that matched. */
	title: string;
}

/**
 * Regions that must never be edited: YAML frontmatter, fenced and inline
 * code, existing wikilinks, markdown links, and bare URLs.
 */
const PROTECTED =
	/^---\n[\s\S]*?\n---\n|```[\s\S]*?```|`[^`\n]*`|\[\[[\s\S]*?\]\]|\[[^\]]*\]\([^)]*\)|https?:\/\/\S+/gm;

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface Segment {
	protected: boolean;
	start: number;
	text: string;
}

function splitSegments(content: string): Segment[] {
	const segments: Segment[] = [];
	let pos = 0;
	let m: RegExpExecArray | null;
	PROTECTED.lastIndex = 0;
	while ((m = PROTECTED.exec(content)) !== null) {
		if (m.index > pos) {
			segments.push({ protected: false, start: pos, text: content.slice(pos, m.index) });
		}
		segments.push({ protected: true, start: m.index, text: m[0] });
		pos = m.index + m[0].length;
	}
	if (pos < content.length) {
		segments.push({ protected: false, start: pos, text: content.slice(pos) });
	}
	return segments;
}

/**
 * Compute non-overlapping link claims for `content`.
 *
 * Titles are tried longest-first so "Knowledge Graph" claims the phrase
 * before "Graph" can take the second word. Matches require word
 * boundaries on both sides (unicode-aware) and reject adjacent brackets.
 */
export function computeClaims(
	content: string,
	titles: Iterable<string>,
	ownTitle: string,
	options: LinkerOptions
): Claim[] {
	const candidates = [...new Set(titles)]
		.filter((t) => t !== ownTitle && t.length >= options.minTitleLength)
		.sort((a, b) => b.length - a.length);

	const segments = splitSegments(content);
	const claims: Claim[] = [];

	for (const title of candidates) {
		// A consumed leading-boundary group instead of a lookbehind:
		// lookbehinds are unsupported on iOS WebKit before 16.4.
		const pattern = new RegExp(
			"(^|[^\\[\\p{L}\\p{N}_])(" + escapeRegExp(title) + ")(?![\\]\\p{L}\\p{N}_])",
			options.exactCase ? "gu" : "giu"
		);
		let claimedThisTitle = false;
		for (const seg of segments) {
			if (seg.protected || (claimedThisTitle && options.firstOccurrenceOnly)) continue;
			let m: RegExpExecArray | null;
			while ((m = pattern.exec(seg.text)) !== null) {
				const start = seg.start + m.index + m[1].length;
				const end = start + m[2].length;
				const overlaps = claims.some((c) => start < c.end && end > c.start);
				if (overlaps) continue;
				claims.push({ start, end, text: m[2], title });
				claimedThisTitle = true;
				if (options.firstOccurrenceOnly) break;
			}
		}
	}

	return claims.sort((a, b) => a.start - b.start);
}

/**
 * Apply claims to content by inserting brackets right-to-left, so earlier
 * offsets stay valid. Used by tests; the plugin applies claims through
 * editor.transaction() instead.
 */
export function applyClaims(content: string, claims: Claim[]): string {
	let result = content;
	for (const c of [...claims].sort((a, b) => b.start - a.start)) {
		result = result.slice(0, c.start) + `[[${c.text}]]` + result.slice(c.end);
	}
	return result;
}
