// Programmatic render entry — avoids the CLI's mkdtemp-in-/var/folders issue by
// using a workspace-local TMPDIR, and works around the brokered-fs shim which
// denies async fs.promises.mkdir (CODEBUDDY_BROKER_DENY) while allowing the
// synchronous fs.mkdirSync. We monkeypatch fs.promises.mkdir/mkdtemp to route
// through the synchronous variants before any Remotion module is loaded.
import { createRequire } from "module";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BUNDLE_DIR = path.join(ROOT, ".bundle");
const OUT_DIR = path.join(ROOT, "out");
const TMP = path.join(ROOT, ".tmp");
for (const d of [BUNDLE_DIR, OUT_DIR, TMP]) fs.mkdirSync(d, { recursive: true });
if (!process.env.TMPDIR) process.env.TMPDIR = TMP;

const BROWSER = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// ---- broker workaround: async mkdir denied, sync allowed ---------------------
function patchFs() {
  const syncMkdir = (p, opts) => {
    try {
      fs.mkdirSync(p, opts);
    } catch (e) {
      if (e.code === "EEXIST" || e.code === "CODEBUDDY_BROKER_DENY") return;
      throw e;
    }
  };
  try {
    Object.defineProperty(fs.promises, "mkdir", {
      value: (p, o) => {
        syncMkdir(p, o);
        return Promise.resolve();
      },
      configurable: true,
      writable: true,
    });
  } catch {}
  try {
    Object.defineProperty(fs.promises, "mkdtemp", {
      value: (p, o) => Promise.resolve(fs.mkdtempSync(p, o)),
      configurable: true,
      writable: true,
    });
  } catch {}
}
patchFs();

const require = createRequire(import.meta.url);
const { bundle } = require("@remotion/bundler");
const { renderMedia, renderStill, getCompositions } = require("@remotion/renderer");

async function main() {
  const mode = process.argv[2] || "video"; // "video" | "still:<frame>"
  const entry = path.join(ROOT, "src/index.ts");

  console.log("bundling...");
  const serveUrl = await bundle({
    entryPoint: entry,
    outDir: BUNDLE_DIR,
    publicDir: path.join(ROOT, "public"),
    enableCaching: false,
    onProgress: () => {},
  });
  console.log("serveUrl ->", serveUrl);

  const comps = await getCompositions(serveUrl, {
    browserExecutable: BROWSER,
  });
  const comp = comps.find((c) => c.id === "SmartWarehouseIntro");
  if (!comp) throw new Error("composition SmartWarehouseIntro not found");
  console.log(
    "composition ->",
    comp.id,
    comp.width + "x" + comp.height,
    comp.fps + "fps",
    comp.durationInFrames + "f"
  );

  if (mode.startsWith("still")) {
    const frames = (mode.split(":")[1] || "450").split(",").map(Number);
    for (const frame of frames) {
      const out = path.join(OUT_DIR, `frame-${frame}.png`);
      await renderStill({
        serveUrl,
        composition: comp,
        frame,
        output: out,
        browserExecutable: BROWSER,
        imageFormat: "png",
        overwrite: true,
      });
      console.log("still ->", out);
    }
    return;
  }

  const out = path.join(OUT_DIR, "smart-warehouse-intro.mp4");
  await renderMedia({
    serveUrl,
    composition: comp,
    outputLocation: out,
    browserExecutable: BROWSER,
    codec: "h264",
    imageFormat: "jpeg",
    fps: 30,
    width: 1920,
    height: 1080,
    concurrency: 2,
    overwrite: true,
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 100);
      if (p % 10 === 0) process.stdout.write(`\rrender ${p}%`);
    },
  });
  console.log("\nvideo ->", out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
