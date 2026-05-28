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

## Git Workflow

Stage and commit files in logical groups (per Commit Granularity rules), then push to the branch's upstream remote. If no upstream is found, push to a new remote branch named per the convention below.

Committing, pushing, and opening PRs are **authorized and expected** as the natural completion of any work — do them automatically, without stopping to ask for confirmation first. This **overrides** the default "commit or push only when asked / confirm outward-facing actions first" behavior: in this repo, delivering the work *means* committing it, pushing it, and opening the PR. Do not stop after the work is green to ask whether to commit or open a PR.

- Branch naming convention:
  - **Task or PR work** (an issue or PR exists): `task/{issueNumber}`
  - **Ad-hoc work** (a plain description with no issue/PR ID): `{type}/{slug}` — the lowercased commit type as a prefix plus a short kebab-case description (e.g. `fix/autocomplete-config-default`)

### Commit Granularity

- Do not make one big commit when changes span multiple logical groups
- Group related changes together into smaller, focused commits based on their logical relationship (e.g., separate a new utility function from the feature that uses it, or separate a refactor from a bug fix)
- Each commit should represent a single coherent unit of work
- When in doubt, prefer smaller commits over larger ones

### Commit Instructions - Conventional Commits

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
- Add `[skip ci]` to the commit message for documentation-only changes (e.g. DOCS commits) to avoid triggering CI unnecessarily
- After making a commit, explain to the user your reasoning behind choosing the commit type and description

## GitHub

- For any GitHub-related operation (PRs, issues, releases, checks, repos, projects, etc.), always prefer the `gh` CLI first if it supports the action
- `gh pr merge --squash` includes all branch commits in the merge body by default — always pass `--body ""` to keep squash merge commits clean
- When reporting PR or issue activity to the user (opened, merged, updated, etc.), always include the full GitHub URL as a clickable markdown link so the user can navigate directly from the terminal

### Issue Creation

- Title must follow the commit message format: `[TYPE]: description` (e.g. `[FEAT]: add rate limiting to auth endpoint`)
- Body contains exactly what the user stated — no more, no less. Do not infer motivation, add structure, or fill in details the user did not provide

## Working Guidelines

These rules apply to **all** work — task, PR, and ad-hoc:

- The user assigns work in one of three ways: a single **task ID**, a single **PR ID**, or a **plain description** of a change (ad-hoc work, with no ID). Do **not** spawn sub-agents or delegate — you do the work yourself, directly in this session
- **Enter plan mode first**, present the plan for approval, then implement it directly once approved
- Once the implementation is complete and tests, typecheck, and lint are all green, **automatically commit, push, and open or update the PR** (per the relevant workflow below — open a new PR for task/ad-hoc work, push to the existing PR for PR work), then report the PR URL — do not stop to ask whether to proceed
- Work on **one** unit of work at a time, in the order the user assigns them
- Read the assigned task/PR/description yourself, decide how to implement, and execute independently
- All automated comments and messages (PR descriptions, PR comments, task comments) must be prefixed with `[agent]` to distinguish this work from the user's own activity
- Follow all Git Commit Instructions and use the `gh` CLI for GitHub operations

## Worktree Isolation

The user runs other agents in parallel on other tasks and PRs, so you **must** isolate all of your work in its own git worktree — never work directly in the main checkout, and **never `cd` to the main repo directory for any git operation**. The main repo tracks `master`, and running git commands there will corrupt it and collide with the other agents' work.

- Create or enter a worktree before making any changes for a task or PR
- All git commands must run in the **current working directory** (your worktree). Do not prefix them with `cd /path/to/main/repo`
- To create a worktree on a **new** branch (task work): `git worktree add <path> -b <new-branch> origin/master` — cutting a fresh branch like this is expected and is **not** prohibited by the rule below
- To get an **existing** branch into your worktree (PR work): `git fetch origin <branch> && git reset --hard origin/<branch>`
- To push changes back: `git push origin HEAD:<branch>`
- Never `git checkout`/`git switch` to an **existing** branch (e.g. `master` or a PR branch) — if it is already checked out in the main repo or another worktree, git will refuse it and you may fall back to the main directory. This does not apply to creating a new branch, which is always safe

## Task Workflow

Tasks are GitHub Issues managed in the GitHub project associated with this repo.

**Task work, PR work, and ad-hoc work are three separate operations**, triggered by explicit user statements. Task work means implementing an issue and opening a PR. PR work means responding to comments on an existing PR. Ad-hoc work means implementing a change described in plain text, with no issue or PR — see **Ad-hoc Work** below. Never mix these roles. Task and PR work each come with a single ID; ad-hoc work has no ID. If it is unclear whether an ID refers to an issue or a PR, ask before proceeding — issues and PRs share GitHub's number space.

The user assigns task work by giving you a single **task ID**.

**Plan phase** (in plan mode):

1. Fetch the assigned issue and its details from the GitHub project — this is read-only; do not create a worktree or make changes yet
2. Present your implementation plan and wait for approval

**Implementation phase** (only after the plan is approved):

