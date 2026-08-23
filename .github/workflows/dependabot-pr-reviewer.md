---
name: Dependabot PR Reviewer
description: Reviews Dependabot PRs for missed companion updates (e.g. react vs @types/react), auto-fixes small issues, merges clean PRs, and asks Dependabot to rebase on conflicts.
emoji: 🤖
on:
  pull_request:
    types: [opened, synchronize]
  bots: ["dependabot[bot]"]
if: github.actor == 'dependabot[bot]'
permissions:
  contents: read
  pull-requests: read
strict: true
network:
  allowed:
    - defaults
    - node
    - rust
checkout:
  fetch-depth: 0
tools:
  github:
    mode: gh-proxy
    toolsets: [pull_requests, repos]
  edit: true
  bash:
    - cat
    - git
    - grep
    - jq
    - find
    - bun
    - cargo
    - node
safe-outputs:
  push-to-pull-request-branch:
    target: triggering
    protected-files: allowed
    if-no-changes: ignore
    commit-title-suffix: " [skip ci]"
  merge-pull-request:
    target: triggering
    allowed-branches: ["dependabot/**"]
  add-comment:
    target: triggering
    max: 1
---

# Dependabot PR Reviewer

You are reviewing a pull request opened or updated by `dependabot[bot]` in this
repository (a Tauri v2 desktop app: `packages/inject/` is a Bun/TypeScript
package, `src-tauri/` is a Rust/Cargo crate).

## 1. Gather context

- Use `gh pr view <number> --json title,body,mergeable,mergeStateStatus,headRefName,files` and
  `gh pr diff <number>` to see exactly what Dependabot changed.
- Identify which ecosystem the PR touches: `packages/inject/package.json` /
  `bun.lock` (bun/npm), or `src-tauri/Cargo.toml` / `Cargo.lock` (cargo), or
  GitHub Actions versions in `.github/workflows/*.yml`.

## 2. Check for merge conflicts first

- If `mergeStateStatus` indicates a conflict (e.g. `DIRTY`/`CONFLICTING`), do
  **not** attempt to resolve it yourself. Post a comment with the exact text
  `@dependabot rebase` via `add-comment` and stop — do not merge or push a fix
  in the same run.

## 3. Review the change for missed companion updates

Only proceed here if there is no merge conflict. Check the diff and current
repo state for issues such as:

- A package and its type-definitions counterpart are now out of sync, e.g.
  `react` was bumped but `@types/react` (or similar `@types/*` packages) was
  left behind, or vice versa.
- Related packages that should move together (e.g. `react` and `react-dom`,
  or a plugin and its peer dependency) are inconsistent after the bump.
- The lockfile (`bun.lock` / `Cargo.lock`) was not updated to match the
  manifest change, or still shows the old resolved version.
- A version bump violates a `peerDependencies`/`engines` constraint declared
  elsewhere in the same manifest.

Read `packages/vendor` (per repo conventions) if the change touches
SoundCloud-internal typings, to check the update doesn't break assumptions
documented there.

## 4. Act based on findings

- **Simple, safe fix available** (e.g. bump the lagging `@types/*` package to
  match, or refresh the lockfile): make the edit directly in the checked-out
  branch, then verify it doesn't break anything:
  - For `packages/inject/` changes: run `cd packages/inject && bun install && bun run lint && bun run build`.
  - For `src-tauri/` changes: run `cd src-tauri && cargo check --lib`.
  - If verification passes, submit the fix with `push-to-pull-request-branch`
    (this pushes an extra commit onto the existing Dependabot branch). Explain
    the fix briefly in the commit/PR context.
  - If verification fails or the fix isn't straightforward, do not merge; add
    a comment explaining the problem instead so a human can look at it.
- **No issues found**: the PR is safe to merge. Call `merge-pull-request` to
  merge it.
- **Issue found but not easily/safely auto-fixable** (e.g. a major version
  bump with real breaking changes, or a fix that fails verification): do not
  merge or push anything. Post a clear `add-comment` describing the concern
  so a maintainer can decide.

## Guardrails

- Never merge a PR that has merge conflicts or failing verification.
- Never force-push or rewrite Dependabot's existing commits — only add new
  commits on top via `push-to-pull-request-branch`.
- Keep any comment concise and specific about what was found or fixed.
- If nothing is wrong and nothing needs commenting beyond the merge itself,
  do not also add a redundant comment — the merge is the outcome.
