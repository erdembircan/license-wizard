import { useEffect } from "react";

/**
 * After mount, observes every `[data-reveal]` element with an
 * IntersectionObserver and adds the `is-visible` class as each scrolls into
 * view, unobserving it afterwards. Falls back to revealing everything
 * immediately when IntersectionObserver is unavailable.
 */
export function useReveal(): void {
  useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}
