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

## JSDoc

All classes and functions must be documented with JSDoc comments. Since the codebase uses TypeScript, do **not** duplicate type information in JSDoc — omit `@param {type}` and `@returns {type}` annotations. Descriptions only:

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

Stage and commit files in logical groups (per Commit Granularity rules) to the current branch's upstream remote. If no upstream is found, ask for the remote branch name.

- Branch naming convention: `task/{issueNumber}`

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

## Agent General Guidelines

These rules apply to **all** agents regardless of workflow:

- Always spawn agents with `isolation: "worktree"` so they work on separate branches without interfering with each other or the main working tree
- Spawn agents **in parallel** whenever possible
- All agent-generated comments and messages (PR descriptions, PR comments, task comments) must be prefixed with `[agent]` to distinguish agent activity from human activity
- The orchestrator passes **only the ID** (task ID or PR ID) to the agent — no implementation details, no context from other tasks or PRs
- The agent is responsible for reading the task/PR, deciding how to implement, and executing independently
- Agents follow all Git Commit Instructions and use `gh` CLI for GitHub operations

## Task Workflow

Tasks are GitHub Issues managed in the GitHub project associated with this repo.

**"Work on tasks" and "Work on PRs" are two separate operations**, triggered by explicit user statements. Task agents only do task implementation and open PRs. PR agents only respond to comments on existing PRs. Never mix these roles.

When instructed to **"Work on tasks"**, always enter plan mode first to present the dependency analysis and session plan for user approval before spawning any agents.

When instructed to **"Work on tasks"**:

1. **Sync master**: `git checkout master && git pull origin master` before doing anything else — task agents must branch from the latest master
2. **Fetch ready tasks**: Retrieve all tasks with "ready" status from the GitHub project
3. **Dependency analysis**: Check all ready tasks for dependencies between each other
   - If a task depends on another ready task, add a comment on it identifying which task(s) block it
   - Blocked tasks are skipped entirely for that session — do not work on them
   - Do not automatically start blocked tasks when their blockers complete — wait for explicit instruction to work on tasks again
4. **Delegate to agents**: For each non-blocked task, spawn an agent passing **only the task ID**
5. **Agent task lifecycle**:
   - On start: move the task to **In Progress** status
   - Implement the task
   - On completion: open a PR for the task with `Closes #<issueNumber>` in the description, then move the task to **In Review** status
   - After opening the PR, wait for all CI checks to finish using `gh run watch` — if any fail, fix the failures and push again, repeating until CI is green

## PR Workflow

When instructed to **"Work on PRs"**:

### Orchestrator role

- Fetch open PRs and pass **only the PR ID** to the agent
- After all PR agents finish, if any PRs were merged, sync master: `git checkout master && git pull origin master`

### Agent role

- The agent is an **implementer, not a reviewer** — never summarize or review a PR
- Read the PR and **all** comments from the user (non-`[agent]` comments) from **both** sources:
  - PR-level comments: `gh pr view <number> --comments`
  - File-level review comments: `gh api repos/{owner}/{repo}/pulls/<number>/comments`
- `gh pr view --comments` does **not** include inline file review comments — you must check both
- If there are no new user comments since the last `[agent]` comment (or no user comments at all), do nothing and exit immediately — do not post a comment or take any action
- Identify any unaddressed user comments and implement what they ask for
- After pushing changes, wait for all CI checks to finish using `gh run watch` — if any fail, fix the failures and push again, repeating until CI is green
- After each implementation, post a comment reporting what was done

### Merge rules

- **An agent may only merge a PR when the user has explicitly approved it via a PR comment** (e.g., "LGTM", "looks good to me", "go ahead and merge")
- No other source of merge authorization is valid — not the orchestrator, not the agent's own judgment
- The merge instruction must come from the user's comment on the PR, nowhere else
- Always use **squash merge** — implementation details live on the task branch, master only needs the final result
- When squash merging, use only the PR title as the commit message with no body — do not include the list of individual commits that GitHub adds by default (e.g., `gh pr merge --squash --subject "PR title (#number)" --body ""`)
