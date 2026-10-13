import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { getCommitTag } from "./commit-quest-refs.mjs";

const execFileAsync = promisify(execFile);
const width = 1000;
const height = 365;
const { stdout: log } = await execFileAsync("git", [
  "log", "--all", "-n", "60", "--date-order", "--format=%H%x1f%ad%x1f%an%x1f%s%x1f%D", "--date=short",
]);
const commits = log.trim().split("\n").filter(Boolean).map((line) => {
  const [hash, date, author, subject, refs] = line.split("\x1f");
  return { hash, shortHash: hash.slice(0, 7), date, author, subject, refs: refs ?? "" };
}).filter((commit) => !/(?:\[bot\]|github-actions|dependabot)/i.test(commit.author))
  .filter((commit) => !/(?:kali|starred)/i.test(commit.subject))
  .slice(0, 6)
  .reverse();
const points = commits.map((_, index) => ({ x: 43, y: 106 + index * 40 }));
const { stdout: branchName } = await execFileAsync("git", ["branch", "--show-current"]);
const branch = branchName.trim() || "detached";
const { stdout: headHashOutput } = await execFileAsync("git", ["rev-parse", "HEAD"]);
const headHash = headHashOutput.trim();
const tempDirectory = await mkdtemp(join(tmpdir(), "commit-log-"));

function xml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]);
}

function render(activeIndex) {
  const rows = commits.map((commit, index) => {
    const { y } = points[index];
    const active = index === activeIndex;
    const tag = getCommitTag(commit, branch, headHash);
    const metadata = `${commit.shortHash} · ${commit.date} · ${commit.author}`;
    return `<g>
      ${active ? `<rect x="68" y="${y - 17}" width="908" height="34" rx="5" fill="#241b08" stroke="#7a5a00"/>` : ""}
      <circle cx="43" cy="${y}" r="${active ? 6 : 4.5}" fill="${active ? "#f5bd00" : "#b58100"}" stroke="${active ? "#fff4c2" : "#493708"}" stroke-width="2"/>
      <text x="82" y="${y - 2}" fill="${active ? "#fff8df" : "#e4dcc2"}" font-family="monospace" font-size="13" font-weight="${active ? "700" : "500"}">${xml(commit.subject)}</text>
      <text x="82" y="${y + 13}" fill="#aa9a70" font-family="monospace" font-size="10">${xml(metadata)}</text>
      ${tag ? `<text x="960" y="${y + 4}" fill="${commit.hash === headHash ? "#f5bd00" : "#d99a00"}" text-anchor="end" font-family="monospace" font-size="10" font-weight="700">${xml(tag)}</text>` : ""}
    </g>`;
  }).join("\n");
  const first = points[0];
  const last = points.at(-1);
  const mascot = `<g transform="translate(43 ${first.y + (last.y - first.y) * activeIndex / Math.max(1, commits.length - 1) - 15})"><circle r="12" fill="#090909" stroke="#fff4c2" stroke-width="2"/><path d="M-8 2Q-9-8 0-9Q9-8 8 2L6 7H-6Z" fill="#1b170d" stroke="#f5bd00"/><ellipse cx="-3" cy="-1" rx="1.6" ry="2.3" fill="#fff8df"/><ellipse cx="3" cy="-1" rx="1.6" ry="2.3" fill="#fff8df"/><path d="M-4 3L0 6L4 3Z" fill="#d99a00"/></g>`;
  const headRef = branch === "detached" ? "HEAD" : `HEAD → ${branch}`;
  const trunk = `<path d="M43 ${first.y}V${last.y}" stroke="#7a5a00" stroke-width="2"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="1000" height="365" rx="14" fill="#090909"/>
  <rect x="1" y="1" width="998" height="363" rx="13" fill="none" stroke="#7a5a00" stroke-width="2"/>
  <path d="M1 44h998" stroke="#362b10"/>
  <circle cx="20" cy="22" r="4" fill="#ffdc70"/><circle cx="35" cy="22" r="4" fill="#f5bd00"/><circle cx="50" cy="22" r="4" fill="#b58100"/>
  <text x="68" y="27" fill="#fff4c2" font-family="monospace" font-size="12" font-weight="700">┌──(gustavx404@redteam)-[~/history]</text>
  <text x="975" y="27" fill="#aa9a70" text-anchor="end" font-family="monospace" font-size="10">${commits.length} RECENT COMMITS</text>
  <text x="25" y="74" fill="#f5bd00" font-family="monospace" font-size="12">└─$ git log --graph --decorate --oneline --author=Gustavo -60</text>
  <rect x="820" y="54" width="155" height="27" rx="5" fill="#1b170d" stroke="#b58100"/>
  <text x="897" y="72" fill="#f5bd00" text-anchor="middle" font-family="monospace" font-size="10" font-weight="700">${xml(headRef)}</text>
  ${trunk}\n  ${rows}\n  ${mascot}
  <path d="M1 337h998" stroke="#362b10"/>
  <text x="24" y="354" fill="#82744e" font-family="monospace" font-size="9">MAIN HISTORY · MESSAGES, HASHES, DATES</text>
  <text x="976" y="354" fill="#f5bd00" text-anchor="end" font-family="monospace" font-size="9">${activeIndex + 1} / ${commits.length} · ${activeIndex === commits.length - 1 ? "HEAD" : "WALKING HISTORY"}</text>
  </svg>`;
}

try {
  const frames = [];
  for (let index = 0; index < commits.length; index += 1) {
    const frameSvg = join(tempDirectory, `frame-${String(index).padStart(2, "0")}.svg`);
    const framePng = join(tempDirectory, `frame-${String(index).padStart(2, "0")}.png`);
    await writeFile(frameSvg, render(index));
    await execFileAsync("rsvg-convert", ["--width", String(width), "--height", String(height), frameSvg, "--output", framePng]);
    frames.push(framePng);
  }
  await execFileAsync("convert", ["-delay", "140", ...frames, "-delay", "60", ...Array(4).fill(frames.at(-1)), "-loop", "0", "-layers", "Optimize", "assets/commit-quest.gif"]);
  process.stdout.write(`Updated commit log (${commits.length} commits)\n`);
} finally {
  await rm(tempDirectory, { recursive: true, force: true });
}
