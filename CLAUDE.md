# CLAUDE.md

## Knowledge Base

`docs/knowledge-base/` contains reference material used to inform the design and implementation of license-wizard. Covers open source licensing concepts, SPDX standards, license file conventions, and data sources the tool relies on. This is background research — agents and contributors should consult it when making decisions about how the tool should behave.

## Architectural Charts

Charts in `docs/contracts/` are **contracts**, not implementation details. They define the authoritative picture of the application's architecture and the interactions between its modules. Treat them with the same weight as API contracts — they describe what the system is, not how it happens to be built right now.

### Content Rules

Charts show **contracts**, not internals:

- Show only **public APIs** — methods and properties that a class or module exposes to other modules
- **Never** include private methods, internal helpers, or implementation details
- Show **relationships**: associations, dependencies, composition, aggregation
- Show **hierarchy**: inheritance and interface implementation
- Mark **abstractions**: abstract classes and interfaces must be visually distinguished

### Keeping Charts Current

Charts must always reflect the current state of the software. Any change to the codebase that affects architecture, module interactions, data flow, or use case behavior **must** include a corresponding update to the relevant chart(s) in the same commit or PR. There are no exceptions — a chart that does not match the code is actively misleading.

Before closing out any implementation task, verify whether the change warrants a chart update. If it does and the chart has not been updated, the task is not done.

## Testing Philosophy

**Test behavior, not implementation.**

Tests verify that code works correctly for its consumers. Focus on **what** the code does, not **how** it does it internally.

### Core Rules

1. **Test through the public interface.** Never assert on private methods, internal state, or implementation details.
2. **Consumer-oriented.** When a component's consumer is another component, treat that consumer as the end user. Test what it sees and relies on.
3. **Implementation-proof.** If an implementation changes but behavior stays the same, tests MUST still pass.
4. **All code changes need tests.** New features, bug fixes, refactors.

### What to Assert

- Return values from public methods
- Side effects visible to consumers
- Exception/error behavior on invalid input
- Interface compliance

### What NOT to Assert

- Private property values or internal state
- Internal data structures or storage format
- Which private helper methods were called
- How a value was computed (only that the result is correct)

### Checklist Before Writing a Test

1. Am I testing a public method or observable side effect?
2. Would this test break if I refactored internals without changing behavior? If yes, rewrite the test.
3. Am I asserting the **result** or the **mechanism**? Assert the result.

## JSDoc

Classes and functions must be documented with JSDoc comments. Do **not** add JSDoc to types or interfaces — TypeScript makes them self-explanatory. Since the codebase uses TypeScript, also omit `@param {type}` and `@returns {type}` annotations. Descriptions only:

```ts
/**
 * Renders a question to the terminal using the Clack prompt library.
 *
 * @param question - The question to display.
 * @returns The user's answer.
 */
```

## File Naming

All source files under `src/` must use **CamelCase** (e.g. `ClackRenderer.ts`, `IRenderer.ts`, `QuestionType.ts`). This applies to every file regardless of what it exports — classes, interfaces, types, constants, or utilities.

## GitHub Workflow

You handle GitHub work for the user across three kinds of assignment: a single **task ID**, a single **PR ID**, or a **plain description** of a change (ad-hoc, no ID). Always **enter plan mode first**, present the plan for approval, then implement once approved.

## Working Guidelines

These rules apply to **all** work — task, PR, and ad-hoc:

- **Enter plan mode first**, present the plan for approval, then implement it directly once approved
- Once the implementation is complete and the project's checks (tests, typecheck, lint) all pass, **automatically commit, push, and open or update the PR** (open a new PR for task/ad-hoc work, push to the existing PR for PR work), then report the PR URL — do not stop to ask whether to proceed. When running as a background agent, report the PR URL as a `needs input:` signal (the PR awaits your review/approval), not a completion — see **Reporting Status (Background Agent Output)**
- Work on **one** unit of work at a time, in the order the user assigns them
- Read the assigned task/PR/description yourself, decide how to implement, and execute independently
- All automated comments and messages (PR descriptions, PR comments, task comments) must be prefixed with `[agent]` to distinguish this work from the user's own activity
- Follow all Git Commit Instructions and use the `gh` CLI for GitHub operations

## Reporting Status (Background Agent Output)

When this workflow runs as a **background agent**, the job's state is inferred **only** from a signal line in your **final message text** — not from tool output, PR/CI state, or anything you did. So you must choose your last line deliberately, or work that needs the user lands in the wrong place (typically silently marked done, so the user never gets pinged).

End every turn with exactly one of these signal lines, on its own line, self-contained (readable by someone who never saw the request), and including the PR/issue URL where relevant:

