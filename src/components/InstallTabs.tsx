import { useState } from "react";
import CopyButton from "./CopyButton";
import { PackageManagerIcon } from "./PackageManagerIcon";
import {
  PACKAGE_MANAGERS,
  type PackageManagerId,
} from "../data/packageManagers";

/**
 * The hero install widget: a row of package-manager tabs (npm · pnpm · yarn ·
 * bun), each fronted by its brand glyph, over a single copy-field that shows
 * the run command for the selected manager. Switching tabs swaps the command
 * and the text the copy button hands to the clipboard.
 */
export default function InstallTabs() {
  const [active, setActive] = useState<PackageManagerId>(
    PACKAGE_MANAGERS[0]!.id,
  );
  const current = PACKAGE_MANAGERS.find((pm) => pm.id === active)!;

  return (
    <div className="install-tabs">
      <div
        className="install-tabs-row"
        role="tablist"
        aria-label="Package manager"
      >
        {PACKAGE_MANAGERS.map((pm) => (
          <button
            key={pm.id}
            type="button"
            role="tab"
            id={`install-tab-${pm.id}`}
            aria-selected={pm.id === active}
            aria-controls="install-command"
            className="install-tab"
            onClick={() => setActive(pm.id)}
          >
            <PackageManagerIcon id={pm.id} className="install-tab-icon" />
            {pm.label}
          </button>
        ))}
      </div>

      <div
        className="copy-field"
        id="install-command"
        role="tabpanel"
        aria-labelledby={`install-tab-${active}`}
      >
        <span className="truncate">
          <span
            className="t-accent select-none"
            style={{ color: "var(--color-brand)" }}
          >
            $
          </span>{" "}
          {current.command}
        </span>
        <CopyButton
          text={current.command}
          label={`Copy ${current.label} command`}
        />
      </div>
    </div>
  );
}
