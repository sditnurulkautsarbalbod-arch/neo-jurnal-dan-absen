/**
 * Copy data Google Sheet (read-only doGet) -> Neon. Idempotent, aman diulang kapan saja.
 * Google Sheet TIDAK pernah diubah — hanya GET.
 * Usage: npx tsx scripts/migrate-from-sheets.ts
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

// --- Bentuk data dari GAS (dari snapshot produksi) ---
interface SheetUser {
  id: string; fullName: string; username: string; password?: string; role: string;
}
interface SheetClass {
  id: string; name: string; studentCount?: number;
}
interface SheetStudent {
  id: string; nisn?: unknown; name: string; class: string; gender: string;
}
interface SheetJournal {
  id: string | number; date?: string; class: string; jam?: string; materi?: string;
  aktivitas?: string; izin?: number; sakit?: number; tanpaKet?: number;
  teacher?: string; teacherName?: string;
}
interface SheetAttendance {
  id: string; date?: string; class: string; teacher?: string;
  students_json?: unknown;
}
interface SheetSettings {
  id?: string; semester?: string; tahunAjaran?: string; kepalaSekolah?: string;
}
interface SheetData {
  users?: SheetUser[]; classes?: SheetClass[]; students?: SheetStudent[];
  journals?: SheetJournal[]; attendance?: SheetAttendance[]; settings?: SheetSettings[];
}

let usedSnapshot = false;

async function loadSheet(): Promise<SheetData> {
  // GAS exec URL kadang 404 sesaat (rate-limit Google) -> coba beberapa kali sebelum fallback.
  const MAX_ATTEMPTS = 4;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(GAS_URL, { redirect: 'follow' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as SheetData;
    } catch (error) {
      const message = error instanceof Error ? error.message : error;
      console.warn(`Live fetch gagal (percobaan ${attempt}/${MAX_ATTEMPTS}): ${message}`);
      if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, attempt * 5000));
    }
  }
  usedSnapshot = true;
  console.warn('Semua percobaan live gagal, pakai snapshot lokal.');
  return JSON.parse(readFileSync(SNAPSHOT, 'utf-8')) as SheetData;
}

// --- Transform helpers ---
const stripApostrophe = (v: unknown): string =>
  v === null || v === undefined ? '' : String(v).replace(/^'/, '');

function normDate(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

const toInt = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

function dedupByLastId<T extends { id: string }>(rows: T[]): T[] {
  return Array.from(new Map(rows.map((r) => [r.id, r])).values());
}

// --- Batch upsert ---
interface Column<T> {
  name: string;
  cast: string;
  get: (row: T) => unknown;
}

const BATCH_ROWS = 300; // kolom terbanyak = journals (12) -> 3600 param/statement, aman < 65535

async function upsertRows<T extends { id: string }>(
  table: string,
  columns: Array<Column<T>>,
  rows: T[]
): Promise<number> {
  const allCols: Array<Column<T>> = [
    { name: 'id', cast: 'text', get: (r) => r.id },
    ...columns,
  ];
  const setPairs = allCols.map((c) => `${c.name}=EXCLUDED.${c.name}`).join(', ');
  const colNames = allCols.map((c) => c.name).join(', ');
  let statements = 0;

  for (let i = 0; i < rows.length; i += BATCH_ROWS) {
    const batch = rows.slice(i, i + BATCH_ROWS);
    const params: unknown[] = [];
    const tuples: string[] = [];
    for (const row of batch) {
      const placeholders = allCols.map((c) => {
        params.push(c.get(row));
        return `$${params.length}::${c.cast}`;
      });
      tuples.push(`(${placeholders.join(', ')})`);
    }
    const text =
      `INSERT INTO ${table} (${colNames}) VALUES ${tuples.join(', ')} ` +
      `ON CONFLICT (id) DO UPDATE SET ${setPairs}`;
    await sql.query(text, params);
    statements += 1;
  }
  return statements;
}

// --- Transform per collection ---
interface PrepUser {
  id: string; fullName: string; username: string; password: string | null; role: string;
}

function prepareUsers(raw: SheetUser[]): PrepUser[] {
  const byId = dedupByLastId(
    raw.map((u) => ({
      id: String(u.id),
      fullName: u.fullName ?? '',
      username: u.username ?? '',
      password: u.password ?? null, // hash/plaintext dipertahankan apa adanya
      role: u.role ?? 'guru',
    }))
  );
  // UNIQUE constraint users.username: ada entri ganda (mis. furqan/furqon) -> pertama menang.
  const seen = new Map<string, PrepUser>();
  for (const u of byId) {
    const existing = seen.get(u.username);
    if (existing) {
      console.warn(`users: username duplikat "${u.username}" — id=${u.id} dilewati (pakai id=${existing.id})`);
      continue;
    }
    seen.set(u.username, u);
  }
  return Array.from(seen.values());
}

function prepareClasses(raw: SheetClass[]): SheetClass[] {
  return dedupByLastId(
    raw.map((c) => ({
      id: String(c.id),
      name: c.name ?? '',
      studentCount: toInt(c.studentCount),
    }))
  );
}

interface PrepStudent { id: string; nisn: string | null; name: string; class: string; gender: string }

// Siswa yang sengaja dihapus dari Neon — jangan dikembalikan oleh copy ulang.
const STUDENT_EXCLUDE_IDS = new Set(['3164600770']);

function prepareStudents(raw: SheetStudent[]): PrepStudent[] {
  return dedupByLastId(
    raw
      .filter((s) => !STUDENT_EXCLUDE_IDS.has(String(s.id)))
      .map((s) => ({
      id: String(s.id),
      nisn: s.nisn === null || s.nisn === undefined || s.nisn === '' ? null : stripApostrophe(s.nisn),
      name: s.name ?? '',
      class: s.class ?? '',
      gender: s.gender === 'P' ? 'P' : 'L',
    }))
  );
}

interface PrepJournal {
  id: string; date: string | null; class: string; jam: string | null; materi: string | null;
  aktivitas: string | null; izin: number; sakit: number; tanpa_ket: number;
  teacher: string | null; teacher_name: string | null;
}

function prepareJournals(raw: SheetJournal[]): PrepJournal[] {
  return dedupByLastId(
    raw.map((j) => ({
      id: String(j.id),
      date: normDate(j.date),
      class: j.class ?? '',
      jam: j.jam === undefined || j.jam === '' ? null : stripApostrophe(j.jam),
      materi: j.materi ?? null,
      aktivitas: j.aktivitas ?? null,
      izin: toInt(j.izin),
      sakit: toInt(j.sakit),
      tanpa_ket: toInt(j.tanpaKet),
      teacher: j.teacher ?? null,
      teacher_name: j.teacherName ?? null,
    }))
  );
}

interface PrepAttendance {
  id: string; date: string | null; class: string; teacher: string | null; students: string;
}

function prepareAttendance(raw: SheetAttendance[]): PrepAttendance[] {
  const prepped = raw.map<PrepAttendance>((a) => {
    let studentsJson = '[]';
    try {
      const parsed =
        typeof a.students_json === 'string' ? JSON.parse(a.students_json) : a.students_json;
      studentsJson = JSON.stringify(Array.isArray(parsed) ? parsed : []);
    } catch {
      console.warn(`attendance ${a.id}: students_json rusak, disimpan sebagai []`);
    }
    return {
      id: String(a.id),
      date: normDate(a.date),
      class: a.class ?? '',
      teacher: a.teacher ?? null,
      students: studentsJson,
    };
  });
  return dedupByLastId(prepped);
}

interface PrepSettings {
  id: string; semester: string | null; tahunAjaran: string | null; kepalaSekolah: string | null;
}

function prepareSettings(raw: SheetSettings[]): PrepSettings[] {
  return dedupByLastId(
    raw.map((s) => ({
      id: s.id || 'main',
      semester: s.semester ?? null,
      tahunAjaran: s.tahunAjaran ?? null,
      kepalaSekolah: s.kepalaSekolah ?? null,
    }))
  );
}

// --- Main ---
const sheet = await loadSheet();

const users = prepareUsers(sheet.users ?? []);
const classes = prepareClasses(sheet.classes ?? []);
const students = prepareStudents(sheet.students ?? []);
const journals = prepareJournals(sheet.journals ?? []);
const attendance = prepareAttendance(sheet.attendance ?? []);
const settings = prepareSettings(sheet.settings ?? []);

const failures: string[] = [];
let totalStatements = 0;

async function run(
  name: string,
  fn: () => Promise<number>
): Promise<void> {
  try {
    totalStatements += await fn();
    console.log(`${name}: upsert selesai`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${name}: ${message}`);
    console.error(`${name}: GAGAL — ${message}`);
  }
}

await run('users', () =>
  upsertRows('users', [
    { name: 'full_name', cast: 'text', get: (r) => r.fullName },
    { name: 'username', cast: 'text', get: (r) => r.username },
    { name: 'password', cast: 'text', get: (r) => r.password },
    { name: 'role', cast: 'text', get: (r) => r.role },
  ], users)
);
await run('classes', () =>
  upsertRows('classes', [
    { name: 'name', cast: 'text', get: (r) => r.name },
    { name: 'student_count', cast: 'int', get: (r) => r.studentCount },
  ], classes)
);
await run('students', () =>
  upsertRows('students', [
    { name: 'nisn', cast: 'text', get: (r) => r.nisn },
    { name: 'name', cast: 'text', get: (r) => r.name },
    { name: 'class', cast: 'text', get: (r) => r.class },
    { name: 'gender', cast: 'text', get: (r) => r.gender },
  ], students)
);
await run('journals', () =>
  upsertRows('journals', [
    { name: 'date', cast: 'date', get: (r) => r.date },
    { name: 'class', cast: 'text', get: (r) => r.class },
    { name: 'jam', cast: 'text', get: (r) => r.jam },
    { name: 'materi', cast: 'text', get: (r) => r.materi },
    { name: 'aktivitas', cast: 'text', get: (r) => r.aktivitas },
    { name: 'izin', cast: 'int', get: (r) => r.izin },
    { name: 'sakit', cast: 'int', get: (r) => r.sakit },
    { name: 'tanpa_ket', cast: 'int', get: (r) => r.tanpa_ket },
    { name: 'teacher', cast: 'text', get: (r) => r.teacher },
    { name: 'teacher_name', cast: 'text', get: (r) => r.teacher_name },
  ], journals)
);
await run('attendance', () =>
  upsertRows('attendance', [
    { name: 'date', cast: 'date', get: (r) => r.date },
    { name: 'class', cast: 'text', get: (r) => r.class },
    { name: 'teacher', cast: 'text', get: (r) => r.teacher },
    { name: 'students', cast: 'jsonb', get: (r) => r.students },
  ], attendance)
);
await run('settings', () =>
  upsertRows('settings', [
    { name: 'semester', cast: 'text', get: (r) => r.semester ?? null },
    { name: 'tahun_ajaran', cast: 'text', get: (r) => r.tahunAjaran ?? null },
    { name: 'kepala_sekolah', cast: 'text', get: (r) => r.kepalaSekolah ?? null },
  ], settings)
);

// --- Verifikasi jumlah row ---
const expected: Array<{ name: string; count: number }> = [
  { name: 'users', count: users.length },
  { name: 'classes', count: classes.length },
  { name: 'students', count: students.length },
  { name: 'journals', count: journals.length },
  { name: 'attendance', count: attendance.length },
  { name: 'settings', count: settings.length },
];

let mismatch = failures.length > 0;
console.log('\ncollection  | sheet | neon | status');
console.log('------------|-------|------|-------');
for (const exp of expected) {
  let neonCount = -1;
  try {
    const rows = (await sql.query(
      `SELECT count(*)::int AS n FROM ${exp.name}`
    )) as Array<{ n: number }>;
    neonCount = rows[0]?.n ?? -1;
  } catch {
    neonCount = -1;
  }
  const ok = neonCount === exp.count;
  if (!ok) mismatch = true;
  console.log(
    `${exp.name.padEnd(11)} | ${String(exp.count).padStart(5)} | ${String(neonCount).padStart(4)} | ${ok ? 'OK' : 'GAGAL'}`
  );
}

console.log(`\nTotal statement query: ${totalStatements}`);
if (failures.length > 0) {
  console.error('Koleksi gagal:');
  for (const f of failures) console.error(' -', f);
}
if (usedSnapshot) {
  console.error(
    'VERIFIKASI GAGAL — sumber snapshot lokal (bukan data live terbaru). Jalankan ulang saat GAS bisa diakses.'
  );
  process.exit(1);
}
if (mismatch) {
  console.error('VERIFIKASI GAGAL');
  process.exit(1);
}
console.log('VERIFIKASI OK — semua jumlah row cocok. Sheet tidak disentuh (read-only).');
