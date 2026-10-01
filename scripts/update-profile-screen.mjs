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
    windowTitle: "GUSTAVX404 // TTY 01",
    sync: "SYNC",
    command: "whoami",
    name: "Gustav",
    role: "CYBERSECURITY  →  AI ENGINEERING",
    bio: "Building secure systems and exploring applied AI. Linux user since 2017.",
    skillsTitle: "01 // CORE SKILLS",
    skills: ["CYBERSECURITY", "AI ENGINEERING", "LINUX · 2017+", "3D PRINTING"],
    metricsTitle: "02 // GITHUB SIGNAL",
    metricLabels: ["PUBLIC REPOSITORIES", "PROJECT STARS", "FOLLOWERS", "MEMBER SINCE"],
    metricUnit: "// TOTAL",
    footer: "CONTACT // LINKEDIN · TRYHACKME",
  },
  "pt-BR": {
    windowTitle: "GUSTAVX404 // TTY 01",
    sync: "SINCRONIA",
    command: "whoami",
    name: "Gustav",
    role: "CIBERSEGURANÇA  →  ENGENHARIA DE IA",
    bio: "Desenvolvo sistemas seguros e exploro aplicações de IA. Uso Linux desde 2017.",
    skillsTitle: "01 // HABILIDADES-CHAVE",
    skills: ["CIBERSEGURANÇA", "ENGENHARIA DE IA", "LINUX · 2017+", "IMPRESSÃO 3D"],
    metricsTitle: "02 // SINAIS DO GITHUB",
    metricLabels: ["REPOSITÓRIOS PÚBLICOS", "ESTRELAS NOS PROJETOS", "SEGUIDORES", "MEMBRO DESDE"],
    metricUnit: "// TOTAL",
    footer: "CONTATO // LINKEDIN · TRYHACKME",
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
  const positions = [12, 213, 414, 615];
  const skills = copy.skills.map((skill, index) => {
    const x = positions[index];
    const accent = index % 2 === 0 ? "#ffbd4a" : "#b8f56b";
    return `
      <g transform="translate(${x} 204)">
        <rect width="193" height="40" rx="3" fill="#151b17" stroke="#39473d"/>
        <rect x="12" y="14" width="4" height="12" fill="${accent}"/>
        <text x="25" y="24" fill="#e8eee9" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9" font-weight="600" letter-spacing=".3">[ ${escapeXml(skill)} ]</text>
      </g>`.trim();
  }).join("\n  ");
  const metrics = values.map((value, index) => {
    const x = positions[index];
    const accent = index % 2 === 0 ? "#ffbd4a" : "#b8f56b";
    return `
      <g transform="translate(${x} 285)">
        <rect width="193" height="64" rx="3" fill="#151b17" stroke="#39473d"/>
        <rect x="12" y="13" width="4" height="10" fill="${accent}"/>
        <text x="24" y="21" fill="#94a197" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="8" letter-spacing=".35">${escapeXml(copy.metricLabels[index])}</text>
        <text x="12" y="51" fill="#e8eee9" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="23" font-weight="700">${escapeXml(value)}</text>
        <text x="179" y="51" fill="${accent}" text-anchor="end" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9">${copy.metricUnit}</text>
      </g>`.trim();
  }).join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="820" height="380" viewBox="0 0 820 380" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(copy.windowTitle)} · ${escapeXml(copy.name)}</title>
  <desc id="desc">${escapeXml(copy.role)}. ${escapeXml(copy.bio)} ${escapeXml(copy.metricsTitle)}: ${escapeXml(copy.metricLabels.map((label, index) => `${label} ${values[index]}`).join(" · "))}.</desc>
  <rect width="820" height="380" rx="8" fill="#0b0e0d"/>
  <rect x="1" y="1" width="818" height="378" rx="7" fill="none" stroke="#303a34"/>
  <path d="M8 31h804" stroke="#303a34"/>
  <circle cx="17" cy="16" r="3" fill="#ffbd4a"/>
  <circle cx="29" cy="16" r="3" fill="#b8f56b"/>
  <circle cx="41" cy="16" r="3" fill="#58645d"/>
  <text x="55" y="20" fill="#94a197" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10" letter-spacing="1">${escapeXml(copy.windowTitle)}</text>
  <text x="805" y="20" fill="#ffbd4a" text-anchor="end" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9" letter-spacing=".5">${escapeXml(copy.sync)}: ${escapeXml(data.updatedAt)}</text>
  <text x="15" y="58" fill="#b8f56b" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11">gustavx404@workstation:~$ ${escapeXml(copy.command)}</text>
  <rect x="237" y="47" width="7" height="13" rx="1" fill="#b8f56b" opacity=".8"/>
  <text x="15" y="99" fill="#f0f3ed" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="30" font-weight="700">${escapeXml(copy.name)}</text>
  <text x="15" y="124" fill="#ffbd4a" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12" font-weight="600" letter-spacing=".5">${escapeXml(copy.role)}</text>
  <text x="15" y="151" fill="#b4beb6" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11">${escapeXml(copy.bio)}</text>
  <path d="M15 170h790" stroke="#303a34"/>
  <text x="15" y="192" fill="#ffbd4a" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9" letter-spacing="1">${escapeXml(copy.skillsTitle)}</text>
  ${skills}
  <text x="15" y="273" fill="#ffbd4a" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9" letter-spacing="1">${escapeXml(copy.metricsTitle)}</text>
  ${metrics}
  <path d="M15 363h790" stroke="#303a34"/>
  <text x="15" y="374" fill="#657269" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="7" letter-spacing=".35">${escapeXml(copy.footer)}</text>
</svg>
`;
}

const data = await getProfileData();
for (const locale of Object.keys(palettes)) {
  const filename = `assets/profile-screen.${locale}.svg`;
  await writeFile(filename, createScreen(data, locale));
  process.stdout.write(`Updated ${filename}\n`);
}
