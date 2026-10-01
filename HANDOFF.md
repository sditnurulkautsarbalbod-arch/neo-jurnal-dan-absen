# HANDOFF — Proyek Neo Jurnal & Absen (Neon + Vercel)

> Session ID OpenCode: `ses_f0aa96ce5ffeZLG9jGLXHUuBkN`
> Tanggal: 2026-10-01

## 1. Ringkasan proyek

Aplikasi jurnal & absensi SD IT Nurul Kautsar (Vite + React 19 + TypeScript, neo-brutalism).
Migrasi database dari Google Sheets (Apps Script) → **Neon PostgreSQL**, deploy di **Vercel**.

| Item | Nilai |
|---|---|
| Folder kerja | `D:\Projects\Junal-dan-Absen\app-neon` |
| Repo lama (jangan disentuh) | `D:\Projects\Junal-dan-Absen\repo` |
| GitHub | `sditnurulkautsarbalbod-arch/neo-jurnal-dan-absen` (public, branch `main`) |
| Vercel project | `new-jurnal-nk` (akun `sditnk`), auto-deploy saat push `main` |
| Live | https://new-jurnal-nk.vercel.app |
| HEAD | `cadd7d0` — feat: sembunyikan indikator sinkronisasi visual, tombol PWA selalu tampil + panduan manual Chrome |
| Google Sheet / GAS | arsip read-only, TIDAK pernah ditulis, app lama masih jalan dengan Sheet-nya |

## 2. Arsitektur

- **Frontend** tidak pernah bicara langsung ke Neon. Semua lewat Vercel Serverless Functions:
  - `GET /api/sync` → `SyncDataResponse` {users (TANPA password), classes, students, journals, attendance, settings array id='main'}; journals di-map ke **camelCase** (teacherName, tanpaKet); `attendance.students_json` = String; date via `COALESCE(date::text,'')`.
  - `POST /api/mutation` {action: CREATE|UPDATE|DELETE, collection, data} → upsert `INSERT ... ON CONFLICT (id) DO UPDATE`; whitelist collection→tabel (anti SQL injection); users UPDATE tanpa field password → kolom password tak disentuh; DELETE idempoten selalu `{status:'success'}`.
  - `POST /api/login` → bcrypt server-side + fallback plaintext legacy; balas `{success, user:{id,fullName,username,role}}` tanpa hash.
- **Offline-first**: IndexedDB (`NeoJurnalDB`) = cache + antrean `mutation_queue`; Neon = source of truth; React state = pantulan IndexedDB.
- **DataContext** (`context/DataContext.tsx`): `loading` HANYA tunggu baca IndexedDB → sync jalan **background** (`void syncData()`); state `syncing` + race guard (`mutationVersionRef`, skip overwrite bila ada mutasi saat fetch). Sync pemicu: mount, Force Sync (sudah dihapus dari UI), setelah CRUD.
- **PWA**: `vite-plugin-pwa` (manifest + workbox, runtimeCaching Tailwind CDN + Google Fonts), hook `hooks/usePwaInstall.ts`, tombol "Pasang Aplikasi (PWA)" di Login — selalu tampil bila belum standalone; tanpa prompt → panduan manual (Chrome ⋮ / iOS Bagikan).
- Layout: `api/_lib/db.ts` (neon driver), `db/schema.sql`, `scripts/{init-db,migrate-from-sheets,smoke-test,generate-icons}.ts|mjs`, `services/sheetApi.ts` (rewrite total, export name tetap → DataContext nol ubah), `pages/Login.tsx` (POST /api/login).

## 3. State terakhir

SELESAI & LIVE, semua verifikasi hijau:
- `npx tsc --noEmit` EXIT=0, `npm run build` EXIT=0, `npm run db:smoke` 18/18 OK.
- Data migrasi final (re-run live): users 32, classes 22, students 447, journals 5657, attendance 1387, settings 1.
- Smoke live terakhir: asset `index-CX46WJjP.js` 200, PWA button tampil, Force Sync & SyncIndicator tak ada, console auto-sync jalan tanpa error (hanya warning pre-existing: Tailwind CDN prod, label form).

**BELUM (todo environment pending USER):**
1. **Rotasi password Neon** — `npg_lOAeVoWC0kd4` pernah bocor di chat. Reset di Neon Console → update `.env.local` + `vercel env rm/add DATABASE_URL production` → `git commit --allow-empty -m "chore: rotate neon credentials [skip ci]" && git push` → `npm run db:smoke`.
2. Opsional: re-run `npm run db:migrate-sheets` bila app lama masih menulis Sheet.

## 4. Fakta penting untuk lanjutan

- **Delegasi subagent RUSAK** di sesi ini: background → `EPERM mkdir C:\Windows\System32\.omo` (cwd session = System32); sync → `Token refresh failed: 401`. Semua kerja dilakukan LANGSUNG oleh utama. `fs_write`/`fs_delete` nonaktif → pakai tool `write`/`edit` biasa.
- `package.json` punya `"type": "module"` → semua import di `api/*.js` **WAJIB ber-ekstensi `.js`** (bug pernah bikin FUNCTION_INVOCATION_FAILED).
- Driver `@neondatabase/serverless` `sql.query()` mengembalikan **array row langsung** (bukan `{rows}`).
- Local dev penuh: `npx vercel dev` (`npm run dev` hanya front-end, `/api/*` tak ada).
- `vercel inspect --logs` = build logs; runtime logs = `vercel logs <url>`.
- PowerShell: curl `-d '{"k":v}'` single-quote kirim backslash literal → JSON invalid.
- Password bcrypt di Sheet: semua hash; dup username 1 grup (furqan/furqon → first-wins).
- Warning pre-existing (biarkan): chunk >500kB, bcryptjs crypto externalized (AdminDashboard masih hash client-side by design).
- Grep 'Lengkapi' literal = 0; tombol submit jurnal = `submitButtonText` dinamis di TeacherDashboard.
- Ikons PWA dari logo via `scripts/generate-icons.mjs` (sharp); maskable = kanvas putih + logo 477px (tanpa chroma-key).

## 5. Commit terpenting

| SHA | Isi |
|---|---|
| `73cc7ec` | feat: migrasi Neon (27 file, Fase 0–5) |
| `ea8329d` | fix: ekstensi .js import ESM di api/* |
| `b2d0c55` | feat: PWA installable (manifest, SW, ikon, tombol) |
| `68f1c21` | fix: map journals camelCase (teacherName, tanpaKet) |
| `4ef15dd` | feat: UI responsif saat sync (loading hanya IDB, sync background) |
| `851a1d8`+`7dc8b55` | chore: hapus tombol Force Sync dari login |
| `cadd7d0` | feat: sembunyikan SyncIndicator visual, tombol PWA selalu tampil + panduan Chrome |