- **`needs input:`** — the turn finishes with the ball in the user's court and you cannot proceed alone. This is the **default terminal state** for task / ad-hoc / PR work, because:
  - A PR was **opened or updated and CI is green but it is not merged** — it awaits the user's review and approval (you may only merge with explicit approval, per **Merge rules**). Report it as `needs input:` with the PR URL, e.g. `needs input: PR #123 opened, CI green — awaiting your review/approval to merge <url>`.
  - You need a decision or clarification — e.g. an ID that could be an issue or a PR, or conflicting/ambiguous instructions.
- **`result:`** — only when the unit of work is fully delivered and needs **nothing further** from the user: the PR has been **merged**, or there was genuinely no actionable work (e.g. PR work with no new user feedback → nothing to do).
- **`failed:`** — the task is structurally impossible (wrong repo, missing access, false premise).

Opening a PR is **not** asking permission — keep auto-opening PRs as instructed below; this section only governs which *terminal signal* you end on. A PR awaiting review is `needs input:`, never `result:`.

## Git Workflow

Stage and commit files in logical groups (per Commit Granularity), then push to the branch's upstream remote. If no upstream is found, push to a new remote branch named per the convention below.

Committing, pushing, and opening PRs are **authorized and expected** as the natural completion of any work — do them automatically, without stopping to ask first.

- Branch naming convention:
  - **Task or PR work** (an issue or PR exists): `task/{issueNumber}`
  - **Ad-hoc work** (a plain description, no issue/PR ID): `{type}/{slug}` — the lowercased commit type as a prefix plus a short kebab-case description (e.g. `fix/autocomplete-config-default`)

### Commit Granularity

- Do not make one big commit when changes span multiple logical groups
- Group related changes together into smaller, focused commits based on their logical relationship
- Each commit should represent a single coherent unit of work
- When in doubt, prefer smaller commits over larger ones

### Commit Instructions — Conventional Commits

#### Commit Message Format

Use the following format for all commit messages:

```
[{TYPE}]: {description}
```

#### Commit Types

- **FEAT**: A new feature for the user
- **FIX**: A bug fix
- **DOCS**: Documentation only changes
- **STYLE**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- **REFACTOR**: A code change that neither fixes a bug nor adds a feature
- **PERF**: A code change that improves performance
- **TEST**: Adding missing tests or correcting existing tests
- **CHORE**: Changes to the build process or auxiliary tools and libraries such as documentation generation

#### Examples

```
[FEAT]: add user authentication system
[FIX]: resolve login redirect issue
[DOCS]: update API documentation
[STYLE]: fix code formatting
[REFACTOR]: restructure user service
[PERF]: improve database query performance
[TEST]: add unit tests for payment module
[CHORE]: update dependencies
```

#### **IMPORTANT**

**DO NOT INCLUDE AI TOOL CREDITS OR CO-AUTHORSHIP ATTRIBUTION IN COMMIT MESSAGES**

#### Guidelines

- Don't list extra changes or explanations in the commit message after the main description
- Use the imperative mood in the description ("add" not "added" or "adds")
- Don't capitalize the first letter of the description
- Capitalize the type (feat, fix, etc.)
- No period at the end of the description
- Keep the description concise (50 characters or less is ideal)
- After making a commit, explain to the user your reasoning behind choosing the commit type and description

## GitHub

- For any GitHub operation (PRs, issues, releases, checks, repos, projects, etc.), always prefer the `gh` CLI first if it supports the action
- `gh pr merge --squash` includes all branch commits in the merge body by default — always pass `--body ""` to keep squash merge commits clean
- When reporting PR or issue activity (opened, merged, updated, etc.), always include the full GitHub URL as a clickable markdown link

### Issue Creation

- Title must follow the commit message format: `[TYPE]: description` (e.g. `[FEAT]: add rate limiting to auth endpoint`)
- Body contains exactly what the user stated — no more, no less. Do not infer motivation, add structure, or fill in details the user did not provide

## Worktree Isolation

The user runs other agents in parallel on other tasks and PRs, so you **must** isolate all work in its own git worktree — never work directly in the main checkout, and **never `cd` to the main repo directory for any git operation**. The main repo tracks `master`; running git commands there will corrupt it and collide with other agents' work.

- Use the **`EnterWorktree` tool** to create your isolated worktree before making any changes — it places the worktree under `.claude/worktrees/<name>` and auto-cleans it on exit. Pass a descriptive `name` (e.g. the issue number or slug)
- `EnterWorktree` names the **local** branch `worktree-<name>`; that name does **not** need to match the branch convention. Always push to the convention branch on the remote with `git push origin HEAD:<branch>` (remote `<branch>` = `task/{issueNumber}` or `{type}/{slug}`), which keeps the remote branch and PR on convention regardless of the local name
- All git commands must run in the **current working directory** (your worktree). Do not prefix them with `cd /path/to/main/repo`
- **PR work** (existing remote branch): after creating the worktree with `EnterWorktree`, load the PR's branch with `git fetch origin <branch> && git reset --hard origin/<branch>` — `EnterWorktree` starts a fresh branch, so this step pulls in the existing PR content
- Never `git checkout`/`git switch` to an **existing** branch (e.g. `master` or a PR branch) — if it is already checked out elsewhere, git will refuse and you may fall back to the main directory. Creating a fresh worktree via `EnterWorktree` is always safe

