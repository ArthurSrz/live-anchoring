import { strict as assert } from "node:assert";
import { test } from "node:test";
import { applyClaims, computeClaims, LinkerOptions } from "../src/linker";

const DEFAULTS: LinkerOptions = {
	minTitleLength: 3,
	exactCase: false,
	firstOccurrenceOnly: false,
};

function anchor(content: string, titles: string[], own = "Current Note", opts: Partial<LinkerOptions> = {}) {
	return applyClaims(content, computeClaims(content, titles, own, { ...DEFAULTS, ...opts }));
}

test("links every occurrence of a title", () => {
	const out = anchor("A contract binds. The contract endures.", ["contract"]);
	assert.equal(out, "A [[contract]] binds. The [[contract]] endures.");
});

test("matching is case-insensitive by default", () => {
	const out = anchor("The Contract was signed.", ["contract"]);
	assert.equal(out, "The [[Contract]] was signed.");
});

test("exactCase only links identical case", () => {
	const out = anchor("The Contract and the contract.", ["contract"], "Current Note", { exactCase: true });
	assert.equal(out, "The Contract and the [[contract]].");
});

test("firstOccurrenceOnly links once", () => {
	const out = anchor("contract here, contract there", ["contract"], "Current Note", {
		firstOccurrenceOnly: true,
	});
	assert.equal(out, "[[contract]] here, contract there");
});

test("longest title wins overlapping spans", () => {
	const out = anchor("I study the knowledge graph daily.", ["graph", "knowledge graph"]);
	assert.equal(out, "I study the [[knowledge graph]] daily.");
});

test("never links the note's own title", () => {
	const out = anchor("This mentions Current Note explicitly.", ["Current Note"]);
	assert.equal(out, "This mentions Current Note explicitly.");
});

test("respects minimum title length", () => {
	const out = anchor("Go to the go board.", ["go"]);
	assert.equal(out, "Go to the go board.");
});

test("does not link inside existing wikilinks", () => {
	const out = anchor("Already [[contract]] linked, plain contract not.", ["contract"]);
	assert.equal(out, "Already [[contract]] linked, plain [[contract]] not.");
});

test("does not link inside fenced or inline code", () => {
	const content = "```\ncontract in fence\n```\nA contract and `a contract in code`.";
	const out = anchor(content, ["contract"]);
	assert.equal(out, "```\ncontract in fence\n```\nA [[contract]] and `a contract in code`.");
});

test("does not link inside frontmatter", () => {
	const content = "---\ntitle: contract\n---\nThe contract body.";
	const out = anchor(content, ["contract"]);
	assert.equal(out, "---\ntitle: contract\n---\nThe [[contract]] body.");
});

test("does not link inside markdown links or URLs", () => {
	const content = "See [contract](https://example.com/contract) and https://contract.dev plus a contract.";
	const out = anchor(content, ["contract"]);
	assert.equal(
		out,
		"See [contract](https://example.com/contract) and https://contract.dev plus a [[contract]]."
	);
});

test("requires word boundaries", () => {
	const out = anchor("Subcontracting contracts a contract.", ["contract"]);
	assert.equal(out, "Subcontracting contracts a [[contract]].");
});

test("handles unicode word boundaries", () => {
	// "décontract" must not match: "é" is a letter, so there is no word
	// boundary before "contract" inside it.
	const out = anchor("Le décontract differs, mais le contrat... contract!", ["contract"]);
	assert.equal(out, "Le décontract differs, mais le contrat... [[contract]]!");
});

test("titles with regex metacharacters are escaped", () => {
	const out = anchor("What is C++ (lang)?", ["C++ (lang)"]);
	assert.equal(out, "What is [[C++ (lang)]]?");
});

test("claims carry correct absolute offsets", () => {
	const content = "x contract y";
	const claims = computeClaims(content, ["contract"], "Current Note", DEFAULTS);
	assert.equal(claims.length, 1);
	assert.equal(content.slice(claims[0].start, claims[0].end), "contract");
});
