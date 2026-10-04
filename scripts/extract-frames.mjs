/**
 * Turns a video into a WebP image sequence for a scroll-scrubbed canvas.
 *
 *   node scripts/extract-frames.mjs assets-raw/spin.mp4 --name spin --frames 96
 *   node scripts/extract-frames.mjs assets-raw/pour.mp4 --name pour --start 4 --end 16 --frames 80
 *
 * --name            output folder in public/ ("spin" = the reveal, "pour" = the pour)
 * --start / --end   seconds to keep (trim to the best part)
 * --frames          how many frames to keep (60–96 is the sweet spot)
 *
 * Writes public/<name>/d/ (desktop), public/<name>/m/ (mobile) and
 * public/<name>/manifest.json. To swap in a high-quality original later,
 * run this again on the new file. Uses the ffmpeg bundled by ffmpeg-static.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import ffmpeg from "ffmpeg-static";

const [input, ...rest] = process.argv.slice(2);
const raw = (name) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : undefined;
};
const arg = (name, def) => (raw(name) === undefined ? def : Number(raw(name)));
const name = raw("name") ?? "pour";
if (!input) {
  console.error("Usage: node scripts/extract-frames.mjs <video> [--name pour|spin] [--start s] [--end s] [--frames n]");
  process.exit(1);
}

const start = arg("start", 0);
const end = arg("end", 22);
const frames = arg("frames", 80);
const fps = frames / (end - start);
const sizes = { d: 720, m: 420 }; // output widths; ffmpeg never upscales past the source

for (const [size, width] of Object.entries(sizes)) {
  const dir = `public/${name}/${size}`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const r = spawnSync(
    ffmpeg,
    [
      "-y",
      "-ss", String(start),
      "-to", String(end),
      "-i", input,
      "-vf", `fps=${fps},scale='min(${width},iw)':-2`,
      "-frames:v", String(frames),
      "-c:v", "libwebp",
      "-quality", size === "m" ? "62" : "75",
      `${dir}/frame-%04d.webp`,
    ],
    { stdio: "inherit" },
  );
  if (r.status !== 0) process.exit(r.status ?? 1);
}

writeFileSync(
  `public/${name}/manifest.json`,
  JSON.stringify({ count: frames, sizes, pattern: `/${name}/{size}/frame-{i}.webp` }, null, 2),
);
console.log(`Done: ${frames} frames in public/${name}/`);
