import "./style.css";
import { scenes, type TerminalScene, type TerminalLine } from "./data/scenes";
import { runTypewriter } from "./lib/typewriter";
import { copyToClipboard } from "./lib/clipboard";
import { classifyTreeLine, lineMarker } from "./lib/terminalLine";

const toneClass: Record<NonNullable<TerminalLine["tone"]>, string> = {
  default: "",
  dim: "t-dim",
  accent: "t-accent",
  green: "t-green",
  amber: "t-amber",
  red: "t-red",
};

/* ---------------------------------------------------------------- terminal */
function initTerminal(): void {
  const tabsEl = document.getElementById("term-tabs");
  const bodyEl = document.getElementById("terminal-body");
  if (!tabsEl || !bodyEl) return;

  let activeIndex = 0;
  let runToken = 0;
  let autoAdvance = true;
  const pending: ReturnType<typeof setTimeout>[] = [];

  const clearPending = (): void => {
    while (pending.length) clearTimeout(pending.pop());
  };
  const later = (fn: () => void, ms: number): void => {
    pending.push(setTimeout(fn, ms));
  };

  const tabButtons = scenes.map((scene, i) => {
    const btn = document.createElement("button");
    btn.className = "term-tab";
    btn.textContent = scene.label;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", String(i === 0));
    btn.addEventListener("click", () => {
      autoAdvance = false;
      select(i);
    });
    tabsEl.appendChild(btn);
    return btn;
  });

  function appendChild(el: HTMLElement): void {
    bodyEl!.appendChild(el);
    bodyEl!.scrollTop = bodyEl!.scrollHeight;
  }

  // Renders one output line. Tree lines (◇ ◆ │ └) get a CSS-drawn gutter so the
  // connectors form one continuous vertical line; everything else is plain text.
  function renderLine(line: TerminalLine, isFirstTreeRow: boolean): void {
    const { glyph, content } = classifyTreeLine(line.text);
    const toneCls = toneClass[line.tone ?? "default"];

    if (!glyph) {
      const el = document.createElement("div");
      el.className = `term-line ${toneCls}`.trim();
      el.style.whiteSpace = "pre-wrap";

      // Tint a leading agent bullet (⏺) or success tick (✓), keep the rest.
      const marker = lineMarker(line.text);
      if (marker) {
        const mark = document.createElement("span");
        mark.className = marker === "bullet" ? "term-bullet" : "term-check";
        mark.textContent = line.text.charAt(0);
        const rest = document.createElement("span");
        rest.textContent = line.text.slice(1);
        el.append(mark, rest);
      } else {
        el.textContent = line.text;
      }

      appendChild(el);
      return;
    }

    const row = document.createElement("div");
    row.className = "term-row";

    const gutter = document.createElement("span");
    gutter.className = "term-gutter";
    if (isFirstTreeRow) gutter.classList.add("start");
    if (glyph === "end") gutter.classList.add("end");
    if (glyph === "node-hollow" || glyph === "node-filled") {
      const node = document.createElement("span");
      node.className =
        glyph === "node-hollow" ? "term-node hollow" : "term-node filled";
      gutter.appendChild(node);
    }

    const body = document.createElement("span");
    body.className = `term-content ${toneCls}`.trim();
    body.textContent = content;

    row.append(gutter, body);
    appendChild(row);
  }

  function play(scene: TerminalScene, token: number): void {
    bodyEl!.innerHTML = "";
    bodyEl!.scrollTop = 0;
    const sigil = scene.kind === "agent" ? ">" : "$";
    const prompt = document.createElement("div");
    prompt.className = "term-line caret";
    if (scene.kind === "agent") prompt.classList.add("term-prompt-agent");
    prompt.style.whiteSpace = "pre-wrap";
    prompt.textContent = `${sigil} `;
    appendChild(prompt);

    const firstTreeIndex = scene.output.findIndex(
      (l) => classifyTreeLine(l.text).glyph !== null,
    );

    runTypewriter(scene.command, {
      charMs: 38,
      onFrame: (frame) => {
        if (token !== runToken) return;
        prompt.textContent = `${sigil} ${frame}`;
      },
      onDone: () => {
        if (token !== runToken) return;
        prompt.classList.remove("caret");
        scene.output.forEach((line, i) => {
          later(
            () => {
              if (token !== runToken) return;
              renderLine(line, i === firstTreeIndex);
            },
            90 * (i + 1),
          );
        });

        if (autoAdvance) {
          const total = 90 * (scene.output.length + 1) + 3200;
          later(() => {
            if (token !== runToken) return;
            select((activeIndex + 1) % scenes.length);
          }, total);
        }
      },
    });
  }

  function select(index: number): void {
    activeIndex = index;
    runToken += 1;
    clearPending();
    tabButtons.forEach((b, i) =>
      b.setAttribute("aria-selected", String(i === index)),
    );
    play(scenes[index]!, runToken);
  }

  select(0);
}

/* ---------------------------------------------------------------- copy */
function initCopyButtons(): void {
  const buttons =
    document.querySelectorAll<HTMLButtonElement>("button[data-copy]");
  buttons.forEach((btn) => {
    const icon = btn.querySelector<SVGElement>(".copy-icon");
    const original = icon?.innerHTML ?? "";
    btn.addEventListener("click", async () => {
      const text = btn.dataset.copy ?? "";
      const ok = await copyToClipboard(text);
      if (icon) {
        icon.innerHTML = ok ? '<path d="M20 6 9 17l-5-5"/>' : original;
        btn.classList.toggle("text-brand", ok);
        window.setTimeout(() => {
          icon.innerHTML = original;
          btn.classList.remove("text-brand");
        }, 1400);
      }
    });
  });
}

/* ---------------------------------------------------------------- reveal */
function initReveal(): void {
  const items = document.querySelectorAll<HTMLElement>("[data-reveal]");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
  );
  items.forEach((el) => observer.observe(el));
}

/* ---------------------------------------------------------------- nav */
function initNav(): void {
  const nav = document.getElementById("nav");
  if (!nav) return;
  const onScroll = (): void => {
    const scrolled = window.scrollY > 12;
    nav.classList.toggle("backdrop-blur-md", scrolled);
    nav.classList.toggle("bg-paper/80", scrolled);
    nav.classList.toggle("border-b", scrolled);
    nav.classList.toggle("border-line", scrolled);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

/* ---------------------------------------------------------------- footer */
function initYear(): void {
  const el = document.getElementById("year");
  if (el) el.textContent = String(new Date().getFullYear());
}

initTerminal();
initCopyButtons();
initReveal();
initNav();
initYear();
