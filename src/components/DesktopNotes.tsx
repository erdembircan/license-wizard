const FILE_NAME = "notes-to-self.md";

// The note's body, written out the way it would actually sit in the file — the
// little TextEdit window below renders these lines verbatim.
const HEADING = "# notes to self";
const NOTES = [
  "the LICENSE file is not optional",
  '"All rights reserved" is not open source',
  "nobody reads the README either",
  "this desktop is fake, btw 👋",
  "yes, you found the easter egg",
  "go star the repo or something. hi.",
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

interface DesktopNotesProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}

/**
 * A stray Markdown file on the mini desktop. Clicking the icon opens a small
 * TextEdit-style window that renders the note verbatim — an Easter egg tucked
 * inside the desktop Easter egg.
 */
export default function DesktopNotes({
  open,
  onOpen,
  onClose,
}: DesktopNotesProps) {
  return (
    <>
      <button
        type="button"
        className="desktop-file"
        onClick={onOpen}
        aria-label={`Open ${FILE_NAME}`}
      >
        <span className="desktop-file__tile">
          <MarkdownFileIcon />
        </span>
        <span className="desktop-file__name">{FILE_NAME}</span>
      </button>

      {open && (
        <div
          className="notes-window"
          role="dialog"
          aria-label={FILE_NAME}
          aria-modal="false"
        >
          <div className="notes-window__bar">
            <button
              type="button"
              className="notes-dot notes-dot--close"
              onClick={onClose}
              aria-label="Close note"
            >
              <span className="notes-dot__glyph" aria-hidden="true">
                ×
              </span>
            </button>
            <span className="notes-dot"></span>
            <span className="notes-dot"></span>
            <span className="notes-window__title">{FILE_NAME}</span>
          </div>
          <div className="notes-window__body">
            <div className="notes-line notes-line--head">{HEADING}</div>
            <div className="notes-line notes-line--gap"></div>
            {NOTES.map((note) => (
              <div className="notes-line" key={note}>
                - {note}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
