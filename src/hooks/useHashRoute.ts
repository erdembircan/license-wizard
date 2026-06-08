import { useSyncExternalStore } from "react";
import { parseRoute, type Route } from "../lib/route";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function getSnapshot(): string {
  return window.location.hash;
}

/**
 * Subscribes to the URL hash and returns the current parsed route, re-rendering
 * the component whenever the hash changes.
 */
export function useHashRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getSnapshot, () => "");
  return parseRoute(hash);
}
