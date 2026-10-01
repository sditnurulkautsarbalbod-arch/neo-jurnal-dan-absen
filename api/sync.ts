// GET /api/sync — kontrak JSON identik dengan GAS doGet lama.
// users TANPA password: hash tidak boleh sampai ke browser.
import {
  queryRows,
  jsonResponse,
  type UserRow,
  type ClassRow,
  type StudentRow,
  type JournalRow,
  type AttendanceRow,
  type SettingsRow,
} from './_lib/db.js';

interface AttendanceSyncRow {
  id: string;
  date: string;
  class: string;
  teacher: string | null;
  students_json: string;
}

export async function GET(): Promise<Response> {
  try {
    const [users, classes, students, journals, attendance, settings] = await Promise.all([
      queryRows<UserRow>('SELECT id, full_name, username, role FROM users'),
      queryRows<ClassRow>('SELECT id, name, student_count FROM classes'),
      queryRows<StudentRow>('SELECT id, nisn, name, class, gender FROM students'),
      queryRows<JournalRow>(
        `SELECT id, COALESCE(date::text, '') AS date, class, jam, materi, aktivitas,
                izin, sakit, tanpa_ket, teacher, teacher_name
         FROM journals`
      ),
      queryRows<AttendanceRow>(
        `SELECT id, COALESCE(date::text, '') AS date, class, teacher, students
         FROM attendance`
      ),
      queryRows<SettingsRow>(
        'SELECT id, semester, tahun_ajaran, kepala_sekolah FROM settings'
      ),
    ]);

    const attendanceSync: AttendanceSyncRow[] = attendance.map((row) => ({
      id: row.id,
      date: row.date ?? '',
      class: row.class,
      teacher: row.teacher,
      // Klien lama (DataContext) melakukan JSON.parse terhadap students_json — wajib string.
      students_json: JSON.stringify(row.students ?? []),
    }));

    return jsonResponse({
      users: users.map((u) => ({
        id: u.id,
        fullName: u.full_name,
        username: u.username,
        role: u.role,
      })),
      classes: classes.map((c) => ({
        id: c.id,
        name: c.name,
        studentCount: c.student_count,
      })),
      students,
      journals,
      attendance: attendanceSync,
      settings: settings.map((s) => ({
        id: s.id,
        semester: s.semester,
        tahunAjaran: s.tahun_ajaran,
        kepalaSekolah: s.kepala_sekolah,
      })),
    });
  } catch (error) {
    console.error('sync error', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Sync failed' }, 500);
  }
}
