
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { NeoButton, NeoCard, NeoInput, NeoSelect, NeoTable, NeoModal, NeoBottomNav, NeoConfirmModal, IconLoading, SyncIndicator } from '../components/NeoUI';
import { User, Class, Student, SystemSettings, Journal } from '../types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import bcrypt from 'bcryptjs';

// Icons
const IconRekapJurnal = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
const IconRekapAbsen = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>;
const IconPanel = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1-2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;

// Action Icons
const IconEye = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const IconEyeOff = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>;
const IconEdit = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const IconTrash = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

// Helper to format date for display
const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
};

// Robust Date Standardizer (Always returns YYYY-MM-DD)
const standardizeDate = (input: string) => {
    if(!input) return '';
    const date = new Date(input);
    if (isNaN(date.getTime())) return input;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { 
    users, classes, students, journals, attendance, settings, 
    loading, syncing, addUser, deleteUser, addClass, deleteClass, 
    addStudent, deleteStudent, saveSettings, syncData
  } = useData();
  
  const [activeTab, setActiveTab] = useState<'rekap-jurnal' | 'rekap-absen' | 'panel-admin'>('rekap-jurnal');
  
  // -- Modals State --
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [studentClassFilter, setStudentClassFilter] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; type: 'user' | 'student' | 'class' }>({ isOpen: false, id: '', type: 'user' });
  const [showPassword, setShowPassword] = useState(false);
  const [localSettings, setLocalSettings] = useState<SystemSettings>(settings);

  useEffect(() => {
      setLocalSettings(settings);
  }, [settings]);

  // -- Pagination --
  const [classPage, setClassPage] = useState(1);
  const classPerPage = 10;
  const [userPage, setUserPage] = useState(1);
  const userPerPage = 10;
  const [studentPage, setStudentPage] = useState(1);
  const studentPerPage = 10;
  
  // -- Pagination for Jurnal --
  const [statsPage, setStatsPage] = useState(1);
  const statsPerPage = 10;
  const [journalPage, setJournalPage] = useState(1);
  const journalPerPage = 10;

  // -- Filters --
  const [jurnalFilter, setJurnalFilter] = useState({ 
      type: 'harian', 
      date: new Date().toISOString().split('T')[0], 
      month: new Date().toISOString().substring(0, 7), 
      week: '1',
      teacher: '' 
  });

  // Reset pagination when filters change
  useEffect(() => {
    setStatsPage(1);
    setJournalPage(1);
  }, [jurnalFilter]);

  const [absenFilter, setAbsenFilter] = useState({ 
      type: 'harian', 
      class: '', 
      date: new Date().toISOString().split('T')[0], 
      month: new Date().toISOString().substring(0, 7),
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
  });
  const [absenPage, setAbsenPage] = useState(1);
  const [detailAbsenPage, setDetailAbsenPage] = useState(1); // New pagination for Detail Absence
  const absenItemsPerPage = 10;

  // --- MOVE HOOKS TO TOP LEVEL (FIX ERROR #310) ---
  
  // 1. Sort users alphabetically by full name
  const sortedUsers = useMemo(() => {
      return [...users].sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [users]);

  // 2. Calculate dynamic student counts for classes
  const classesWithCounts = useMemo(() => {
      return classes.map(c => ({
          ...c,
          studentCount: students.filter(s => s.class === c.name).length
      }));
  }, [classes, students]);

  // 3. Filtered students for management (sorted A-Z)
  const filteredStudents = useMemo(() => {
      return students.filter(s => studentClassFilter ? s.class === studentClassFilter : true)
                     .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, studentClassFilter]);

  // --- HELPERS ---
  const calculateJam = (jam: string): number => {
    if (!jam) return 0;
    if (jam.includes('-')) {
        const [start, end] = jam.split('-').map(s => parseInt(s.trim()));
        if (!isNaN(start) && !isNaN(end)) return Math.max(0, end - start + 1);
    }
    if (jam.includes(',')) return jam.split(',').length;
    const num = parseInt(jam);
    return isNaN(num) ? 0 : 1; 
  };

  const getWeekOfMonth = (dateString: string) => {
      const d = new Date(dateString);
      const date = d.getDate();
      return Math.ceil(date / 7);
  };

  const handleExportStatsPDF = (stats: {teacherName: string, totalJam: number}[]) => {
    const doc = new jsPDF();
    doc.text("STATISTIK JAM MENGAJAR", 14, 20);
    doc.text(`Periode: ${jurnalFilter.type.toUpperCase()} ${jurnalFilter.type === 'mingguan' ? `- Minggu ke-${jurnalFilter.week}` : ''}`, 14, 30);
    const data = stats.map((s) => [s.teacherName, `${s.totalJam} Jam`]);
    autoTable(doc, {
        head: [['Nama Guru', 'Total Jam Mengajar']],
        body: data,
        startY: 40,
    });
    doc.save("statistik_mengajar.pdf");
  };

  const handleExportStatsExcel = (stats: {teacherName: string, totalJam: number}[]) => {
      const worksheet = XLSX.utils.json_to_sheet(stats.map(s => ({
          "Nama Guru": s.teacherName,
          "Total Jam Mengajar": s.totalJam
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Statistik");
      XLSX.writeFile(workbook, "statistik_mengajar.xlsx");
  };

  const handleExportDetailPDF = (data: Journal[]) => {
    const doc = new jsPDF('landscape');
    doc.text("DETAIL JURNAL MENGAJAR", 14, 20);
    let periodeStr = "";
    if (jurnalFilter.type === 'harian') periodeStr = jurnalFilter.date;
    else if (jurnalFilter.type === 'bulanan') periodeStr = jurnalFilter.month;
    else periodeStr = `Bulan ${jurnalFilter.month} Minggu ke-${jurnalFilter.week}`;
    doc.text(`Periode: ${periodeStr}`, 14, 30);
    
    const tableData = data.map((j, i) => [
        i + 1,
        formatDate(j.date),
        j.teacherName,
        j.class,
        j.jam,
        j.materi,
        j.aktivitas,
        j.izin,
        j.sakit,
        j.tanpaKet
    ]);

    autoTable(doc, {
        head: [['No', 'Tanggal', 'Guru', 'Kelas', 'Jam', 'Materi', 'Aktivitas', 'I', 'S', 'TK']],
        body: tableData,
        startY: 40,
        styles: { fontSize: 8, cellPadding: 1, overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 8 },  // No
            1: { cellWidth: 20 }, // Tanggal
            2: { cellWidth: 30 }, // Guru
            3: { cellWidth: 15 }, // Kelas
            4: { cellWidth: 12 }, // Jam
            5: { cellWidth: 60 }, // Materi
            6: { cellWidth: 90 }, // Aktivitas (Dibuat paling lebar)
            7: { cellWidth: 8, halign: 'center' }, // I
            8: { cellWidth: 8, halign: 'center' }, // S
            9: { cellWidth: 8, halign: 'center' }, // TK
        }
    });
    doc.save("detail_jurnal.pdf");
  };

  const handleExportDetailExcel = (data: Journal[]) => {
      const worksheet = XLSX.utils.json_to_sheet(data.map((j, i) => ({
          No: i + 1,
          Tanggal: formatDate(j.date),
          Guru: j.teacherName,
          Kelas: j.class,
          Jam: j.jam,
          Materi: j.materi,
          Aktivitas: j.aktivitas,
          Izin: j.izin,
          Sakit: j.sakit,
          TK: j.tanpaKet
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Detail Jurnal");
      XLSX.writeFile(workbook, "detail_jurnal.xlsx");
  };

  const handleExportAbsenPDF = (data: any[]) => {
    const doc = new jsPDF('landscape');
    let periodeStr = "";
    if (absenFilter.type === 'harian') periodeStr = absenFilter.date;
    else if (absenFilter.type === 'bulanan') periodeStr = absenFilter.month;
    else periodeStr = `${absenFilter.startDate} s/d ${absenFilter.endDate}`;
    doc.text(`REKAP ABSENSI SISWA - ${periodeStr}`, 14, 20);
    const tableData = data.map((s, i) => [
        i + 1, s.nisn, s.name, s.class, s.h, s.i, s.sk, s.tk, s.percentage + '%'
    ]);
    autoTable(doc, {
        head: [['No', 'NISN', 'Nama', 'Kelas', 'Hadir', 'Izin', 'Sakit', 'Tanpa Ket', '%']],
        body: tableData,
        startY: 30,
    });
    doc.save("rekap_absensi.pdf");
  };

  const handleExportAbsenExcel = (data: any[]) => {
      const worksheet = XLSX.utils.json_to_sheet(data.map((s, i) => ({
          No: i + 1,
          NISN: s.nisn,
          Nama: s.name,
          Kelas: s.class,
          Hadir: s.h,
          Izin: s.i,
          Sakit: s.sk,
          TanpaKet: s.tk,
          Persentase: s.percentage + '%'
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Absensi");
      XLSX.writeFile(workbook, "rekap_absensi.xlsx");
  };

  const handleExportDetailAbsenPDF = (data: any[]) => {
    const doc = new jsPDF();
    let periodeStr = "";
    if (absenFilter.type === 'harian') periodeStr = formatDate(absenFilter.date);
    else if (absenFilter.type === 'bulanan') periodeStr = absenFilter.month;
    else periodeStr = `${formatDate(absenFilter.startDate)} s/d ${formatDate(absenFilter.endDate)}`;
    
    doc.text(`DETAIL KETIDAKHADIRAN SISWA`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Periode: ${periodeStr}`, 14, 28);
    if(absenFilter.class) doc.text(`Kelas: ${absenFilter.class}`, 14, 34);

    const tableData = data.map((d, i) => [
        i + 1, d.nisn, d.name, d.class, d.status === 'tanpaKet' ? 'TK' : d.status.toUpperCase(), formatDate(d.date)
    ]);

    autoTable(doc, {
        head: [['No', 'NISN', 'Nama', 'Kelas', 'Status', 'Tanggal']],
        body: tableData,
        startY: 40,
    });
    doc.save("detail_ketidakhadiran.pdf");
  };

  const handleExportDetailAbsenExcel = (data: any[]) => {
      const worksheet = XLSX.utils.json_to_sheet(data.map((d, i) => ({
          No: i + 1,
          NISN: d.nisn,
          Nama: d.name,
          Kelas: d.class,
          Status: d.status === 'tanpaKet' ? 'TK' : d.status.toUpperCase(),
          Tanggal: formatDate(d.date)
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Detail Ketidakhadiran");
      XLSX.writeFile(workbook, "detail_ketidakhadiran.xlsx");
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      const usernameInput = formData.get('username') as string;
      const plainPassword = formData.get('password') as string;
      
      const password = plainPassword ? bcrypt.hashSync(plainPassword, 10) : editingUser?.password;
      
      // PERBAIKAN: Gunakan username sebagai ID jika user baru, agar tidak jadi angka timestamp
      const newId = editingUser ? editingUser.id : usernameInput;

      // Cek duplikasi ID jika user baru
      if (!editingUser && users.some(u => u.id === newId)) {
        alert("Username/ID ini sudah digunakan! Silakan pilih yang lain.");
        return;
      }

      const userData: User = {
          id: newId, 
          fullName: formData.get('fullName') as string,
          username: usernameInput,
          password: password,
          role: formData.get('role') as 'admin' | 'guru'
      };
      await addUser(userData);
      setUserModalOpen(false);
      setEditingUser(null);
  };

  const handleClassSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      const classData: Class = {
          id: editingClass ? editingClass.id : Date.now().toString(),
          name: formData.get('name') as string,
          studentCount: editingClass ? editingClass.studentCount : 0
      };
      await addClass(classData);
      setClassModalOpen(false);
      setEditingClass(null);
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      const studentData: Student = {
          id: editingStudent ? editingStudent.id : Date.now().toString(),
          nisn: formData.get('nisn') as string,
          name: formData.get('name') as string,
          class: formData.get('class') as string,
          gender: formData.get('gender') as 'L' | 'P'
      };
      await addStudent(studentData);
      setStudentModalOpen(false);
      setEditingStudent(null);
  };

  const confirmDelete = async () => {
      if (deleteConfirm.type === 'user') await deleteUser(deleteConfirm.id);
      if (deleteConfirm.type === 'class') await deleteClass(deleteConfirm.id);
      if (deleteConfirm.type === 'student') await deleteStudent(deleteConfirm.id);
      setDeleteConfirm({ ...deleteConfirm, isOpen: false });
  };

  // --- SUB-RENDERERS ---

  const renderPanelAdmin = () => {
      const paginatedUsers = sortedUsers.slice((userPage - 1) * userPerPage, userPage * userPerPage);
      const totalUserPages = Math.ceil(sortedUsers.length / userPerPage);

      const paginatedClasses = classesWithCounts.slice((classPage - 1) * classPerPage, classPage * classPerPage);
      const totalClassPages = Math.ceil(classesWithCounts.length / classPerPage);

      const paginatedStudents = filteredStudents.slice((studentPage - 1) * studentPerPage, studentPage * studentPerPage);
      const totalStudentPages = Math.ceil(filteredStudents.length / studentPerPage);

      // Student statistics
      const totalSiswa = filteredStudents.length;
      const totalL = filteredStudents.filter(s => s.gender === 'L').length;
      const totalP = filteredStudents.filter(s => s.gender === 'P').length;

      return (
          <div className="space-y-10">
              <NeoCard title="Pengaturan Sistem">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <NeoSelect label="Semester" value={localSettings.semester} onChange={e => setLocalSettings({...localSettings, semester: e.target.value})} className="mb-0">
                            <option value="Ganjil">Ganjil</option>
                            <option value="Genap">Genap</option>
                        </NeoSelect>
                        <NeoInput label="Tahun Ajaran" value={localSettings.tahunAjaran} onChange={e => setLocalSettings({...localSettings, tahunAjaran: e.target.value})} className="mb-0"/>
                        <NeoInput label="Kepala Sekolah" value={localSettings.kepalaSekolah} onChange={e => setLocalSettings({...localSettings, kepalaSekolah: e.target.value})} className="mb-0"/>
                   </div>
                   <div className="mt-4 flex justify-end">
                       <NeoButton onClick={() => saveSettings(localSettings)} disabled={loading}>Simpan Pengaturan</NeoButton>
                   </div>
              </NeoCard>

              <NeoCard title="Manajemen Pengguna">
                  <div className="mb-4 flex justify-between items-center">
                      <h3 className="font-bold">Total: {users.length} User</h3>
                      <NeoButton onClick={() => { setEditingUser(null); setUserModalOpen(true); }} className="text-sm px-4 py-2">Tambah User</NeoButton>
                  </div>
                  <NeoTable headers={['Nama Lengkap', 'Username', 'Role', 'Aksi']}>
                      {paginatedUsers.map(u => (
                          <tr key={u.id} className="border-b-2 border-black hover:bg-gray-50">
                              <td className="p-3 border-r-2 border-black font-bold capitalize">{u.fullName.toLowerCase()}</td>
                              <td className="p-3 border-r-2 border-black font-mono">{u.username}</td>
                              <td className="p-3 border-r-2 border-black uppercase text-xs font-black">{u.role}</td>
                              <td className="p-3 flex gap-2">
                                  <button onClick={() => { setEditingUser(u); setUserModalOpen(true); }} className="text-blue-600 hover:text-blue-800"><IconEdit /></button>
                                  <button onClick={() => setDeleteConfirm({ isOpen: true, id: u.id, type: 'user' })} className="text-red-600 hover:text-red-800"><IconTrash /></button>
                              </td>
                          </tr>
                      ))}
                  </NeoTable>
                  <div className="flex justify-between items-center mt-4">
                      <button disabled={userPage === 1} onClick={() => setUserPage(p => p - 1)} className="font-bold disabled:opacity-50">Prev</button>
                      <span className="font-black text-sm">Page {userPage}/{totalUserPages || 1}</span>
                      <button disabled={userPage >= totalUserPages} onClick={() => setUserPage(p => p + 1)} className="font-bold disabled:opacity-50">Next</button>
                  </div>
              </NeoCard>

              <NeoCard title="Manajemen Kelas">
                  <div className="mb-4 flex justify-between items-center">
                      <h3 className="font-bold">Total: {classes.length} Kelas</h3>
                      <NeoButton onClick={() => { setEditingClass(null); setClassModalOpen(true); }} className="text-sm px-4 py-2">Tambah Kelas</NeoButton>
                  </div>
                  <NeoTable headers={['Nama Kelas', 'Jumlah Siswa', 'Aksi']}>
                      {paginatedClasses.map(c => (
                          <tr key={c.id} className="border-b-2 border-black hover:bg-gray-50">
                              <td className="p-3 border-r-2 border-black font-bold">{c.name}</td>
                              <td className="p-3 border-r-2 border-black font-black text-center text-neo-blue">{c.studentCount}</td>
                              <td className="p-3 flex gap-2">
                                  <button onClick={() => { setEditingClass(c); setClassModalOpen(true); }} className="text-blue-600 hover:text-blue-800"><IconEdit /></button>
                                  <button onClick={() => setDeleteConfirm({ isOpen: true, id: c.id, type: 'class' })} className="text-red-600 hover:text-red-800"><IconTrash /></button>
                              </td>
                          </tr>
                      ))}
                  </NeoTable>
                   <div className="flex justify-between items-center mt-4">
                      <button disabled={classPage === 1} onClick={() => setClassPage(p => p - 1)} className="font-bold disabled:opacity-50">Prev</button>
                      <span className="font-black text-sm">Page {classPage}/{totalClassPages || 1}</span>
                      <button disabled={classPage >= totalClassPages} onClick={() => setClassPage(p => p + 1)} className="font-bold disabled:opacity-50">Next</button>
                  </div>
              </NeoCard>

              <NeoCard title="Manajemen Siswa">
                  {/* Statistics Badges */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-neo-green border-3 border-black p-3 shadow-neo flex flex-col items-center justify-center transform -rotate-1">
                          <span className="text-xs font-black uppercase tracking-widest text-black">Total Siswa</span>
                          <span className="text-3xl font-black text-black">{totalSiswa}</span>
                      </div>
                      <div className="bg-neo-blue border-3 border-black p-3 shadow-neo flex flex-col items-center justify-center transform rotate-1">
                          <span className="text-xs font-black uppercase tracking-widest text-black">Laki-laki (L)</span>
                          <span className="text-3xl font-black text-black">{totalL}</span>
                      </div>
                      <div className="bg-neo-pink border-3 border-black p-3 shadow-neo flex flex-col items-center justify-center transform -rotate-1">
                          <span className="text-xs font-black uppercase tracking-widest text-black">Perempuan (P)</span>
                          <span className="text-3xl font-black text-black">{totalP}</span>
                      </div>
                  </div>

                  <div className="flex flex-wrap gap-4 justify-between items-end mb-4">
                      <div className="w-48">
                          <NeoSelect label="Filter Kelas" value={studentClassFilter} onChange={e => { setStudentClassFilter(e.target.value); setStudentPage(1); }} className="mb-0">
                              <option value="">Semua Kelas</option>
                              {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                          </NeoSelect>
                      </div>
                      <NeoButton onClick={() => { setEditingStudent(null); setStudentModalOpen(true); }} className="text-sm px-4 py-2">Tambah Siswa</NeoButton>
                  </div>
                  <NeoTable headers={['NISN', 'Nama', 'Kelas', 'L/P', 'Aksi']}>
                      {paginatedStudents.map(s => (
                          <tr key={s.id} className="border-b-2 border-black hover:bg-gray-50">
                              <td className="p-3 border-r-2 border-black">{s.nisn}</td>
                              <td className="p-3 border-r-2 border-black font-bold">{s.name}</td>
                              <td className="p-3 border-r-2 border-black">{s.class}</td>
                              <td className="p-3 border-r-2 border-black text-center font-black">{s.gender}</td>
                              <td className="p-3 flex gap-2">
                                  <button onClick={() => { setEditingStudent(s); setStudentModalOpen(true); }} className="text-blue-600 hover:text-blue-800"><IconEdit /></button>
                                  <button onClick={() => setDeleteConfirm({ isOpen: true, id: s.id, type: 'student' })} className="text-red-600 hover:text-red-800"><IconTrash /></button>
                              </td>
                          </tr>
                      ))}
                  </NeoTable>
                   <div className="flex justify-between items-center mt-4">
                      <button disabled={studentPage === 1} onClick={() => setStudentPage(p => p - 1)} className="font-bold disabled:opacity-50">Prev</button>
                      <span className="font-black text-sm">Page {studentPage}/{totalStudentPages || 1}</span>
                      <button disabled={studentPage >= totalStudentPages} onClick={() => setStudentPage(p => p + 1)} className="font-bold disabled:opacity-50">Next</button>
                  </div>
              </NeoCard>
          </div>
      );
  };

  const renderRekapJurnal = () => {
      const filtered = journals.filter(j => {
          if (jurnalFilter.teacher && j.teacher !== jurnalFilter.teacher) return false;
          const jDate = standardizeDate(j.date);
          if(jurnalFilter.type === 'harian') return jDate === jurnalFilter.date;
          if(jurnalFilter.type === 'bulanan') return jDate.startsWith(jurnalFilter.month);
          if(jurnalFilter.type === 'mingguan') {
              if (!jDate.startsWith(jurnalFilter.month)) return false;
              const weekNum = getWeekOfMonth(jDate);
              return weekNum.toString() === jurnalFilter.week;
          }
          return true;
      });

      // Sort filtered journals by date descending (terbaru ke terlama), jam descending
      filtered.sort((a, b) => {
          const dateCompare = b.date.localeCompare(a.date);
          if (dateCompare !== 0) return dateCompare;
          const jamA = parseInt(a.jam) || 0;
          const jamB = parseInt(b.jam) || 0;
          return jamB - jamA;
      });

      const statsMap = new Map<string, number>();
      filtered.forEach(j => {
          const current = statsMap.get(j.teacherName) || 0;
          statsMap.set(j.teacherName, current + calculateJam(j.jam));
      });
      // Sort stats alphabetically
      const stats = Array.from(statsMap.entries())
        .map(([teacherName, totalJam]) => ({ teacherName, totalJam }))
        .sort((a, b) => a.teacherName.localeCompare(b.teacherName));

      // Pagination for Stats
      const totalStatsPages = Math.ceil(stats.length / statsPerPage);
      const paginatedStats = stats.slice((statsPage - 1) * statsPerPage, statsPage * statsPerPage);

      // Pagination for Journals
      const totalJournalPages = Math.ceil(filtered.length / journalPerPage);
      const paginatedJournals = filtered.slice((journalPage - 1) * journalPerPage, journalPage * journalPerPage);

      return (
          <div className="space-y-8">
              {/* GLOBAL FILTER FOR BOTH TABLES */}
              <div className="bg-white border-4 border-black p-4 shadow-neo flex flex-wrap gap-4 items-end">
                  <div className="w-full md:w-32">
                      <NeoSelect label="Tipe Filter" value={jurnalFilter.type} onChange={e => setJurnalFilter({...jurnalFilter, type: e.target.value})} className="mb-0">
                          <option value="harian">Harian</option>
                          <option value="mingguan">Mingguan</option>
                          <option value="bulanan">Bulanan</option>
                      </NeoSelect>
                  </div>
                  <div className="w-full md:w-40">
                      {jurnalFilter.type === 'harian' ? (
                          <NeoInput type="date" label="Tanggal" value={jurnalFilter.date} onChange={e => setJurnalFilter({...jurnalFilter, date: e.target.value})} className="mb-0" />
                      ) : (
                          <NeoInput type="month" label="Bulan" value={jurnalFilter.month} onChange={e => setJurnalFilter({...jurnalFilter, month: e.target.value})} className="mb-0" />
                      )}
                  </div>
                  {jurnalFilter.type === 'mingguan' && (
                      <div className="w-full md:w-32">
                          <NeoSelect label="Minggu Ke" value={jurnalFilter.week} onChange={e => setJurnalFilter({...jurnalFilter, week: e.target.value})} className="mb-0">
                              {[1,2,3,4,5].map(i => <option key={i} value={i.toString()}>{i}</option>)}
                          </NeoSelect>
                      </div>
                  )}
                  <div className="w-full md:w-48">
                        <NeoSelect label="Filter Guru" value={jurnalFilter.teacher} onChange={e => setJurnalFilter({...jurnalFilter, teacher: e.target.value})} className="mb-0">
                            <option value="">Semua Guru</option>
                            {users.filter(u => u.role === 'guru')
                                  .sort((a, b) => a.fullName.localeCompare(b.fullName))
                                  .map(u => (
                                <option key={u.id} value={u.username}>{u.fullName}</option>
                            ))}
                        </NeoSelect>
                  </div>
              </div>

              <NeoCard title="Statistik Jam Mengajar">
                   <div className="mb-4 flex justify-end gap-2">
                       <NeoButton variant="success" className="px-3 py-2 text-sm" onClick={() => handleExportStatsPDF(stats)}>PDF</NeoButton>
                       <NeoButton variant="secondary" className="px-3 py-2 text-sm bg-neo-yellow" onClick={() => handleExportStatsExcel(stats)}>Excel</NeoButton>
                  </div>
                  <NeoTable headers={['Nama Guru', 'Total Jam Mengajar']}>
                      {paginatedStats.map((s, i) => (
                          <tr key={i} className="border-b-2 border-black">
                              <td className="p-3 border-r-2 border-black font-bold capitalize">{s.teacherName.toLowerCase()}</td>
                              <td className="p-3 border-r-2 border-black font-black text-center">{s.totalJam} Jam</td>
                          </tr>
                      ))}
                      {paginatedStats.length === 0 && <tr><td colSpan={2} className="p-4 text-center text-gray-400 font-bold">Tidak ada data.</td></tr>}
                  </NeoTable>
                  {/* Pagination Stats */}
                  <div className="flex justify-between items-center mt-4">
                      <button disabled={statsPage === 1} onClick={() => setStatsPage(p => p - 1)} className="font-bold disabled:opacity-50">Prev</button>
                      <span className="font-black text-sm">Page {statsPage}/{totalStatsPages || 1}</span>
                      <button disabled={statsPage >= totalStatsPages} onClick={() => setStatsPage(p => p + 1)} className="font-bold disabled:opacity-50">Next</button>
                  </div>
              </NeoCard>
              
              <NeoCard title="Detail Jurnal">
                   <div className="mb-4 flex justify-end gap-2">
                       <NeoButton variant="success" className="px-3 py-2 text-sm" onClick={() => handleExportDetailPDF(filtered)}>PDF</NeoButton>
                       <NeoButton variant="secondary" className="px-3 py-2 text-sm bg-neo-yellow" onClick={() => handleExportDetailExcel(filtered)}>Excel</NeoButton>
                   </div>
                   <NeoTable headers={['Tanggal', 'Guru', 'Kelas', 'Jam', 'Materi', 'Aktivitas', 'I', 'S', 'TK']}>
                       {paginatedJournals.map(j => (
                           <tr key={j.id} className="border-b-2 border-black hover:bg-yellow-50 text-sm">
                               <td className="p-3 border-r-2 border-black whitespace-nowrap">{formatDate(j.date)}</td>
                               <td className="p-3 border-r-2 border-black font-bold capitalize">{j.teacherName.toLowerCase()}</td>
                               <td className="p-3 border-r-2 border-black text-center">{j.class}</td>
                               <td className="p-3 border-r-2 border-black text-center">{j.jam}</td>
                               <td className="p-3 border-r-2 border-black truncate max-w-[150px]">{j.materi}</td>
                               <td className="p-3 border-r-2 border-black truncate max-w-[150px]">{j.aktivitas}</td>
                               <td className="p-3 border-r-2 border-black text-center text-blue-600 font-bold">{j.izin || 0}</td>
                               <td className="p-3 border-r-2 border-black text-center text-orange-600 font-bold">{j.sakit || 0}</td>
                               <td className="p-3 text-center text-red-600 font-bold">{j.tanpaKet || 0}</td>
                           </tr>
                       ))}
                       {paginatedJournals.length === 0 && <tr><td colSpan={9} className="p-4 text-center text-gray-400 font-bold">Tidak ada data.</td></tr>}
                   </NeoTable>
                   {/* Pagination Detail Jurnal */}
                   <div className="flex justify-between items-center mt-4">
                      <button disabled={journalPage === 1} onClick={() => setJournalPage(p => p - 1)} className="font-bold disabled:opacity-50">Prev</button>
                      <span className="font-black text-sm">Page {journalPage}/{totalJournalPages || 1}</span>
                      <button disabled={journalPage >= totalJournalPages} onClick={() => setJournalPage(p => p + 1)} className="font-bold disabled:opacity-50">Next</button>
                   </div>
              </NeoCard>
          </div>
      );
  };

  const renderRekapAbsen = () => {
    const filteredRecords = attendance.filter(r => {
        if (absenFilter.class && r.class !== absenFilter.class) return false;
        const rDate = standardizeDate(r.date); 
        if (absenFilter.type === 'harian') return rDate === absenFilter.date;
        if (absenFilter.type === 'bulanan') return rDate.startsWith(absenFilter.month);
        if (absenFilter.type === 'range') return rDate >= absenFilter.startDate && rDate <= absenFilter.endDate;
        return true;
    });

    // Sorted Classes for Dropdown (1A, 1B, 2A...)
    const sortedClassesDropdown = [...classes].sort((a, b) => 
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    const studentsInClass = students
        .filter(s => absenFilter.class ? s.class === absenFilter.class : true)
        .sort((a, b) => {
            // Sort by Class first (Natural Order)
            const classCompare = a.class.localeCompare(b.class, undefined, { numeric: true, sensitivity: 'base' });
            if (classCompare !== 0) return classCompare;
            // Then by Name (Alphabetical)
            return a.name.localeCompare(b.name);
        });

    // 1. Calculate General Stats (Top Table)
    const studentStats = studentsInClass.map(s => {
        let h = 0, i = 0, sk = 0, tk = 0;
        filteredRecords.forEach(r => {
            const status = r.students.find(st => st.nisn === s.nisn)?.status;
            if (status === 'hadir') h++;
            else if (status === 'izin') i++;
            else if (status === 'sakit') sk++;
            else if (status === 'tanpaKet') tk++;
        });
        const total = h + i + sk + tk;
        const percentage = total > 0 ? ((h / total) * 100).toFixed(1) : '0.0';
        return { ...s, h, i, sk, tk, percentage };
    });

    // Calculate Grand Totals
    const totalH = studentStats.reduce((acc, curr) => acc + curr.h, 0);
    const totalI = studentStats.reduce((acc, curr) => acc + curr.i, 0);
    const totalS = studentStats.reduce((acc, curr) => acc + curr.sk, 0);
    const totalTK = studentStats.reduce((acc, curr) => acc + curr.tk, 0);

    const totalPages = Math.ceil(studentStats.length / absenItemsPerPage);
    const paginatedStudents = studentStats.slice((absenPage - 1) * absenItemsPerPage, absenPage * absenItemsPerPage);


    // 2. Prepare Data for "Detail Ketidakhadiran" Table (Bottom Table)
    const absenceDetails: { nisn: string, name: string, class: string, status: string, date: string }[] = [];
    
    filteredRecords.forEach(record => {
        record.students.forEach(student => {
            if (student.status !== 'hadir') {
                absenceDetails.push({
                    nisn: student.nisn,
                    name: student.name,
                    class: record.class,
                    status: student.status,
                    date: record.date
                });
            }
        });
    });

    // Sort Detailed Absences: Class (1A-6B) -> Name (A-Z)
    absenceDetails.sort((a, b) => {
         const classCompare = a.class.localeCompare(b.class, undefined, { numeric: true, sensitivity: 'base' });
         if (classCompare !== 0) return classCompare;
         return a.name.localeCompare(b.name);
    });

    // Pagination for Detail Table
    const totalDetailPages = Math.ceil(absenceDetails.length / absenItemsPerPage);
    const paginatedDetails = absenceDetails.slice((detailAbsenPage - 1) * absenItemsPerPage, detailAbsenPage * absenItemsPerPage);


    return (
        <div className="space-y-8">
            <NeoCard title="Rekap Absensi Siswa">
                 <div className="flex flex-wrap items-end gap-2 mb-6">
                    <div className="w-[150px]">
                        <NeoSelect value={absenFilter.type} onChange={e => { setAbsenFilter({...absenFilter, type: e.target.value}); setAbsenPage(1); setDetailAbsenPage(1); }} className="mb-0">
                            <option value="harian">Harian</option>
                            <option value="bulanan">Bulanan</option>
                            <option value="range">Rentang Waktu</option>
                        </NeoSelect>
                    </div>
                    <div className="w-[180px]">
                         <NeoSelect value={absenFilter.class} onChange={e => { setAbsenFilter({...absenFilter, class: e.target.value}); setAbsenPage(1); setDetailAbsenPage(1); }} className="mb-0">
                            <option value="">Semua Kelas</option>
                            {sortedClassesDropdown.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </NeoSelect>
                    </div>
                    {absenFilter.type === 'harian' && (
                        <div className="w-[180px]">
                             <NeoInput type="date" value={absenFilter.date} onChange={e => setAbsenFilter({...absenFilter, date: e.target.value})} className="mb-0" />
                        </div>
                    )}
                    {absenFilter.type === 'bulanan' && (
                        <div className="w-[200px]">
                             <NeoInput type="month" value={absenFilter.month} onChange={e => setAbsenFilter({...absenFilter, month: e.target.value})} className="mb-0" />
                        </div>
                    )}
                    {absenFilter.type === 'range' && (
                        <div className="flex gap-2 items-center">
                            <div className="w-[140px]">
                                 <input type="date" className="w-full border-3 border-black p-2 font-bold" value={absenFilter.startDate} onChange={e => setAbsenFilter({...absenFilter, startDate: e.target.value})} />
                            </div>
                            <span className="font-black">-</span>
                            <div className="w-[140px]">
                                 <input type="date" className="w-full border-3 border-black p-2 font-bold" value={absenFilter.endDate} onChange={e => setAbsenFilter({...absenFilter, endDate: e.target.value})} />
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Total Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-neo-green border-3 border-black p-3 shadow-neo flex flex-col items-center justify-center transform -rotate-1">
                        <span className="text-xs font-black uppercase tracking-widest text-black">Total Hadir</span>
                        <span className="text-3xl font-black text-black">{totalH}</span>
                    </div>
                    <div className="bg-neo-blue border-3 border-black p-3 shadow-neo flex flex-col items-center justify-center transform rotate-1">
                        <span className="text-xs font-black uppercase tracking-widest text-black">Total Izin</span>
                        <span className="text-3xl font-black text-black">{totalI}</span>
                    </div>
                    <div className="bg-neo-yellow border-3 border-black p-3 shadow-neo flex flex-col items-center justify-center transform -rotate-1">
                        <span className="text-xs font-black uppercase tracking-widest text-black">Total Sakit</span>
                        <span className="text-3xl font-black text-black">{totalS}</span>
                    </div>
                    <div className="bg-neo-orange border-3 border-black p-3 shadow-neo flex flex-col items-center justify-center transform rotate-1">
                        <span className="text-xs font-black uppercase tracking-widest text-white">Tanpa Ket.</span>
                        <span className="text-3xl font-black text-white">{totalTK}</span>
                    </div>
                </div>

                <div className="flex gap-2 mb-4">
                     <NeoButton variant="success" onClick={() => handleExportAbsenPDF(studentStats)} className="px-4 py-2 text-sm">PDF</NeoButton>
                     <NeoButton variant="secondary" className="bg-neo-yellow px-4 py-2 text-sm" onClick={() => handleExportAbsenExcel(studentStats)}>Excel</NeoButton>
                </div>
                <NeoTable headers={['No', 'NISN', 'Nama', 'Kelas', 'H', 'I', 'S', 'TK', '%']}>
                    {paginatedStudents.map((s, idx) => (
                        <tr key={s.id} className="border-b-2 border-black hover:bg-blue-50 text-sm font-bold">
                            <td className="p-3 border-r-2 border-black">{(absenPage - 1) * absenItemsPerPage + idx + 1}</td>
                            <td className="p-3 border-r-2 border-black whitespace-nowrap">{s.nisn}</td>
                            <td className="p-3 border-r-2 border-black min-w-[150px]">{s.name}</td>
                            <td className="p-3 border-r-2 border-black">{s.class}</td>
                            <td className="p-3 border-r-2 border-black text-green-600">{s.h}</td>
                            <td className="p-3 border-r-2 border-black text-blue-600">{s.i}</td>
                            <td className="p-3 border-r-2 border-black text-orange-600">{s.sk}</td>
                            <td className="p-3 border-r-2 border-black text-red-600">{s.tk}</td>
                            <td className="p-3">{s.percentage}%</td>
                        </tr>
                    ))}
                </NeoTable>
                <div className="flex justify-between md:justify-end items-center gap-2 mt-6">
                    <button disabled={absenPage === 1} onClick={() => setAbsenPage(p => p - 1)} className="px-4 py-2 bg-white border-3 border-black disabled:opacity-50 font-black text-sm shadow-neo">Prev</button>
                    <span className="font-black text-sm bg-black text-white px-2 py-1">PAGE {absenPage}/{totalPages || 1}</span>
                    <button disabled={absenPage >= totalPages} onClick={() => setAbsenPage(p => p + 1)} className="px-4 py-2 bg-white border-3 border-black disabled:opacity-50 font-black text-sm shadow-neo">Next</button>
                </div>
            </NeoCard>

            <NeoCard title="Detail Ketidakhadiran">
                <div className="flex gap-2 mb-4 justify-end">
                     <NeoButton variant="success" onClick={() => handleExportDetailAbsenPDF(absenceDetails)} className="px-4 py-2 text-sm">PDF</NeoButton>
                     <NeoButton variant="secondary" className="bg-neo-yellow px-4 py-2 text-sm" onClick={() => handleExportDetailAbsenExcel(absenceDetails)}>Excel</NeoButton>
                </div>
                <NeoTable headers={['No', 'NISN', 'Nama', 'Kelas', 'Status']}>
                    {paginatedDetails.map((detail, idx) => (
                        <tr key={idx} className="border-b-2 border-black hover:bg-gray-50 text-sm font-bold">
                            <td className="p-3 border-r-2 border-black">{(detailAbsenPage - 1) * absenItemsPerPage + idx + 1}</td>
                            <td className="p-3 border-r-2 border-black whitespace-nowrap">{detail.nisn}</td>
                            <td className="p-3 border-r-2 border-black min-w-[200px]">{detail.name}</td>
                            <td className="p-3 border-r-2 border-black">{detail.class}</td>
                            <td className="p-3 border-r-2 border-black">
                                <span className={`px-2 py-1 text-xs font-black uppercase border border-black inline-block 
                                    ${detail.status === 'izin' ? 'bg-neo-blue text-black' : 
                                      detail.status === 'sakit' ? 'bg-neo-yellow text-black' : 
                                      'bg-neo-orange text-white'}`}>
                                    {detail.status === 'tanpaKet' ? 'Tanpa Ket.' : 
                                     detail.status === 'izin' ? 'Izin' : 
                                     detail.status === 'sakit' ? 'Sakit' : detail.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                    {paginatedDetails.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-400 font-bold">Tidak ada data ketidakhadiran.</td></tr>}
                </NeoTable>
                <div className="flex justify-between md:justify-end items-center gap-2 mt-6">
                    <button disabled={detailAbsenPage === 1} onClick={() => setDetailAbsenPage(p => p - 1)} className="px-4 py-2 bg-white border-3 border-black disabled:opacity-50 font-black text-sm shadow-neo">Prev</button>
                    <span className="font-black text-sm bg-black text-white px-2 py-1">PAGE {detailAbsenPage}/{totalDetailPages || 1}</span>
                    <button disabled={detailAbsenPage >= totalDetailPages} onClick={() => setDetailAbsenPage(p => p + 1)} className="px-4 py-2 bg-white border-3 border-black disabled:opacity-50 font-black text-sm shadow-neo">Next</button>
                </div>
            </NeoCard>
        </div>
    );
  };

  const handleManualSync = async () => {
    if(confirm("Sinkronisasi data dengan server?")) {
        setIsSyncing(true);
        try {
          await Promise.all([syncData(), new Promise(r => setTimeout(r, 1500))]);
          alert("Sinkronisasi Selesai.");
        } catch (e) {
          alert("Sinkronisasi Gagal.");
        } finally {
          setIsSyncing(false);
        }
    }
  };

  return (
    <div className="min-h-screen pb-24 md:pb-10 relative bg-gray-100">
        <SyncIndicator syncing={syncing} />
        <div className="bg-neo-purple border-b-4 border-black sticky top-0 z-10 px-4 md:px-6 py-4 flex justify-between items-center shadow-neo-lg text-white">
            <div className="flex flex-col">
                <h1 className="text-xl md:text-3xl font-black uppercase tracking-tighter italic">ADMIN PANEL</h1>
                <span className="text-xs font-bold tracking-widest text-neo-yellow">SD IT NURUL KAUTSAR</span>
            </div>
            <div className="flex gap-2">
                <NeoButton onClick={handleManualSync} disabled={isSyncing} variant="secondary" className="text-xs md:text-sm px-2 md:px-4 font-black">
                    {isSyncing ? "SYNCING..." : "SYNC"}
                </NeoButton>
                <NeoButton onClick={onLogout} variant="danger" className="text-xs md:text-sm px-2 md:px-4">Keluar</NeoButton>
            </div>
        </div>
        <div className="container mx-auto mt-6 md:mt-10 px-2 md:px-6 max-w-6xl">
             <div className="hidden md:flex gap-4 mb-8">
                {[
                    {id: 'rekap-jurnal', label: 'Rekap Jurnal'},
                    {id: 'rekap-absen', label: 'Rekap Absensi'},
                    {id: 'panel-admin', label: 'Master Data'}
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-6 py-3 font-black uppercase border-4 border-black transition-all tracking-wider ${activeTab === tab.id ? 'bg-neo-yellow shadow-neo translate-x-[-4px] translate-y-[-4px] text-black rotate-1' : 'bg-white hover:bg-gray-100 hover:-rotate-1 text-black'}`}>
                        {tab.label}
                    </button>
                ))}
             </div>
             {activeTab === 'rekap-jurnal' && renderRekapJurnal()}
             {activeTab === 'rekap-absen' && renderRekapAbsen()}
             {activeTab === 'panel-admin' && renderPanelAdmin()}
        </div>
        <NeoBottomNav activeId={activeTab} onChange={setActiveTab} items={[{ id: 'rekap-jurnal', label: 'Jurnal', icon: <IconRekapJurnal /> }, { id: 'rekap-absen', label: 'Absen', icon: <IconRekapAbsen /> }, { id: 'panel-admin', label: 'Admin', icon: <IconPanel /> }]} />
        <NeoModal isOpen={userModalOpen} onClose={() => { setUserModalOpen(false); setEditingUser(null); }} title={editingUser ? "Edit User" : "Tambah User"}>
            <form onSubmit={handleUserSubmit} className="space-y-4">
                <NeoInput name="fullName" label="Nama Lengkap" defaultValue={editingUser?.fullName} required />
                <NeoInput name="username" label="Username" defaultValue={editingUser?.username} required />
                <NeoInput name="password" type={showPassword ? "text" : "password"} label={editingUser ? "Password (Kosongkan jika tidak ubah)" : "Password"} rightIcon={<button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <IconEyeOff /> : <IconEye />}</button>} required={!editingUser} />
                <NeoSelect name="role" label="Role" defaultValue={editingUser?.role || 'guru'}>
                    <option value="guru">Guru</option>
                    <option value="admin">Admin</option>
                </NeoSelect>
                <NeoButton type="submit" className="w-full">SIMPAN</NeoButton>
            </form>
        </NeoModal>
        <NeoModal isOpen={classModalOpen} onClose={() => { setClassModalOpen(false); setEditingClass(null); }} title={editingClass ? "Edit Kelas" : "Tambah Kelas"}>
            <form onSubmit={handleClassSubmit} className="space-y-4">
                <NeoInput name="name" label="Nama Kelas" defaultValue={editingClass?.name} placeholder="Contoh: 1A" required />
                <NeoButton type="submit" className="w-full">SIMPAN</NeoButton>
            </form>
        </NeoModal>
        <NeoModal isOpen={studentModalOpen} onClose={() => { setStudentModalOpen(false); setEditingStudent(null); }} title={editingStudent ? "Edit Siswa" : "Tambah Siswa"}>
            <form onSubmit={handleStudentSubmit} className="space-y-4">
                <NeoInput name="nisn" label="NISN" defaultValue={editingStudent?.nisn} required />
                <NeoInput name="name" label="Nama Siswa" defaultValue={editingStudent?.name} required />
                <NeoSelect name="class" label="Kelas" defaultValue={editingStudent?.class || (studentClassFilter || '')} required>
                    <option value="">Pilih Kelas...</option>
                    {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </NeoSelect>
                <NeoSelect name="gender" label="Jenis Kelamin" defaultValue={editingStudent?.gender || 'L'}>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                </NeoSelect>
                <NeoButton type="submit" className="w-full">SIMPAN</NeoButton>
            </form>
        </NeoModal>
        <NeoConfirmModal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({...deleteConfirm, isOpen: false})} onConfirm={confirmDelete} title="Hapus Data" message="Apakah anda yakin ingin menghapus data ini secara permanen?" />
    </div>
  );
};

export default AdminDashboard;
