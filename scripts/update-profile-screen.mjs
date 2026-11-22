import { readFile, writeFile } from "node:fs/promises";

const username = "gustavx404";
const apiBase = "https://api.github.com";
const token = process.env.GITHUB_TOKEN;

const headers = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

async function getJson(path) {
  const response = await fetch(`${apiBase}${path}`, { headers });
  if (!response.ok) {
    throw new Error(`GitHub API ${path} returned ${response.status}`);
  }
  return response.json();
}

async function getProfileData() {
  const user = await getJson(`/users/${username}`);
  const repos = [];

  for (let page = 1; ; page += 1) {
    const pageRepos = await getJson(
      `/users/${username}/repos?type=owner&sort=updated&per_page=100&page=${page}`,
    );
    repos.push(...pageRepos.filter((repo) => !repo.private && !repo.fork));
    if (pageRepos.length < 100) break;
  }

  return {
    repositoryCount: user.public_repos,
    starCount: repos.reduce((sum, repo) => sum + repo.stargazers_count, 0),
    topRepositories: repos
      .filter((repo) => repo.stargazers_count > 0)
      .sort((first, second) => second.stargazers_count - first.stargazers_count)
      .slice(0, 3)
      .map((repo) => ({ name: repo.name, stars: repo.stargazers_count })),
    followerCount: user.followers,
    joinedYear: new Date(user.created_at).getUTCFullYear(),
  };
}

function renderMetrics(data) {
  const lines = [
    `- **${data.starCount}** stars earned`,
    `- **${data.repositoryCount}** public repositories`,
    `- **${data.followerCount}** followers`,
    `- On GitHub since **${data.joinedYear}**`,
  ];

  if (data.topRepositories.length) {
    lines.push("", "**Top repositories by stars**", "");
    for (const { name, stars } of data.topRepositories) {
      const url = `https://github.com/${username}/${encodeURIComponent(name)}`;
      lines.push(`- [\`${name}\`](${url}) · ${stars} ${stars === 1 ? "star" : "stars"}`);
    }
  }

  return lines.join("\n");
}

const readmePath = new URL("../README.md", import.meta.url);
const startMarker = "<!-- PROFILE_METRICS_START -->";
const endMarker = "<!-- PROFILE_METRICS_END -->";
const readme = await readFile(readmePath, "utf8");
const start = readme.indexOf(startMarker);
const end = readme.indexOf(endMarker);
if (start < 0 || end < start + startMarker.length) {
  throw new Error("Profile metrics markers are missing or out of order in README.md.");
}

const metrics = renderMetrics(await getProfileData());
const updated = `${readme.slice(0, start + startMarker.length)}\n${metrics}\n${readme.slice(end)}`;
if (updated !== readme) {
  await writeFile(readmePath, updated);
  process.stdout.write("Updated GitHub activity in README.md.\n");
} else {
  process.stdout.write("GitHub activity is already current.\n");
}
