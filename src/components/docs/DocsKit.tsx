import type { ReactNode } from "react";
import CopyButton from "../CopyButton";

/**
 * A standalone, copyable shell command rendered on the dark terminal palette.
 * Use for the one-liners a reader is meant to run verbatim.
 */
export function Cmd({ children }: { children: string }) {
  return (
    <div className="my-4 flex items-center justify-between gap-3 rounded-xl border border-term-line bg-term-bg px-4 py-3 font-mono text-[13px] text-term-text">
      <code className="overflow-x-auto whitespace-pre">
        <span className="text-term-accent select-none">$</span> {children}
      </code>
      <CopyButton
        text={children}
        label={`Copy command: ${children}`}
        className="!text-term-dim hover:!bg-white/5 hover:!text-term-accent"
      />
    </div>
  );
}

/**
 * A multi-line, non-interactive code or config sample on the terminal palette.
 * `lang` is an optional caption shown in the top corner (e.g. `jsonc`, `yaml`).
 */
export function Sample({
  children,
  lang,
}: {
  children: string;
  lang?: string;
}) {
  return (
    <div className="relative my-4 overflow-hidden rounded-xl border border-term-line bg-term-bg">
      {lang ? (
        <span className="absolute top-2.5 right-3 font-mono text-[11px] tracking-wide text-term-dim uppercase">
          {lang}
        </span>
      ) : null}
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[12.5px] leading-relaxed text-term-text">
        <code>{children}</code>
      </pre>
    </div>
  );
}

/** A soft, brand-tinted note callout for tips and important asides. */
export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="my-5 rounded-xl border border-line-strong bg-brand-soft/60 px-4 py-3.5 text-[15px] leading-relaxed text-ink-soft">
      {children}
    </div>
  );
}

/** An inline code token, tinted to match the package's flag styling. */
export function Code({ children }: { children: ReactNode }) {
  return <code className="flag-code">{children}</code>;
}

/** A documentation section heading with a hash-link anchor target. */
export function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="mt-12 scroll-mt-24 font-display text-2xl font-bold tracking-tight text-ink first:mt-0"
    >
      {children}
    </h2>
  );
}

/** A sub-heading within a section. */
export function H3({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-8 font-display text-lg font-semibold tracking-tight text-ink">
      {children}
    </h3>
  );
}

/** A body paragraph with the docs' reading rhythm. */
export function P({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">{children}</p>
  );
}

/** An unordered list styled for the docs body. */
export function List({ children }: { children: ReactNode }) {
  return (
    <ul className="mt-4 space-y-2 text-[15px] leading-relaxed text-ink-soft">
      {children}
    </ul>
  );
}

/** A single bullet inside {@link List}. */
export function LI({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand/60" />
      <span>{children}</span>
    </li>
  );
}

export interface FlagRow {
  flag: string;
  description: ReactNode;
}

/** A reference table of flags and their descriptions. */
export function FlagTable({ rows }: { rows: FlagRow[] }) {
  return (
    <div className="my-5 overflow-x-auto rounded-xl border border-line">
      <table className="w-full border-collapse text-left text-[14px]">
        <thead>
          <tr className="border-b border-line bg-paper">
            <th className="px-4 py-3 font-semibold text-ink">Flag</th>
            <th className="px-4 py-3 font-semibold text-ink">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.flag} className="border-b border-line last:border-0">
              <td className="px-4 py-3 align-top whitespace-nowrap">
                <code className="flag-code">{row.flag}</code>
              </td>
              <td className="px-4 py-3 align-top leading-relaxed text-ink-soft">
                {row.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
