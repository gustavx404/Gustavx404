export function getCommitTag(commit, branch, headHash) {
  if (commit.hash === headHash) {
    return branch === "detached" ? "HEAD" : `HEAD → ${branch}`;
  }

  return (commit.refs ?? "")
    .split(",")
    .map((ref) => ref.trim().replace(/^HEAD -> /, ""))
    .filter((ref) => ref && ref !== "origin/HEAD" && ref !== branch)
    .join(", ");
}
