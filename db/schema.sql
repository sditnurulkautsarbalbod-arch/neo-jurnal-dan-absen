-- Neon PostgreSQL schema for neo-jurnal-sdit (app baru).
-- Idempotent: aman dijalankan berulang. Data Google Sheet TIDAK disentuh skrip ini.

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  full_name   TEXT NOT NULL,
  username    TEXT NOT NULL UNIQUE,
  password    TEXT,                       -- bcrypt hash; bisa kosong (seed lokal lama)
  role        TEXT NOT NULL CHECK (role IN ('admin', 'guru'))
);

CREATE TABLE IF NOT EXISTS classes (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  student_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS students (
  id     TEXT PRIMARY KEY,
  nisn   TEXT,
  name   TEXT NOT NULL,
  class  TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('L', 'P'))
);

CREATE INDEX IF NOT EXISTS idx_students_class ON students (class);
CREATE INDEX IF NOT EXISTS idx_students_nisn ON students (nisn);

CREATE TABLE IF NOT EXISTS journals (
  id          TEXT PRIMARY KEY,
  date        DATE,                       -- NULL bila kosong (bukan ''::date)
  class       TEXT NOT NULL,
  jam         TEXT,                       -- TEXT: GAS lama menyimpan prefix '
  materi      TEXT,
  aktivitas   TEXT,
  izin        INTEGER NOT NULL DEFAULT 0,
  sakit       INTEGER NOT NULL DEFAULT 0,
  tanpa_ket   INTEGER NOT NULL DEFAULT 0,
  teacher     TEXT,
  teacher_name TEXT
);

CREATE INDEX IF NOT EXISTS idx_journals_date ON journals (date);
CREATE INDEX IF NOT EXISTS idx_journals_class_date ON journals (class, date);

CREATE TABLE IF NOT EXISTS attendance (
  id       TEXT PRIMARY KEY,
  date     DATE,
  class    TEXT NOT NULL,
  teacher  TEXT,
  students JSONB NOT NULL DEFAULT '[]'::jsonb  -- [{nisn,name,status}]
);

CREATE INDEX IF NOT EXISTS idx_attendance_date_class ON attendance (date, class);

CREATE TABLE IF NOT EXISTS settings (
  id             TEXT PRIMARY KEY CHECK (id = 'main'),
  semester       TEXT,
  tahun_ajaran   TEXT,
  kepala_sekolah TEXT
);
