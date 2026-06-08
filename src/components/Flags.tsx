/**
 * Reference section listing every CLI flag in a two-column table.
 */
export default function Flags() {
  return (
    <section id="flags" className="mx-auto max-w-5xl scroll-mt-24 px-5 py-20">
      <div className="text-center" data-reveal>
        <p className="eyebrow">
          <span className="size-1.5 rounded-full bg-brand"></span>Reference
        </p>
        <h2 className="mt-5 font-display text-4xl font-bold tracking-tight text-ink">
          Available flags
        </h2>
        <p className="mt-4 text-lg text-ink-soft">
          Run <code className="flag-code">license-wizard --help</code> to print
          the same list from the CLI.
        </p>
      </div>

      <div
        className="mt-12 overflow-hidden rounded-2xl border border-line bg-paper-raised"
        data-reveal
      >
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-5 py-3.5 font-semibold">Flag</th>
              <th className="px-5 py-3.5 font-semibold">What it does</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            <tr>
              <td className="px-5 py-3.5 align-top">
                <code className="flag-code">--help</code>
              </td>
              <td className="px-5 py-3.5 text-ink-soft">
                Show the help message and exit.
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3.5 align-top">
                <code className="flag-code">--verify</code>
              </td>
              <td className="px-5 py-3.5 text-ink-soft">
                Check the{" "}
                <code className="font-mono text-[0.85em]">LICENSE</code> file,
                every manifest&apos;s license field (and the source-file
                headers, when configured) against the saved config, reconciling
                drift. Standalone mode.
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3.5 align-top">
                <code className="flag-code">--strict</code>
              </td>
              <td className="px-5 py-3.5 text-ink-soft">
                With <code className="font-mono text-[0.85em]">--verify</code>,
                fail on any drift instead of reconciling, for CI.
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3.5 align-top">
                <code className="flag-code">--license &lt;spdx-id&gt;</code>
              </td>
              <td className="px-5 py-3.5 text-ink-soft">
                Select a license by SPDX identifier and run non-interactively.
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3.5 align-top">
                <code className="flag-code">--set &lt;field=value&gt;</code>
              </td>
              <td className="px-5 py-3.5 text-ink-soft">
                Set a copyright field for the chosen license (repeatable).
                Implies non-interactive mode.
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3.5 align-top">
                <code className="flag-code">--save-rc</code>
              </td>
              <td className="px-5 py-3.5 text-ink-soft">
                Save the resolved config to{" "}
                <code className="font-mono text-[0.85em]">
                  .licensewizardrc.json
                </code>
                .
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3.5 align-top">
                <code className="flag-code">--save-npm</code>
              </td>
              <td className="px-5 py-3.5 text-ink-soft">
                Save to the{" "}
                <code className="font-mono text-[0.85em]">
                  &quot;license-wizard&quot;
                </code>{" "}
                field of{" "}
                <code className="font-mono text-[0.85em]">package.json</code>.
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3.5 align-top">
                <code className="flag-code">--save-composer</code>
              </td>
              <td className="px-5 py-3.5 text-ink-soft">
                Save to the{" "}
                <code className="font-mono text-[0.85em]">
                  &quot;license-wizard&quot;
                </code>{" "}
                field of{" "}
                <code className="font-mono text-[0.85em]">composer.json</code>.
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3.5 align-top">
                <code className="flag-code">--get-tokens</code>
              </td>
              <td className="px-5 py-3.5 text-ink-soft">
                List the copyright fields the selected license accepts and exit.
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3.5 align-top">
                <code className="flag-code">--headers &lt;short|full&gt;</code>
              </td>
              <td className="px-5 py-3.5 text-ink-soft">
                Also stamp SPDX license headers into source files:{" "}
                <code className="font-mono text-[0.85em]">short</code> (SPDX tag
                lines) or <code className="font-mono text-[0.85em]">full</code>{" "}
                (the standard notice). Implies non-interactive mode.
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3.5 align-top">
                <code className="flag-code">--headers-ignore &lt;glob&gt;</code>
              </td>
              <td className="px-5 py-3.5 text-ink-soft">
                Extra gitignore-style pattern to skip when writing headers, on
                top of the defaults and{" "}
                <code className="font-mono text-[0.85em]">.gitignore</code>{" "}
                (repeatable).
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3.5 align-top">
                <code className="flag-code">--remove-headers</code>
              </td>
              <td className="px-5 py-3.5 text-ink-soft">
                Strip License Wizard&apos;s headers from source files and drop
                the saved headers preference. Standalone mode.
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3.5 align-top">
                <code className="flag-code">--dry-run</code>
              </td>
              <td className="px-5 py-3.5 text-ink-soft">
                Preview the license and skip every write.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
