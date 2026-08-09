#!/usr/bin/env node
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const WORKDIR = path.resolve(__dirname, '..');
const assets = [
  { src: 'assets/splash-icon.png', out: 'assets/splash-icon-square.png', size: 1024 },
  { src: 'assets/icon.png', out: 'assets/icon-square.png', size: 1024 },
  { src: 'assets/android-icon-foreground.png', out: 'assets/android-icon-foreground-square.png', size: 1024 },
  { src: 'assets/android-icon-background.png', out: 'assets/android-icon-background-square.png', size: 1024 },
  { src: 'assets/android-icon-monochrome.png', out: 'assets/android-icon-monochrome-square.png', size: 1024 },
];

async function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });
}

async function processAsset(a) {
  const src = path.join(WORKDIR, a.src);
  const out = path.join(WORKDIR, a.out);
  if (!fs.existsSync(src)) {
    console.warn('Skipping (not found):', a.src);
    return;
  }

  try {
    await ensureDir(out);
    await sharp(src)
      .resize({ width: a.size, height: a.size, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(out);
    console.log('Wrote', a.out);
  } catch (err) {
    console.error('Failed processing', a.src, err.message || err);
  }
}

async function main() {
  console.log('Generating square icons (requires sharp).');
  for (const a of assets) {
    // process sequentially to avoid high memory use
    // eslint-disable-next-line no-await-in-loop
    await processAsset(a);
  }
  console.log('Done. Update app.json if you want different filenames.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
