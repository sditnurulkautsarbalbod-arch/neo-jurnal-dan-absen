// POST /api/login — autentikasi SERVER-SIDE. Hash bcrypt tidak pernah meninggalkan server.
import bcrypt from 'bcryptjs';
import { queryRows, jsonResponse, type UserRow } from './_lib/db.js';

function checkPassword(plain: string, stored: string | null): boolean {
  if (!stored) return false;
  if (stored.startsWith('$2')) {
    try {
      return bcrypt.compareSync(plain, stored);
    } catch {
      return false;
    }
  }
  // Legacy: password plaintext lama (mis. '123') yang belum pernah di-hash.
  return stored === plain;
}

export async function POST(request: Request): Promise<Response> {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Username atau password salah!' }, 400);
  }

  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username || !password) {
    return jsonResponse({ success: false, error: 'Username atau password salah!' });
  }

  try {
    const rows = await queryRows<Pick<UserRow, 'id' | 'full_name' | 'username' | 'password' | 'role'>>(
      'SELECT id, full_name, username, password, role FROM users WHERE username=$1',
      [username]
    );
    const user = rows[0];
    if (!user || !checkPassword(password, user.password)) {
      return jsonResponse({ success: false, error: 'Username atau password salah!' });
    }
    return jsonResponse({
      success: true,
      user: {
        id: user.id,
        fullName: user.full_name,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('login error', error);
    return jsonResponse({ success: false, error: 'Server error' }, 500);
  }
}
