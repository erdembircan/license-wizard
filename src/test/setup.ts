import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest does not enable `globals`, so testing-library's automatic
// afterEach cleanup is not registered — unmount each render explicitly so
// rendered components do not leak across tests.
afterEach(() => {
  cleanup();
});
