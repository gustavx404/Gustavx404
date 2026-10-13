import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const frameCount = 32;
const dashboards = [
  {
    source: "assets/tmux-dashboard.svg",
    output: "assets/tmux-dashboard.gif",
    width: 1000,
    height: 570,
    clipId: "dashboard-clip",
    rainColumns: [7, 16, 28, 492, 500, 508, 972, 984, 994],
  },
  {
    source: "assets/tmux-dashboard-mobile.svg",
    output: "assets/tmux-dashboard-mobile.gif",
    width: 620,
    height: 1100,
    clipId: "mobile-clip",
    rainColumns: [7, 17, 29, 302, 310, 318, 590, 601, 613],
  },
];

function makeMatrixRain({ width, height, clipId, rainColumns }, frame) {
  const offset = Math.round((frame / frameCount) * height);
  const spacing = width > 800 ? 22 : 26;
  const glyphs = [];

  for (const [column, x] of rainColumns.entries()) {
    for (let index = 0; index <= Math.ceil(height / spacing); index += 1) {
      const streamOffset = (column * 7) % height;
      const y = (index * spacing + offset + streamOffset) % height;
      const seed = index * 13 + column * 19 + Math.floor(frame / 2);
      const glyph = seed % 3 === 0 ? "0" : "1";
      const opacity = index % 7 === 0 ? "1" : index % 3 === 0 ? ".72" : ".48";
      glyphs.push(`<text x="${x}" y="${y}" opacity="${opacity}">${glyph}</text>`);
    }
  }

  return `<g clip-path="url(#${clipId})" fill="#39ff14" font-family="monospace" font-size="12" opacity=".42">${glyphs.join("")}</g>`;
}

async function buildDashboard(config) {
  const source = await readFile(config.source, "utf8");
  const frameDirectory = await mkdtemp(join(tmpdir(), "tmux-matrix-"));

  try {
    const frames = [];

    for (let frame = 0; frame < frameCount; frame += 1) {
      const activeTab = Math.floor(frame / (frameCount / 4));
      const cursorOpacity = frame % 2 === 0 ? "1" : ".12";
      let svg = source
        .replace("<!-- MATRIX_LAYER -->", makeMatrixRain(config, frame))
        .replace(/<text data-cursor="true"([^>]*)>/, `<text data-cursor="true"$1 opacity="${cursorOpacity}">`)
        .replace(/<circle data-pulse="true"([^>]*)\/>/, `<circle data-pulse="true"$1 opacity="${frame % 4 === 0 ? ".5" : "1"}"/>`)
        .replace(/<text data-tab="(\d+)"([^>]*)fill="[^"]+"([^>]*)>/g, (tab, tabNumber, beforeFill, afterFill) => {
          const active = Number(tabNumber) === activeTab;
          const color = active ? "#39ff14" : "#8aa68d";
          const weight = active ? ' font-weight="700"' : "";
          return `<text data-tab="${tabNumber}"${beforeFill}fill="${color}"${weight}${afterFill}>`;
        });

      svg = svg.replace(
        /<rect data-pane="(\d+)"([^>]*)stroke="#176b2a"\/>/g,
        (pane, paneNumber) => Number(paneNumber) === activeTab
          ? pane.replace('stroke="#176b2a"', 'stroke="#39ff14" stroke-width="2"')
          : pane,
      );

      const svgPath = join(frameDirectory, `frame-${String(frame).padStart(2, "0")}.svg`);
      const pngPath = join(frameDirectory, `frame-${String(frame).padStart(2, "0")}.png`);
      await writeFile(svgPath, svg);
      await execFileAsync("rsvg-convert", [
        "--width", String(config.width), "--height", String(config.height), svgPath, "--output", pngPath,
      ]);
      frames.push(pngPath);
    }

    await execFileAsync("convert", [
      "-dispose", "Background", "-delay", "20", ...frames, "-loop", "0", config.output,
    ]);
    process.stdout.write(`Updated ${config.output}\n`);
  } finally {
    await rm(frameDirectory, { recursive: true, force: true });
  }
}

for (const dashboard of dashboards) await buildDashboard(dashboard);
