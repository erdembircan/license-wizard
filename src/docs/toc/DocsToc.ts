/**
 * Scroll-spy for the documentation "On this page" navigation. The subsection
 * links are baked into the static page and work on their own (click to jump);
 * this progressively enhances them by highlighting the entry whose heading is
 * currently in view. It is a no-op on pages that have no subsection nav.
 */

const ACTIVE_CLASS = "is-active";

// Distance from the top of the viewport, in pixels, at which a heading counts
// as "current" — matched to the headings' scroll-margin-top (6rem) plus a
// little slack so a heading activates as it settles below the fixed topbar.
const ACTIVATION_OFFSET = 104;

/** Highlights the table-of-contents link whose heading is currently in view. */
export function initDocsToc(): void {
  const toc = document.querySelector<HTMLElement>(".docs-toc");
  if (!toc) return;

  const links = Array.from(
    toc.querySelectorAll<HTMLAnchorElement>(".docs-toc-link"),
  );
  if (links.length === 0) return;

  // Pair each link with its heading, in document order, dropping any link whose
  // target heading is missing from the page.
  const tracked = links
    .map((link) => {
      const id = link.dataset.tocTarget ?? "";
      const heading = id ? document.getElementById(id) : null;
      return heading ? { link, heading } : null;
    })
    .filter(
      (pair): pair is { link: HTMLAnchorElement; heading: HTMLElement } =>
        pair !== null,
    );
  if (tracked.length === 0) return;

  const setActive = (active: HTMLAnchorElement): void => {
    for (const { link } of tracked) {
      link.classList.toggle(ACTIVE_CLASS, link === active);
    }
  };

  // The current heading is the last one whose top has scrolled above the
  // activation line; near the bottom of the page nothing has, so we fall back
  // to the first. Recomputed from live geometry whenever an observed heading
  // crosses the activation band.
  const update = (): void => {
    let current = tracked[0]!;
    for (const pair of tracked) {
      if (pair.heading.getBoundingClientRect().top <= ACTIVATION_OFFSET) {
        current = pair;
      } else {
        break;
      }
    }
    setActive(current.link);
  };

  const observer = new IntersectionObserver(update, {
    // A thin band at the activation line — observers fire as each heading
    // enters or leaves it, which is exactly when the active entry can change.
    rootMargin: `-${ACTIVATION_OFFSET}px 0px -70% 0px`,
    threshold: [0, 1],
  });
  for (const { heading } of tracked) observer.observe(heading);

  update();
}
