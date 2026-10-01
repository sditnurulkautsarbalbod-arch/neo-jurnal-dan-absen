/**
 * Apply db/schema.sql ke Neon. Idempotent — jalankan kapan saja.
 * Usage: npx tsx scripts/init-db.ts
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';
import { loadEnvFile } from 'node:process';

loadEnvFile(resolve(dirname(fileURLToPath(import.meta.url)), '../.env.local'));

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL tidak ditemukan di .env.local');
  process.exit(1);
}

const sql = neon(databaseUrl);
const schema = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../db/schema.sql'),
  'utf-8'
);

// neon() tidak mendukung multi-statement; buang komentar lalu pecah per statement.
const statements = schema
  .replace(/^--.*$/gm, '')
  .split(/;\s*(?:\r?\n|$)/)
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

for (const statement of statements) {
  await sql.query(statement);
}

// neon() HTTP driver mengembalikan array row langsung.
const rows = (await sql.query(
  `SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name IN
   ('users','classes','students','journals','attendance','settings')
   ORDER BY table_name`
)) as Array<{ table_name: string }>;
console.log('Tabel aktif:', rows.map((r) => r.table_name).join(', '));
console.log('Schema OK.');
