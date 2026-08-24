import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initDocsToc } from "./DocsToc";

// The fake top-of-viewport coordinate each heading reports, in px.
let tops: Record<string, number>;

function setTop(id: string, top: number): void {
  tops[id] = top;
}

function buildDom(): void {
  document.body.innerHTML = `
    <details class="docs-toc" open>
      <ul class="docs-toc-list">
        <li><a class="docs-toc-link docs-toc-top" data-toc-target="flags-reference" href="#flags-reference">Flags reference</a></li>
        <li><a class="docs-toc-link" data-toc-target="how-flags-combine" href="#how-flags-combine">How flags combine</a></li>
        <li><a class="docs-toc-link" data-toc-target="priority" href="#priority">Priority when flags are combined</a></li>
      </ul>
    </details>
    <h2 id="flags-reference">Flags reference</h2>
    <h3 id="how-flags-combine">How flags combine</h3>
    <h3 id="priority">Priority when flags are combined</h3>
  `;
  for (const id of ["flags-reference", "how-flags-combine", "priority"]) {
    const el = document.getElementById(id)!;
    el.getBoundingClientRect = () =>
      ({
        top: tops[id]!,
        bottom: 0,
        left: 0,
        right: 0,
        width: 0,
        height: 0,
        x: 0,
        y: tops[id]!,
        toJSON() {},
      }) as DOMRect;
  }
}

function activeTarget(): string | null {
  const active = document.querySelector(".docs-toc-link.is-active");
  return active ? active.getAttribute("data-toc-target") : null;
}

describe("initDocsToc scroll-spy", () => {
  beforeEach(() => {
    tops = { "flags-reference": 500, "how-flags-combine": 900, priority: 1300 };
    // Run scheduled frames synchronously so a dispatched scroll updates at once.
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    // A tall page, so the "at the bottom" shortcut stays off unless a test asks.
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 5000,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: 0,
    });
    buildDom();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("highlights the section-top link while above the first subsection", () => {
    initDocsToc();
    expect(activeTarget()).toBe("flags-reference");
  });

  it("keeps the section-top link active through the section intro", () => {
    initDocsToc();
    setTop("flags-reference", 50); // H2 crossed the line; no H3 has.
    window.dispatchEvent(new Event("scroll"));
    expect(activeTarget()).toBe("flags-reference");
  });

  it("activates a subsection once its heading crosses the line", () => {
    initDocsToc();
    setTop("flags-reference", -100);
    setTop("how-flags-combine", 40);
    window.dispatchEvent(new Event("scroll"));
    expect(activeTarget()).toBe("how-flags-combine");
  });

  it("activates the last subsection at the bottom of the page", () => {
    initDocsToc();
    (window as unknown as { scrollY: number }).scrollY = 4200; // 4200 + 800 >= 5000 - 2
    window.dispatchEvent(new Event("scroll"));
    expect(activeTarget()).toBe("priority");
  });

  it("pins the section-top link when it is clicked", () => {
    initDocsToc();
    setTop("flags-reference", -100); // geometry alone would pick a subsection...
    setTop("how-flags-combine", 40);
    const topLink = document.querySelector<HTMLAnchorElement>(".docs-toc-top")!;
    topLink.dispatchEvent(new Event("click")); // ...but the click wins.
    expect(activeTarget()).toBe("flags-reference");
  });
});
