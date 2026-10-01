// POST /api/mutation — CREATE/UPDATE = upsert, DELETE idempotent.
// Nama tabel & kolom hanya dari whitelist statis; nilai selalu parameterized.
import { sql, jsonResponse } from './_lib/db';

type Collection = 'users' | 'classes' | 'students' | 'journals' | 'attendance' | 'settings';
type Action = 'CREATE' | 'UPDATE' | 'DELETE';

interface FieldSpec {
  key: string;
  column: string;
  cast: 'text' | 'int' | 'date';
  // users.password: UPDATE tanpa field password tidak boleh menyentuh kolom (hash lama bertahan).
  skipWhenMissingOnUpdate?: boolean;
}

const FIELD_MAP: Record<Collection, FieldSpec[]> = {
  users: [
    { key: 'fullName', column: 'full_name', cast: 'text' },
    { key: 'username', column: 'username', cast: 'text' },
    { key: 'password', column: 'password', cast: 'text', skipWhenMissingOnUpdate: true },
    { key: 'role', column: 'role', cast: 'text' },
  ],
  classes: [
    { key: 'name', column: 'name', cast: 'text' },
    { key: 'studentCount', column: 'student_count', cast: 'int' },
  ],
  students: [
    { key: 'nisn', column: 'nisn', cast: 'text' },
    { key: 'name', column: 'name', cast: 'text' },
    { key: 'class', column: 'class', cast: 'text' },
    { key: 'gender', column: 'gender', cast: 'text' },
  ],
  journals: [
    { key: 'date', column: 'date', cast: 'date' },
    { key: 'class', column: 'class', cast: 'text' },
    { key: 'jam', column: 'jam', cast: 'text' },
    { key: 'materi', column: 'materi', cast: 'text' },
    { key: 'aktivitas', column: 'aktivitas', cast: 'text' },
    { key: 'izin', column: 'izin', cast: 'int' },
    { key: 'sakit', column: 'sakit', cast: 'int' },
    { key: 'tanpaKet', column: 'tanpa_ket', cast: 'int' },
    { key: 'teacher', column: 'teacher', cast: 'text' },
    { key: 'teacherName', column: 'teacher_name', cast: 'text' },
  ],
  // attendance ditangani khusus (students_json -> JSONB).
  attendance: [
    { key: 'date', column: 'date', cast: 'date' },
    { key: 'class', column: 'class', cast: 'text' },
    { key: 'teacher', column: 'teacher', cast: 'text' },
  ],
  settings: [
    { key: 'semester', column: 'semester', cast: 'text' },
    { key: 'tahunAjaran', column: 'tahun_ajaran', cast: 'text' },
    { key: 'kepalaSekolah', column: 'kepala_sekolah', cast: 'text' },
  ],
};

function coerceValue(spec: FieldSpec, raw: unknown): unknown {
  if (spec.cast === 'int') {
    const n = Number(raw ?? 0);
    return Number.isFinite(n) ? Math.trunc(n) : 0;
  }
  if (spec.cast === 'date') {
    return raw === null || raw === undefined || raw === '' ? null : String(raw);
  }
  return raw === null || raw === undefined ? null : String(raw);
}

async function upsert(
  collection: Collection,
  action: Action,
  data: Record<string, unknown>
): Promise<Response> {
  const isSettings = collection === 'settings';
  const rawId = data.id ?? (isSettings ? 'main' : undefined);
  if (rawId === undefined || rawId === null || rawId === '') {
    return jsonResponse({ status: 'error', message: 'data.id wajib diisi' }, 400);
  }

  const table = collection; // whitelist: key FIELD_MAP = nama tabel (sama persis)
  const params: unknown[] = [];
  const insertCols: string[] = [];
  const setPairs: string[] = [];

  const pushField = (column: string, value: unknown, cast: string): void => {
    params.push(value);
    const idx = params.length;
    insertCols.push(column);
    setPairs.push(`${column}=$${idx}::${cast}`);
  };

  pushField('id', String(rawId), 'text');

  for (const spec of FIELD_MAP[collection]) {
    const raw = data[spec.key];
    if (
      spec.skipWhenMissingOnUpdate &&
      action === 'UPDATE' &&
      (raw === undefined || raw === null || raw === '')
    ) {
      continue; // password tidak dikirim saat edit tanpa ganti password -> jangan disentuh
    }
    pushField(spec.column, coerceValue(spec, raw), spec.cast);
  }

  if (collection === 'attendance') {
    const rawStudents = data.students_json ?? data.students ?? [];
    let parsed: unknown = rawStudents;
    try {
      if (typeof rawStudents === 'string') parsed = JSON.parse(rawStudents);
    } catch {
      return jsonResponse({ status: 'error', message: 'students_json bukan JSON valid' }, 400);
    }
    if (!Array.isArray(parsed)) {
      return jsonResponse({ status: 'error', message: 'students harus berupa array' }, 400);
    }
    params.push(JSON.stringify(parsed));
    const idx = params.length;
    insertCols.push('students');
    setPairs.push(`students=$${idx}::jsonb`);
  }

  // UPSERT: replay queue lama & 'ID not found' lama tidak lagi masalah.
  const setClause = setPairs.length > 0 ? setPairs.join(', ') : 'id=EXCLUDED.id';
  const placeholders = insertCols.map((_, i) => `$${i + 1}`).join(', ');
  const text = `INSERT INTO ${table} (${insertCols.join(', ')}) VALUES (${placeholders})
    ON CONFLICT (id) DO UPDATE SET ${setClause}`;
  await sql.query(text, params);
  void action;
  return jsonResponse({ status: 'success' });
}

async function remove(collection: Collection, data: Record<string, unknown>): Promise<Response> {
  const rawId = data.id ?? (collection === 'settings' ? 'main' : undefined);
  if (rawId === undefined || rawId === null || rawId === '') {
    return jsonResponse({ status: 'error', message: 'data.id wajib diisi' }, 400);
  }
  // Idempotent: row yang sudah hilang tetap dianggap sukses.
  await sql.query(`DELETE FROM ${collection} WHERE id=$1::text`, [String(rawId)]);
  return jsonResponse({ status: 'success' });
}

export async function POST(request: Request): Promise<Response> {
  let body: { action?: string; collection?: string; data?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ status: 'error', message: 'Body bukan JSON valid' }, 400);
  }

  const { action, collection, data } = body;
  if (!data || typeof data !== 'object') {
    return jsonResponse({ status: 'error', message: 'data wajib berupa object' }, 400);
  }
  if (!collection || !(collection in FIELD_MAP)) {
    return jsonResponse({ status: 'error', message: `Collection tidak dikenal: ${collection}` }, 400);
  }
  if (action !== 'CREATE' && action !== 'UPDATE' && action !== 'DELETE') {
    return jsonResponse({ status: 'error', message: `Action tidak dikenal: ${action}` }, 400);
  }

  try {
    const typedCollection = collection as Collection;
    if (action === 'DELETE') return await remove(typedCollection, data);
    return await upsert(typedCollection, action, data);
  } catch (error) {
    console.error('mutation error', error);
    return jsonResponse(
      { status: 'error', message: error instanceof Error ? error.message : 'Mutation gagal' },
      500
    );
  }
}
