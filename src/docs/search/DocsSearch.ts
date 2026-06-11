/**
 * Client-side command palette for the documentation pages. The docs are
 * otherwise static, prerendered HTML; this is the only script they load. It
 * progressively enhances the search trigger baked into the topbar: opens a
 * Cmd/Ctrl-K modal, lazily fetches the prebuilt search index, and matches,
 * ranks, and deep-links into sections and subsections.
 *
 * Everything is built with the DOM API (no innerHTML for untrusted text) and
 * has no runtime dependencies, so it stays a tiny standalone bundle.
 */
import {
  escapeRegExp,
  rankEntries,
  tokenize,
  type SearchEntry,
} from "./SearchRanking";
import { initDocsToc } from "../toc/DocsToc";

const MAX_RESULTS = 8;

// Don't run the ranking until the query is at least this long — a single
// character matches almost everything and isn't a meaningful search.
const MIN_QUERY_LENGTH = 2;

// Coalesce bursts of keystrokes into one search this many milliseconds after
// the last keypress, so a search runs only once the user pauses typing rather
// than on every key.
const DEBOUNCE_MS = 300;

/**
 * Drives the documentation search palette: state, DOM, and all interaction
 * wiring. A single instance is created per page from the topbar trigger.
 */
class DocsSearch {
  private readonly trigger: HTMLElement;
  private readonly base: string;
  private readonly indexUrl: string;

  private entries: SearchEntry[] | null = null;
  private indexPromise: Promise<SearchEntry[]> | null = null;
  private results: SearchEntry[] = [];
  private activeIndex = 0;
  private isOpen = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  private overlay!: HTMLDivElement;
  private input!: HTMLInputElement;
  private list!: HTMLDivElement;
  private status!: HTMLParagraphElement;

  constructor(trigger: HTMLElement) {
    this.trigger = trigger;
    this.base = trigger.dataset.base ?? "/";
    this.indexUrl =
      trigger.dataset.searchIndex ?? `${this.base}search-index.json`;

    this.buildDom();
    this.trigger.addEventListener("click", () => this.open());
    document.addEventListener("keydown", (event) =>
      this.onGlobalKeydown(event),
    );
  }

  /** Builds the overlay, search field, and results list once, up front. */
  private buildDom(): void {
    this.overlay = document.createElement("div");
    this.overlay.className = "docs-search-overlay";
    this.overlay.hidden = true;
    this.overlay.addEventListener("mousedown", (event) => {
      if (event.target === this.overlay) this.close();
    });

    const panel = document.createElement("div");
    panel.className = "docs-search-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Search documentation");

    const field = document.createElement("div");
    field.className = "docs-search-field";
    field.innerHTML =
      '<svg class="docs-search-field-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>' +
      '<path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

    this.input = document.createElement("input");
    this.input.type = "search";
    this.input.className = "docs-search-input";
    this.input.placeholder = "Search the documentation…";
    this.input.setAttribute("role", "combobox");
    this.input.setAttribute("aria-expanded", "true");
    this.input.setAttribute("aria-controls", "docs-search-list");
    this.input.setAttribute("aria-autocomplete", "list");
    this.input.autocomplete = "off";
    this.input.spellcheck = false;
    this.input.addEventListener("input", () => this.onInput());

    const escHint = document.createElement("kbd");
    escHint.className = "docs-search-esc";
    escHint.textContent = "Esc";
    escHint.addEventListener("click", () => this.close());

    field.append(this.input, escHint);

    this.list = document.createElement("div");
    this.list.className = "docs-search-list";
    this.list.id = "docs-search-list";
    this.list.setAttribute("role", "listbox");

    this.status = document.createElement("p");
    this.status.className = "docs-search-status";
    this.status.setAttribute("aria-live", "polite");

    const footer = document.createElement("div");
    footer.className = "docs-search-footer";
    footer.innerHTML =
      "<span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span>" +
      "<span><kbd>↵</kbd> to select</span>" +
      "<span><kbd>esc</kbd> to close</span>";

