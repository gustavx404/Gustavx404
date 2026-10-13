import { writeFile } from "node:fs/promises";

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
    repos.push(...pageRepos);
    if (pageRepos.length < 100) break;
  }

  return {
    repositoryCount: user.public_repos,
    starCount: repos.filter((repo) => !repo.fork).reduce((sum, repo) => sum + repo.stargazers_count, 0),
    topRepositories: repos
      .filter((repo) => !repo.fork)
      .sort((first, second) => second.stargazers_count - first.stargazers_count)
      .slice(0, 3)
      .map((repo) => ({ name: repo.name, stars: repo.stargazers_count })),
    followerCount: user.followers,
    joinedYear: new Date(user.created_at).getUTCFullYear(),
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

const palettes = {
  "pt-BR": {
    windowTitle: "GUSTAVX404 // RED OPERATOR",
    sync: "SINCRONIA",
    role: "RED OPERATOR · EM BUSCA DE VAGA",
    bio: "Software · IA · Cibersegurança · Linux desde 2017.",
    metricsTitle: "GITHUB",
    metricLabels: ["REPOS", "ESTRELAS", "SEGUIDORES", "DESDE"],
    topRepositoriesTitle: "PROJETOS ATIVOS",
    starLabel: "estrelas",
  },
};

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[char]);
}

function createScreen(data, locale) {
  const copy = palettes[locale];
  const values = [
    data.repositoryCount,
    data.starCount,
    data.followerCount,
    data.joinedYear,
  ];
  const positions = [28, 223, 418, 613];
  const metrics = values.map((value, index) => {
    const x = positions[index];
    return `
      <g transform="translate(${x} 157)">
        <rect width="179" height="54" rx="10" fill="#090e1b" stroke="#4d7cff" stroke-opacity=".28"/>
        <text x="12" y="18" fill="#8090b2" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="8" font-weight="500" letter-spacing=".5">${escapeXml(copy.metricLabels[index])}</text>
        <text x="12" y="43" fill="#e4ecff" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="22" font-weight="650" font-variant-numeric="tabular-nums">${escapeXml(value)}</text>
      </g>`.trim();
  }).join("\n  ");
  const topRepositories = data.topRepositories.map((repo, index) => {
    const x = [28, 286, 544][index];
    const name = repo.name.length > 22 ? `${repo.name.slice(0, 21)}…` : repo.name;
    return `
      <g transform="translate(${x} 248)">
        <rect width="248" height="30" rx="8" fill="#090e1b" stroke="#4d7cff" stroke-opacity=".24"/>
        <text x="12" y="19" fill="#f4f7ff" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="9" font-weight="550">${escapeXml(name)}</text>
        <text x="235" y="19" fill="#00d4ff" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="8" font-weight="650">★ ${escapeXml(repo.stars)}</text>
      </g>`.trim();
  }).join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="auto" viewBox="0 0 820 304" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(copy.windowTitle)}</title>
  <desc id="desc">${escapeXml(copy.role)}. ${escapeXml(copy.bio)} ${escapeXml(copy.metricsTitle)}: ${escapeXml(copy.metricLabels.map((label, index) => `${label} ${values[index]}`).join(" · "))}. ${escapeXml(copy.topRepositoriesTitle)}: ${escapeXml(data.topRepositories.map((repo) => `${repo.name}, ${repo.stars} ${copy.starLabel}`).join(" · "))}.</desc>
  <rect width="820" height="304" rx="18" fill="#050811"/>
  <rect x="1" y="1" width="818" height="302" rx="17" fill="none" stroke="#4d7cff" stroke-opacity=".42"/>
  <circle cx="29" cy="28" r="4" fill="#4d7cff"/>
  <text x="43" y="32" fill="#e4ecff" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="10" font-weight="650" letter-spacing="1">GUSTAVX404</text>
  <text x="791" y="32" fill="#00d4ff" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="9" font-weight="600" letter-spacing=".5">${escapeXml(copy.sync)} · ${escapeXml(data.updatedAt)}</text>
  <text x="28" y="78" fill="#f4f7ff" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="19" font-weight="650" letter-spacing="-.3">${escapeXml(copy.role)}</text>
  <text x="28" y="103" fill="#8090b2" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="11">${escapeXml(copy.bio)}</text>
  <path d="M28 126h764" stroke="#4d7cff" stroke-opacity=".35"/>
  <text x="28" y="148" fill="#8090b2" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="9" font-weight="600" letter-spacing="1">${escapeXml(copy.metricsTitle)}</text>
  ${metrics}
  <text x="28" y="237" fill="#8090b2" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="9" font-weight="600" letter-spacing="1">${escapeXml(copy.topRepositoriesTitle)}</text>
  ${topRepositories}
</svg>
`;
}

const data = await getProfileData();
const locale = "pt-BR";
const svgFilename = `assets/profile-screen-v3.${locale}.svg`;
await writeFile(svgFilename, createScreen(data, locale));
process.stdout.write(`Updated ${svgFilename}\n`);
