import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const width = 1000;
const height = 350;
const fallbackProjects = [
  "backup-omarchy/Omarchy backup and sync plugin with Quickshell dashboard",
  "yubikey-omarchy/Community Omarchy widget for YubiKey OATH codes",
  ".dotfiles/CachyOS and Arch Linux dotfiles with Fish, Kitty, and Starship",
];
const prompt = "gustavx404@redteam:~/oss$ ";

function summarizeProject(repo) {
  const description = repo.description ? `  ${repo.description}` : "";
  const line = `${repo.name}/${description}`;
  if (line.length <= 78) return line;

  const shortened = line.slice(0, 77).replace(/\s+\S*$/, "").trimEnd();
  return `${shortened}…`;
}

async function getProjects() {
  const token = process.env.GITHUB_TOKEN;

  try {
    const response = await fetch("https://api.github.com/users/Gustavx404/repos?sort=updated", {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);

    const repos = (await response.json())
      .filter((repo) => !repo.fork && repo.name.toLowerCase() !== "gustavx404")
      .sort((left, right) => Date.parse(right.pushed_at ?? right.updated_at) - Date.parse(left.pushed_at ?? left.updated_at))
      .slice(0, 3);

    return repos.length
      ? repos.map(summarizeProject)
      : ["No public project repositories found"];
  } catch (error) {
    process.stderr.write(`Could not load GitHub repositories: ${error.message}\n`);
  }

  return fallbackProjects;
}

const projects = await getProjects();
const scene = [
  ["whoami", ["Gustavx404", "Red Team Operator", "Linux user since 2017 · Open to work"]],
  ["cat ~/focus", ["Red Team · Web Application Security", "Software · Artificial Intelligence · Cybersecurity"]],
  ["ls -la ~/oss", projects],
];
const visible = scene.flatMap(([command, output]) => [
  { kind: "command", text: command },
  ...output.map((text, index) => ({
    kind: index === 0 && command === "whoami" ? "identity" : "output",
    text,
  })),
]);

function escapeXml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]);
}

function render(visible, cursorX = null) {
  const rows = visible.map((row, index) => {
    const y = 77 + index * 21;
    const text = row.kind === "command" ? `${prompt}${row.text}` : row.text;
    const color = row.kind === "command" ? "#f5bd00" : row.kind === "identity" ? "#fff4c2" : "#d2c9ad";
    const weight = row.kind === "identity" ? " font-weight=\"700\"" : "";
    return `<text x="42" y="${y}" fill="${color}"${weight}>${escapeXml(text)}</text>`;
  }).join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" rx="8" fill="#090909"/>
  <rect x="1" y="1" width="998" height="${height - 2}" rx="7" fill="none" stroke="#f5bd00" stroke-width="2"/>
  <path d="M1 42h998" stroke="#362b10"/>
  <circle cx="23" cy="21" r="6" fill="#ffdc70"/><circle cx="44" cy="21" r="6" fill="#f5bd00"/><circle cx="65" cy="21" r="6" fill="#b58100"/>
  <text x="500" y="26" fill="#b8ad8c" text-anchor="middle" font-family="monospace" font-size="13">gustavx404@redteam: ~/oss</text>
  <g font-family="monospace" font-size="15">${rows}</g>
  ${cursorX === null ? "" : `<rect x="${cursorX}" y="${77 + (visible.length - 1) * 21 - 14}" width="9" height="17" fill="#f5bd00" opacity=".9"/>`}
</svg>`;
}

const directory = await mkdtemp(join(tmpdir(), "profile-terminal-"));
try {
  const frames = [];
  const delays = [];
  async function addFrame(index, rows, cursorX, delay) {
    const svg = join(directory, `frame-${String(index).padStart(2, "0")}.svg`);
    const png = join(directory, `frame-${String(index).padStart(2, "0")}.png`);
    await writeFile(svg, render(rows, cursorX));
    await execFileAsync("rsvg-convert", ["--width", String(width), "--height", String(height), svg, "--output", png]);
    frames.push(png);
    delays.push(delay);
  }

  let frameIndex = 0;
  const shown = [];
  for (const [command, output] of scene) {
    for (let end = 1; end <= command.length; end += 2) {
      const partial = command.slice(0, end);
      const currentRows = [...shown, { kind: "command", text: partial }];
      await addFrame(frameIndex++, currentRows, 42 + (prompt.length + partial.length) * 9, 12);
    }
    if (!shown.length || shown.at(-1).text !== command) shown.push({ kind: "command", text: command });
    await addFrame(frameIndex++, shown, 42 + (prompt.length + command.length) * 9, 9);
    for (const text of output) {
      shown.push({ kind: shown.length === 1 && command === "whoami" ? "identity" : "output", text });
      await addFrame(frameIndex++, shown, 42 + Math.min(text.length, 78) * 9, 22);
    }
  }
  await addFrame(frameIndex++, shown, null, 8);
  await addFrame(frameIndex++, shown, 42 + Math.min(shown.at(-1).text.length, 78) * 9, 450);
  const gifArgs = frames.flatMap((frame, index) => ["-delay", String(delays[index]), frame]);
  await execFileAsync("convert", [...gifArgs, "-loop", "0", "-layers", "Optimize", "assets/profile-terminal.gif"]);
  process.stdout.write("Updated assets/profile-terminal.gif\n");
} finally {
  await rm(directory, { recursive: true, force: true });
}
