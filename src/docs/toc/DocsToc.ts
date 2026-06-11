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
const ACTIVATION_OFFSET = 108;

// How long after the last scroll event a programmatic (smooth) anchor scroll
// counts as settled. Smooth scrolling emits a steady stream of scroll events;
// once they stop for this long, the animation is over.
const SETTLE_MS = 150;

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

  // The current heading, from live geometry: the last one whose top has
  // scrolled above the activation line. At the very bottom of the page the
  // final heading is current — with little content after it, it may never
  // reach the line at all.
  const update = (): void => {
    const doc = document.documentElement;
    const atBottom =
      window.scrollY + window.innerHeight >= doc.scrollHeight - 2;

    let current = tracked[0]!;
    if (atBottom) {
      current = tracked[tracked.length - 1]!;
    } else {
      for (const pair of tracked) {
        if (pair.heading.getBoundingClientRect().top <= ACTIVATION_OFFSET) {
          current = pair;
        } else {
          break;
        }
      }
    }
    setActive(current.link);
  };

  let frame = 0;
  const schedule = (): void => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      update();
    });
  };

  /*
   * Clicked (or deep-linked) entries win over the geometry. Clicking a link
   * starts a smooth programmatic scroll (scroll-behavior: smooth), and a
   * heading near the end of the page may be unable to reach the activation
   * line at all — on tall viewports the page simply cannot scroll that far, so
   * geometry alone would highlight the preceding entry. The clicked entry is
   * therefore pinned immediately; while the animation's scroll events stream
   * in, the spy is held off, and the pin dissolves once they settle. A real
   * user gesture (wheel, touch) hands control back to the spy at once.
   */
  let pinned = false;
  let settleTimer: ReturnType<typeof setTimeout> | null = null;

  const releasePin = (): void => {
    pinned = false;
    if (settleTimer !== null) {
      clearTimeout(settleTimer);
      settleTimer = null;
    }
  };

  const pinTo = (id: string): void => {
    const pair = tracked.find((p) => p.heading.id === id);
    if (!pair) return;
    pinned = true;
    setActive(pair.link);
  };

  for (const { link, heading } of tracked) {
    link.addEventListener("click", () => pinTo(heading.id));
  }
  // Covers the search palette deep-linking to a subsection on the same page.
  window.addEventListener("hashchange", () =>
    pinTo(window.location.hash.slice(1)),
  );

  window.addEventListener(
    "scroll",
    () => {
      if (pinned) {
        if (settleTimer !== null) clearTimeout(settleTimer);
        settleTimer = setTimeout(releasePin, SETTLE_MS);
        return;
      }
      schedule();
    },
    { passive: true },
  );

  const onUserGesture = (): void => {
    if (!pinned) return;
    releasePin();
    schedule();
  };
  window.addEventListener("wheel", onUserGesture, { passive: true });
  window.addEventListener("touchstart", onUserGesture, { passive: true });

  window.addEventListener("resize", schedule);

  // Arriving with a subsection hash starts pinned to it; otherwise the spy
  // decides from geometry.
  const hashId = window.location.hash.slice(1);
  if (hashId && tracked.some((p) => p.heading.id === hashId)) {
    pinTo(hashId);
  } else {
    update();
  }
}
