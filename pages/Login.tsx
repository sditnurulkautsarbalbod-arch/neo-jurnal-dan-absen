import React, { useState } from 'react';
import { NeoButton, NeoCard, NeoInput, IconLoading, IconSync } from '../components/NeoUI';
import { useData } from '../context/DataContext';
import { usePwaInstall } from '../hooks/usePwaInstall';

// Icons
const IconEye = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const IconEyeOff = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>;
const IconDownload = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;

interface LoginProps {
  onLogin: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { loading, syncData } = useData();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { isStandalone, canPrompt, isIOS, install } = usePwaInstall();

  // Sembunyikan jika sudah terpasang / browser tak mendukung install prompt
  const showInstallButton = !isStandalone && (canPrompt || isIOS);

  const handleInstallClick = async () => {
    // iOS tak punya beforeinstallprompt -> tampilkan panduan manual
    if (isIOS && !canPrompt) {
      setShowIOSGuide((prev) => !prev);
      return;
    }
    await install();
  };

  // Autentikasi server-side: hash bcrypt tidak lagi dikirim/diproses di browser.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const result = (await response.json()) as { success?: boolean; user?: unknown };
      if (response.ok && result.success && result.user) {
        onLogin(result.user);
      } else {
        setError('Username atau password salah!');
      }
    } catch {
      setError('Username atau password salah!');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForceSync = async () => {
      setIsSyncing(true);
      try {
          // Add artificial delay (1.5s) to ensure animation is seen
          await Promise.all([
              syncData(),
              new Promise(resolve => setTimeout(resolve, 1500))
          ]);
          alert("Sinkronisasi selesai! Silakan coba login kembali.");
      } catch (e) {
          alert("Gagal sinkronisasi. Cek koneksi internet.");
      } finally {
          setIsSyncing(false);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-neo-blue">
      {/* Decorative Elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-neo-yellow border-4 border-black shadow-neo-xl transform -rotate-12 hidden md:block"></div>
      <div className="absolute bottom-10 right-10 w-40 h-40 bg-neo-pink border-4 border-black shadow-neo-xl rounded-full transform rotate-12 hidden md:block"></div>

      {/* Tombol Pasang Aplikasi (PWA) */}
      {showInstallButton && (
        <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
          {showIOSGuide && (
            <div className="bg-white border-3 border-black shadow-neo p-3 text-xs font-bold max-w-[250px]">
              <p className="mb-1 uppercase font-black">iPhone / iPad:</p>
              <ol className="list-decimal ml-5 space-y-1">
                <li>Ketuk tombol <strong>Bagikan</strong> (ikon kotak panah ↑)</li>
                <li>Pilih <strong>Tambahkan ke Layar Utama</strong></li>
                <li>Konfirmasi dengan <strong>Tambah</strong></li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-2 font-black underline uppercase"
              >
                Tutup
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex items-center gap-2 bg-neo-green hover:bg-green-400 border-3 border-black shadow-neo rounded-full px-4 py-2 font-black uppercase text-sm transition-transform hover:-translate-y-0.5"
          >
            <IconDownload />
            Pasang Aplikasi (PWA)
          </button>
        </div>
      )}
      
      <div className="w-full max-w-md relative z-10">
          <div className="bg-white border-4 border-black shadow-neo-xl p-8 transform rotate-1">
            <div className="text-center mb-8 border-b-4 border-black pb-6">
                <h1 className="text-5xl font-black mb-2 uppercase tracking-tighter italic">NEO JURNAL</h1>
                <div className="inline-block bg-black text-white px-4 py-1 font-bold text-sm tracking-widest transform -rotate-2">
                    SD IT NURUL KAUTSAR
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
            <NeoInput 
                label="Username" 
                placeholder="USERNAME..." 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                className="bg-neo-yellow/20"
            />
            <NeoInput 
                label="Password" 
                type={showPassword ? "text" : "password"}
                placeholder="PASSWORD..." 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="bg-neo-yellow/20"
                rightIcon={
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="hover:text-neo-purple focus:outline-none">
                        {showPassword ? <IconEyeOff /> : <IconEye />}
                    </button>
                }
            />
            
            {error && (
                <div className="bg-red-500 text-white font-black p-4 border-3 border-black shadow-neo transform -rotate-1 text-center uppercase">
                    {error}
                </div>
            )}

            <NeoButton type="submit" disabled={loading || submitting} className="w-full text-xl py-4 bg-neo-green hover:bg-green-400 mt-4 flex justify-center gap-2 items-center">
                {loading || submitting ? <IconLoading /> : null}
                {loading ? "MEMUAT DATA..." : submitting ? "MEMPROSES..." : "MASUK SEKARANG"}
            </NeoButton>
            </form>

            <div className="mt-6 pt-6 border-t-4 border-black text-center">
                <p className="font-bold text-sm mb-2">Belum ada data? atau Data tidak muncul?</p>
                <button 
                    type="button" 
                    onClick={handleForceSync}
                    disabled={isSyncing || loading}
                    className="text-xs font-black underline uppercase hover:text-neo-blue flex items-center justify-center w-full gap-2 transition-colors"
                >
                    <IconSync className={isSyncing ? "animate-spin" : ""} />
                    {isSyncing ? "SEDANG SINKRONISASI..." : "FORCE SYNC DATA DARI SERVER"}
                </button>
            </div>
          </div>
      </div>
    </div>
  );
};

export default Login;
