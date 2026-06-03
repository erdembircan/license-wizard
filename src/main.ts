import "./style.css";
import { scenes, type TerminalScene, type TerminalLine } from "./data/scenes";
import { runTypewriter } from "./lib/typewriter";
import { copyToClipboard } from "./lib/clipboard";

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

  function addLine(text: string, cls = ""): HTMLElement {
    const line = document.createElement("div");
    line.className = cls;
    line.style.whiteSpace = "pre-wrap";
    line.textContent = text;
    bodyEl!.appendChild(line);
    bodyEl!.scrollTop = bodyEl!.scrollHeight;
    return line;
  }

  function play(scene: TerminalScene, token: number): void {
    bodyEl!.innerHTML = "";
    bodyEl!.scrollTop = 0;
    const prompt = addLine("");
    prompt.classList.add("caret");
    prompt.textContent = "$ ";

    runTypewriter(scene.command, {
      charMs: 38,
      onFrame: (frame) => {
        if (token !== runToken) return;
        prompt.textContent = `$ ${frame}`;
      },
      onDone: () => {
        if (token !== runToken) return;
        prompt.classList.remove("caret");
        scene.output.forEach((line, i) => {
          later(
            () => {
              if (token !== runToken) return;
              addLine(line.text, toneClass[line.tone ?? "default"]);
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
