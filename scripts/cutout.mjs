/**
 * Cuts the bottle out of images (removes the background), locally on this
 * computer. Nothing is uploaded.
 *
 *   node scripts/cutout.mjs <input.png|folder> <output folder>
 *
 * Every PNG/JPG/WebP in the input becomes a transparent PNG of the same name
 * in the output folder.
 */
import { removeBackground } from "@imgly/background-removal-node";
import { readFileSync, writeFileSync, mkdirSync, statSync, readdirSync } from "node:fs";
import { basename, extname, join } from "node:path";

const [input, outDir] = process.argv.slice(2);
if (!input || !outDir) {
  console.error("Usage: node scripts/cutout.mjs <image|folder> <output folder>");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const files = statSync(input).isDirectory()
  ? readdirSync(input).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort().map((f) => join(input, f))
  : [input];

const types = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };
let n = 0;
for (const file of files) {
  const t = Date.now();
  const type = types[extname(file).toLowerCase()];
  const blob = await removeBackground(new Blob([readFileSync(file)], { type }), {
    model: "medium",
    output: { format: "image/png" },
  });
  const out = join(outDir, basename(file).replace(/\.\w+$/, ".png"));
  writeFileSync(out, Buffer.from(await blob.arrayBuffer()));
  n++;
  console.log(`[${n}/${files.length}] ${basename(out)} ${Date.now() - t}ms`);
}
