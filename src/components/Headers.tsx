import { useState } from "react";

/**
 * The "Source-file headers" section: an interactive editor mock that stamps a
 * license header into the top of a real source file. A style toggle flips
 * between the `short` SPDX tag and the `full` standard notice, and the file
 * tabs show how the same block adapts to each language's preamble — a shebang
 * stays on top, a PHP header goes inside `<?php`. Every flip re-stamps the
 * block with a quick animation and a sparkle, echoing the wand metaphor.
 */

type Style = "short" | "full";

interface HeaderStyle {
  license: string;
  /** The header body lines, exactly as they sit inside the comment block. */
  body: string[];
  /** The hidden marker line the wizard stamps to own (and verify) the block. */
  marker: string;
}

// The two header bodies, rendered just as License Wizard writes them: the short
// SPDX tag lines (valid for every license) and Apache-2.0's full standard
// notice (a license that publishes one), each closed by the managed marker.
const STYLES: Record<Style, HeaderStyle> = {
  short: {
    license: "MIT",
    body: [
      "SPDX-License-Identifier: MIT",
      "SPDX-FileCopyrightText: 2026 Acme Corporation",
    ],
    marker: "license-wizard managed-header v1 MIT short 9f2a1c7b4e08",
  },
  full: {
    license: "Apache-2.0",
    body: [
      "Copyright 2026 Acme Corporation",
      "",
      'Licensed under the Apache License, Version 2.0 (the "License");',
      "you may not use this file except in compliance with the License.",
      "You may obtain a copy of the License at",
      "",
      "    http://www.apache.org/licenses/LICENSE-2.0",
      "",
      "Unless required by applicable law or agreed to in writing, software",
      'distributed under the License is distributed on an "AS IS" BASIS,',
      "WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or",
      "implied. See the License for the specific language governing",
      "permissions and limitations under the License.",
    ],
    marker: "license-wizard managed-header v1 Apache-2.0 full 3d7e9a2f15c4",
  },
};

interface SourceFile {
  name: string;
  /** Lines kept above the header — a shebang or a PHP open tag. */
  preamble: string[];
  /** A few dimmed lines of the file's real code, shown below the header. */
  code: string[];
  /** A one-line note on what this file demonstrates. */
  note: string;
}

const FILES: SourceFile[] = [
  {
    name: "App.tsx",
    preamble: [],
    code: [
      "export function App() {",
      '  return <main className="app">…</main>;',
      "}",
    ],
    note: "no preamble — the header sits at the very top",
  },
  {
    name: "cli.mjs",
    preamble: ["#!/usr/bin/env node"],
    code: [
      'import { run } from "./runner.js";',
      "",
      "run(process.argv.slice(2));",
    ],
    note: "a #! shebang always stays on the first line",
  },
  {
    name: "server.php",
    preamble: ["<?php"],
    code: ["namespace App\\Http;", "", "final class Server { /* … */ }"],
    note: "a PHP header goes inside the <?php tag",
  },
];

