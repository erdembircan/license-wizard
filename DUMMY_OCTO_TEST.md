# Dummy PR — octo.nvim test fixture

This file exists only to give a Neovim octo.nvim review something to chew on.
It is safe to delete. The PR it belongs to should be closed, not merged.

## Things to try while reviewing this in Neovim

1. Open the PR list with `:Octo pr list` (or `Space op`).
2. Start a review with `:Octo review start` (or `Space or`).
3. Put the cursor on this line and add an inline comment.
4. Select lines 14–17 in visual mode, then add a multi-line review comment.
5. Add a code suggestion on the line below this one.
6. Reply to your own thread, then resolve it.

```js
// A trivial snippet so there is some code to comment on.
function add(a, b) {
  return a + b;
}
```

When you're done poking at it, submit the review as a plain comment
(`Ctrl-m` in the submit window) — no need to approve a throwaway PR.
