/**
 * Site footer with the logo, copyright line (current year rendered
 * dynamically, author name linking to the author's homepage), and links
 * to GitHub and npm.
 */
export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 py-10 md:flex-row">
        <div className="flex items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}logo-mark.png`}
            alt="License Wizard"
            className="h-8 w-auto"
          />
          <span className="text-sm text-ink-faint">
            Apache-2.0 © {new Date().getFullYear()}{" "}
            <a
              href="https://erdembircan.github.io"
              target="_blank"
              rel="noopener"
              className="nav-link"
            >
              Erdem Bircan
            </a>
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-7 gap-y-2 text-sm">
          <a
            href="https://github.com/erdembircan/license-wizard"
            target="_blank"
            rel="noopener"
            className="nav-link"
          >
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/license-wizard"
            target="_blank"
            rel="noopener"
            className="nav-link"
          >
            npm
          </a>
        </nav>
      </div>
    </footer>
  );
}
