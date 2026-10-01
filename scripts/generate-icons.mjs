import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

// Pakai: node scripts/generate-icons.mjs <logo.png>
const SRC = process.argv[2];
if (!SRC) {
  console.error('usage: node scripts/generate-icons.mjs <logo.png>');
  process.exit(1);
}

const OUT = path.resolve('public/icons');
await mkdir(OUT, { recursive: true });

// Icon biasa: logo (sudah berbentuk kotak-membulat) dijadikan penuh 192/512/180
await sharp(SRC).resize(512, 512, { fit: 'cover' }).png().toFile(path.join(OUT, 'icon-512.png'));
await sharp(SRC).resize(192, 192, { fit: 'cover' }).png().toFile(path.join(OUT, 'icon-192.png'));
await sharp(SRC).resize(180, 180, { fit: 'cover' }).png().toFile(path.join(OUT, 'apple-touch-icon.png'));

// Maskable: latar putih solid + logo diskalakan agar kotak biru muat di safe zone 80% (410px).
// Kotak biru logo ≈ 86% lebar source → source 477px → kotak biru ≈ 410px. Tanpa chroma-key:
// warna putih adalah bagian desain logo (halaman buku, teks) dan harus tetap ada.
const fg = await sharp(SRC).resize(477, 477, { fit: 'cover' }).png().toBuffer();

await sharp({
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  },
})
  .composite([{ input: fg, gravity: 'centre' }])
  .png()
  .toFile(path.join(OUT, 'icon-maskable-512.png'));

console.log('icons OK');
