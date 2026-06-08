import {
  Cmd,
  Code,
  FlagTable,
  H2,
  H3,
  LI,
  List,
  Note,
  P,
  Sample,
} from "./DocsKit";

/* -------------------------------------------------------------------------- */
/*  Getting started                                                            */
/* -------------------------------------------------------------------------- */
export function GettingStarted() {
  return (
    <>
      <H2 id="getting-started">Getting started</H2>
      <P>
        License Wizard picks an open-source license, pulls its canonical SPDX
        text, fills in your copyright details, writes a proper{" "}
        <Code>LICENSE</Code> file, and records the choice back into your project
        manifests so the declared license and the file on disk always agree.
      </P>
      <P>Run it directly — no install required:</P>
      <Cmd>npx license-wizard</Cmd>
      <P>Or install it globally and run it in any project directory:</P>
      <Cmd>npm install -g license-wizard</Cmd>

      <H3>What a run produces</H3>
      <List>
        <LI>
          A <Code>LICENSE</Code> file in the current directory, containing the
          official text of the license you chose.
        </LI>
        <LI>
          The selected SPDX identifier written into the <Code>license</Code>{" "}
          field of every manifest it finds (<Code>package.json</Code>,{" "}
          <Code>composer.json</Code>).
        </LI>
        <LI>
          Optionally, a small saved configuration so future runs start from your
          last choice, and per-file license headers across your source.
        </LI>
      </List>

      <H3>Requirements</H3>
      <List>
        <LI>
          <Code>Node.js &gt;= 22.13.0</Code>
        </LI>
        <LI>
          Network access — license text is fetched from the official SPDX list,
          so every file you generate matches the canonical source exactly.
        </LI>
      </List>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Interactive wizard                                                         */
/* -------------------------------------------------------------------------- */
export function Interactive() {
  return (
    <>
      <H2 id="interactive">Interactive wizard</H2>
      <P>
        Run the command from the root of the project you want to license and
        you'll be guided through a short flow:
      </P>
      <Cmd>npx license-wizard</Cmd>
      <List>
        <LI>
          <strong className="text-ink">Choose a license.</strong> Start typing
          to search the full SPDX catalog (e.g. <Code>MIT</Code>,{" "}
          <Code>Apache-2.0</Code>, <Code>GPL-3.0-or-later</Code>) and select
          one. If your project already declares a license, it's offered as the
          default.
        </LI>
        <LI>
          <strong className="text-ink">Standard or customized.</strong> If the
          license has fillable copyright fields, keep the official text verbatim
          or fill in each field — typically the copyright holder and year.
        </LI>
        <LI>
          <strong className="text-ink">Save your settings.</strong> Choose
          whether to remember your selection for next time.
        </LI>
      </List>
      <P>
        When you're done, License Wizard writes the <Code>LICENSE</Code> file
        and records the selected identifier in every manifest it finds. If you
        opted in, it also offers to stamp{" "}
        <a href="#/docs/headers" className="text-brand hover:underline">
          source-file headers
        </a>
        .
      </P>
      <Note>
        Prefer to skip the prompts? Every step has a flag equivalent — see{" "}
        <a href="#/docs/one-shot" className="text-brand hover:underline">
          one-shot generation
        </a>{" "}
        and{" "}
        <a href="#/docs/agents" className="text-brand hover:underline">
          scripting &amp; agents
        </a>
        .
      </Note>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  One-shot generation                                                        */
/* -------------------------------------------------------------------------- */
export function OneShot() {
  return (
    <>
      <H2 id="one-shot">One-shot generation</H2>
      <P>
        Passing <Code>--license</Code>, <Code>--set</Code>, or{" "}
        <Code>--get-tokens</Code> runs License Wizard as a single command — no
        prompts — so it fits cleanly into scripts and CI. Generate a license in
        one shot:
      </P>
      <Cmd>npx license-wizard --license MIT</Cmd>
      <P>
        This writes the official MIT text to <Code>LICENSE</Code> and records{" "}
        <Code>MIT</Code> in every manifest present.
      </P>

      <H3>Customizing copyright fields</H3>
      <P>
        Some licenses have fillable fields such as the year and copyright
        holder. List the fields a license accepts, then supply each one with a
        repeatable <Code>--set "field=value"</Code>:
      </P>
      <Cmd>npx license-wizard --license MIT --get-tokens</Cmd>
      <Cmd>
        npx license-wizard --license MIT --set "year=2026" --set "copyright
        holders=Erdem Bircan"
      </Cmd>
      <P>
        A field may be named by its label (e.g. <Code>year</Code>,
        case-insensitive) or its bracket token (e.g. <Code>&lt;year&gt;</Code>).
        Omit <Code>--set</Code> to write the official text unchanged.
      </P>
      <Note>
        If you start customizing but leave out a required field, License Wizard
        writes nothing — it lists the missing fields and exits non-zero, so you
        (or a calling agent) know exactly what to provide.
      </Note>

      <H3>Unrecognized identifiers</H3>
      <P>
        SPDX identifiers are exact — <Code>apache-2-0</Code> is not{" "}
        <Code>Apache-2.0</Code>. On a typo, License Wizard reports that no
        license matches, suggests the closest identifiers, and exits non-zero
        rather than failing with a stack trace.
      </P>

      <H3>Previewing without writing</H3>
      <P>
        Add <Code>--dry-run</Code> to any run to print the license that would be
        generated and a summary of the writes that were skipped — no{" "}
        <Code>LICENSE</Code>, config, or manifest changes are made. It works in
        the interactive wizard too.
      </P>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Source-file headers                                                        */
/* -------------------------------------------------------------------------- */
export function Headers() {
  return (
    <>
      <H2 id="headers">Source-file headers</H2>
      <P>
        Beyond the <Code>LICENSE</Code> file, License Wizard can stamp a
        per-file license header at the top of your source files — the short
        notice many licenses ask you to add to each file. The interactive wizard
        offers this after the license is chosen; non-interactively, pass{" "}
        <Code>--headers</Code> with a style:
      </P>
      <Cmd>npx license-wizard --license MIT --headers short --save-npm</Cmd>

      <H3>Two styles</H3>
      <List>
        <LI>
          <Code>short</Code> writes the canonical SPDX tag lines (
          <Code>SPDX-License-Identifier:</Code>, plus{" "}
          <Code>SPDX-FileCopyrightText:</Code> when you've filled in copyright
          fields). Available for <strong className="text-ink">every</strong>{" "}
          license.
        </LI>
        <LI>
          <Code>full</Code> writes the license's complete standard header
          notice, with your copyright fields substituted. Available only for
          licenses that publish one (Apache-2.0, the GPL family, MPL-2.0, …).
          For a license without a standard header (MIT, BSD, ISC, …), only{" "}
          <Code>short</Code> applies.
        </LI>
      </List>
      <P>
        The header reuses whatever copyright values you chose for the{" "}
        <Code>LICENSE</Code> text — it's never asked for separately.
      </P>

      <H3>What gets a header</H3>
      <P>
        Only the source files the npm and Composer ecosystems use:{" "}
        <Code>.js</Code>, <Code>.jsx</Code>, <Code>.mjs</Code>,{" "}
        <Code>.cjs</Code>, <Code>.ts</Code>, <Code>.tsx</Code>,{" "}
        <Code>.cts</Code>, <Code>.mts</Code>, and <Code>.php</Code>. JSON,
        stylesheets, markdown, and generated output are left alone. Dependencies
        (<Code>node_modules/</Code>, <Code>vendor/</Code>), <Code>.git/</Code>,
        and everything your <Code>.gitignore</Code> excludes are skipped
        automatically — add more with a repeatable{" "}
        <Code>--headers-ignore &lt;glob&gt;</Code>. A <Code>#!</Code> shebang
        stays on top, and the header sits inside PHP's <Code>&lt;?php</Code>{" "}
        tag.
      </P>

      <H3>Safe to re-run</H3>
      <P>
        License Wizard owns the headers it writes. Running it again over an
        unchanged project changes nothing; switching licenses updates the
        existing header in place rather than stacking a second one; and{" "}
        <a href="#/docs/verify" className="text-brand hover:underline">
          verification
        </a>{" "}
        keeps them current. A notice you wrote by hand is always left untouched.
      </P>

      <H3>Removing headers</H3>
      <P>
        To take the headers back out, pass <Code>--remove-headers</Code>. It
        strips every header License Wizard added and drops the headers
        preference from your saved config, so verification stops checking that
        surface. It honors <Code>--headers-ignore</Code> and{" "}
        <Code>--dry-run</Code>, and your hand-written notices stay put.
      </P>
      <Cmd>npx license-wizard --remove-headers</Cmd>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Verify & CI                                                                */
/* -------------------------------------------------------------------------- */
export function Verify() {
  return (
    <>
      <H2 id="verify">Verify &amp; CI</H2>
      <P>
        Once a configuration is saved, <Code>--verify</Code> checks that your
        project still matches the license you chose — that the{" "}
        <Code>LICENSE</Code> file is the official, up-to-date text, that every
        manifest's <Code>license</Code> field carries the right identifier, and,
        when you opted into them, that your source-file headers are present and
        current.
      </P>
      <Cmd>npx license-wizard --verify</Cmd>
      <P>
        By default, verification{" "}
        <strong className="text-ink">self-heals</strong>: anything out of sync —
        an edited copyright line, a stale <Code>LICENSE</Code>, a hand-changed
        manifest field, a source file missing its header — is brought back in
        line with the license you chose. When nothing has drifted, it confirms
        and exits zero.
      </P>

      <H3>Strict mode for CI</H3>
      <P>
        Add <Code>--strict</Code> to make any mismatch an error instead: License
        Wizard leaves everything untouched, lists each surface that drifted, and
        exits non-zero so the pipeline stops. A passing run exits zero, making
        it a drop-in check step:
      </P>
      <Sample lang="yaml">{`- name: Check the license is in sync
  run: npx license-wizard --verify --strict`}</Sample>
      <Note>
        Verification reads only your saved configuration — the{" "}
        <Code>.licensewizardrc.json</Code> file first, then the manifests. Both
        a <Code>LICENSE</Code> file and a saved configuration must exist, or it
        reports the problem and exits non-zero.
      </Note>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Apply saved config                                                         */
/* -------------------------------------------------------------------------- */
export function ApplyConfig() {
  return (
    <>
      <H2 id="apply-config">Apply saved config</H2>
      <P>
        When a configuration is already saved, <Code>--apply-config</Code>{" "}
        regenerates the project from it in one shot — no prompts, no selection
        flags. It rewrites the <Code>LICENSE</Code> from the saved license and
        copyright fields, records the identifier in every manifest present, and,
        when the config opted into them, re-stamps the source-file headers in
        the saved style.
      </P>
      <Cmd>npx license-wizard --apply-config</Cmd>
      <P>
        This is the complement of saving: one run records your choice, the other
        replays it — handy for restoring a project's license state in CI or
        after a fresh checkout. If no configuration is found, it reports the
        problem and exits non-zero rather than generating something you didn't
        ask for. Add <Code>--dry-run</Code> to preview the regeneration without
        writing.
      </P>
      <Cmd>npx license-wizard --apply-config --dry-run</Cmd>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Configuration files                                                        */
/* -------------------------------------------------------------------------- */
export function Configuration() {
  return (
    <>
      <H2 id="configuration">Configuration files</H2>
      <P>
        License Wizard can remember your license choice so later runs start from
        a known default and verification has something to check against.
        Configuration is read from one of two places, in order of precedence:
      </P>
      <List>
        <LI>
          <Code>.licensewizardrc.json</Code> in the project root.
        </LI>
        <LI>
          The <Code>license-wizard</Code> field of <Code>package.json</Code> —
          the fallback when no rc file is present.
        </LI>
      </List>
      <P>
        The saved config holds the license id, any copyright field values, and —
        when you opted into source-file headers — the header style, which is
        what tells <Code>--verify</Code> to check that surface:
      </P>
      <Sample lang="jsonc">{`{
  "licenseId": "Apache-2.0",
  "tokens": {
    "[yyyy]": "2026",
    "[name of copyright owner]": "Erdem Bircan"
  },
  "headers": { "style": "full" }
}`}</Sample>
      <P>
        Saving is opt-in. In the wizard, choose to remember your selection; in a
        script, pass exactly one <Code>--save-*</Code> flag —{" "}
        <Code>--save-rc</Code>, <Code>--save-npm</Code>, or{" "}
        <Code>--save-composer</Code>. Saving writes to one location and clears
        the configuration from the others, so there's only ever one source of
        truth.
      </P>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Scripting & agents                                                         */
/* -------------------------------------------------------------------------- */
export function Agents() {
  return (
    <>
      <H2 id="agents">Scripting &amp; agents</H2>
      <P>
        The same predictable flow that guides a human drives cleanly from
        scripts, CI, and AI agents. Any of <Code>--license</Code>,{" "}
        <Code>--set</Code>, or <Code>--get-tokens</Code> switches off the
        prompts and runs as a single command, and the standalone modes (
        <Code>--verify</Code>, <Code>--apply-config</Code>,{" "}
        <Code>--remove-headers</Code>) never prompt at all.
      </P>

      <H3>Exit codes are the contract</H3>
      <P>
        Every run signals its outcome through its exit code, so a script or
        agent always knows what happened without parsing output:
      </P>
      <List>
        <LI>
          A successful generation, a clean <Code>--verify</Code>, or a healed
          run exits <Code>0</Code>.
        </LI>
        <LI>
          A missing required field, an unrecognized identifier, a{" "}
          <Code>--verify --strict</Code> run that found drift, or a standalone
          mode with nothing to act on exits non-zero — and prints exactly what's
          wrong.
        </LI>
      </List>

      <H3>Standalone modes take priority</H3>
      <P>
        <Code>--apply-config</Code> and <Code>--remove-headers</Code> are
        standalone: when combined with selection flags like{" "}
        <Code>--license</Code>, the standalone mode wins. This means an agent
        can pass a saved config replay without worrying that a stray{" "}
        <Code>--license</Code> will override it.
      </P>
      <Note>
        Tell your agent to use License Wizard and it will: the flags are
        explicit, the failures are descriptive, and nothing is written until
        every required field is present.
      </Note>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Flags reference                                                            */
/* -------------------------------------------------------------------------- */
export function Flags() {
  return (
    <>
      <H2 id="flags">Flags reference</H2>
      <P>
        The complete flag list. Run <Code>npx license-wizard --help</Code> to
        print the same reference from the CLI.
      </P>
      <FlagTable
        rows={[
          { flag: "--help", description: "Show the help message and exit." },
          {
            flag: "--verify",
            description:
              "Check the LICENSE file, every manifest's license field, and (when configured) the source-file headers against your saved configuration, reconciling any drift. Standalone mode.",
          },
          {
            flag: "--strict",
            description:
              "With --verify, fail on any drift instead of reconciling it — for CI.",
          },
          {
            flag: "--apply-config",
            description:
              "Regenerate the LICENSE, manifest fields, and configured headers from the saved config; errors if none exists. Standalone — takes priority over selection flags; honors --dry-run.",
          },
          {
            flag: "--license <spdx-id>",
            description:
              "Select a license by its SPDX identifier and run non-interactively.",
          },
          {
            flag: "--set <field=value>",
            description:
              "Set a copyright field for the chosen license (repeatable). Implies non-interactive mode.",
          },
          {
            flag: "--save-rc",
            description:
              "Save the resolved config to .licensewizardrc.json. Implies non-interactive mode.",
          },
          {
            flag: "--save-npm",
            description:
              "Save the resolved config to the license-wizard field of package.json (must exist).",
          },
          {
            flag: "--save-composer",
            description:
              "Save the resolved config to the license-wizard field of composer.json (must exist).",
          },
          {
            flag: "--get-tokens",
            description:
              "List the copyright fields the selected license accepts (requires --license) and exit.",
          },
          {
            flag: "--headers <short|full>",
            description:
              "Also write SPDX license headers into source files — short (tag lines) or full (the standard notice).",
          },
          {
            flag: "--headers-ignore <glob>",
            description:
              "Extra gitignore-style pattern to skip when writing headers, on top of the defaults and .gitignore (repeatable).",
          },
          {
            flag: "--remove-headers",
            description:
              "Strip License Wizard's headers and drop the saved headers preference. Standalone; takes priority over --headers; honors --headers-ignore and --dry-run.",
          },
          {
            flag: "--dry-run",
            description:
              "Preview the license (and, with --headers, a sample block and the files it would touch) and skip every write.",
          },
        ]}
      />
    </>
  );
}
