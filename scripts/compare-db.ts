/**
 * Perbandingan READ-ONLY: Google Sheet lama (doGet) vs Neon.
 * Tidak menulis apa pun ke kedua database.
 * Usage: npx tsx scripts/compare-db.ts
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';
import { loadEnvFile } from 'node:process';

loadEnvFile(resolve(dirname(fileURLToPath(import.meta.url)), '../.env.local'));

const GAS_URL =
  'https://script.google.com/macros/s/AKfycbxha17-5wId8MEVF9Liye3G33eCICuVXpcTn_GNTWhcp_z_SFS94DOwZv3jQgB4NYbC/exec';
const SNAPSHOT = 'C:\\Users\\LENOVO\\AppData\\Local\\Temp\\opencode\\sheet_sample.json';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL tidak ditemukan di .env.local');
  process.exit(1);
}
const sql = neon(databaseUrl);

interface SheetData {
  users?: Array<{ id: unknown }>;
  classes?: Array<{ id: unknown }>;
  students?: Array<{ id: unknown }>;
  journals?: Array<{ id: unknown }>;
  attendance?: Array<{ id: unknown }>;
  settings?: Array<{ id?: unknown }>;
}

async function loadSheet(): Promise<{ data: SheetData; source: string }> {
  try {
    const response = await fetch(GAS_URL, { redirect: 'follow' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { data: (await response.json()) as SheetData, source: 'LIVE (GAS doGet)' };
  } catch (error) {
    console.warn(
      'Live fetch gagal, pakai snapshot lokal:',
      error instanceof Error ? error.message : error
    );
    return { data: JSON.parse(readFileSync(SNAPSHOT, 'utf-8')) as SheetData, source: 'SNAPSHOT LOKAL' };
  }
}

const COLLECTIONS = ['users', 'classes', 'students', 'journals', 'attendance', 'settings'] as const;

const { data: sheet, source } = await loadSheet();
console.log(`Sumber sheet: ${source}\n`);

let anyDiff = false;
console.log('collection | sheet(unik) | neon | selisih | id hanya di sheet | id hanya di neon');
console.log('-----------|-------------|------|---------|-------------------|------------------');

for (const name of COLLECTIONS) {
  const raw = (sheet[name] ?? []) as Array<{ id: unknown }>;
  const sheetIds = new Set(raw.map((r) => String(r.id ?? '')));

  const rows = (await sql.query(`SELECT id::text AS id FROM ${name}`)) as Array<{ id: string }>;
  const neonIds = new Set(rows.map((r) => r.id));

  const onlySheet = [...sheetIds].filter((id) => id !== '' && !neonIds.has(id));
  const onlyNeon = [...neonIds].filter((id) => !sheetIds.has(id));
  const diff = onlySheet.length + onlyNeon.length;
  if (diff > 0 || sheetIds.size !== neonIds.size) anyDiff = true;

  console.log(
    `${name.padEnd(10)} | ${String(sheetIds.size).padStart(11)} | ${String(neonIds.size).padStart(4)} | ${String(neonIds.size - sheetIds.size).padStart(7)} | ${String(onlySheet.length).padStart(17)} | ${String(onlyNeon.length).padStart(16)}`
  );
  if (onlySheet.length > 0) {
    console.log(`  -> hanya di Sheet (${onlySheet.length}): ${onlySheet.slice(0, 10).join(', ')}${onlySheet.length > 10 ? ', ...' : ''}`);
  }
  if (onlyNeon.length > 0) {
    console.log(`  -> hanya di Neon (${onlyNeon.length}): ${onlyNeon.slice(0, 10).join(', ')}${onlyNeon.length > 10 ? ', ...' : ''}`);
  }
}

console.log(
  anyDiff
    ? '\nADA SELISIH — kemungkinan data baru masuk setelah copy terakhir (app lama vs app baru paralel).'
    : '\nSINKRON — jumlah & id semua collection identik.'
);
