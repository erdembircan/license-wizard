import { useEffect, useRef, useState } from "react";
import { copyToClipboard } from "../lib/clipboard";

interface CopyButtonProps {
  text: string;
  label: string;
  className?: string;
}

/**
 * Copy-to-clipboard button used inside `.copy-field` rows. Copies `text` on
 * click and, on success, briefly swaps its icon to a check mark and tints
 * itself with `text-brand` for 1400ms before reverting.
 */
export default function CopyButton({
  text,
  label,
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleClick = async () => {
    const ok = await copyToClipboard(text);
    if (!ok) return;
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setCopied(false);
    }, 1400);
  };

  const buttonClass = [
    "shrink-0 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-paper hover:text-brand",
    copied ? "text-brand" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={buttonClass}
      aria-label={label}
      onClick={() => {
        void handleClick();
      }}
    >
      <svg
        className="copy-icon size-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {copied ? (
          <path d="M20 6 9 17l-5-5" />
        ) : (
          <>
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </>
        )}
      </svg>
    </button>
  );
}
