import { docsHref, type DocsSectionId } from "../../lib/route";
import { SECTIONS } from "../../data/docs";

/**
 * The docs navigation: a sticky list of every section on desktop, and a
 * horizontally scrollable strip on small screens. The active section is
 * highlighted from the current route.
 */
export default function DocsSidebar({ active }: { active: DocsSectionId }) {
  return (
    <nav
      aria-label="Documentation sections"
      className="lg:sticky lg:top-24 lg:self-start"
    >
      <p className="hidden px-3 pb-2 text-xs font-semibold tracking-wide text-ink-faint uppercase lg:block">
        Documentation
      </p>
      <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
        {SECTIONS.map((section) => {
          const isActive = section.id === active;
          return (
            <li key={section.id} className="shrink-0">
              <a
                href={docsHref(section.id)}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "block rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-brand-soft text-brand-strong"
                    : "text-ink-soft hover:bg-paper-raised hover:text-ink",
                ].join(" ")}
              >
                {section.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
