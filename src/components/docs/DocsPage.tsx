import { useEffect } from "react";
import { docsHref, type DocsSectionId } from "../../lib/route";
import Footer from "../Footer";
import DocsHeader from "./DocsHeader";
import DocsSidebar from "./DocsSidebar";
import { SECTIONS } from "../../data/docs";

/**
 * The full documentation page: a fixed header, the section sidebar, the active
 * section's content, and prev/next links. Scrolls back to the top whenever the
 * active section changes so each one opens from its heading.
 */
export default function DocsPage({ section }: { section: DocsSectionId }) {
  const index = SECTIONS.findIndex((s) => s.id === section);
  const current = SECTIONS[index]!;
  const prev = index > 0 ? SECTIONS[index - 1] : null;
  const next = index < SECTIONS.length - 1 ? SECTIONS[index + 1] : null;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [section]);

  const Body = current.Body;

  return (
    <>
      <DocsHeader />
      <div className="mx-auto grid max-w-6xl gap-10 px-5 pt-28 pb-20 lg:grid-cols-[16rem_1fr]">
        <DocsSidebar active={section} />

        <main id="docs-content" className="min-w-0 max-w-3xl">
          <article>
            <Body />
          </article>

          <nav
            aria-label="Section pagination"
            className="mt-16 flex flex-col gap-4 border-t border-line pt-8 sm:flex-row sm:justify-between"
          >
            {prev ? (
              <a
                href={docsHref(prev.id)}
                className="group flex flex-col rounded-xl border border-line bg-paper-raised px-4 py-3 transition-colors hover:border-line-strong"
              >
                <span className="text-xs text-ink-faint">← Previous</span>
                <span className="text-sm font-semibold text-ink group-hover:text-brand-strong">
                  {prev.title}
                </span>
              </a>
            ) : (
              <span />
            )}
            {next ? (
              <a
                href={docsHref(next.id)}
                className="group flex flex-col rounded-xl border border-line bg-paper-raised px-4 py-3 text-right transition-colors hover:border-line-strong sm:items-end"
              >
                <span className="text-xs text-ink-faint">Next →</span>
                <span className="text-sm font-semibold text-ink group-hover:text-brand-strong">
                  {next.title}
                </span>
              </a>
            ) : (
              <span />
            )}
          </nav>
        </main>
      </div>
      <Footer />
    </>
  );
}
