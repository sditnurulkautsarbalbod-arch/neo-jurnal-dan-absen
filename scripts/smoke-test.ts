/**
 * Smoke test lokal: memanggil handler /api/* langsung (tanpa Vercel) terhadap Neon.
 * Menguji: sync (shape + tanpa password), login (sukses/gagal), mutation
 * roundtrip CREATE -> UPDATE (password bertahan) -> DELETE (idempotent).
 * Usage: npx tsx scripts/smoke-test.ts
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from 'node:process';

loadEnvFile(resolve(dirname(fileURLToPath(import.meta.url)), '../.env.local'));

const { GET } = await import('../api/sync');
const { POST: mutation } = await import('../api/mutation');
const { POST: login } = await import('../api/login');

let failed = 0;
function check(label: string, cond: boolean, extra = ''): void {
  console.log(`${cond ? 'OK  ' : 'GAGAL'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!cond) failed += 1;
}

function jsonRequest(path: string, body: unknown): Request {
  return new Request(`http://local${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

interface SyncShape {
  users: Array<Record<string, unknown>>;
  classes: unknown[];
  students: unknown[];
  journals: Array<Record<string, unknown>>;
  attendance: Array<Record<string, unknown>>;
  settings: Array<Record<string, unknown>>;
}

// --- 1. GET /api/sync ---
const syncRes = await GET();
check('sync status 200', syncRes.status === 200, `got ${syncRes.status}`);
const sync = (await syncRes.json()) as SyncShape;
check('sync users > 0', sync.users.length > 0, `${sync.users.length} users`);
check('sync classes > 0', sync.classes.length > 0, `${sync.classes.length}`);
check('sync students > 0', sync.students.length > 0, `${sync.students.length}`);
check('sync journals > 0', sync.journals.length > 0, `${sync.journals.length}`);
check('sync attendance > 0', sync.attendance.length > 0, `${sync.attendance.length}`);
check(
  'settings array dengan id=main',
  sync.settings.length === 1 && sync.settings[0].id === 'main',
  JSON.stringify(sync.settings[0])
);
check(
  'users TANPA field password',
  sync.users.length > 0 && !('password' in sync.users[0]),
  Object.keys(sync.users[0] ?? {}).join(',')
);
check(
  'attendance.students_json berupa string',
  sync.attendance.length > 0 && typeof sync.attendance[0].students_json === 'string'
);
check(
  'journal.date berupa string',
  sync.journals.length > 0 && typeof sync.journals[0].date === 'string',
  String(sync.journals[0].date)
);

// --- 2. Login gagal (user salah) ---
const badRes = await login(jsonRequest('/api/login', { username: 'tidak_ada_xyz', password: 'apa' }));
const bad = (await badRes.json()) as { success?: boolean };
check('login user tak dikenal -> success:false', bad.success === false);

// --- 3. Roundtrip users: CREATE -> login -> UPDATE (password bertahan) -> DELETE ---
const bcrypt = (await import('bcryptjs')).default;
const smokeId = 'smoke_test_001';
const smokePass = 'SmokeTest!123';
const hash = bcrypt.hashSync(smokePass, 10);

const cleanup = async (): Promise<void> => {
  await mutation(
    jsonRequest('/api/mutation', { action: 'DELETE', collection: 'users', data: { id: smokeId } })
  );
};

try {
  const createRes = await mutation(
    jsonRequest('/api/mutation', {
      action: 'CREATE',
      collection: 'users',
      data: { id: smokeId, fullName: 'Smoke Test', username: smokeId, password: hash, role: 'guru' },
    })
  );
  const create = (await createRes.json()) as { status?: string };
  check('mutation CREATE user', create.status === 'success', JSON.stringify(create));

  const okRes = await login(jsonRequest('/api/login', { username: smokeId, password: smokePass }));
  const ok = (await okRes.json()) as { success?: boolean; user?: { fullName?: string } };
  check('login sukses setelah CREATE', ok.success === true, JSON.stringify(ok.user));

  // UPDATE tanpa field password -> hash lama wajib bertahan (kasus AdminDashboard edit user)
  const updRes = await mutation(
    jsonRequest('/api/mutation', {
      action: 'UPDATE',
      collection: 'users',
      data: { id: smokeId, fullName: 'Smoke Test Updated', username: smokeId, role: 'guru' },
    })
  );
  const upd = (await updRes.json()) as { status?: string };
  check('mutation UPDATE tanpa password', upd.status === 'success', JSON.stringify(upd));

  const reloginRes = await login(jsonRequest('/api/login', { username: smokeId, password: smokePass }));
  const relogin = (await reloginRes.json()) as { success?: boolean };
  check('password TETAP sama setelah UPDATE', relogin.success === true);

  const delRes = await mutation(
    jsonRequest('/api/mutation', { action: 'DELETE', collection: 'users', data: { id: smokeId } })
  );
  const del = (await delRes.json()) as { status?: string };
  check('mutation DELETE user', del.status === 'success');

  const delAgain = await mutation(
    jsonRequest('/api/mutation', { action: 'DELETE', collection: 'users', data: { id: smokeId } })
  );
  const delAgainBody = (await delAgain.json()) as { status?: string };
  check('DELETE idempotent (row hilang tetap success)', delAgainBody.status === 'success');

  const goneRes = await login(jsonRequest('/api/login', { username: smokeId, password: smokePass }));
  const gone = (await goneRes.json()) as { success?: boolean };
  check('login gagal setelah DELETE', gone.success === false);
} finally {
  await cleanup();
}

console.log(failed === 0 ? '\nSMOKE TEST OK' : `\nSMOKE TEST GAGAL (${failed} kegagalan)`);
process.exit(failed === 0 ? 0 : 1);
