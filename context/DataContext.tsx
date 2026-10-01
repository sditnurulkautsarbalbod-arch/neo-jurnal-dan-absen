import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Class, Student, Journal, AttendanceRecord, SystemSettings } from '../types';
import { 
    getAllFromStore, saveToStore, saveItemToStore, deleteItemFromStore, 
    isDBSeeded, getQueueItems, deleteQueueItem 
} from '../services/indexedDB';
import { fetchAllFromSheet, sendToSheet, ApiRequest } from '../services/sheetApi';

interface DataContextType {
  users: User[];
  classes: Class[];
  students: Student[];
  journals: Journal[];
  attendance: AttendanceRecord[];
  settings: SystemSettings;
  loading: boolean;
  syncData: () => Promise<void>;
  
  // CRUD Helpers
  addUser: (user: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addClass: (cls: Class) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  addStudent: (student: Student) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  addJournal: (journal: Journal) => Promise<void>;
  deleteJournal: (id: string) => Promise<void>;
  addAttendance: (record: AttendanceRecord) => Promise<void>;
  deleteAttendance: (id: string) => Promise<void>;
  saveSettings: (settings: SystemSettings) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({ semester: 'Ganjil', tahunAjaran: '2024/2025', kepalaSekolah: '' });
  const [loading, setLoading] = useState(true);

  // --- 1. LOAD FROM INDEXED DB ON STARTUP & AUTO SYNC ---
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const hasData = await isDBSeeded();

        if (hasData) {
            await loadFromIDB();
        } else {
            // Initial Seed for UX if empty
            const dummyUsers: User[] = [
                { id: 'admin', fullName: 'Administrator', username: 'admin', password: '123', role: 'admin' },
                { id: 'guru', fullName: 'Budi Santoso', username: 'guru', password: '123', role: 'guru' },
            ];
            setUsers(dummyUsers);
            await saveToStore('users', dummyUsers);
            await saveToStore('settings', { id: 'main', ...settings });
        }
        
        // Auto Sync: Process Queue & Pull from Sheet
        await syncData();

      } catch (err) {
        console.error("Failed to load/sync data", err);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  const loadFromIDB = async () => {
      const loadedUsers = await getAllFromStore<User>('users');
      const loadedClasses = await getAllFromStore<Class>('classes');
      const loadedStudents = await getAllFromStore<Student>('students');
      const loadedJournals = await getAllFromStore<Journal>('journals');
      const loadedAttendance = await getAllFromStore<AttendanceRecord>('attendance');
      const loadedSettings = await getAllFromStore<any>('settings');

      setUsers(loadedUsers);
      setClasses(loadedClasses);
      setStudents(loadedStudents);
      setJournals(loadedJournals);
      setAttendance(loadedAttendance);
      if (loadedSettings.length > 0) {
            const { id, ...realSettings } = loadedSettings[0];
            setSettings(realSettings);
      }
  };

  // --- 2. QUEUE PROCESSING (BACKGROUND SYNC) ---
  const processQueue = async () => {
      const queue = await getQueueItems();
      if (queue.length === 0) return;

      console.log(`Processing ${queue.length} background jobs...`);
      
      for (const item of queue) {
          const req = item.val as ApiRequest;
          const success = await sendToSheet(req);
          if (success) {
              await deleteQueueItem(item.key);
          } else {
              // Stop processing if network fails, try again later
              console.warn("Network failed, pausing queue processing.");
              break;
          }
      }
  };

  // Helper to add to IDB and Queue
  const enqueueAction = async (action: 'CREATE' | 'UPDATE' | 'DELETE', collection: string, data: any) => {
      const req: ApiRequest = { action, collection: collection as any, data };
      await saveItemToStore('mutation_queue', req);
      processQueue(); // Trigger immediately (fire and forget)
  };

  // --- 3. SYNC WITH GOOGLE SHEETS (PULL) ---
  const syncData = async () => {
    console.log("Starting Auto Sync...");
    
    try {
      // 1. Process local queue first to ensure upstream is fresh
      await processQueue();

      // 2. Fetch all data from Sheet
      const data = await fetchAllFromSheet();
      
      // 3. Normalize Data (Handle JSON strings from Sheet) & Deduplicate

      // Users: Dedup by ID
      const uniqueUsers = Array.from(new Map((data.users || []).map((u: any) => [u.id, u])).values());

      // Classes: Dedup by ID first, THEN by Name (to prevent visual duplicates in UI if multiple IDs exist for same class name)
      const classesById = Array.from(new Map((data.classes || []).map((c: any) => [c.id, c])).values());
      const uniqueClasses = Array.from(new Map(classesById.map((c: any) => [c.name, c])).values());

      // Students: Dedup by ID
      const uniqueStudents = Array.from(new Map((data.students || []).map((s: any) => [s.id, s])).values());

      // Journals: Dedup by ID
      const uniqueJournals = Array.from(new Map((data.journals || []).map((j: any) => [j.id, j])).values());

      // Attendance: Parse JSON and Dedup by ID
      const parsedAttendance = (data.attendance || []).map((a: any) => ({
          ...a,
          students: typeof a.students_json === 'string' ? JSON.parse(a.students_json) : a.students_json
      }));
      const uniqueAttendance = Array.from(new Map(parsedAttendance.map((a: any) => [a.id, a])).values());

      const parsedSettings = (data.settings || []).find((s: any) => s.id === 'main') || settings;
      
      // 4. Update IndexedDB (Source of Truth) - saveToStore clears existing data first, preventing local IDB dups
      await saveToStore('users', uniqueUsers);
      await saveToStore('classes', uniqueClasses);
      await saveToStore('students', uniqueStudents);
      await saveToStore('journals', uniqueJournals);
      await saveToStore('attendance', uniqueAttendance);
      await saveToStore('settings', { id: 'main', ...parsedSettings });

      // 5. Update State
      setUsers(uniqueUsers);
      setClasses(uniqueClasses);
      setStudents(uniqueStudents);
      setJournals(uniqueJournals);
      setAttendance(uniqueAttendance);
      setSettings(parsedSettings);
      
      console.log("Auto Sync Completed.");

    } catch (error) {
      console.error("Sync failed (Offline or Error)", error);
    }
  };

  // --- CRUD OPERATIONS ---
  // Pattern: Update State -> Update IDB -> Enqueue API Call

  const addUser = async (user: User) => {
    setUsers(prev => {
        const exists = prev.find(u => u.id === user.id);
        return exists ? prev.map(u => u.id === user.id ? user : u) : [...prev, user];
    });
    await saveItemToStore('users', user);
    const action = users.find(u => u.id === user.id) ? 'UPDATE' : 'CREATE';
    enqueueAction(action, 'users', user);
  };

  const deleteUser = async (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    await deleteItemFromStore('users', id);
    enqueueAction('DELETE', 'users', { id });
  };

  const addClass = async (cls: Class) => {
    setClasses(prev => {
        const exists = prev.find(c => c.id === cls.id);
        return exists ? prev.map(c => c.id === cls.id ? cls : c) : [...prev, cls];
    });
    await saveItemToStore('classes', cls);
    const action = classes.find(c => c.id === cls.id) ? 'UPDATE' : 'CREATE';
    enqueueAction(action, 'classes', cls);
  };

  const deleteClass = async (id: string) => {
    setClasses(prev => prev.filter(c => c.id !== id));
    await deleteItemFromStore('classes', id);
    enqueueAction('DELETE', 'classes', { id });
  };

  const addStudent = async (student: Student) => {
    setStudents(prev => {
        const exists = prev.find(s => s.id === student.id);
        return exists ? prev.map(s => s.id === student.id ? student : s) : [...prev, student];
    });
    await saveItemToStore('students', student);
    const action = students.find(s => s.id === student.id) ? 'UPDATE' : 'CREATE';
    enqueueAction(action, 'students', student);
    updateClassCount(student.class);
  };

  const deleteStudent = async (id: string) => {
    const student = students.find(s => s.id === id);
    if(student) {
        setStudents(prev => prev.filter(s => s.id !== id));
        await deleteItemFromStore('students', id);
        enqueueAction('DELETE', 'students', { id });
        updateClassCount(student.class);
    }
  };

  const updateClassCount = async (className: string) => {
      // This is a UI helper, doesn't need to sync to backend explicitly as `studentCount` 
      // in 'classes' might be better calculated dynamically, but if we persist it:
      setTimeout(async () => {
          const count = students.filter(s => s.class === className).length;
          const cls = classes.find(c => c.name === className);
          if (cls) {
              const updatedClass = { ...cls, studentCount: count };
              setClasses(prev => prev.map(c => c.id === cls.id ? updatedClass : c));
              await saveItemToStore('classes', updatedClass);
              enqueueAction('UPDATE', 'classes', updatedClass);
          }
      }, 500);
  };

  const addJournal = async (journal: Journal) => {
    const exists = journals.find(j => j.id === journal.id);
    setJournals(prev => exists ? prev.map(j => j.id === journal.id ? journal : j) : [...prev, journal]);
    
    await saveItemToStore('journals', journal);
    enqueueAction(exists ? 'UPDATE' : 'CREATE', 'journals', journal);
  };
  
  const deleteJournal = async (id: string) => {
    setJournals(prev => prev.filter(j => j.id !== id));
    await deleteItemFromStore('journals', id);
    enqueueAction('DELETE', 'journals', { id });
  };

  const addAttendance = async (record: AttendanceRecord) => {
    const exists = attendance.find(a => a.id === record.id);
    setAttendance(prev => exists ? prev.map(a => a.id === record.id ? record : a) : [...prev, record]);
    
    // Convert students array to JSON string for Queue/Sheet
    const recordForSheet = { 
        ...record, 
        students_json: record.students // Helper API will handle stringify if needed, or we do it in GAS
    };
    
    await saveItemToStore('attendance', record);
    // For local IDB we keep object, for Sheet we need special handling.
    // Our sendToSheet logic sends JSON, GAS parses it.
    // However, the header mapping in GAS `students_json` handles the object->string conversion.
    enqueueAction(exists ? 'UPDATE' : 'CREATE', 'attendance', recordForSheet);
  };
  
  const deleteAttendance = async (id: string) => {
    setAttendance(prev => prev.filter(a => a.id !== id));
    await deleteItemFromStore('attendance', id);
    enqueueAction('DELETE', 'attendance', { id });
  };

  const saveSettings = async (newSettings: SystemSettings) => {
    setSettings(newSettings);
    const settingObj = { id: 'main', ...newSettings };
    await saveItemToStore('settings', settingObj);
    enqueueAction('UPDATE', 'settings', settingObj);
  };

  return (
    <DataContext.Provider value={{ 
        users, classes, students, journals, attendance, settings, loading, syncData,
        addUser, deleteUser, addClass, deleteClass, addStudent, deleteStudent,
        addJournal, deleteJournal, addAttendance, deleteAttendance, saveSettings
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error('useData must be used within a DataProvider');
  return context;
};