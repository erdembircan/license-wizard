import { useEffect, type RefObject } from "react";
import { scenes, type TerminalScene, type TerminalLine } from "../data/scenes";
import { runTypewriter } from "../lib/typewriter";
import { classifyTreeLine, lineMarker } from "../lib/terminalLine";
import {
  THINKING_PHRASES,
  THINKING_FRAMES,
  thinkingMeta,
} from "../lib/thinking";

const toneClass: Record<NonNullable<TerminalLine["tone"]>, string> = {
  default: "",
  dim: "t-dim",
  accent: "t-accent",
  green: "t-green",
  amber: "t-amber",
  red: "t-red",
};

/**
 * Per-character speed for typing an output line. Faster than the prompt (which
 * stands in for a human at the keyboard) so the streamed answer reads as the
 * machine emitting text, while still being visibly typed rather than appearing
 * whole.
 */
const OUTPUT_CHAR_MS = 9;

/**
 * Runs the interactive hero terminal engine against the given tabs container and
 * body elements: builds the scene tabs, types each prompt, plays back the shell
 * scenes line-by-line, streams the agent turn with the thinking spinner, and
 * auto-advances between scenes. The whole engine lives inside a single useEffect
 * whose cleanup clears every pending timeout/interval so nothing leaks on unmount
 * or a StrictMode double-invoke.
 */
