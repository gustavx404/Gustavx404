import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const width = 1000;
const height = 690;
const frames = [];
const scene = [
  ["$ whoami", ["Gustavx404", "Student and security enthusiast", "Linux user since 2017 · Open to work"]],
  ["$ cat /etc/focus", ["Software development", "Artificial intelligence", "Cybersecurity"]],
  ["$ ls -la ~/projects", [".dotfiles/     Linux configuration files", "homelab/       Home lab experiments", "Estudos/       Study notes and exercises"]],
  ["$ gh profile --summary", ["18 public repositories · 8 stars · 20 followers", "Member since 2018"]],
  ["$ printf \"Building, learning, securing.\"", ["Building, learning, securing."]],
];

function escapeXml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]);
}

function render(visible, titleText, cursor = true, glow = 0.5) {
  const rows = visible.map((row, index) => {
    const y = 176 + index * 22;
    const color = row.kind === "command" ? "#ffbf00" : row.kind === "identity" ? "#fff2cc" : "#c1ad83";
    const weight = row.kind === "identity" ? " font-weight=\"700\"" : "";
    return `<text x="42" y="${y}" fill="${color}"${weight}>${escapeXml(row.text)}</text>`;
  }).join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><filter id="title-glow" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="4"/></filter></defs>
  <rect width="1000" height="690" rx="16" fill="#050505"/>
  <rect x="1" y="1" width="998" height="688" rx="15" fill="none" stroke="#8a5a00" stroke-width="2"/>
  <path d="M1 52h998" stroke="#5b3a00"/>
  <circle cx="25" cy="26" r="5" fill="#ffc400"/><circle cx="44" cy="26" r="5" fill="#ffb000" opacity=".7"/><circle cx="63" cy="26" r="5" fill="#ffda73" opacity=".5"/>
  <text x="88" y="31" fill="#fff2cc" font-family="monospace" font-size="14" font-weight="700">gustavx404@matrix:~</text>
  <text x="972" y="31" fill="#ffbf00" text-anchor="end" font-family="monospace" font-size="11">PROFILE SESSION · ONLINE</text>
  <text x="42" y="112" fill="#ffc400" opacity="${glow}" filter="url(#title-glow)" font-family="monospace" font-size="38" font-weight="700" letter-spacing="3">${escapeXml(titleText)}</text>
  <text x="42" y="112" fill="#ffc400" font-family="monospace" font-size="38" font-weight="700" letter-spacing="3">${escapeXml(titleText)}</text>
  <text x="44" y="140" fill="#c1ad83" font-family="monospace" font-size="12" letter-spacing="1">SOFTWARE · ARTIFICIAL INTELLIGENCE · CYBERSECURITY</text>
  <g font-family="monospace" font-size="15">${rows}</g>
  ${cursor ? `<rect x="42" y="${176 + visible.length * 22 - 15}" width="9" height="17" fill="#ffc400" opacity=".85"/>` : ""}
  <path d="M1 642h998" stroke="#5b3a00"/>
  <text x="24" y="671" fill="#8d7543" font-family="monospace" font-size="11">MATRIX TERMINAL // BUILDING · LEARNING · SECURING</text>
  <text x="976" y="671" fill="#ffbf00" text-anchor="end" font-family="monospace" font-size="11">CTRL+C · exit 0</text>
</svg>`;
}

const directory = await mkdtemp(join(tmpdir(), "profile-terminal-"));
try {
  const visible = [];
  let frame = 0;
  async function addFrame(cursor = true, hold = 1) {
    const svg = join(directory, `frame-${String(frame).padStart(4, "0")}.svg`);
    const png = join(directory, `frame-${String(frame).padStart(4, "0")}.png`);
    const glow = (0.45 + 0.45 * Math.sin(frame * Math.PI / 18)).toFixed(2);
    await writeFile(svg, render(visible, title, cursor, glow));
    await execFileAsync("rsvg-convert", ["--width", String(width), "--height", String(height), svg, "--output", png]);
    for (let copy = 0; copy < hold; copy += 1) frames.push(png);
    frame += 1;
  }

  let title = "";
  const fullTitle = "GUSTAVX404";
  for (let index = 1; index <= fullTitle.length; index += 1) {
    title = fullTitle.slice(0, index);
    await addFrame(false, 3);
  }
  await addFrame(false, 18);

  for (const [command, output] of scene) {
    const row = { kind: "command", text: "" };
    visible.push(row);
    for (let index = 1; index <= command.length; index += 2) {
      row.text = command.slice(0, Math.min(index, command.length));
      await addFrame(true, 2);
    }
    row.text = command;
    await addFrame(false, 4);
    for (const [index, text] of output.entries()) {
      visible.push({ kind: index === 0 && command === "$ whoami" ? "identity" : "output", text });
      await addFrame(true, 5);
    }
    await addFrame(true, 7);
  }

  await addFrame(true, 70);
  await execFileAsync("convert", ["-delay", "4", ...frames, "-loop", "0", "-layers", "Optimize", "assets/profile-terminal.gif"]);
  process.stdout.write("Updated assets/profile-terminal.gif\n");
} finally {
  await rm(directory, { recursive: true, force: true });
}
