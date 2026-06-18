import { useState } from "react";

interface DesktopFile {
  id: string;
  name: string;
  /** Raw Markdown, rendered verbatim in the TextEdit-style window. */
  body: string;
}

// Files scattered on the desktop. `notes-to-self.md` winks at whoever found the
// desktop; `angry-gnome.md` is a breadcrumb — its haiku points at the gnome mode
// hiding on the author's personal site (tap the profile photo five times).
const FILES: DesktopFile[] = [
  {
    id: "notes",
    name: "notes-to-self.md",
    body: `# notes to self

- the LICENSE file is not optional
- "All rights reserved" is not open source
- nobody reads the README either
- this desktop is fake, btw 👋
- yes, you found the easter egg
- go star the repo or something. hi.`,
  },
  {
    id: "gnome",
    name: "angry-gnome.md",
    body: `# how to summon him

tap the friendly face
five times where the writer dwells —
a gnome wakes, fuming

🍄`,
  },
];

/** A generic .md document icon — folded-corner page with a Markdown badge. */
function MarkdownFileIcon() {
  return (
    <svg viewBox="0 0 48 58" className="desktop-file__glyph" aria-hidden="true">
      <path
        d="M7 2h25l10 10v42a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
        fill="#fff"
        stroke="#c7d2e2"
        strokeWidth="1.4"
      />
      <path
        d="M32 2.5V12h9.5"
        fill="#eef2f8"
        stroke="#c7d2e2"
        strokeWidth="1.4"
      />
      <rect x="11" y="22" width="26" height="2.4" rx="1.2" fill="#c2ccdc" />
      <rect x="11" y="28" width="20" height="2.4" rx="1.2" fill="#c2ccdc" />
      <rect x="8" y="38" width="32" height="13" rx="2.5" fill="#1f3a6b" />
      <path
        d="M12 48v-7l3.2 3.6L18.4 41v7"
        stroke="#fff"
        strokeWidth="1.7"
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M27.6 41v5.4m0 1.6-2.7-2.8m2.7 2.8 2.7-2.8"
        stroke="#fff"
        strokeWidth="1.7"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Renders one Markdown line: heading, blank gap, or plain verbatim text. */
function NoteLine({ line }: { line: string }) {
  if (line.startsWith("#")) {
    return <div className="notes-line notes-line--head">{line}</div>;
  }
  if (line.trim() === "") {
    return <div className="notes-line notes-line--gap"></div>;
  }
  return <div className="notes-line">{line}</div>;
}

/**
 * The stray Markdown files on the mini desktop. Each icon opens a small
 * TextEdit-style window that renders the file verbatim — Easter eggs tucked
 * inside the desktop Easter egg. One window is open at a time.
 */
export default function DesktopNotes() {
  const [openId, setOpenId] = useState<string | null>(null);
  const openFile = FILES.find((file) => file.id === openId) ?? null;

  return (
    <>
      <div className="desktop-files">
        {FILES.map((file) => (
          <button
            key={file.id}
            type="button"
            className="desktop-file"
            onClick={() => setOpenId(file.id)}
            aria-label={`Open ${file.name}`}
          >
            <span className="desktop-file__tile">
              <MarkdownFileIcon />
            </span>
            <span className="desktop-file__name">{file.name}</span>
          </button>
        ))}
      </div>

      {openFile && (
        <div
          className="notes-window"
          role="dialog"
          aria-label={openFile.name}
          aria-modal="false"
        >
          <div className="notes-window__bar">
            <button
              type="button"
              className="notes-dot notes-dot--close"
              onClick={() => setOpenId(null)}
              aria-label="Close note"
            >
              <span className="notes-dot__glyph" aria-hidden="true">
                ×
              </span>
            </button>
            <span className="notes-dot"></span>
            <span className="notes-dot"></span>
            <span className="notes-window__title">{openFile.name}</span>
          </div>
          <div className="notes-window__body">
            {openFile.body.split("\n").map((line, i) => (
              <NoteLine key={`${openFile.id}-${i}`} line={line} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
