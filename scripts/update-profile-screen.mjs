import { copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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
  en: {
    windowTitle: "GUSTAVX404 // PROFILE",
    sync: "SYNC",
    role: "AI ENGINEER · CYBERSECURITY",
    bioLines: [
      "AI is my engineering tool: I design, implement, test and validate software.",
      "Red-team security · Linux since 2017 · Always exploring technology.",
    ],
    skillsTitle: "01 // FOCUS AREAS",
    skills: ["AI ENGINEERING", "AI-ASSISTED DEV", "RED TEAM", "LINUX · 2017+"],
    metricsTitle: "02 // GITHUB SIGNAL",
    metricLabels: ["PUBLIC REPOSITORIES", "PROJECT STARS", "FOLLOWERS", "MEMBER SINCE"],
    topRepositoriesTitle: "03 // TOP REPOSITORIES",
    starLabel: "stars",
  },
  "pt-BR": {
    windowTitle: "GUSTAVX404 // PERFIL",
    sync: "SINCRONIA",
    role: "ENGENHARIA DE IA · CIBERSEGURANÇA",
    bioLines: [
      "Desenvolvo software com IA como engenheiro: projeto, implemento, testo e valido.",
      "Red team · Linux desde 2017 · Sempre explorando tecnologia.",
    ],
    skillsTitle: "01 // ÁREAS DE FOCO",
    skills: ["ENGENHARIA DE IA", "IA NO DESENVOLVIMENTO", "RED TEAM", "LINUX · 2017+"],
    metricsTitle: "02 // SINAIS DO GITHUB",
    metricLabels: ["REPOSITÓRIOS PÚBLICOS", "ESTRELAS NOS PROJETOS", "SEGUIDORES", "MEMBRO DESDE"],
    topRepositoriesTitle: "03 // REPOSITÓRIOS EM DESTAQUE",
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

function createScreen(data, locale, animationProgress = null) {
  const copy = palettes[locale];
  const values = [
    data.repositoryCount,
    data.starCount,
    data.followerCount,
    data.joinedYear,
  ];
  const positions = [28, 223, 418, 613];
  const accents = ["#ff5266", "#ff9b72"];
  const scanOpacity = animationProgress === null ? null : (0.45 + 0.55 * Math.sin(Math.PI * animationProgress)).toFixed(2);
  const scanX = animationProgress === null ? 28 : 28 + (764 * animationProgress);
  const skills = copy.skills.map((skill, index) => {
    const x = positions[index];
    const accent = accents[index % accents.length];
    return `
      <g transform="translate(${x} 168)">
        <rect width="179" height="48" rx="12" fill="url(#glass-surface)" stroke="#ffffff" stroke-opacity=".14"/>
        <circle cx="18" cy="24" r="4" fill="${accent}"/>
        <text x="31" y="28" fill="#f5f2f4" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="10" font-weight="600" letter-spacing=".1">${escapeXml(skill)}</text>
      </g>`.trim();
  }).join("\n  ");
  const metrics = values.map((value, index) => {
    const x = positions[index];
    const accent = accents[index % accents.length];
    return `
      <g transform="translate(${x} 250)">
        <rect width="179" height="66" rx="14" fill="url(#glass-surface)" stroke="#ffffff" stroke-opacity=".14"/>
        <text x="14" y="21" fill="#d6cdd1" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="9" font-weight="500">${escapeXml(copy.metricLabels[index])}</text>
        <text x="14" y="52" fill="#fff9fb" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="25" font-weight="700" font-variant-numeric="tabular-nums">${escapeXml(value)}</text>
        <circle cx="162" cy="48" r="3" fill="${accent}"/>
      </g>`.trim();
  }).join("\n  ");
  const topRepositories = data.topRepositories.map((repo, index) => {
    const x = [28, 286, 544][index];
    const name = repo.name.length > 22 ? `${repo.name.slice(0, 21)}…` : repo.name;
    return `
      <g transform="translate(${x} 341)">
        <rect width="248" height="32" rx="10" fill="url(#glass-surface)" stroke="#ffffff" stroke-opacity=".14"/>
        <text x="12" y="20" fill="#f5f2f4" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="10" font-weight="600">${escapeXml(name)}</text>
        <text x="235" y="20" fill="#ff9b72" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="9" font-weight="700">★ ${escapeXml(repo.stars)}</text>
      </g>`.trim();
  }).join("\n  ");

  const scanIndicator = animationProgress === null
    ? `<g><circle cx="28" cy="138" r="11" fill="#ff5266" opacity=".12"><animate attributeName="cx" values="28;792;28" dur="6s" repeatCount="indefinite"/></circle><circle cx="28" cy="138" r="3" fill="#ff5266"><animate attributeName="cx" values="28;792;28" dur="6s" repeatCount="indefinite"/><animate attributeName="opacity" values=".35;1;.35" dur="2s" repeatCount="indefinite"/></circle></g>`
    : `<g><circle cx="${scanX.toFixed(1)}" cy="138" r="11" fill="#ff5266" opacity="${(Number(scanOpacity) * 0.14).toFixed(2)}"/><circle cx="${scanX.toFixed(1)}" cy="138" r="3" fill="#ff5266" opacity="${scanOpacity}"/></g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="auto" viewBox="0 0 820 387" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(copy.windowTitle)}</title>
  <desc id="desc">${escapeXml(copy.role)}. ${escapeXml(copy.bioLines.join(" "))} ${escapeXml(copy.metricsTitle)}: ${escapeXml(copy.metricLabels.map((label, index) => `${label} ${values[index]}`).join(" · "))}. ${escapeXml(copy.topRepositoriesTitle)}: ${escapeXml(data.topRepositories.map((repo) => `${repo.name}, ${repo.stars} ${copy.starLabel}`).join(" · "))}.</desc>
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
      <rect x="1" y="1" width="818" height="385" rx="21"/>
    </clipPath>
  </defs>
  <rect width="820" height="387" rx="22" fill="url(#background)"/>
  <circle cx="740" cy="105" r="260" fill="url(#ambient-glow)" clip-path="url(#panel-clip)"/>
  <rect x="1" y="1" width="818" height="385" rx="21" fill="none" stroke="#ffffff" stroke-opacity=".12"/>
  <circle cx="29" cy="28" r="4" fill="#ff5266"/>
  <text x="43" y="32" fill="#e7e0e4" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="10" font-weight="650" letter-spacing="1">GUSTAVX404</text>
  <text x="791" y="32" fill="#ff9b72" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="9" font-weight="600" letter-spacing=".5">${escapeXml(copy.sync)} · ${escapeXml(data.updatedAt)}</text>
  <text x="28" y="75" fill="#ff9b72" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="13" font-weight="650" letter-spacing=".2">${escapeXml(copy.role)}</text>
  <text x="28" y="102" fill="#e0d8dc" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="12">${escapeXml(copy.bioLines[0])}</text>
  <text x="28" y="121" fill="#e0d8dc" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="12">${escapeXml(copy.bioLines[1])}</text>
  <path d="M28 138h764" stroke="#ffffff" stroke-opacity=".12"/>
  ${scanIndicator}
  <text x="28" y="160" fill="#c7bdc2" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="10" font-weight="600" letter-spacing="1.4">${escapeXml(copy.skillsTitle)}</text>
  ${skills}
  <text x="28" y="241" fill="#c7bdc2" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="10" font-weight="600" letter-spacing="1.4">${escapeXml(copy.metricsTitle)}</text>
  ${metrics}
  <text x="28" y="331" fill="#c7bdc2" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="10" font-weight="600" letter-spacing="1.4">${escapeXml(copy.topRepositoriesTitle)}</text>
  ${topRepositories}
</svg>
`;
}

const data = await getProfileData();
const frameCount = 48;
const frameDuration = 12;
for (const locale of Object.keys(palettes)) {
  const svgFilename = `assets/profile-screen-v3.${locale}.svg`;
  await writeFile(svgFilename, createScreen(data, locale));
  const frameDirectory = await mkdtemp(join(tmpdir(), `profile-${locale}-`));
  try {
    const frames = [];
    for (let frame = 0; frame < frameCount; frame += 1) {
      const phase = frame / frameCount;
      const progress = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
      const frameSvg = join(frameDirectory, `frame-${String(frame).padStart(2, "0")}.svg`);
      const framePng = join(frameDirectory, `frame-${String(frame).padStart(2, "0")}.png`);
      await writeFile(frameSvg, createScreen(data, locale, progress));
      await execFileAsync("rsvg-convert", ["--width", "1640", "--height", "774", frameSvg, "--output", framePng]);
      frames.push(framePng);
    }
    const gifFilename = `assets/profile-motion.${locale}.gif`;
    const generatedGif = join(frameDirectory, "profile.gif");
    await execFileAsync("convert", ["-delay", String(frameDuration), ...frames, "-loop", "0", "-layers", "Optimize", generatedGif]);
    await copyFile(generatedGif, gifFilename);
    process.stdout.write(`Updated ${svgFilename} and ${gifFilename}\n`);
  } finally {
    await rm(frameDirectory, { recursive: true, force: true });
  }
}
