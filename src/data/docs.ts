import type { ComponentType } from "react";
import type { DocsSectionId } from "../lib/route";
import {
  Agents,
  ApplyConfig,
  Configuration,
  Flags,
  GettingStarted,
  Headers,
  Interactive,
  OneShot,
  Verify,
} from "../components/docs/sections";

export interface DocsSection {
  id: DocsSectionId;
  title: string;
  Body: ComponentType;
}

/** The docs sections, in sidebar order. */
export const SECTIONS: DocsSection[] = [
  { id: "getting-started", title: "Getting started", Body: GettingStarted },
  { id: "interactive", title: "Interactive wizard", Body: Interactive },
  { id: "one-shot", title: "One-shot generation", Body: OneShot },
  { id: "headers", title: "Source-file headers", Body: Headers },
  { id: "verify", title: "Verify & CI", Body: Verify },
  { id: "apply-config", title: "Apply saved config", Body: ApplyConfig },
  { id: "configuration", title: "Configuration files", Body: Configuration },
  { id: "agents", title: "Scripting & agents", Body: Agents },
  { id: "flags", title: "Flags reference", Body: Flags },
];