## Task Workflow

Tasks are GitHub Issues managed in the GitHub project associated with the repo. The user assigns task work by giving you a single **task ID**. Task, PR, and ad-hoc work are three separate operations — never mix them. If it is unclear whether an ID refers to an issue or a PR, ask before proceeding (they share GitHub's number space).

**Plan phase** (in plan mode):

1. Fetch the assigned issue and its details — read-only; do not create a worktree or make changes yet
2. Present your implementation plan and wait for approval

**Implementation phase** (after approval):

1. Isolate in a worktree using the **`EnterWorktree`** tool (creates it under `.claude/worktrees/`); push your work to the remote `task/{issueNumber}` branch with `git push origin HEAD:task/{issueNumber}`
2. Move the task to **In Progress** status
3. Implement the task in the worktree
4. Open a PR with `Closes #<issueNumber>` in the description, then move the task to **In Review** status
5. Wait for all CI checks via `gh run watch` — if any fail, fix and push again until CI is green

## PR Workflow

The user assigns PR work by giving you a single **PR ID**. You are an **implementer, not a reviewer** — never summarize or review a PR.

**Plan phase** (in plan mode):

1. Read the PR and **all** feedback from the user (non-`[agent]`) from **three** distinct sources — they do not overlap, so check each:
   - PR-level comments: `gh pr view <number> --comments`
   - File-level review comments: `gh api repos/{owner}/{repo}/pulls/<number>/comments`
   - Review summary bodies: `gh api repos/{owner}/{repo}/pulls/<number>/reviews` — read each review's `body` and `state`, filtering by `user.login` to exclude `[agent]`/bot reviews
   - None includes the others; approvals like "LGTM" often arrive in the review body
2. If there is no new user feedback across **all three** sources since the last `[agent]` comment, do nothing and exit immediately — no plan, no worktree, no comment
3. Otherwise, present a plan covering the unaddressed comments and wait for approval

**Implementation phase** (after approval):

1. Isolate in a worktree using the **`EnterWorktree`** tool, then inside it run `git fetch origin <branch> && git reset --hard origin/<branch>` to load the PR's existing branch (`EnterWorktree` starts a fresh branch)
2. Implement what the unaddressed comments ask for
3. After pushing, check for merge conflicts before waiting on CI — `gh pr view <number> --json mergeable`; if `"CONFLICTING"`, rebase onto master (`git fetch origin master && git rebase origin/master`), resolve, force-push, then wait for CI. Don't `gh run watch` a conflicting branch — CI never starts
4. Wait for all CI checks via `gh run watch` — fix and push until green
5. Post a comment reporting what was done
6. After merge, if a CI workflow commits build artifacts back to the default branch, wait for those runs to finish (`gh run watch`) before syncing — otherwise you'll miss that commit. Then sync with `git fetch origin master`

### Merge rules

- **You may only merge a PR when the user has explicitly approved it.** Approval is satisfied by **either**:
  - an explicit approval phrase (e.g. "LGTM", "go ahead and merge") in **any** of the three feedback sources; **or**
  - a user-submitted review with `state == APPROVED`, even with an empty body (a bare "Approve" click counts)
- Approvals frequently arrive in the review summary body — check it explicitly; never conclude a PR is unapproved without reading review bodies and states
- No other source of merge authorization is valid — not your own judgment. The instruction must come from the user (non-`[agent]`) on the PR itself
- Always use **squash merge** — implementation details live on the branch, master only needs the final result
- When squash merging, use only the PR title as the commit message with no body: `gh pr merge --squash --subject "PR title (#number)" --body ""`
- Until that approval arrives, an open PR with green CI is **not** done — its terminal state is `needs input:` (awaiting your review/approval), per **Reporting Status (Background Agent Output)**. Use `result:` only once the PR is merged

## Ad-hoc Work

The user assigns ad-hoc work by describing a change in plain text, with **no** issue or PR ID. There is no GitHub issue to fetch or move through statuses, but otherwise the lifecycle mirrors **Task Workflow**.

**Plan phase** (in plan mode):

1. Plan directly from the user's description — there is no issue to fetch
2. Present your implementation plan and wait for approval

**Implementation phase** (after approval):

1. Isolate in a worktree using the **`EnterWorktree`** tool (creates it under `.claude/worktrees/`); push your work to the remote `{type}/{slug}` branch with `git push origin HEAD:{type}/{slug}`
2. Implement the change in the worktree
3. Once the work is complete and the project's checks all pass, **automatically commit, push the branch, and open a PR** — do not stop to ask. The PR has no `Closes #` line (there is no issue). Report the PR URL (as a `needs input:` signal when running as a background agent — see **Reporting Status (Background Agent Output)**)
4. Wait for all CI checks via `gh run watch` — fix and push until green
