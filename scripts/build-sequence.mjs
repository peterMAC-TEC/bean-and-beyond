/**
 * Video -> transparent, scroll-scrubbable image sequence.
 * Extracts frames, cuts the bottle out of each one (locally, see cutout.mjs),
 * fades leftover ghosting, and writes web-sized WebP frames with transparency.
 *
 *   node scripts/build-sequence.mjs assets-raw/spin.mp4 --name spin --frames 96
 *   node scripts/build-sequence.mjs assets-raw/pour.mp4 --name pour --start 4.5 --end 22 --frames 96 --keep 40
 *
 * --name     output folder in public/ ("spin" = hero bottle, "pour" = the pour)
 * --start/--end  seconds to keep
 * --frames   how many frames
 * --keep     how faint a pixel may be and still survive (0-255, default 90).
 *            Lower keeps more (thin milk streams), higher removes more ghosting.
 *
 * Writes public/<name>/d (desktop), public/<name>/m (mobile), manifest.json.
 * Swapping in a better video later = run this again on the new file.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, readdirSync } from "node:fs";
import ffmpeg from "ffmpeg-static";

const [input, ...rest] = process.argv.slice(2);
const raw = (k) => {
  const i = rest.indexOf(`--${k}`);
  return i >= 0 ? rest[i + 1] : undefined;
};
const num = (k, d) => (raw(k) === undefined ? d : Number(raw(k)));
if (!input) {
  console.error("Usage: node scripts/build-sequence.mjs <video> --name <name> [--start s] [--end s] [--frames n] [--keep 0-255]");
  process.exit(1);
}
const name = raw("name") ?? "spin";
const start = num("start", 0);
const end = num("end", 9999);
const frames = num("frames", 96);
const keep = num("keep", 90);

const run = (args) => {
  const r = spawnSync(ffmpeg, ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

const work = `assets-raw/.work/${name}`;
rmSync(work, { recursive: true, force: true });
mkdirSync(`${work}/raw`, { recursive: true });

// 1. frames, evenly spaced across the chosen stretch
const probe = spawnSync(ffmpeg, ["-i", input], { encoding: "utf8" }).stderr;
const [, h, m, s] = probe.match(/Duration: (\d+):(\d+):([\d.]+)/);
const duration = Math.min(end, +h * 3600 + +m * 60 + +s) - start;
run(["-ss", String(start), "-t", String(duration), "-i", input, "-vf", `fps=${frames / duration}`, "-frames:v", String(frames), `${work}/raw/f-%04d.png`]);
console.log(`Extracted ${readdirSync(`${work}/raw`).length} frames`);

// 2. cut the bottle out of every frame
const cut = spawnSync(process.execPath, ["scripts/cutout.mjs", `${work}/raw`, `${work}/cut`], { stdio: "inherit" });
if (cut.status !== 0) process.exit(cut.status ?? 1);

// 3. fade ghosting, then encode transparent WebP at two sizes
const alpha = `lutrgb=a='clip((val-${keep})*255/(255-${keep}),0,255)'`;
for (const [size, width] of Object.entries({ d: 720, m: 420 })) {
  const dir = `public/${name}/${size}`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  run([
    "-i", `${work}/cut/f-%04d.png`,
    "-vf", `format=rgba,${alpha},scale='min(${width},iw)':-2`,
    "-c:v", "libwebp", "-pix_fmt", "yuva420p",
    "-quality", size === "m" ? "65" : "80",
    `${dir}/frame-%04d.webp`,
  ]);
}
writeFileSync(`public/${name}/manifest.json`, JSON.stringify({ count: frames, transparent: true, pattern: `/${name}/{size}/frame-{i}.webp` }, null, 2));
console.log(`Done: public/${name}/`);
