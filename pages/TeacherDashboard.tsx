
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { NeoButton, NeoCard, NeoInput, NeoSelect, NeoTable, NeoToast, NeoBottomNav, NeoModal, NeoConfirmModal, IconLoading, IconSync, SyncIndicator } from '../components/NeoUI';
import { User, Journal, AttendanceRecord } from '../types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TeacherProps {
    user: User;
    onLogout: () => void;
}

// Icons for Bottom Nav
const IconJurnal = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconAbsen = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
const IconRekap = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
const IconRiwayat = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;

// Action Icons (Neo Style)
const IconEye = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const IconEdit = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const IconTrash = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

// Helper to format date
const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const dateObj = new Date(dateString);
  if (isNaN(dateObj.getTime())) return dateString;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(dateObj);
};

// Robust Date Standardizer (Always returns YYYY-MM-DD)
const standardizeDate = (input: string) => {
    if(!input) return '';
    const dateObj = new Date(input);
    if (isNaN(dateObj.getTime())) return input;
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper to convert ISO/Date string to YYYY-MM-DD for Input
const toInputDate = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const TeacherDashboard: React.FC<TeacherProps> = ({ user, onLogout }) => {
  const { classes, students, journals, attendance, addJournal, deleteJournal, addAttendance, deleteAttendance, syncData, loading, syncing } = useData();
  const [activeTab, setActiveTab] = useState<'input-jurnal' | 'input-absen' | 'rekap-absen' | 'riwayat'>('input-jurnal');
  
  // -- View Modal State --
  const [viewJournal, setViewJournal] = useState<Journal | null>(null);
  const [viewAttendance, setViewAttendance] = useState<AttendanceRecord | null>(null);

  // -- Delete Confirm State --
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'journal' | 'attendance' } | null>(null);

  // -- Pagination State --
  const [riwayatPage, setRiwayatPage] = useState(1);
  const riwayatPerPage = 10;
  
  // -- Filters for Rekap Jurnal --
  const [jurnalListFilter, setJurnalListFilter] = useState({
      type: 'bulanan',
      date: new Date().toISOString().split('T')[0],
      month: new Date().toISOString().substring(0, 7),
      week: '1'
  });

  // -- Rekap Absen State (Global) --
  const [rekapFilter, setRekapFilter] = useState({ 
      type: 'harian', 
      class: '', 
      date: new Date().toISOString().split('T')[0], 
      month: new Date().toISOString().substring(0, 7), 
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
  });
  const [rekapPage, setRekapPage] = useState(1);
  const rekapItemsPerPage = 10;
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });
  const showToast = (message: string) => {
      setToast({ show: true, message });
      setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const [jurnalForm, setJurnalForm] = useState<Partial<Journal>>({
      id: '',
      date: new Date().toISOString().split('T')[0],
      class: '',
      jam: '',
      materi: '',
      aktivitas: '',
      izin: 0,
      sakit: 0,
      tanpaKet: 0
  });

  const [absenDate, setAbsenDate] = useState(new Date().toISOString().split('T')[0]);
  const [absenClass, setAbsenClass] = useState('');
  const [absenData, setAbsenData] = useState<Record<string, string>>({}); // nisn -> status
  const [editingAbsenId, setEditingAbsenId] = useState<string | null>(null);

  // -- Helpers --
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

  // --- MOVE HOOKS TO TOP LEVEL (FIX ERROR #310) ---
  const teacherJournals = useMemo(() => {
    return journals.filter(j => j.teacher === user.username);
  }, [journals, user.username]);

  const monthlyStats = useMemo(() => {
      const stats: Record<string, number> = {};
      teacherJournals.forEach(j => {
          const d = new Date(j.date);
          if (isNaN(d.getTime())) return;
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const hours = calculateJam(j.jam);
          stats[monthKey] = (stats[monthKey] || 0) + hours;
      });

      const currentMonth = new Date();
      return Array.from({ length: 3 }, (_, idx) => {
          const monthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - idx, 1);
          const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
          const monthLabel = monthDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
          return [monthLabel, stats[monthKey] || 0] as [string, number];
      });
  }, [teacherJournals]);

  // -- Auto Save & Load Logic --
  useEffect(() => {
    const saved = localStorage.getItem('autosave_jurnal');
    if (saved) {
        try {
            setJurnalForm(JSON.parse(saved));
        } catch (e) {
            console.error("Failed to parse auto-save", e);
        }
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
        localStorage.setItem('autosave_jurnal', JSON.stringify(jurnalForm));
    }, 500);
    return () => clearTimeout(timeout);
  }, [jurnalForm]);

  useEffect(() => {
    if (jurnalForm.class && jurnalForm.date) {
        const attRecord = attendance.find(a => 
            standardizeDate(a.date) === standardizeDate(jurnalForm.date!) && 
            a.class.trim().toUpperCase() === jurnalForm.class!.trim().toUpperCase()
        );
        
        let i = 0, s = 0, tk = 0;
        if (attRecord) {
             attRecord.students.forEach(std => {
                 if(std.status === 'izin') i++;
                 if(std.status === 'sakit') s++;
                 if(std.status === 'tanpaKet') tk++;
             });
        }
        
        setJurnalForm(prev => {
            if (prev.izin === i && prev.sakit === s && prev.tanpaKet === tk) return prev;
            return { ...prev, izin: i, sakit: s, tanpaKet: tk };
        });
    }
  }, [jurnalForm.class, jurnalForm.date, attendance]);

  useEffect(() => {
    if (activeTab === 'input-absen' && absenClass) {
      const studentList = students.filter(s => s.class === absenClass).sort((a, b) => a.name.localeCompare(b.name));
        if (studentList.length > 0) {
            setAbsenData(prev => {
                const newState = { ...prev };
                let changed = false;
                studentList.forEach(s => {
                    if (!newState[s.nisn]) {
                        newState[s.nisn] = 'hadir';
                        changed = true;
                    }
                });
                return changed ? newState : prev;
            });
        }
    }
  }, [activeTab, absenClass, students]);

  const handleJurnalSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const relatedAbsence = attendance.find(a => 
        standardizeDate(a.date) === standardizeDate(jurnalForm.date!) && 
        a.class.trim().toUpperCase() === jurnalForm.class!.trim().toUpperCase()
      );
      if (!relatedAbsence) {
          showToast("GAGAL: Absensi belum diinput!");
          return;
      }
      const isDuplicate = journals.some(j => 
          standardizeDate(j.date) === standardizeDate(jurnalForm.date!) &&
          j.class.trim().toUpperCase() === jurnalForm.class!.trim().toUpperCase() &&
          j.jam === jurnalForm.jam &&
          j.teacher === user.username && 
          j.id !== jurnalForm.id
      );
      if (isDuplicate) {
          showToast("GAGAL: Anda sudah mengisi jurnal untuk Kelas, Tanggal & Jam ini!");
          return;
      }
      await addJournal({
          id: jurnalForm.id || Date.now().toString(),
          date: jurnalForm.date!,
          class: jurnalForm.class!,
          jam: jurnalForm.jam!,
          materi: jurnalForm.materi!,
          aktivitas: jurnalForm.aktivitas!,
          izin: jurnalForm.izin || 0,
          sakit: jurnalForm.sakit || 0,
          tanpaKet: jurnalForm.tanpaKet || 0,
          teacher: user.username,
          teacherName: user.fullName
      });
      showToast("Jurnal Berhasil Disimpan!");
      localStorage.removeItem('autosave_jurnal');
      
      // RESET FORM, but KEEP Attendance Data (Sakit, Izin, TK) and Date/Class
      // This ensures if teacher inputs next hour for same day, the attendance stats persist
      setJurnalForm({
          id: '',
          date: jurnalForm.date, // Keep date
          class: jurnalForm.class, // Keep class
          jam: '',
          materi: '',
          aktivitas: '',
          izin: jurnalForm.izin, // Keep existing calc
          sakit: jurnalForm.sakit, // Keep existing calc
          tanpaKet: jurnalForm.tanpaKet // Keep existing calc
      });
  };

  const handleAbsenSubmit = async () => {
      if(!absenClass || !absenDate) return;
      const existing = attendance.find(a => 
        standardizeDate(a.date) === standardizeDate(absenDate) && 
        a.class.trim().toUpperCase() === absenClass.trim().toUpperCase()
      );
      if (existing) {
          if (!editingAbsenId || existing.id !== editingAbsenId) {
             showToast("GAGAL: Absensi untuk Kelas & Tanggal ini sudah ada!");
             return;
          }
      }
      const studentList = students.filter(s => s.class === absenClass);
      const studentAttendance = studentList.map(s => ({
          nisn: s.nisn,
          name: s.name,
          status: (absenData[s.nisn] || 'hadir') as any
      }));
      const idToSave = editingAbsenId || `${absenDate}_${absenClass}`;
      await addAttendance({
          id: idToSave,
          date: absenDate,
          class: absenClass,
          teacher: user.username,
          students: studentAttendance
      });
      showToast(editingAbsenId ? "Absensi Berhasil Diupdate!" : "Absensi Berhasil Disimpan!");
      setEditingAbsenId(null);
  };

  const requestDelete = (id: string, type: 'journal' | 'attendance') => {
      setDeleteConfirm({ id, type });
  };

  const confirmDelete = async () => {
      if (deleteConfirm) {
          if (deleteConfirm.type === 'journal') {
              await deleteJournal(deleteConfirm.id);
              showToast("Jurnal Dihapus!");
          } else {
              await deleteAttendance(deleteConfirm.id);
              showToast("Absensi Dihapus!");
          }
          setDeleteConfirm(null);
      }
  };

  const handleEditJournal = (journal: Journal) => {
      const cleanDate = toInputDate(journal.date);
      setJurnalForm({ ...journal, date: cleanDate });
      setActiveTab('input-jurnal');
      showToast("Mode Edit Aktif");
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditAttendance = (record: AttendanceRecord) => {
      setEditingAbsenId(record.id);
      setAbsenDate(toInputDate(record.date));
      setAbsenClass(record.class);
      const newData: Record<string, string> = {};
      record.students.forEach(s => {
          newData[s.nisn] = s.status;
      });
      setAbsenData(newData);
      showToast("Mode Edit Absensi Aktif");
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleManualSync = async () => {
      if(confirm("Sinkronisasi data dengan server?")) {
          setIsSyncing(true);
          try {
            await Promise.all([
                syncData(),
                new Promise(resolve => setTimeout(resolve, 1500))
            ]);
            showToast("Sinkronisasi Selesai.");
          } catch (e) {
            showToast("Sinkronisasi Gagal.");
          } finally {
            setIsSyncing(false);
          }
      }
  };

  const handleExportAbsenPDF = (data: any[]) => {
    const doc = new jsPDF('landscape');
    let periodeStr = "";
    if (rekapFilter.type === 'harian') periodeStr = rekapFilter.date;
    else if (rekapFilter.type === 'bulanan') periodeStr = rekapFilter.month;
    else periodeStr = `${rekapFilter.startDate} s/d ${rekapFilter.endDate}`;
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

  const handleExportHistoryPDF = (data: Journal[]) => {
      const doc = new jsPDF('landscape');
      doc.text("RIWAYAT JURNAL MENGAJAR", 14, 20);
      doc.text(`Guru: ${user.fullName}`, 14, 28);
      
      let periodeStr = "";
      if (jurnalListFilter.type === 'harian') periodeStr = jurnalListFilter.date;
      else if (jurnalListFilter.type === 'bulanan') periodeStr = jurnalListFilter.month;
      else periodeStr = `Bulan ${jurnalListFilter.month} Minggu ke-${jurnalListFilter.week}`;
      doc.text(`Periode: ${periodeStr}`, 14, 36);

      const tableData = data.map((j, i) => [
          i + 1,
          formatDate(j.date),
          j.class,
          j.jam,
          j.materi,
          j.aktivitas,
          j.izin,
          j.sakit,
          j.tanpaKet
      ]);

      autoTable(doc, {
          head: [['No', 'Tanggal', 'Kelas', 'Jam', 'Materi', 'Aktivitas', 'I', 'S', 'TK']],
          body: tableData,
          startY: 45,
          styles: { fontSize: 8, cellPadding: 1, overflow: 'linebreak' },
          columnStyles: {
              0: { cellWidth: 8 },  
              1: { cellWidth: 20 }, 
              2: { cellWidth: 15 }, 
              3: { cellWidth: 12 }, 
              4: { cellWidth: 60 }, 
              5: { cellWidth: 100 }, // Aktivitas lebih lebar
              6: { cellWidth: 8, halign: 'center' }, 
              7: { cellWidth: 8, halign: 'center' }, 
              8: { cellWidth: 8, halign: 'center' }, 
          }
      });
      doc.save("riwayat_jurnal.pdf");
  };

  const handleExportHistoryExcel = (data: Journal[]) => {
      const worksheet = XLSX.utils.json_to_sheet(data.map((j, i) => ({
          No: i + 1,
          Tanggal: formatDate(j.date),
          Kelas: j.class,
          Jam: j.jam,
          Materi: j.materi,
          Aktivitas: j.aktivitas,
          Izin: j.izin,
          Sakit: j.sakit,
          TK: j.tanpaKet
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat Jurnal");
      XLSX.writeFile(workbook, "riwayat_jurnal.xlsx");
  };

  const renderInputJurnal = () => {
      const relatedAbsence = attendance.find(a => 
        standardizeDate(a.date) === standardizeDate(jurnalForm.date!) && 
        a.class.trim().toUpperCase() === jurnalForm.class!.trim().toUpperCase()
      );
      let visualIzin = 0, visualSakit = 0, visualTK = 0;
      if (relatedAbsence) {
          relatedAbsence.students.forEach(std => {
              if(std.status === 'izin') visualIzin++;
              if(std.status === 'sakit') visualSakit++;
              if(std.status === 'tanpaKet') visualTK++;
          });
      }
      const isFormFilled = !!(jurnalForm.date && jurnalForm.class && jurnalForm.jam && jurnalForm.materi && jurnalForm.aktivitas);
      const canSubmit = relatedAbsence && isFormFilled;
      let submitButtonText = "SIMPAN JURNAL";
      if (!relatedAbsence) submitButtonText = "INPUT ABSENSI DULU";
      else if (!isFormFilled) submitButtonText = "LENGKAPI FORM";
      else if (jurnalForm.id) submitButtonText = "UPDATE JURNAL";
      return (
          <NeoCard title={jurnalForm.id ? "Edit Jurnal" : "Input Jurnal Mengajar"}>
              <form onSubmit={handleJurnalSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <NeoInput type="date" label="Tanggal" value={jurnalForm.date} onChange={e => setJurnalForm({...jurnalForm, date: e.target.value})} required />
                      <NeoSelect label="Kelas" value={jurnalForm.class} onChange={e => setJurnalForm({...jurnalForm, class: e.target.value})} required>
                          <option value="">Pilih Kelas...</option>
                          {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </NeoSelect>
                  </div>
                  <NeoInput label="Jam Ke (ex: 1-3)" value={jurnalForm.jam} onChange={e => setJurnalForm({...jurnalForm, jam: e.target.value})} placeholder="Contoh: 1-3" required />
                  <div className="mb-6">
                      <label className="block font-black mb-2 uppercase text-xs tracking-widest bg-black text-white inline-block px-2 py-1 transform -rotate-1">Materi Pembelajaran</label>
                      <textarea className="w-full bg-gray-50 border-3 border-black p-3 font-bold text-lg focus:outline-none focus:bg-neo-bg focus:shadow-neo-sm h-32" value={jurnalForm.materi} onChange={e => setJurnalForm({...jurnalForm, materi: e.target.value})} placeholder="ISI MATERI..." required />
                  </div>
                  <div className="mb-6">
                      <label className="block font-black mb-2 uppercase text-xs tracking-widest bg-black text-white inline-block px-2 py-1 transform rotate-1">Aktivitas Kelas</label>
                      <textarea className="w-full bg-gray-50 border-3 border-black p-3 font-bold text-lg focus:outline-none focus:bg-neo-bg focus:shadow-neo-sm h-24" value={jurnalForm.aktivitas} onChange={e => setJurnalForm({...jurnalForm, aktivitas: e.target.value})} placeholder="AKTIVITAS SISWA..." required />
                  </div>
                  <div className="bg-neo-blue/10 border-3 border-black p-4 mb-6">
                      <h3 className="font-black uppercase mb-4 text-sm tracking-widest">Data Absensi (Otomatis dari Absen)</h3>
                      {relatedAbsence ? (
                          <div className="grid grid-cols-3 gap-4">
                              <NeoInput type="number" label="Sakit" value={visualSakit} readOnly className="text-center bg-gray-200" />
                              <NeoInput type="number" label="Izin" value={visualIzin} readOnly className="text-center bg-gray-200" />
                              <NeoInput type="number" label="Tanpa Ket" value={visualTK} readOnly className="text-center bg-gray-200" />
                          </div>
                      ) : (
                          <div className="bg-red-100 border-2 border-red-500 text-red-600 font-bold p-3 text-center text-sm uppercase">Data absensi untuk Tanggal & Kelas ini belum tersedia.</div>
                      )}
                  </div>
                  <div className="flex gap-4">
                      {jurnalForm.id && (
                          <NeoButton type="button" variant="secondary" onClick={() => {
                              setJurnalForm({ id: '', date: new Date().toISOString().split('T')[0], class: '', jam: '', materi: '', aktivitas: '', izin: 0, sakit: 0, tanpaKet: 0 });
                              showToast("Mode Edit Dibatalkan");
                          }} className="flex-1">Batal</NeoButton>
                      )}
                      <NeoButton type="submit" disabled={!canSubmit || loading} className="w-full flex-1">{loading ? <IconLoading /> : submitButtonText}</NeoButton>
                  </div>
              </form>
          </NeoCard>
      );
  };

  const renderInputAbsen = () => {
      const studentList = students.filter(s => s.class === absenClass).sort((a, b) => a.name.localeCompare(b.name));
      const recentAttendance = [...attendance]
          .filter(r => r.teacher === user.username)
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 10);
      return (
          <>
          <NeoCard title={editingAbsenId ? "Edit Absensi" : "Input Absensi Siswa"}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <NeoInput type="date" label="Tanggal" value={absenDate} onChange={e => setAbsenDate(e.target.value)} disabled={!!editingAbsenId} />
                  <NeoSelect label="Kelas" value={absenClass} onChange={e => { setAbsenClass(e.target.value); setAbsenData({}); }} disabled={!!editingAbsenId}>
                      <option value="">Pilih Kelas...</option>
                      {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </NeoSelect>
              </div>
              {absenClass && (
                  <div className="space-y-2 mb-6">
                      <div className="flex justify-between items-center bg-black text-white p-3 font-black uppercase text-sm">
                          <span>Nama Siswa</span>
                          <span>Status</span>
                      </div>
                      {studentList.map(s => (
                          <div key={s.id} className="flex justify-between items-center border-b-2 border-black p-3 bg-white hover:bg-gray-50">
                              <span className="font-bold">{s.name}</span>
                              <div className="flex gap-1">
                                  {(['hadir', 'sakit', 'izin', 'tanpaKet'] as const).map(status => (
                                      <button key={status} type="button" onClick={() => setAbsenData(prev => ({ ...prev, [s.nisn]: status }))} className={`px-2 py-1 text-xs font-black uppercase border-2 border-black transition-all ${absenData[s.nisn] === status ? status === 'hadir' ? 'bg-neo-green text-black' : status === 'sakit' ? 'bg-neo-yellow text-black' : status === 'izin' ? 'bg-neo-blue text-black' : 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:bg-gray-100'}`}>{status === 'tanpaKet' ? 'TK' : status}</button>
                                  ))}
                              </div>
                          </div>
                      ))}
                      {studentList.length === 0 && <div className="p-4 text-center font-bold text-gray-500">Tidak ada siswa di kelas ini.</div>}
                  </div>
              )}
              <div className="flex gap-4">
                   {editingAbsenId && (
                       <NeoButton variant="secondary" onClick={() => { setEditingAbsenId(null); setAbsenDate(new Date().toISOString().split('T')[0]); setAbsenClass(''); setAbsenData({}); showToast("Edit Dibatalkan"); }} className="flex-1">Batal</NeoButton>
                   )}
                   <NeoButton onClick={handleAbsenSubmit} disabled={!absenClass || studentList.length === 0 || loading} className="w-full flex-1">{loading ? <IconLoading /> : (editingAbsenId ? "UPDATE ABSENSI" : "SIMPAN ABSENSI")}</NeoButton>
              </div>
          </NeoCard>
          <div className="mt-8 border-t-4 border-black pt-8">
             <div className="bg-neo-pink border-3 border-black p-3 mb-6 transform -rotate-1 inline-block shadow-neo"><h3 className="text-xl font-black uppercase text-white tracking-widest">Riwayat Input Absensi</h3></div>
             <NeoTable headers={['Tanggal', 'Kelas', 'H', 'I', 'S', 'TK', 'Aksi']}>
                {recentAttendance.map(r => {
                   let h = 0, i = 0, s = 0, tk = 0;
                   r.students.forEach(st => { if(st.status === 'hadir') h++; if(st.status === 'izin') i++; if(st.status === 'sakit') s++; if(st.status === 'tanpaKet') tk++; });
                   return (
                       <tr key={r.id} className="border-b-2 border-black hover:bg-yellow-50 text-sm font-bold">
                           <td className="p-3 border-r-2 border-black whitespace-nowrap">{formatDate(r.date)}</td>
                           <td className="p-3 border-r-2 border-black font-black">{r.class}</td>
                           <td className="p-3 border-r-2 border-black text-center text-green-600">{h}</td>
                           <td className="p-3 border-r-2 border-black text-center text-blue-600">{i}</td>
                           <td className="p-3 border-r-2 border-black text-center text-orange-600">{s}</td>
                           <td className="p-3 border-r-2 border-black text-center text-red-600">{tk}</td>
                           <td className="p-3 flex gap-2 justify-center">
                                <button onClick={() => setViewAttendance(r)} className="w-8 h-8 flex items-center justify-center bg-blue-300 border-2 border-black shadow-neo-sm hover:translate-y-[-1px] transition-all"><IconEye /></button>
                                <button onClick={() => handleEditAttendance(r)} className="w-8 h-8 flex items-center justify-center bg-yellow-300 border-2 border-black shadow-neo-sm hover:translate-y-[-1px] transition-all"><IconEdit /></button>
                                <button onClick={() => requestDelete(r.id, 'attendance')} className="w-8 h-8 flex items-center justify-center bg-red-400 border-2 border-black shadow-neo-sm hover:translate-y-[-1px] transition-all text-white"><IconTrash /></button>
                           </td>
                       </tr>
                   );
                })}
                {recentAttendance.length === 0 && (<tr><td colSpan={7} className="p-6 text-center font-black uppercase text-gray-400">Belum ada riwayat absensi.</td></tr>)}
             </NeoTable>
          </div>
          </>
      );
  };

  const renderRekapAbsen = () => {
    const filteredRecords = attendance.filter(r => {
        if (rekapFilter.class && r.class !== rekapFilter.class) return false;
        const rDate = standardizeDate(r.date); 
        if (rekapFilter.type === 'harian') return rDate === rekapFilter.date;
        if (rekapFilter.type === 'bulanan') return rDate.startsWith(rekapFilter.month);
        if (rekapFilter.type === 'range') return rDate >= rekapFilter.startDate && rDate <= rekapFilter.endDate;
        return true;
    });
    const filteredStudents = students.filter(s => rekapFilter.class ? s.class === rekapFilter.class : true).sort((a, b) => a.name.localeCompare(b.name));
    const studentStats = filteredStudents.map(s => {
        let h = 0, i = 0, sk = 0, tk = 0;
        filteredRecords.forEach(r => {
            const status = r.students.find(st => st.nisn === s.nisn)?.status;
            if (status === 'hadir') h++; else if (status === 'izin') i++; else if (status === 'sakit') sk++; else if (status === 'tanpaKet') tk++;
        });
        const total = h + i + sk + tk;
        const percentage = total > 0 ? ((h / total) * 100).toFixed(1) : '0.0';
        return { ...s, h, i, sk, tk, percentage };
    });
    const totalPages = Math.ceil(studentStats.length / rekapItemsPerPage);
    const paginatedStudents = studentStats.slice((rekapPage - 1) * rekapItemsPerPage, rekapPage * rekapItemsPerPage);
    return (
        <NeoCard title="Rekap Absensi">
             <div className="flex flex-wrap items-end gap-2 mb-6">
                <div className="w-[150px]"><NeoSelect value={rekapFilter.type} onChange={e => { setRekapFilter({...rekapFilter, type: e.target.value}); setRekapPage(1); }} className="mb-0"><option value="harian">Harian</option><option value="bulanan">Bulanan</option><option value="range">Rentang Waktu</option></NeoSelect></div>
                <div className="w-[180px]"><NeoSelect value={rekapFilter.class} onChange={e => { setRekapFilter({...rekapFilter, class: e.target.value}); setRekapPage(1); }} className="mb-0"><option value="">Semua Kelas</option>{classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</NeoSelect></div>
                {rekapFilter.type === 'harian' && (<div className="w-[180px]"><NeoInput type="date" value={rekapFilter.date} onChange={e => setRekapFilter({...rekapFilter, date: e.target.value})} className="mb-0" /></div>)}
                {rekapFilter.type === 'bulanan' && (<div className="w-[200px]"><NeoInput type="month" value={rekapFilter.month} onChange={e => setRekapFilter({...rekapFilter, month: e.target.value})} className="mb-0" /></div>)}
                {rekapFilter.type === 'range' && (<div className="flex gap-2 items-center"><div className="w-[160px]"><label className="block text-[10px] font-black uppercase mb-1">Mulai</label><input type="date" className="w-full bg-gray-50 border-3 border-black p-2 font-bold focus:outline-none" value={rekapFilter.startDate} onChange={e => setRekapFilter({...rekapFilter, startDate: e.target.value})} /></div><span className="font-black">-</span><div className="w-[160px]"><label className="block text-[10px] font-black uppercase mb-1">Sampai</label><input type="date" className="w-full bg-gray-50 border-3 border-black p-2 font-bold focus:outline-none" value={rekapFilter.endDate} onChange={e => setRekapFilter({...rekapFilter, endDate: e.target.value})} /></div></div>)}
            </div>
            <div className="flex gap-2 mb-4">
                 <NeoButton variant="success" onClick={() => handleExportAbsenPDF(studentStats)} className="px-4 py-2 text-sm">PDF</NeoButton>
                 <NeoButton variant="secondary" className="bg-neo-yellow px-4 py-2 text-sm" onClick={() => handleExportAbsenExcel(studentStats)}>Excel</NeoButton>
            </div>
            <NeoTable headers={['No', 'NISN', 'Nama', 'Kelas', 'H', 'I', 'S', 'TK', '%']}>
                {paginatedStudents.map((s, idx) => (
                    <tr key={s.id} className="border-b-2 border-black hover:bg-blue-50 text-sm font-bold">
                        <td className="p-3 border-r-2 border-black">{(rekapPage - 1) * rekapItemsPerPage + idx + 1}</td>
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
                {paginatedStudents.length === 0 && <tr><td colSpan={9} className="p-6 text-center font-black text-gray-400 uppercase">Tidak ada data.</td></tr>}
            </NeoTable>
            <div className="flex justify-between md:justify-end items-center gap-2 mt-6">
                <button disabled={rekapPage === 1} onClick={() => setRekapPage(p => p - 1)} className="px-4 py-2 bg-white border-3 border-black disabled:opacity-50 font-black text-sm uppercase shadow-neo">Prev</button>
                <span className="font-black text-sm bg-black text-white px-2 py-1">PAGE {rekapPage}/{totalPages || 1}</span>
                <button disabled={rekapPage >= totalPages} onClick={() => setRekapPage(p => p + 1)} className="px-4 py-2 bg-white border-3 border-black disabled:opacity-50 font-black text-sm uppercase shadow-neo">Next</button>
            </div>
        </NeoCard>
    );
  };

  const renderRekapJurnalGuru = () => {
      const filtered = teacherJournals.filter(j => {
          const jDate = standardizeDate(j.date);
          if(jurnalListFilter.type === 'harian') return jDate === jurnalListFilter.date;
          if(jurnalListFilter.type === 'bulanan') return jDate.startsWith(jurnalListFilter.month);
          if(jurnalListFilter.type === 'mingguan') {
              if (!jDate.startsWith(jurnalListFilter.month)) return false;
              const weekNum = getWeekOfMonth(jDate);
              return weekNum.toString() === jurnalListFilter.week;
          }
          return true;
      }).sort((a, b) => {
          const dateCompare = b.date.localeCompare(a.date);
          if (dateCompare !== 0) return dateCompare;
          const jamA = parseInt(a.jam) || 0;
          const jamB = parseInt(b.jam) || 0;
          return jamB - jamA;
      });

      const totalPages = Math.ceil(filtered.length / riwayatPerPage);
      const paginatedData = filtered.slice((riwayatPage - 1) * riwayatPerPage, riwayatPage * riwayatPerPage);

      return (
          <div className="space-y-6">
              {/* teaching stats summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-neo-blue border-4 border-black p-4 shadow-neo-lg transform -rotate-1">
                      <h4 className="text-xs font-black uppercase tracking-widest text-black/70 mb-1">Total Mengajar</h4>
                      <p className="text-3xl font-black italic">{teacherJournals.reduce((acc, curr) => acc + calculateJam(curr.jam), 0)} JAM</p>
                  </div>
                  {monthlyStats.map(([month, hours], idx) => (
                      <div key={month} className={`border-4 border-black p-4 shadow-neo-lg transform ${idx % 2 === 0 ? 'rotate-1 bg-neo-yellow' : '-rotate-1 bg-neo-green'}`}>
                          <h4 className="text-xs font-black uppercase tracking-widest text-black/70 mb-1">{month}</h4>
                          <p className="text-3xl font-black italic">{hours} JAM</p>
                      </div>
                  ))}
              </div>

              <NeoCard title="Riwayat Jurnal Saya">
                  <div className="flex flex-wrap gap-4 items-end mb-6">
                      <div className="w-full md:w-48">
                          <NeoSelect value={jurnalListFilter.type} onChange={e => setJurnalListFilter({...jurnalListFilter, type: e.target.value})} className="mb-0">
                              <option value="harian">Harian</option>
                              <option value="mingguan">Mingguan</option>
                              <option value="bulanan">Bulanan</option>
                          </NeoSelect>
                      </div>
                      <div className="w-full md:w-56">
                          {jurnalListFilter.type === 'harian' ? (
                              <NeoInput type="date" value={jurnalListFilter.date} onChange={e => setJurnalListFilter({...jurnalListFilter, date: e.target.value})} className="mb-0" />
                          ) : (
                              <NeoInput type="month" value={jurnalListFilter.month} onChange={e => setJurnalListFilter({...jurnalListFilter, month: e.target.value})} className="mb-0" />
                          )}
                      </div>
                      {jurnalListFilter.type === 'mingguan' && (
                          <div className="w-full md:w-48">
                              <NeoSelect value={jurnalListFilter.week} onChange={e => setJurnalListFilter({...jurnalListFilter, week: e.target.value})} className="mb-0">
                                  <option value="1">Minggu 1</option>
                                  <option value="2">Minggu 2</option>
                                  <option value="3">Minggu 3</option>
                                  <option value="4">Minggu 4</option>
                                  <option value="5">Minggu 5</option>
                              </NeoSelect>
                          </div>
                      )}
                      <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                           <NeoButton variant="success" className="px-3 py-2 text-sm" onClick={() => handleExportHistoryPDF(filtered)}>PDF</NeoButton>
                           <NeoButton variant="secondary" className="px-3 py-2 text-sm bg-neo-yellow" onClick={() => handleExportHistoryExcel(filtered)}>Excel</NeoButton>
                      </div>
                  </div>
                  <NeoTable headers={['Tanggal', 'Kelas', 'Jam', 'Materi', 'Aktivitas', 'I', 'S', 'TK', 'Aksi']}>
                      {paginatedData.map((j) => (
                          <tr key={j.id} className="border-b-2 border-black hover:bg-yellow-50 text-sm font-bold">
                              <td className="p-3 border-r-2 border-black whitespace-nowrap">{formatDate(j.date)}</td>
                              <td className="p-3 border-r-2 border-black">{j.class}</td>
                              <td className="p-3 border-r-2 border-black text-center">{j.jam}</td>
                              <td className="p-3 border-r-2 border-black min-w-[150px] truncate max-w-[200px]">{j.materi}</td>
                              <td className="p-3 border-r-2 border-black min-w-[150px] truncate max-w-[200px]">{j.aktivitas}</td>
                              <td className="p-3 border-r-2 border-black text-center text-blue-600">{j.izin}</td>
                              <td className="p-3 border-r-2 border-black text-center text-orange-600">{j.sakit}</td>
                              <td className="p-3 border-r-2 border-black text-center text-red-600">{j.tanpaKet}</td>
                              <td className="p-3 flex gap-2 justify-center">
                                  <button onClick={() => setViewJournal(j)} className="w-8 h-8 flex items-center justify-center bg-blue-300 border-2 border-black shadow-neo-sm hover:translate-y-[-1px] transition-all"><IconEye /></button>
                                  <button onClick={() => handleEditJournal(j)} className="w-8 h-8 flex items-center justify-center bg-yellow-300 border-2 border-black shadow-neo-sm hover:translate-y-[-1px] transition-all"><IconEdit /></button>
                                  <button onClick={() => requestDelete(j.id, 'journal')} className="w-8 h-8 flex items-center justify-center bg-red-400 border-2 border-black shadow-neo-sm hover:translate-y-[-1px] transition-all text-white"><IconTrash /></button>
                              </td>
                          </tr>
                      ))}
                      {paginatedData.length === 0 && <tr><td colSpan={9} className="p-6 text-center font-black text-gray-400 uppercase">Tidak ada data.</td></tr>}
                  </NeoTable>
                  <div className="flex justify-between md:justify-end items-center gap-2 mt-6">
                      <button disabled={riwayatPage === 1} onClick={() => setRiwayatPage(p => p - 1)} className="px-4 py-2 bg-white border-3 border-black disabled:opacity-50 font-black text-sm uppercase shadow-neo">Prev</button>
                      <span className="font-black text-sm bg-black text-white px-2 py-1">PAGE {riwayatPage}/{totalPages || 1}</span>
                      <button disabled={riwayatPage >= totalPages} onClick={() => setRiwayatPage(p => p + 1)} className="px-4 py-2 bg-white border-3 border-black disabled:opacity-50 font-black text-sm uppercase shadow-neo">Next</button>
                  </div>
              </NeoCard>
          </div>
      );
  };

  return (
    <div className="min-h-screen pb-24 md:pb-10 relative bg-gray-100">
      <NeoToast show={toast.show} message={toast.message} onClose={() => setToast({ show: false, message: '' })} />
      <SyncIndicator syncing={syncing} />
      <div className="bg-neo-green border-b-4 border-black sticky top-0 z-10 px-4 md:px-6 py-4 flex justify-between items-center shadow-neo-lg"><div className="flex flex-col"><h1 className="text-xl md:text-3xl font-black uppercase tracking-tighter italic">DASHBOARD GURU</h1><span className="text-xs font-bold tracking-widest">{user.fullName}</span></div><div className="flex gap-2"><NeoButton onClick={handleManualSync} disabled={isSyncing} variant="secondary" className="text-xs md:text-sm px-2 md:px-4 font-black">{isSyncing ? "SYNCING..." : "SYNC"}</NeoButton><NeoButton onClick={onLogout} variant="danger" className="text-xs md:text-sm px-2 md:px-4">Keluar</NeoButton></div></div>
      <div className="container mx-auto mt-6 md:mt-10 px-2 md:px-6 max-w-5xl"><div className="hidden md:flex gap-4 mb-8">{[{id: 'input-jurnal', label: 'Input Jurnal'}, {id: 'input-absen', label: 'Input Absen'}, {id: 'rekap-absen', label: 'Rekap Absen'}, {id: 'riwayat', label: 'Riwayat Jurnal'}].map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-6 py-3 font-black uppercase border-4 border-black transition-all tracking-wider ${activeTab === tab.id ? 'bg-neo-blue shadow-neo translate-x-[-4px] translate-y-[-4px] text-black rotate-1' : 'bg-white hover:bg-gray-100 hover:-rotate-1'}`}>{tab.label}</button>))}</div>{activeTab === 'input-jurnal' && renderInputJurnal()}{activeTab === 'input-absen' && renderInputAbsen()}{activeTab === 'rekap-absen' && renderRekapAbsen()}{activeTab === 'riwayat' && renderRekapJurnalGuru()}</div>
      <NeoBottomNav activeId={activeTab} onChange={setActiveTab} items={[{ id: 'input-jurnal', label: 'Jurnal', icon: <IconJurnal /> }, { id: 'input-absen', label: 'Absen', icon: <IconAbsen /> }, { id: 'rekap-absen', label: 'Rekap', icon: <IconRekap /> }, { id: 'riwayat', label: 'Riwayat', icon: <IconRiwayat /> }]} />
      <NeoConfirmModal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={confirmDelete} title="Konfirmasi Hapus" message="Apakah anda yakin ingin menghapus data ini?" />
      <NeoModal isOpen={!!viewJournal} onClose={() => setViewJournal(null)} title="Detail Jurnal">{viewJournal && (<div className="space-y-4 font-bold"><p><span className="block text-xs uppercase text-gray-500">Tanggal</span> {formatDate(viewJournal.date)}</p><p><span className="block text-xs uppercase text-gray-500">Kelas</span> {viewJournal.class}</p><p><span className="block text-xs uppercase text-gray-500">Jam</span> {viewJournal.jam}</p><p><span className="block text-xs uppercase text-gray-500">Materi</span> {viewJournal.materi}</p><p><span className="block text-xs uppercase text-gray-500">Aktivitas</span> {viewJournal.aktivitas}</p><div className="flex gap-4 border-t-2 border-black pt-2"><div className="text-blue-600">Izin: {viewJournal.izin}</div><div className="text-orange-600">Sakit: {viewJournal.sakit}</div><div className="text-red-600">TK: {viewJournal.tanpaKet}</div></div></div>)}</NeoModal>
      <NeoModal isOpen={!!viewAttendance} onClose={() => setViewAttendance(null)} title="Detail Absensi">{viewAttendance && (<div className="space-y-4"><div className="flex justify-between items-center bg-gray-100 p-2 border-2 border-black"><span className="font-bold text-sm uppercase">TANGGAL: {formatDate(viewAttendance.date)}</span><span className="font-bold text-sm uppercase">KELAS: {viewAttendance.class}</span></div><div className="max-h-[300px] overflow-y-auto border-2 border-black">{viewAttendance.students.map((s, i) => (<div key={i} className="flex justify-between items-center p-2 border-b border-gray-200 last:border-b-0 text-sm"><span className="font-bold">{s.name}</span><span className={`px-2 py-1 text-xs font-black uppercase border border-black ${s.status === 'hadir' ? 'bg-neo-green' : s.status === 'sakit' ? 'bg-neo-yellow' : s.status === 'izin' ? 'bg-neo-blue' : 'bg-red-500 text-white'}`}>{s.status === 'tanpaKet' ? 'TK' : s.status}</span></div>))}</div></div>)}</NeoModal>
    </div>
  );
};

export default TeacherDashboard;
