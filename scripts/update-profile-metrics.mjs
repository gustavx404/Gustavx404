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
    followerCount: user.followers,
    joinedYear: new Date(user.created_at).getUTCFullYear(),
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

const palettes = {
  en: {
    title: "GITHUB // DAILY TELEMETRY",
    labels: ["PUBLIC REPOSITORIES", "PROJECT STARS", "FOLLOWERS", "MEMBER SINCE"],
    footer: "AUTO-REFRESHED DAILY · SOURCE: GITHUB API",
    updated: "LAST SYNC",
    totalUnit: "// TOTAL",
  },
  "pt-BR": {
    title: "GITHUB // TELEMETRIA DIÁRIA",
    labels: ["REPOSITÓRIOS PÚBLICOS", "ESTRELAS NOS PROJETOS", "SEGUIDORES", "MEMBRO DESDE"],
    footer: "ATUALIZAÇÃO DIÁRIA · FONTE: API DO GITHUB",
    updated: "ÚLTIMA SINCRONIZAÇÃO",
    totalUnit: "// TOTAL",
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

function createSvg(data, locale) {
  const copy = palettes[locale];
  const values = [
    data.repositoryCount,
    data.starCount,
    data.followerCount,
    data.joinedYear,
  ];
  const xPositions = [12, 213, 414, 615];
  const cards = values.map((value, index) => {
    const x = xPositions[index];
    const accent = index % 2 === 0 ? "#ffbd4a" : "#b8f56b";
    return `
    <g transform="translate(${x} 43)">
      <rect width="193" height="76" rx="4" fill="#151b17" stroke="#39473d"/>
      <rect x="14" y="15" width="4" height="12" fill="${accent}"/>
      <text x="27" y="25" fill="#94a197" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9" letter-spacing=".6">${escapeXml(copy.labels[index])}</text>
      <text x="14" y="59" fill="#e8eee9" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="25" font-weight="700">${escapeXml(value)}</text>
      <text x="179" y="59" fill="${accent}" text-anchor="end" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10">${copy.totalUnit}</text>
    </g>`.trim();
  }).join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="820" height="143" viewBox="0 0 820 143" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(copy.title)}</title>
  <desc id="desc">${escapeXml(copy.labels.map((label, index) => `${label}: ${values[index]}`).join(". "))}</desc>
  <rect width="820" height="143" rx="8" fill="#0b0e0d"/>
  <rect x="1" y="1" width="818" height="141" rx="7" fill="none" stroke="#303a34"/>
  <rect x="1" y="1" width="818" height="29" rx="7" fill="#171d19"/>
  <path d="M1 23h818v7H1z" fill="#171d19"/>
  <circle cx="17" cy="15" r="3" fill="#ffbd4a"/>
  <circle cx="29" cy="15" r="3" fill="#b8f56b"/>
  <circle cx="41" cy="15" r="3" fill="#58645d"/>
  <text x="55" y="19" fill="#94a197" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10" letter-spacing="1">${escapeXml(copy.title)}</text>
  <text x="805" y="19" fill="#ffbd4a" text-anchor="end" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9" letter-spacing=".5">${escapeXml(copy.updated)}: ${escapeXml(data.updatedAt)}</text>
  ${cards}
  <text x="805" y="137" fill="#657269" text-anchor="end" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="8" letter-spacing=".4">${escapeXml(copy.footer)}</text>
</svg>
`;
}

const data = await getProfileData();
for (const locale of Object.keys(palettes)) {
  const filename = `assets/profile-metrics.${locale}.svg`;
  await writeFile(filename, createSvg(data, locale));
  process.stdout.write(`Updated ${filename}\n`);
}
