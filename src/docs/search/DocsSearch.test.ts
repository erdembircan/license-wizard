import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initDocsSearch } from "./DocsSearch";
import type { SearchEntry } from "./SearchRanking";

const INDEX: SearchEntry[] = [
  {
    id: "getting-started",
    title: "Getting started",
    section: "Getting started",
    subsection: null,
    url: "docs/getting-started/",
    text: "install and run the wizard",
    snippet: "install and run the wizard",
  },
  {
    id: "source-file-headers",
    title: "Source-file headers",
    section: "Source-file headers",
    subsection: null,
    url: "docs/source-file-headers/",
    text: "spdx tag lines written into every file",
    snippet: "spdx tag lines written into every file",
  },
  {
    id: "source-file-headers#two-styles",
    title: "Two styles",
    section: "Source-file headers",
    subsection: "Two styles",
    url: "docs/source-file-headers/#two-styles",
    text: "short and full headers",
    snippet: "short and full headers",
  },
];

/** Flushes the fetch().then().then() chain that populates the index. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function fire(target: EventTarget, init: KeyboardEventInit): void {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, ...init }),
  );
}

/**
 * Opens the palette via the trigger's own click handler. `initDocsSearch` adds
 * a document-level Cmd-K listener that is not torn down between tests, so only
 * the dedicated shortcut test dispatches Cmd-K on `document`; everywhere else we
 * click the freshly-built trigger to drive exactly this test's instance.
 */
async function open(): Promise<void> {
  document.getElementById("docs-search-trigger")!.click();
  await flush();
}

// Comfortably longer than the palette's input debounce.
const PAST_DEBOUNCE_MS = 360;

/** Types into the field and waits out the input debounce so results settle. */
async function type(value: string): Promise<void> {
  const input = document.querySelector<HTMLInputElement>(".docs-search-input")!;
  input.value = value;
  input.dispatchEvent(new Event("input"));
  await new Promise((resolve) => setTimeout(resolve, PAST_DEBOUNCE_MS));
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => INDEX })),
  );
  document.body.innerHTML =
    '<button id="docs-search-trigger" data-base="/" ' +
    'data-search-index="/search-index.json"></button>';
  initDocsSearch();
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("DocsSearch palette", () => {
  it("opens on Cmd-K and lists the top-level sections by default", async () => {
    expect(
      document.querySelector<HTMLElement>(".docs-search-overlay")?.hidden,
    ).toBe(true);

    fire(document, { key: "k", metaKey: true });
    await flush();

    const overlay = document.querySelector<HTMLElement>(".docs-search-overlay");
    expect(overlay?.hidden).toBe(false);
    expect(document.querySelector(".docs-search-group")?.textContent).toBe(
      "Browse the docs",
    );
    // Only the two section roots show by default, not the subsection.
    const titles = [
      ...document.querySelectorAll(".docs-search-result-title"),
    ].map((n) => n.textContent);
    expect(titles).toEqual(["Getting started", "Source-file headers"]);
  });

  it("filters as you type and highlights the matched term", async () => {
    await open();
    await type("headers");

    const results = document.querySelectorAll<HTMLAnchorElement>(
      ".docs-search-result",
    );
    expect(results.length).toBeGreaterThan(0);
    // Title hit ranks above the body-only hit.
    expect(
      results[0]!.querySelector(".docs-search-result-title")?.textContent,
    ).toBe("Source-file headers");
    expect(results[0]!.querySelector("mark")?.textContent?.toLowerCase()).toBe(
      "headers",
    );
    expect(
      [...results].some((r) => r.getAttribute("href")?.includes("install")),
    ).toBe(false);
  });

  it("arrow keys move the active result and build a deep-link href", async () => {
    await open();
    await type("two");

    const overlay = document.querySelector<HTMLElement>(
      ".docs-search-overlay",
    )!;
    fire(overlay, { key: "ArrowDown" });

    const active = document.querySelector<HTMLAnchorElement>(
      ".docs-search-result.is-active",
    )!;
    // base "/" + the subsection's base-relative url, anchored to the heading.
    expect(active.getAttribute("href")).toBe(
      "/docs/source-file-headers/#two-styles",
    );
  });

  it("does not search below the minimum query length", async () => {
    await open();
    await type("g");

    // A single character keeps the browse list rather than ranking.
    expect(document.querySelector(".docs-search-group")?.textContent).toBe(
      "Browse the docs",
    );
    const titles = [
      ...document.querySelectorAll(".docs-search-result-title"),
    ].map((n) => n.textContent);
    expect(titles).toEqual(["Getting started", "Source-file headers"]);

    // Two characters cross the threshold and filter down.
    await type("ge");
    const filtered = [
      ...document.querySelectorAll(".docs-search-result-title"),
    ].map((n) => n.textContent);
    expect(filtered).toEqual(["Getting started"]);
  });

  it("debounces a real query so results update only after the pause", async () => {
    await open();

    const input =
      document.querySelector<HTMLInputElement>(".docs-search-input")!;
    input.value = "headers";
    input.dispatchEvent(new Event("input"));

    // Synchronously after typing, the ranking has not run yet — the browse
    // list from opening is still in place.
    expect(document.querySelector(".docs-search-group")?.textContent).toBe(
      "Browse the docs",
    );

    await new Promise((resolve) => setTimeout(resolve, PAST_DEBOUNCE_MS));

    // Once the debounce elapses, the search has run.
    expect(document.querySelector(".docs-search-group")).toBeNull();
    expect(
      document.querySelector(".docs-search-result-title")?.textContent,
    ).toBe("Source-file headers");
  });

  it("reports an empty state when nothing matches", async () => {
    await open();
    await type("zzzznotfound");

    expect(document.querySelectorAll(".docs-search-result")).toHaveLength(0);
    expect(
      document.querySelector(".docs-search-status")?.textContent,
    ).toContain("No matches");
  });

  it("closes on Escape", async () => {
    await open();
    const root = document.documentElement;
    expect(root.classList.contains("docs-search-open")).toBe(true);

    const overlay = document.querySelector<HTMLElement>(
      ".docs-search-overlay",
    )!;
    fire(overlay, { key: "Escape" });
    expect(root.classList.contains("docs-search-open")).toBe(false);
    expect(overlay.classList.contains("is-visible")).toBe(false);
  });
});
