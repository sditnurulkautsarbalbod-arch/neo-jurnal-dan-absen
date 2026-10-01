// Backend: Vercel Functions (/api/*) yang bicara ke Neon — bukan Google Apps Script.
// Nama export & interface TIDAK berubah agar context/DataContext.tsx nol perubahan.
// API_BASE kosong = same-origin (path relatif) saat di-deploy di Vercel.
const API_BASE = (import.meta as any).env?.VITE_API_BASE || "";

export interface SyncDataResponse {
  users: any[];
  classes: any[];
  students: any[];
  journals: any[];
  attendance: any[];
  settings: any[];
}

export interface ApiRequest {
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  collection: 'users' | 'classes' | 'students' | 'journals' | 'attendance' | 'settings';
  data: any;
}

export const fetchAllFromSheet = async (): Promise<SyncDataResponse> => {
  try {
    const response = await fetch(`${API_BASE}/api/sync`);
    if (!response.ok) throw new Error("Network response was not ok");
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch /api/sync", error);
    throw error;
  }
};

export const sendToSheet = async (req: ApiRequest): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE}/api/mutation`, {
      method: 'POST',
      body: JSON.stringify(req),
      headers: { 'Content-Type': 'application/json;charset=utf-8' },
    });
    // false = biarkan mutation_queue mencoba lagi nanti (perilaku lama dipertahankan).
    if (!response.ok) return false;
    const result = await response.json();
    return result.status === 'success';
  } catch {
    return false;
  }
};
