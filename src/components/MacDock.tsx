import type { ReactNode } from "react";

/**
 * Finder — the split blue face. Left half light, right half deep, two eyes and
 * a smile, drawn flat so it reads at dock size.
 */
function FinderIcon(): ReactNode {
  return (
    <svg viewBox="0 0 64 64" className="dock-glyph" aria-hidden="true">
      <defs>
        <linearGradient id="dk-finder" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4eb3ff" />
          <stop offset="1" stopColor="#1f7fe0" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#dk-finder)" />
      <path
        d="M32 8v48"
        stroke="#ffffff"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <path
        d="M20 26v6"
        stroke="#fff"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M44 26v6"
        stroke="#fff"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M21 40c4 6 18 6 22 0"
        stroke="#fff"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Safari — the compass: ticked ring with a red/white needle. */
function SafariIcon(): ReactNode {
  return (
    <svg viewBox="0 0 64 64" className="dock-glyph" aria-hidden="true">
      <defs>
        <radialGradient id="dk-safari" cx="0.5" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#f4fbff" />
          <stop offset="1" stopColor="#d8edff" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#dk-safari)" />
      <circle
        cx="32"
        cy="32"
        r="21"
        fill="#1a8cff"
        stroke="#0a6fd6"
        strokeWidth="2"
      />
      <circle cx="32" cy="32" r="3" fill="#fff" />
      <path d="M32 13 36 32 32 32Z" fill="#fff" />
      <path d="M32 51 28 32 32 32Z" fill="#ff4b4b" />
      <path d="M32 32 51 28 32 36Z" fill="#fff" opacity="0.85" />
      <path d="M32 32 13 36 32 28Z" fill="#ff4b4b" />
    </svg>
  );
}

/** Mail — white envelope on the system blue tile. */
function MailIcon(): ReactNode {
  return (
    <svg viewBox="0 0 64 64" className="dock-glyph" aria-hidden="true">
      <defs>
        <linearGradient id="dk-mail" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#41c6ff" />
          <stop offset="1" stopColor="#1f8ef0" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#dk-mail)" />
      <rect x="13" y="19" width="38" height="26" rx="4" fill="#fff" />
      <path
        d="M15 22 32 35 49 22"
        stroke="#1f8ef0"
        strokeWidth="3"
        fill="none"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Messages — the green speech bubble. */
function MessagesIcon(): ReactNode {
  return (
    <svg viewBox="0 0 64 64" className="dock-glyph" aria-hidden="true">
      <defs>
        <linearGradient id="dk-msg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5af07a" />
          <stop offset="1" stopColor="#1fc24a" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#dk-msg)" />
      <path
        d="M32 16c-10 0-18 6.5-18 14.5 0 8 8 14.5 18 14.5 2.2 0 4.3-.3 6.2-.9L48 48l-2.2-7.3C50 38 50 34 50 30.5 50 22.5 42 16 32 16Z"
        fill="#fff"
      />
    </svg>
  );
}

/** Music — the white note on a candy gradient. */
function MusicIcon(): ReactNode {
  return (
    <svg viewBox="0 0 64 64" className="dock-glyph" aria-hidden="true">
      <defs>
        <linearGradient id="dk-music" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff7d94" />
          <stop offset="1" stopColor="#fb3b5c" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#dk-music)" />
      <path
        d="M40 16 26 20v22"
        stroke="#fff"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M40 16v18"
        stroke="#fff"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="22" cy="43" r="6" fill="#fff" />
      <circle cx="38" cy="35" r="6" fill="#fff" />
    </svg>
  );
}

/** Calendar — white card, red banner, today's number. */
function CalendarIcon(): ReactNode {
  return (
    <svg viewBox="0 0 64 64" className="dock-glyph" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#fff" />
      <path
        d="M0 14a14 14 0 0 1 14-14h36a14 14 0 0 1 14 14v6H0Z"
        fill="#ff4b4b"
      />
      <text
        x="32"
        y="50"
        textAnchor="middle"
        fontSize="30"
        fontWeight="700"
        fontFamily="-apple-system, system-ui, sans-serif"
        fill="#2b2b2b"
      >
        18
      </text>
    </svg>
  );
}

/** Terminal — the classic black tile with a green prompt. */
function TerminalIcon(): ReactNode {
  return (
    <svg viewBox="0 0 64 64" className="dock-glyph" aria-hidden="true">
      <defs>
        <linearGradient id="dk-term" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3f4b" />
          <stop offset="1" stopColor="#16191f" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#dk-term)" />
      <rect
        x="10"
        y="12"
        width="44"
        height="9"
        rx="4"
        fill="#000"
        opacity="0.3"
      />
      <path
        d="M18 32 26 38 18 44"
        stroke="#4be07a"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M30 45h14"
        stroke="#cfd6e0"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Trash — translucent bin, sits apart at the far end of the dock. */
function TrashIcon(): ReactNode {
  return (
    <svg viewBox="0 0 64 64" className="dock-glyph" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#e9eef6" />
      <rect x="20" y="14" width="24" height="3.5" rx="1.75" fill="#9aa6bb" />
      <path
        d="M22 22h20l-2.2 26a4 4 0 0 1-4 3.6H28.2a4 4 0 0 1-4-3.6Z"
        fill="#fff"
        stroke="#9aa6bb"
        strokeWidth="2"
      />
      <path
        d="M29 28v18M35 28v18"
        stroke="#9aa6bb"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface MacDockProps {
  /** Reopen the hero terminal — wired only to the License Wizard icon. */
  onLaunch: () => void;
  /** Whether the terminal is currently stowed (shows the running indicator). */
  running: boolean;
}

const DECORATIVE_APPS: { label: string; icon: ReactNode }[] = [
  { label: "Finder", icon: <FinderIcon /> },
  { label: "Safari", icon: <SafariIcon /> },
  { label: "Messages", icon: <MessagesIcon /> },
  { label: "Mail", icon: <MailIcon /> },
  { label: "Music", icon: <MusicIcon /> },
  { label: "Calendar", icon: <CalendarIcon /> },
  { label: "Terminal", icon: <TerminalIcon /> },
];

/**
 * The macOS dock revealed when the hero terminal is closed or minimized. Every
 * tile is decorative chrome except the License Wizard icon, which relaunches the
 * terminal. A divider sets Trash apart at the far end, mirroring real macOS.
 */
export default function MacDock({
  onLaunch,
  running,
}: MacDockProps): ReactNode {
  return (
    <div className="mac-dock" role="toolbar" aria-label="Dock">
      {DECORATIVE_APPS.map((app) => (
        <div key={app.label} className="dock-item" title={app.label}>
          <span className="dock-tile" aria-hidden="true">
            {app.icon}
          </span>
        </div>
      ))}

      <button
        type="button"
        className="dock-item dock-item--app"
        onClick={onLaunch}
        title="License Wizard"
        aria-label="Open License Wizard terminal"
      >
        <span className="dock-tile">
          <img
            src={`${import.meta.env.BASE_URL}favicon.svg`}
            alt=""
            className="dock-glyph"
          />
        </span>
        <span
          className={`dock-running ${running ? "is-on" : ""}`}
          aria-hidden="true"
        ></span>
      </button>

      <span className="dock-divider" aria-hidden="true"></span>

      <div className="dock-item" title="Trash">
        <span className="dock-tile" aria-hidden="true">
          <TrashIcon />
        </span>
      </div>
    </div>
  );
}