    panel.append(field, this.list, this.status, footer);
    this.overlay.append(panel);
    document.body.append(this.overlay);
  }

  /** Opens the palette on Cmd/Ctrl-K (or `/` outside a text field). */
  private onGlobalKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      this.toggle();
      return;
    }
    if (
      event.key === "/" &&
      !this.isOpen &&
      !this.isEditingElsewhere(event.target)
    ) {
      event.preventDefault();
      this.open();
    }
  }

  private isEditingElsewhere(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el) return false;
    return (
      el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA" ||
      el.isContentEditable
    );
  }

  private toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  private open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.overlay.hidden = false;
    document.documentElement.classList.add("docs-search-open");
    // Defer so the entrance transition runs from the hidden state.
    requestAnimationFrame(() => this.overlay.classList.add("is-visible"));
    void this.ensureIndex().then(() => {
      if (this.isOpen) this.render();
    });
    this.input.focus();
    this.render();
  }

  private close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.cancelScheduledRender();
    this.overlay.classList.remove("is-visible");
    document.documentElement.classList.remove("docs-search-open");
    const hide = (): void => {
      this.overlay.hidden = true;
    };
    this.overlay.addEventListener("transitionend", hide, { once: true });
    this.input.value = "";
    this.trigger.focus();
  }

  /**
   * Handles each keystroke. Short queries (and clearing the field) drop back to
   * the cheap browse list immediately; a real query is debounced so a burst of
   * keystrokes triggers only one ranking pass.
   */
  private onInput(): void {
    if (this.input.value.trim().length < MIN_QUERY_LENGTH) {
      this.cancelScheduledRender();
      this.render();
    } else {
      this.scheduleRender();
    }
  }

  private scheduleRender(): void {
    this.cancelScheduledRender();
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.render();
    }, DEBOUNCE_MS);
  }

  private cancelScheduledRender(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /** Fetches the search index once and caches it for the page's lifetime. */
  private ensureIndex(): Promise<SearchEntry[]> {
    if (this.entries) return Promise.resolve(this.entries);
    if (!this.indexPromise) {
      this.indexPromise = fetch(this.indexUrl)
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json() as Promise<SearchEntry[]>;
        })
        .then((entries) => {
          this.entries = entries;
          return entries;
        })
        .catch((error) => {
          this.indexPromise = null;
          throw error;
        });
    }
    return this.indexPromise;
  }

  /** Recomputes results for the current query and repaints the list. */
  private render(): void {
    const query = this.input.value.trim();

    if (!this.entries) {
      this.results = [];
      this.list.replaceChildren();
      this.status.textContent = this.indexPromise
        ? "Loading…"
        : "Search is unavailable right now.";
      return;
    }

    // Below the minimum length (including an empty field) we show the section
    // list rather than running the ranking.
    const isSearch = query.length >= MIN_QUERY_LENGTH;
    this.results = isSearch
      ? rankEntries(this.entries, query, MAX_RESULTS)
      : this.entries.filter((e) => !e.subsection);
    this.activeIndex = 0;

    if (this.results.length === 0) {
      this.list.replaceChildren();
      this.status.textContent = `No matches for “${query}”.`;
      return;
    }

    this.status.textContent = "";
    const terms = isSearch ? tokenize(query) : [];
    const heading = isSearch ? null : "Browse the docs";
    this.list.replaceChildren(
      ...(heading ? [this.renderGroupLabel(heading)] : []),
      ...this.results.map((entry, i) => this.renderResult(entry, i, terms)),
    );
    this.setActive(0);
  }

  private renderGroupLabel(text: string): HTMLParagraphElement {
    const label = document.createElement("p");
    label.className = "docs-search-group";
    label.textContent = text;
    return label;
  }

  /** Builds one result row as a real anchor so cmd/middle-click works. */
  private renderResult(
    entry: SearchEntry,
    index: number,
    terms: string[],
  ): HTMLAnchorElement {
    const row = document.createElement("a");
    row.className = "docs-search-result";
    row.href = this.base + entry.url;
    row.id = `docs-search-result-${index}`;
    row.setAttribute("role", "option");
    row.tabIndex = -1;
    row.addEventListener("mousemove", () => this.setActive(index));
    row.addEventListener("click", () => this.close());

    const icon = document.createElement("span");
    icon.className = "docs-search-result-icon";
    icon.textContent = entry.subsection ? "#" : "›";
    icon.setAttribute("aria-hidden", "true");

    const body = document.createElement("span");
    body.className = "docs-search-result-body";

    const title = document.createElement("span");
    title.className = "docs-search-result-title";
    this.applyHighlight(title, entry.title, terms);
    body.append(title);

    if (entry.subsection) {
      const crumb = document.createElement("span");
      crumb.className = "docs-search-result-crumb";
      crumb.textContent = entry.section;
      body.append(crumb);
    }

    if (entry.snippet) {
      const snippet = document.createElement("span");
      snippet.className = "docs-search-result-snippet";
      this.applyHighlight(snippet, entry.snippet, terms);
      body.append(snippet);
    }

    const enter = document.createElement("span");
    enter.className = "docs-search-result-enter";
    enter.textContent = "↵";
    enter.setAttribute("aria-hidden", "true");

    row.append(icon, body, enter);
    return row;
  }

  /** Sets text on an element, wrapping query-term matches in <mark>. */
  private applyHighlight(
    target: HTMLElement,
    text: string,
    terms: string[],
  ): void {
    target.replaceChildren();
    if (terms.length === 0) {
      target.textContent = text;
      return;
    }
    const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "ig");
    let last = 0;
    for (const match of text.matchAll(pattern)) {
      const start = match.index;
      if (start > last) {
        target.append(document.createTextNode(text.slice(last, start)));
      }
      const mark = document.createElement("mark");
      mark.textContent = match[0];
      target.append(mark);
      last = start + match[0].length;
    }
    if (last < text.length) {
      target.append(document.createTextNode(text.slice(last)));
    }
  }

  /** Highlights the result at `index` and keeps it scrolled into view. */
  private setActive(index: number): void {
    if (this.results.length === 0) return;
    const clamped = Math.max(0, Math.min(index, this.results.length - 1));
    this.activeIndex = clamped;
    const rows = this.list.querySelectorAll<HTMLElement>(".docs-search-result");
    rows.forEach((row, i) => {
      const isActive = i === clamped;
      row.classList.toggle("is-active", isActive);
      if (isActive) {
        this.input.setAttribute("aria-activedescendant", row.id);
        row.scrollIntoView?.({ block: "nearest" });
      }
    });
  }

  /** In-modal key handling: navigate, select, or close. */
  private onPanelKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case "Escape":
        event.preventDefault();
        this.close();
        break;
      case "ArrowDown":
        event.preventDefault();
        this.setActive(this.activeIndex + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        this.setActive(this.activeIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        this.setActive(0);
        break;
      case "End":
        event.preventDefault();
        this.setActive(this.results.length - 1);
        break;
      case "Enter": {
        event.preventDefault();
        const active = this.results[this.activeIndex];
        if (active) {
          window.location.href = this.base + active.url;
          this.close();
        }
        break;
      }
      case "Tab":
        // Trap focus inside the modal: there is only the input to focus.
        event.preventDefault();
        break;
      default:
        break;
    }
  }

  /** Attaches the in-modal key handler (called once after construction). */
  attachPanelKeys(): void {
    this.overlay.addEventListener("keydown", (event) =>
      this.onPanelKeydown(event),
    );
  }
}

/** Wires up the palette if this page carries a search trigger. */
export function initDocsSearch(): void {
  const trigger = document.getElementById("docs-search-trigger");
  if (!trigger) return;
  const search = new DocsSearch(trigger);
  search.attachPanelKeys();
}

/** Boots the docs page enhancements: the search palette and the TOC scroll-spy. */
function initDocs(): void {
  initDocsSearch();
  initDocsToc();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDocs);
} else {
  initDocs();
}
