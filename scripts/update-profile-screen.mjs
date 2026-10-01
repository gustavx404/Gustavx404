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
    windowTitle: "GUSTAVX404 // PROFILE",
    sync: "SYNC",
    name: "Gustavo",
    heroLabel: "RED TEAM · ADVERSARY SIM",
    role: "CYBERSECURITY  →  AI ENGINEERING",
    bio: "Exploring adversary simulation and AI security. Linux user since 2017.",
    skillsTitle: "01 // FOCUS AREAS",
    skills: ["RED TEAM", "AI SECURITY", "LINUX · 2017+", "3D PRINTING"],
    metricsTitle: "02 // GITHUB SIGNAL",
    metricLabels: ["PUBLIC REPOSITORIES", "PROJECT STARS", "FOLLOWERS", "MEMBER SINCE"],
  },
  "pt-BR": {
    windowTitle: "GUSTAVX404 // PERFIL",
    sync: "SINCRONIA",
    name: "Gustavo",
    heroLabel: "RED TEAM · SIMULAÇÃO DE ATAQUE",
    role: "CIBERSEGURANÇA  →  ENGENHARIA DE IA",
    bio: "Exploro simulação de adversários e segurança em IA. Uso Linux desde 2017.",
    skillsTitle: "01 // ÁREAS DE FOCO",
    skills: ["RED TEAM", "SEGURANÇA EM IA", "LINUX · 2017+", "IMPRESSÃO 3D"],
    metricsTitle: "02 // SINAIS DO GITHUB",
    metricLabels: ["REPOSITÓRIOS PÚBLICOS", "ESTRELAS NOS PROJETOS", "SEGUIDORES", "MEMBRO DESDE"],
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
  const accents = ["#ff5266", "#ff9b72"];
  const skills = copy.skills.map((skill, index) => {
    const x = positions[index];
    const accent = accents[index % accents.length];
    return `
      <g transform="translate(${x} 224)">
        <rect width="179" height="48" rx="12" fill="url(#glass-surface)" stroke="#ffffff" stroke-opacity=".14"/>
        <circle cx="18" cy="24" r="4" fill="${accent}"/>
        <text x="31" y="28" fill="#f5f2f4" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="10" font-weight="600" letter-spacing=".1">${escapeXml(skill)}</text>
      </g>`.trim();
  }).join("\n  ");
  const metrics = values.map((value, index) => {
    const x = positions[index];
    const accent = accents[index % accents.length];
    return `
      <g transform="translate(${x} 306)">
        <rect width="179" height="66" rx="14" fill="url(#glass-surface)" stroke="#ffffff" stroke-opacity=".14"/>
        <text x="14" y="21" fill="#d6cdd1" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="9" font-weight="500">${escapeXml(copy.metricLabels[index])}</text>
        <text x="14" y="52" fill="#fff9fb" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="25" font-weight="700" font-variant-numeric="tabular-nums">${escapeXml(value)}</text>
        <circle cx="162" cy="48" r="3" fill="${accent}"/>
      </g>`.trim();
  }).join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="auto" viewBox="0 0 820 390" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(copy.windowTitle)} · ${escapeXml(copy.name)}</title>
  <desc id="desc">${escapeXml(copy.role)}. ${escapeXml(copy.bio)} ${escapeXml(copy.metricsTitle)}: ${escapeXml(copy.metricLabels.map((label, index) => `${label} ${values[index]}`).join(" · "))}.</desc>
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0d1017"/>
      <stop offset=".55" stop-color="#171319"/>
      <stop offset="1" stop-color="#211318"/>
    </linearGradient>
    <linearGradient id="glass-surface" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".105"/>
      <stop offset="1" stop-color="#ff5266" stop-opacity=".045"/>
    </linearGradient>
    <radialGradient id="ambient-glow">
      <stop offset="0" stop-color="#ff294f" stop-opacity=".22"/>
      <stop offset="1" stop-color="#ff294f" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="panel-clip">
      <rect x="1" y="1" width="818" height="388" rx="21"/>
    </clipPath>
  </defs>
  <rect width="820" height="390" rx="22" fill="url(#background)"/>
  <circle cx="740" cy="105" r="260" fill="url(#ambient-glow)" clip-path="url(#panel-clip)"/>
  <rect x="1" y="1" width="818" height="388" rx="21" fill="none" stroke="#ffffff" stroke-opacity=".12"/>
  <circle cx="29" cy="28" r="4" fill="#ff5266"/>
  <text x="43" y="32" fill="#e7e0e4" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="10" font-weight="650" letter-spacing="1">GUSTAVX404</text>
  <text x="791" y="32" fill="#ff9b72" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="9" font-weight="600" letter-spacing=".5">${escapeXml(copy.sync)} · ${escapeXml(data.updatedAt)}</text>
  <text x="28" y="75" fill="#ff5266" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="10" font-weight="700" letter-spacing="1.4">${escapeXml(copy.heroLabel)}</text>
  <text x="28" y="119" fill="#fff9fb" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="39" font-weight="700" letter-spacing="-1.2">${escapeXml(copy.name)}</text>
  <text x="28" y="149" fill="#ff9b72" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="13" font-weight="650" letter-spacing=".2">${escapeXml(copy.role)}</text>
  <text x="28" y="176" fill="#e0d8dc" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="12">${escapeXml(copy.bio)}</text>
  <path d="M28 194h764" stroke="#ffffff" stroke-opacity=".12"/>
  <text x="28" y="215" fill="#c7bdc2" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="10" font-weight="600" letter-spacing="1.4">${escapeXml(copy.skillsTitle)}</text>
  ${skills}
  <text x="28" y="296" fill="#c7bdc2" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="10" font-weight="600" letter-spacing="1.4">${escapeXml(copy.metricsTitle)}</text>
  ${metrics}
</svg>
`;
}

const data = await getProfileData();
for (const locale of Object.keys(palettes)) {
  const filename = `assets/profile-screen-v3.${locale}.svg`;
  await writeFile(filename, createScreen(data, locale));
  process.stdout.write(`Updated ${filename}\n`);
}