export function useTerminalPlayer(
  tabsRef: RefObject<HTMLDivElement | null>,
  bodyRef: RefObject<HTMLDivElement | null>,
): void {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }
    const tabsEl = tabsRef.current;
    const bodyEl = bodyRef.current;
    if (!tabsEl || !bodyEl) return;

    let activeIndex = 0;
    let runToken = 0;
    let autoAdvance = true;
    const pending: ReturnType<typeof setTimeout>[] = [];
    const intervals: ReturnType<typeof setInterval>[] = [];
    // Finishers for typewriters that are mid-flight: calling one stops its timer,
    // drops its caret, and resolves the awaiting line so a scene switch can never
    // leave a half-typed line or a dangling promise behind.
    const cancelers: (() => void)[] = [];

    const clearPending = (): void => {
      while (pending.length) clearTimeout(pending.pop());
      while (intervals.length) clearInterval(intervals.pop());
      while (cancelers.length) cancelers.pop()!();
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

    // Where new lines are appended — the body for shell scenes, or the scrollable
    // transcript for the agent scene (whose input box stays pinned below it).
    let renderTarget: HTMLElement = bodyEl;

    const scrollTargetToEnd = (): void => {
      renderTarget.scrollTop = renderTarget.scrollHeight;
    };

    function appendChild(el: HTMLElement): void {
      renderTarget.appendChild(el);
      scrollTargetToEnd();
    }

    // A line's element plus the hooks needed to type it: `typeable` is the text
    // that streams in, `setText` reveals a prefix of it (rebuilding only the
    // characters, never the structural glyph/gutter/marker), and `caretEl` is the
    // node that carries the blinking caret while the line is being typed.
    interface BuiltLine {
      el: HTMLElement;
      typeable: string;
      setText: (prefix: string) => void;
      caretEl: HTMLElement;
    }

    // Builds one output line. Tree lines (◇ ◆ │ └) get a CSS-drawn gutter so the
    // connectors form one continuous vertical line; other lines are plain text
    // with an optional tinted leading marker (⏺ agent action / ✦ success spark).
    // The structural parts (gutter, marker glyph) are fixed up front; only the
    // line's text is fed in progressively via `setText` so it can be typed out.
    function buildLineEl(
      line: TerminalLine,
      isFirstTreeRow: boolean,
    ): BuiltLine {
      const { glyph, content } = classifyTreeLine(line.text);
      const toneCls = toneClass[line.tone ?? "default"];

      if (!glyph) {
        const el = document.createElement("div");
        el.className = `term-line ${toneCls}`.trim();
        el.style.whiteSpace = "pre-wrap";

        const marker = lineMarker(line.text);
        if (marker) {
          // The marker glyph is fixed and tinted; only the text after it types.
          const mark = document.createElement("span");
          mark.className = marker === "bullet" ? "term-bullet" : "term-check";
          mark.textContent = line.text.charAt(0);
          const rest = document.createElement("span");
          el.append(mark, rest);
          const setText = (prefix: string): void => {
            rest.textContent = prefix.slice(1);
          };
          return { el, typeable: line.text, setText, caretEl: rest };
        }

        const setText = (prefix: string): void => {
          el.textContent = prefix;
        };
        return { el, typeable: line.text, setText, caretEl: el };
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

      row.append(gutter, body);
      const setText = (prefix: string): void => {
        body.textContent = prefix;
      };
      return { el: row, typeable: content, setText, caretEl: body };
    }

    /**
     * Types `built.typeable` into the line one character at a time, mirroring the
     * prompt's typewriter so an answer streams in instead of appearing whole. A
     * blinking caret rides the end of the text while it types and is dropped when
     * the line is complete. Resolves once the line finishes — or sooner if the
     * scene is switched out from under it.
     */
    function typeLine(built: BuiltLine, token: number): Promise<void> {
      return new Promise((resolve) => {
        if (built.typeable === "") {
          resolve();
          return;
        }
        built.caretEl.classList.add("caret");
        let cancelTimer = (): void => {};
        const finish = (): void => {
          cancelTimer();
          built.caretEl.classList.remove("caret");
          resolve();
        };
        cancelTimer = runTypewriter(built.typeable, {
          charMs: OUTPUT_CHAR_MS,
          onFrame: (frame) => {
            if (token !== runToken) {
              finish();
              return;
            }
            built.setText(frame);
            scrollTargetToEnd();
          },
          onDone: finish,
        });
        cancelers.push(finish);
      });
    }

    // Appends a freshly-built line to the current render target and types it out.
    function renderTypedLine(
      line: TerminalLine,
      isFirstTreeRow: boolean,
      token: number,
    ): Promise<void> {
      const built = buildLineEl(line, isFirstTreeRow);
      built.setText("");
      appendChild(built.el);
      return typeLine(built, token);
    }

    // Appends a freshly-built line with its full text already in place.
    function renderLine(line: TerminalLine, isFirstTreeRow: boolean): void {
      const built = buildLineEl(line, isFirstTreeRow);
      built.setText(built.typeable);
      appendChild(built.el);
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

    // Plain shell scenes: type the command, then reveal each output line on a
    // timer. The `interactive` tab additionally types each answer line in,
    // character by character, mirroring the prompt's typewriter; the other shell
    // tabs keep revealing whole lines.
    function playShell(scene: TerminalScene, token: number): void {
      const typeAnswers = scene.id === "interactive";
      typePrompt(scene, token, async () => {
        const firstTreeIndex = scene.output.findIndex(
          (l) => classifyTreeLine(l.text).glyph !== null,
        );

        if (!typeAnswers) {
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
          return;
        }

        for (let i = 0; i < scene.output.length; i++) {
          if (token !== runToken) return;
          const line = scene.output[i]!;
          await renderTypedLine(line, i === firstTreeIndex, token);
          await sleep(line.text === "" ? 110 : 45);
        }
        if (token !== runToken) return;
        advanceAfter(token, 3200);
      });
    }

    // Builds the Claude Code layout: a scrollable transcript on top with a pinned
    // input box and status line below it. Returns the transcript + input pieces.
    function buildAgentChrome(): {
      transcript: HTMLElement;
      inputText: HTMLElement;
    } {
      const wrap = document.createElement("div");
      wrap.className = "term-agent";

      const transcript = document.createElement("div");
      transcript.className = "term-transcript";

      const input = document.createElement("div");
      input.className = "term-inputbox";
      const chevron = document.createElement("span");
      chevron.className = "term-input-prompt";
      chevron.textContent = "› ";
      const inputText = document.createElement("span");
      const cursor = document.createElement("span");
      cursor.className = "term-cursor";
      input.append(chevron, inputText, cursor);

      const status = document.createElement("div");
      status.className = "term-status";
      const accent = document.createElement("span");
      accent.className = "term-status-accent";
      accent.textContent = "⏵⏵ auto-accept edits on ";
      const hint = document.createElement("span");
      hint.className = "t-dim";
      hint.textContent = "(shift+tab to cycle)";
      status.append(accent, hint);

      wrap.append(transcript, input, status);
      bodyEl!.appendChild(wrap);
      return { transcript, inputText };
    }

    /**
     * Renders a thinking phrase as one span per character so a single bright
     * band can sweep across it. Each span carries its index in `--i`, which
     * the CSS turns into a staggered (positive) animation delay: the leftmost
     * glyph flashes first and the rightmost last, so one reflection travels
     * left→right, clears the edge, and rests before the next cycle begins.
     */
    function renderShimmerPhrase(el: HTMLElement, text: string): void {
      el.textContent = "";
      [...text].forEach((ch, i) => {
        const span = document.createElement("span");
        span.className = "term-think-char";
        span.style.setProperty("--i", String(i));
        span.textContent = ch;
        el.appendChild(span);
      });
    }

    // Streams an agent turn Claude-Code style: one persistent thinking spinner
    // pinned to the bottom of the transcript — a single running timer + token
    // counter for the whole turn — with the agent's lines appearing above it.
    async function streamAgentTurn(
      scene: TerminalScene,
      token: number,
      transcript: HTMLElement,
    ): Promise<void> {
      const spinner = document.createElement("div");
      spinner.className = "term-line term-think";
      const glyphEl = document.createElement("span");
      glyphEl.className = "term-think-glyph";
      const phraseEl = document.createElement("span");
      phraseEl.className = "term-think-phrase";
      const meta = document.createElement("span");
      meta.className = "t-dim";
      spinner.append(glyphEl, phraseEl, meta);
      transcript.appendChild(spinner);
      scrollTargetToEnd();

      const started = Date.now();
      let tokens = 0;
      let frame = 0;
      let phraseIdx = Math.floor(Math.random() * THINKING_PHRASES.length);
      let renderedPhrase = -1;
      const tick = (): void => {
        const glyph = THINKING_FRAMES[frame % THINKING_FRAMES.length]!;
        frame += 1;
        tokens += 5 + Math.floor(Math.random() * 11);
        if (frame % 22 === 0) {
          phraseIdx = (phraseIdx + 1) % THINKING_PHRASES.length;
        }
        const seconds = Math.max(1, Math.round((Date.now() - started) / 1000));
        glyphEl.textContent = `${glyph} `;
        // Re-split into shimmer characters only when the phrase changes, so the
        // sweeping wave runs uninterrupted between phrase swaps.
        if (phraseIdx !== renderedPhrase) {
          renderShimmerPhrase(phraseEl, `${THINKING_PHRASES[phraseIdx]}…`);
          renderedPhrase = phraseIdx;
        }
        meta.textContent = ` ${thinkingMeta(seconds, tokens)}`;
      };
      tick();
      const iv = setInterval(tick, 110);
      intervals.push(iv);

      for (const line of scene.output) {
        const isResult = /^\s*⎿/.test(line.text);
        const isAction = line.text.startsWith("⏺");
        await sleep(isResult ? 620 : isAction ? 900 : 240);
        if (token !== runToken) {
          clearInterval(iv);
          return;
        }
        const built = buildLineEl(line, false);
        built.setText(built.typeable);
        transcript.insertBefore(built.el, spinner);
        scrollTargetToEnd();
      }

      await sleep(900);
      clearInterval(iv);
      if (token !== runToken) return;
      spinner.remove();
      advanceAfter(token, 3200);
    }

    // Agent scene: type the prompt into the bottom input box, "submit" it into the
    // transcript, then stream the turn above the pinned input.
    function playAgent(scene: TerminalScene, token: number): void {
      const { transcript, inputText } = buildAgentChrome();
      renderTarget = transcript;

      runTypewriter(scene.command, {
        charMs: 30,
        onFrame: (frame) => {
          if (token !== runToken) return;
          inputText.textContent = frame;
        },
        onDone: () => {
          if (token !== runToken) return;
          const userMsg = document.createElement("div");
          userMsg.className = "term-line term-user";
          userMsg.textContent = `> ${scene.command}`;
          transcript.appendChild(userMsg);
          inputText.textContent = "";
          scrollTargetToEnd();
          void streamAgentTurn(scene, token, transcript);
        },
      });
    }

    function play(scene: TerminalScene, token: number): void {
      bodyEl!.innerHTML = "";
      bodyEl!.scrollTop = 0;
      const isAgent = scene.kind === "agent";
      bodyEl!.classList.toggle("is-agent", isAgent);
      renderTarget = bodyEl!;
      if (isAgent) {
        playAgent(scene, token);
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

    return () => {
      runToken += 1;
      clearPending();
      tabButtons.forEach((b) => b.remove());
      bodyEl.innerHTML = "";
      bodyEl.classList.remove("is-agent");
    };
  }, [tabsRef, bodyRef]);
}
