import "./style.css";
import { scenes, type TerminalScene, type TerminalLine } from "./data/scenes";
import { runTypewriter } from "./lib/typewriter";
import { copyToClipboard } from "./lib/clipboard";
import { classifyTreeLine, lineMarker } from "./lib/terminalLine";
import {
  THINKING_PHRASES,
  THINKING_FRAMES,
  thinkingMeta,
} from "./lib/thinking";

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
  const intervals: ReturnType<typeof setInterval>[] = [];

  const clearPending = (): void => {
    while (pending.length) clearTimeout(pending.pop());
    while (intervals.length) clearInterval(intervals.pop());
  };
  const later = (fn: () => void, ms: number): void => {
    pending.push(setTimeout(fn, ms));
  };
  const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

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

  // Types the leading prompt ($ command or > agent prompt), then runs `after`.
  function typePrompt(
    scene: TerminalScene,
    token: number,
    after: () => void,
  ): void {
    const sigil = scene.kind === "agent" ? ">" : "$";
    const prompt = document.createElement("div");
    prompt.className = "term-line caret";
    prompt.style.whiteSpace = "pre-wrap";
    prompt.textContent = `${sigil} `;
    appendChild(prompt);

    runTypewriter(scene.command, {
      charMs: scene.kind === "agent" ? 30 : 38,
      onFrame: (frame) => {
        if (token !== runToken) return;
        prompt.textContent = `${sigil} ${frame}`;
      },
      onDone: () => {
        if (token !== runToken) return;
        prompt.classList.remove("caret");
        after();
      },
    });
  }

  function advanceAfter(token: number, ms: number): void {
    if (!autoAdvance) return;
    later(() => {
      if (token !== runToken) return;
      select((activeIndex + 1) % scenes.length);
    }, ms);
  }

  // Plain shell scenes: type the command, then reveal each output line on a timer.
  function playShell(scene: TerminalScene, token: number): void {
    typePrompt(scene, token, () => {
      const firstTreeIndex = scene.output.findIndex(
        (l) => classifyTreeLine(l.text).glyph !== null,
      );
      scene.output.forEach((line, i) => {
        later(
          () => {
            if (token !== runToken) return;
            renderLine(line, i === firstTreeIndex);
          },
          90 * (i + 1),
        );
      });
      advanceAfter(token, 90 * (scene.output.length + 1) + 3200);
    });
  }

  // Splits agent output into blocks, each beginning at an ⏺ action line, so a
  // "thinking" animation can play before each one.
  function agentBlocks(output: TerminalLine[]): TerminalLine[][] {
    const blocks: TerminalLine[][] = [];
    let current: TerminalLine[] | null = null;
    for (const line of output) {
      if (line.text.startsWith("⏺")) {
        current = [line];
        blocks.push(current);
      } else if (current) {
        current.push(line);
      }
    }
    return blocks;
  }

  // Shows Claude Code's animated thinking status, then removes it. Resolves when
  // the think duration elapses (post-await callers re-check the run token).
  function think(): Promise<void> {
    const line = document.createElement("div");
    line.className = "term-line term-think";
    const head = document.createElement("span");
    const meta = document.createElement("span");
    meta.className = "t-dim";
    line.append(head, meta);
    appendChild(line);

    const phrase =
      THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)];
    const started = Date.now();
    let frame = 0;
    let tokens = 60 + Math.floor(Math.random() * 90);

    const tick = (): void => {
      const glyph = THINKING_FRAMES[frame % THINKING_FRAMES.length]!;
      frame += 1;
      tokens += 6 + Math.floor(Math.random() * 12);
      const seconds = Math.max(1, Math.round((Date.now() - started) / 1000));
      head.textContent = `${glyph} ${phrase}… `;
      meta.textContent = thinkingMeta(seconds, tokens);
    };
    tick();
    intervals.push(setInterval(tick, 110));

    const duration = 1800 + Math.floor(Math.random() * 1400);
    return sleep(duration).then(() => {
      line.remove();
    });
  }

  // Agent scenes: type the prompt, then for each action block play a thinking
  // animation, remove it, and reveal the block's lines (Claude Code style).
  async function playAgent(scene: TerminalScene, token: number): Promise<void> {
    const blocks = agentBlocks(scene.output);
    for (const block of blocks) {
      if (token !== runToken) return;
      await think();
      if (token !== runToken) return;
      for (const line of block) {
        const isResult = /^\s*⎿/.test(line.text);
        await sleep(isResult ? 480 : 180);
        if (token !== runToken) return;
        renderLine(line, false);
      }
    }
    if (token !== runToken) return;
    advanceAfter(token, 4200);
  }

  function play(scene: TerminalScene, token: number): void {
    bodyEl!.innerHTML = "";
    bodyEl!.scrollTop = 0;
    if (scene.kind === "agent") {
      typePrompt(scene, token, () => void playAgent(scene, token));
    } else {
      playShell(scene, token);
    }
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
