import { useEffect } from "react";

/**
 * Toggles the scrolled-state classes on the `#nav` element whenever the page
 * is scrolled past 12px, applying the backdrop blur, translucent background,
 * and bottom border once the user leaves the top of the page.
 */
export function useNavScroll(): void {
  useEffect(() => {
    const nav = document.getElementById("nav");
    if (!nav) return;
    const onScroll = (): void => {
      const scrolled = window.scrollY > 12;
      nav.classList.toggle("backdrop-blur-md", scrolled);
      nav.classList.toggle("bg-paper/80", scrolled);
      nav.classList.toggle("border-b", scrolled);
      nav.classList.toggle("border-line", scrolled);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
}
