// Konektor Neon untuk Vercel Functions. File prefix _ tidak diekspos sebagai endpoint.
import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL tidak terdefinisi di environment server');
}

export const sql = neon(databaseUrl);

// neon() HTTP driver: sql.query(text, params) -> array row langsung (bukan {rows}).
export async function queryRows<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const rows = await sql.query(text, params);
  return rows as unknown as T[];
}

export interface UserRow {
  id: string;
  full_name: string;
  username: string;
  password: string | null;
  role: string;
}

export interface ClassRow {
  id: string;
  name: string;
  student_count: number;
}

export interface StudentRow {
  id: string;
  nisn: string | null;
  name: string;
  class: string;
  gender: string;
}

export interface JournalRow {
  id: string;
  date: string | null;
  class: string;
  jam: string | null;
  materi: string | null;
  aktivitas: string | null;
  izin: number;
  sakit: number;
  tanpa_ket: number;
  teacher: string | null;
  teacher_name: string | null;
}

export interface AttendanceRow {
  id: string;
  date: string | null;
  class: string;
  teacher: string | null;
  students: unknown;
}

export interface SettingsRow {
  id: string;
  semester: string | null;
  tahun_ajaran: string | null;
  kepala_sekolah: string | null;
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