function Check() {
  return (
    <svg
      className="mt-0.5 size-4 shrink-0 text-brand"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** A single rendered code line, splitting the comment prefix from its content
 *  so the SPDX text reads brighter than the ` * ` gutter around it. */
function CommentLine({
  prefix,
  content,
  tone,
}: {
  prefix: string;
  content: string;
  tone: "body" | "marker";
}) {
  return (
    <div className="hdr-ln">
      <span className="hdr-cm">{prefix}</span>
      <span className={tone === "marker" ? "hdr-marker" : "hdr-body"}>
        {content}
      </span>
    </div>
  );
}

export default function Headers() {
  const [style, setStyle] = useState<Style>("short");
  const [fileIdx, setFileIdx] = useState(0);

  const active = STYLES[style];
  const file = FILES[fileIdx]!;

  return (
    <section id="headers" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20">
      <div className="mx-auto max-w-2xl text-center" data-reveal>
        <p className="eyebrow">
          <span className="size-1.5 rounded-full bg-brand"></span>Source-file
          headers
        </p>
        <h2 className="mt-5 font-display text-4xl font-bold tracking-tight text-ink md:text-[2.75rem]">
          A header in every file
        </h2>
        <p className="mt-4 text-lg text-ink-soft">
          The <code className="font-mono text-[0.95em]">LICENSE</code> file
          covers the repo. The little notice many licenses ask you to add to{" "}
          <em>each source file</em> is a per-file chore, so License Wizard
          stamps it for you, and keeps it honest.
        </p>
      </div>

      <div
        className="relative mt-14 overflow-hidden rounded-3xl border border-line bg-paper-raised p-6 md:p-10"
        data-reveal
      >
        <div
          className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(47,111,224,0.14), transparent 65%)",
          }}
        ></div>

        <div className="relative grid gap-8 lg:grid-cols-[290px_1fr] lg:gap-10">
          {/* controls + talking points */}
          <div className="flex flex-col">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Header style
            </p>
            <div
              className="hdr-seg mt-3"
              role="group"
              aria-label="Header style"
            >
              <button
                type="button"
                className="hdr-seg-btn"
                aria-pressed={style === "short"}
                onClick={() => setStyle("short")}
              >
                short
                <span className="hdr-seg-sub">SPDX tag · any license</span>
              </button>
              <button
                type="button"
                className="hdr-seg-btn"
                aria-pressed={style === "full"}
                onClick={() => setStyle("full")}
              >
                full
                <span className="hdr-seg-sub">
                  standard notice · Apache-2.0
                </span>
              </button>
            </div>

            <ul className="mt-8 space-y-4 text-sm leading-relaxed text-ink-soft">
              <li className="flex gap-2.5">
                <Check />
                <span>
                  Scans <code className="font-mono text-[0.85em]">.js</code>,{" "}
                  <code className="font-mono text-[0.85em]">.ts</code> and{" "}
                  <code className="font-mono text-[0.85em]">.php</code> sources,
                  pruning{" "}
                  <code className="font-mono text-[0.85em]">node_modules</code>,{" "}
                  <code className="font-mono text-[0.85em]">vendor</code> and
                  everything your{" "}
                  <code className="font-mono text-[0.85em]">.gitignore</code>{" "}
                  excludes.
                </span>
              </li>
              <li className="flex gap-2.5">
                <Check />
                <span>
                  A hidden marker fingerprints each block, so re-runs are
                  idempotent and switching licenses rewrites in place, never
                  stacking a second notice.
                </span>
              </li>
              <li className="flex gap-2.5">
                <Check />
                <span>
                  <code className="flag-code">--verify</code> checks the header
                  surface too, and a hand-written notice without the marker is
                  always left alone.
                </span>
              </li>
            </ul>

            <a
              href="https://github.com/erdembircan/license-wizard#source-file-headers"
              target="_blank"
              rel="noopener"
              className="mt-7 inline-flex items-center gap-2 font-semibold text-brand-strong transition-colors hover:text-brand"
            >
              Source-file header docs
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
          </div>

          {/* editor */}
          <div className="terminal">
            <div className="terminal-bar">
              <span
                className="term-dot"
                style={{ background: "#ff5f57" }}
              ></span>
              <span
                className="term-dot"
                style={{ background: "#febc2e" }}
              ></span>
              <span
                className="term-dot"
                style={{ background: "#28c840" }}
              ></span>
              <div
                className="ml-3 flex gap-1"
                role="tablist"
                aria-label="Source files"
              >
                {FILES.map((f, i) => (
                  <button
                    key={f.name}
                    type="button"
                    role="tab"
                    aria-selected={i === fileIdx}
                    className="term-tab"
                    onClick={() => setFileIdx(i)}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="hdr-code">
              {file.preamble.map((line) => (
                <div key={line} className="hdr-ln hdr-pre">
                  {line}
                </div>
              ))}
              {file.preamble.length > 0 && <div className="hdr-ln">&nbsp;</div>}

              <div className="hdr-block" key={`${style}-${fileIdx}`}>
                <svg
                  className="hdr-spark"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 0l2.2 9.8L24 12l-9.8 2.2L12 24l-2.2-9.8L0 12l9.8-2.2z" />
                </svg>
                <div className="hdr-ln hdr-cm">/*</div>
                {active.body.map((line, i) =>
                  line === "" ? (
                    <div key={i} className="hdr-ln hdr-cm">
                      {" *"}
                    </div>
                  ) : (
                    <CommentLine
                      key={i}
                      prefix=" * "
                      content={line}
                      tone="body"
                    />
                  ),
                )}
                <CommentLine
                  prefix=" * "
                  content={active.marker}
                  tone="marker"
                />
                <div className="hdr-ln hdr-cm">{" */"}</div>
              </div>

              <div className="hdr-ln">&nbsp;</div>
              {file.code.map((line, i) => (
                <div key={i} className="hdr-ln hdr-src">
                  {line === "" ? " " : line}
                </div>
              ))}
            </div>

            <div className="hdr-foot">
              <div className="hdr-foot-marker">
                <span className="hdr-foot-arrow" aria-hidden="true">
                  ↑
                </span>
                that last line is the managed marker; it&apos;s how{" "}
                <code className="hdr-foot-code">--verify</code> re-checks and
                re-applies the block
              </div>
              <p className="hdr-foot-note">{file.note}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
