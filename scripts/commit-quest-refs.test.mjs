import test from "node:test";
import assert from "node:assert/strict";
import { getCommitTag } from "./commit-quest-refs.mjs";

test("keeps an upstream branch label distinct from the checked out branch", () => {
  assert.equal(
    getCommitTag({ hash: "efd0f6b", refs: "origin/main, origin/HEAD" }, "main", "cd62815"),
    "origin/main",
  );
});

test("labels only the exact HEAD commit as the current branch", () => {
  assert.equal(
    getCommitTag({ hash: "cd62815", refs: "HEAD -> main" }, "main", "cd62815"),
    "HEAD → main",
  );
});

test("does not confuse branch names that contain the current branch name", () => {
  assert.equal(
    getCommitTag({ hash: "aabbccd", refs: "origin/feature/main" }, "main", "cd62815"),
    "origin/feature/main",
  );
});
