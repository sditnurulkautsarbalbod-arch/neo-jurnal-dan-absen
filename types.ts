export interface User {
  id: string;
  fullName: string;
  username: string;
  password?: string;
  role: 'admin' | 'guru';
}

export interface Class {
  id: string;
  name: string;
  studentCount: number;
}

export interface Student {
  id: string;
  nisn: string;
  name: string;
  class: string;
  gender: 'L' | 'P'; // Added gender
}

export interface Journal {
  id: string;
  date: string;
  class: string;
  jam: string;
  materi: string;
  aktivitas: string;
  izin: number;
  sakit: number;
  tanpaKet: number;
  teacher: string; // username
  teacherName: string;
}

export interface StudentAttendance {
  nisn: string;
  name: string;
  status: 'hadir' | 'izin' | 'sakit' | 'tanpaKet';
}

export interface AttendanceRecord {
  id: string;
  date: string;
  class: string;
  teacher: string;
  students: StudentAttendance[];
}

export interface SystemSettings {
  semester: string;
  tahunAjaran: string;
  kepalaSekolah: string;
}

export type TabAdmin = 'rekap-jurnal' | 'rekap-absen' | 'panel-admin';
export type TabTeacher = 'input-jurnal' | 'input-absen' | 'rekap-jurnal' | 'rekap-absen';