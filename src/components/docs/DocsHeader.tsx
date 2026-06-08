/**
 * The fixed top bar for the documentation page: the logo (linking back to the
 * landing page), a "Docs" marker, and the npm and GitHub links. Unlike the
 * landing nav it carries a steady translucent background, since the docs always
 * scroll beneath it.
 */
export default function DocsHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <a
            href="#top"
            className="flex items-center gap-2.5"
            aria-label="License Wizard home"
          >
            <img
              src={`${import.meta.env.BASE_URL}logo-mark.png`}
              alt=""
              className="h-9 w-auto"
            />
            <span className="font-display text-lg font-bold tracking-tight text-ink">
              license <span className="text-brand">wizard</span>
            </span>
          </a>
          <span className="rounded-md border border-line-strong bg-paper-raised px-2 py-0.5 text-xs font-semibold tracking-wide text-ink-soft uppercase">
            Docs
          </span>
        </div>

        <div className="flex items-center gap-3">
          <a href="#top" className="nav-link hidden sm:inline">
            Home
          </a>
          <a
            href="https://www.npmjs.com/package/license-wizard"
            className="nav-link hidden sm:inline"
            target="_blank"
            rel="noopener"
          >
            npm
          </a>
          <a
            href="https://github.com/erdembircan/license-wizard"
            className="btn-ghost !px-4 !py-2 text-xs"
            target="_blank"
            rel="noopener"
          >
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 23.5 12C23.5 5.7 18.3.5 12 .5Z" />
            </svg>
            Star
          </a>
        </div>
      </div>
    </header>
  );
}
