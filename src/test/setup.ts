import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom does not implement scroll methods; stub them so components that scroll
// on mount (e.g. the docs page) run cleanly under test.
window.scrollTo = vi.fn();

// Vitest does not enable `globals`, so testing-library's automatic
// afterEach cleanup is not registered — unmount each render explicitly so
// rendered components do not leak across tests.
afterEach(() => {
  cleanup();
});
