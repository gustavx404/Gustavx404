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
    role: "STUDENT · OPEN TO WORK",
    bio: "Interested in software, AI and cybersecurity · Linux since 2017.",
    metricsTitle: "GITHUB",
    metricLabels: ["REPOS", "STARS", "FOLLOWERS", "SINCE"],
    topRepositoriesTitle: "TOP PROJECTS",
    starLabel: "stars",
  },
  "pt-BR": {
    windowTitle: "GUSTAVX404 // PERFIL",
    sync: "SINCRONIA",
    role: "ESTUDANTE · EM BUSCA DE VAGA",
    bio: "Interesse em software, IA e cibersegurança · Linux desde 2017.",
    metricsTitle: "GITHUB",
    metricLabels: ["REPOS", "ESTRELAS", "SEGUIDORES", "DESDE"],
    topRepositoriesTitle: "PROJETOS EM DESTAQUE",
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
  const metrics = values.map((value, index) => {
    const x = positions[index];
    return `
      <g transform="translate(${x} 157)">
        <rect width="179" height="54" rx="10" fill="#191a21" stroke="#ffffff" stroke-opacity=".1"/>
        <text x="12" y="18" fill="#aaa6ad" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="8" font-weight="500" letter-spacing=".5">${escapeXml(copy.metricLabels[index])}</text>
        <text x="12" y="43" fill="#f5f2f4" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="22" font-weight="650" font-variant-numeric="tabular-nums">${escapeXml(value)}</text>
      </g>`.trim();
  }).join("\n  ");
  const topRepositories = data.topRepositories.map((repo, index) => {
    const x = [28, 286, 544][index];
    const name = repo.name.length > 22 ? `${repo.name.slice(0, 21)}…` : repo.name;
    return `
      <g transform="translate(${x} 248)">
        <rect width="248" height="30" rx="8" fill="#191a21" stroke="#ffffff" stroke-opacity=".1"/>
        <text x="12" y="19" fill="#f5f2f4" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="9" font-weight="550">${escapeXml(name)}</text>
        <text x="235" y="19" fill="#ff9b72" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="8" font-weight="650">★ ${escapeXml(repo.stars)}</text>
      </g>`.trim();
  }).join("\n  ");
  const pulseOpacity = animationProgress === null ? "1" : (0.65 + 0.35 * Math.sin(Math.PI * animationProgress)).toFixed(2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="auto" viewBox="0 0 820 304" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(copy.windowTitle)}</title>
  <desc id="desc">${escapeXml(copy.role)}. ${escapeXml(copy.bio)} ${escapeXml(copy.metricsTitle)}: ${escapeXml(copy.metricLabels.map((label, index) => `${label} ${values[index]}`).join(" · "))}. ${escapeXml(copy.topRepositoriesTitle)}: ${escapeXml(data.topRepositories.map((repo) => `${repo.name}, ${repo.stars} ${copy.starLabel}`).join(" · "))}.</desc>
  <rect width="820" height="304" rx="18" fill="#101116"/>
  <rect x="1" y="1" width="818" height="302" rx="17" fill="none" stroke="#ffffff" stroke-opacity=".12"/>
  <circle cx="29" cy="28" r="4" fill="#ff5266" opacity="${pulseOpacity}"/>
  <text x="43" y="32" fill="#e7e0e4" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="10" font-weight="650" letter-spacing="1">GUSTAVX404</text>
  <text x="791" y="32" fill="#ff9b72" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="9" font-weight="600" letter-spacing=".5">${escapeXml(copy.sync)} · ${escapeXml(data.updatedAt)}</text>
  <text x="28" y="78" fill="#f5f2f4" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="19" font-weight="650" letter-spacing="-.3">${escapeXml(copy.role)}</text>
  <text x="28" y="103" fill="#aaa6ad" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="11">${escapeXml(copy.bio)}</text>
  <path d="M28 126h764" stroke="#ffffff" stroke-opacity=".12"/>
  <text x="28" y="148" fill="#aaa6ad" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="9" font-weight="600" letter-spacing="1">${escapeXml(copy.metricsTitle)}</text>
  ${metrics}
  <text x="28" y="237" fill="#aaa6ad" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="9" font-weight="600" letter-spacing="1">${escapeXml(copy.topRepositoriesTitle)}</text>
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
      await execFileAsync("rsvg-convert", ["--width", "1640", "--height", "608", frameSvg, "--output", framePng]);
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
