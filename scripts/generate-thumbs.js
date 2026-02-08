const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC_DIR = path.resolve(__dirname, '../src/images');
const OUT_DIR = path.resolve(__dirname, '../src/images/thumbs');
const SIZE = 300;

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function processFile(file) {
  const ext = path.extname(file).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return;
  const src = path.join(SRC_DIR, file);
  const out = path.join(OUT_DIR, file);
  try {
    await sharp(src)
      .resize(SIZE, SIZE, { fit: 'cover' })
      .toFile(out);
    console.log('wrote', out);
  } catch (err) {
    console.error('failed', src, err.message);
  }
}

async function main() {
  try {
    const files = await fs.promises.readdir(SRC_DIR);
    await ensureDir(OUT_DIR);
    await Promise.all(files.map(processFile));
    console.log('done');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