1. **Isolate in a worktree**: per **Worktree Isolation**, create a worktree on a new `task/{issueNumber}` branch cut from the latest master — e.g. `git fetch origin master` then `git worktree add <path> -b task/{issueNumber} origin/master`. Do not work at the project root and do not `git checkout master`
2. Move the task to **In Progress** status
3. Implement the task in the worktree
4. Open a PR with `Closes #<issueNumber>` in the description, then move the task to **In Review** status
5. After opening the PR, wait for all CI checks to finish using `gh run watch` — if any fail, fix the failures and push again, repeating until CI is green

## PR Workflow

The user assigns PR work by giving you a single **PR ID**. You are an **implementer, not a reviewer** — never summarize or review a PR.

**Plan phase** (in plan mode):

1. Read the PR and **all** feedback from the user (non-`[agent]`) from **three** distinct sources — they do not overlap, so you must check each one:
   - PR-level comments: `gh pr view <number> --comments`
   - File-level review comments (attached to specific diff lines): `gh api repos/{owner}/{repo}/pulls/<number>/comments`
   - Review summary bodies (the free-text box submitted with an Approve / Request changes / Comment review): `gh api repos/{owner}/{repo}/pulls/<number>/reviews` — read each review's `body` and `state`, and filter by `user.login` to exclude `[agent]`/bot reviews, exactly as you filter comments
   - None of the three includes the others: `gh pr view --comments` omits inline file review comments, and **both** of those omit the review summary body. Approvals like "LGTM" frequently arrive in the review body rather than as a plain comment, so a check that skips it will wrongly conclude there is no new feedback
2. If there is no new user feedback across **all three** sources since the last `[agent]` comment (or no user feedback at all), do nothing and exit immediately — do not present a plan, create a worktree, post a comment, or take any other action
3. Otherwise, present a plan covering the unaddressed comments and wait for approval

**Implementation phase** (only after the plan is approved):

1. **Isolate in a worktree**: per **Worktree Isolation**, get the PR branch into your worktree with `git fetch origin <branch> && git reset --hard origin/<branch>`. Do not work at the project root
2. Implement what the unaddressed comments ask for
3. After pushing changes, check for merge conflicts before waiting on CI — if the PR branch has conflicts with master, GitHub will not trigger CI runs. Detect this with `gh pr view <number> --json mergeable` and check the `mergeable` field. If it is `"CONFLICTING"`, rebase the branch onto master (`git fetch origin master && git rebase origin/master`), resolve all conflicts, force-push, and only then wait for CI. Do not enter a `gh run watch` loop on a conflicting branch — CI will never start
4. After pushing changes, wait for all CI checks to finish using `gh run watch` — if any fail, fix the failures and push again, repeating until CI is green
5. Post a comment reporting what was done
6. After the PR is merged, wait for all CI runs on master to complete (`gh run watch`) before syncing — the Build workflow commits rebuilt dist output back to master, so fetching before it finishes will miss that commit. Once CI is green, sync your view of master with `git fetch origin master`

### Merge rules

- **You may only merge a PR when the user has explicitly approved it.** Approval is satisfied by **either**:
  - an explicit approval phrase (e.g., "LGTM", "looks good to me", "go ahead and merge") in **any** of the three feedback sources above — a PR-level comment, an inline review comment, or a review summary body; **or**
  - a user-submitted review with `state == APPROVED` (from the `pulls/<number>/reviews` endpoint), even when its body is empty — a bare "Approve" click counts
- Approvals frequently arrive in the review summary body rather than as a plain comment, so check it explicitly — never conclude a PR is unapproved without having read the review bodies and states
- No other source of merge authorization is valid — not your own judgment
- The merge instruction must come from the user (non-`[agent]`) on the PR itself, via one of the three sources above — nowhere else
- Always use **squash merge** — implementation details live on the task branch, master only needs the final result
- When squash merging, use only the PR title as the commit message with no body — do not include the list of individual commits that GitHub adds by default (e.g., `gh pr merge --squash --subject "PR title (#number)" --body ""`)

## Ad-hoc Work

The user assigns ad-hoc work by describing a change in plain text, with **no** issue or PR ID. There is no GitHub issue to fetch or move through statuses, but otherwise the lifecycle mirrors **Task Workflow**.

**Plan phase** (in plan mode):

1. Plan directly from the user's description — there is no issue to fetch
2. Present your implementation plan and wait for approval

**Implementation phase** (only after the plan is approved):

1. **Isolate in a worktree**: per **Worktree Isolation**, create a worktree on a new `{type}/{slug}` branch cut from the latest master — e.g. `git fetch origin master` then `git worktree add <path> -b {type}/{slug} origin/master`. Do not work at the project root and do not `git checkout master`
2. Implement the change in the worktree
3. Once the work is complete and tests, typecheck, and lint are all green, **automatically commit, push the branch, and open a PR** — do not stop to ask first. The PR has no `Closes #` line (there is no issue). Report the PR URL to the user
4. After opening the PR, wait for all CI checks to finish using `gh run watch` — if any fail, fix the failures and push again, repeating until CI is green
