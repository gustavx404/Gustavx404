import { readFile, writeFile } from "node:fs/promises";

const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const readmePath = new URL("../README.md", import.meta.url);
const startMarker = "<!-- COMMUNITY_START -->";
const endMarker = "<!-- COMMUNITY_END -->";

async function github(path) {
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) throw new Error(`GitHub API returned ${response.status} for ${path}`);
  return response.json();
}

async function listOpenIssues() {
  const issues = [];
  for (let page = 1; ; page += 1) {
    const batch = await github(`/issues?state=open&per_page=100&page=${page}`);
    issues.push(...batch.filter((issue) => !issue.pull_request));
    if (batch.length < 100) return issues;
  }
}

async function countUpvotes(issueNumber) {
  let votes = 0;
  for (let page = 1; ; page += 1) {
    const reactions = await github(`/issues/${issueNumber}/reactions?per_page=100&page=${page}`);
    votes += reactions.filter((reaction) => reaction.content === "+1").length;
    if (reactions.length < 100) return votes;
  }
}

function field(body, label) {
  const match = body.match(new RegExp(`^### ${label}\\s*\\n([\\s\\S]*?)(?=\\n### |$)`, "m"));
  if (!match) return "";
  return match[1].replace(/_No response_/g, "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

function plainMarkdown(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/@/g, "&#64;")
    .replace(/([\\`*_{}\[\]()#+.!|~])/g, "\\$1");
}

function renderVisitorWall(issues) {
  const seenAuthors = new Set();
  const entries = issues
    .filter((issue) => issue.title.startsWith("Guestbook:"))
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))
    .flatMap((issue) => {
      const message = field(issue.body ?? "", "Message").slice(0, 180);
      const author = (issue.user?.login ?? "visitor").replace(/[^A-Za-z0-9-]/g, "");
      if (message.length < 2 || !author || seenAuthors.has(author)) return [];
      seenAuthors.add(author);
      const date = new Date(issue.created_at).toISOString().slice(0, 10);
      return [`> **${plainMarkdown(author)}** · ${date}  \n> ${plainMarkdown(message)}`];
    })
    .slice(0, 8);

  return ["### Visitor Wall", "", ...(entries.length ? entries : ["_No messages yet. Leave the first note using the visitor form above._"])].join("\n");
}

async function renderProjectVotes(issues) {
  const proposals = issues
    .filter((issue) => issue.title.trim().toLowerCase() === "project vote")
    .flatMap((issue) => {
      const idea = field(issue.body ?? "", "Project idea").slice(0, 70);
      if (idea.length < 2) return [];
      return [{ issue, idea }];
    })
    .sort((left, right) => Date.parse(right.issue.created_at) - Date.parse(left.issue.created_at))
    .slice(0, 8);

  const rows = await Promise.all(proposals.map(async ({ issue, idea }) => {
    const votes = await countUpvotes(issue.number);
    return { issue, idea, votes };
  }));
  rows.sort((left, right) => right.votes - left.votes || Date.parse(right.issue.created_at) - Date.parse(left.issue.created_at));

  const entries = rows.map(({ issue, idea, votes }) => `- [${plainMarkdown(idea)}](${issue.html_url}) — 👍 **${votes}**`);
  return [
    "### What should I build next?",
    "",
    "React with 👍 on a proposal to vote.",
    "",
    ...(entries.length ? entries : ["_No proposals yet. Suggest the first project using the form above._"]),
  ].join("\n");
}

async function main() {
  const readme = await readFile(readmePath, "utf8");
  const start = readme.indexOf(startMarker);
  const end = readme.indexOf(endMarker);
  if (start < 0 && end < 0) {
    process.stdout.write("Community section is absent; skipping sync.\n");
    return;
  }
  if (start < 0 || end < 0 || end <= start) throw new Error("Community markers are missing or out of order in README.md.");
  if (!repository || !token) {
    throw new Error("GITHUB_REPOSITORY and GITHUB_TOKEN are required.");
  }

  const issues = await listOpenIssues();
  const community = [renderVisitorWall(issues), await renderProjectVotes(issues)].join("\n\n");
  const updated = `${readme.slice(0, start + startMarker.length)}\n${community}\n${readme.slice(end)}`;
  if (updated !== readme) {
    await writeFile(readmePath, updated);
    process.stdout.write("Updated the README visitor wall and project votes.\n");
  } else {
    process.stdout.write("Community sections are already current.\n");
  }
}

await main();
