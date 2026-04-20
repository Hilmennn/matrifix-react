import { useEffect, useState } from 'react';
import { fetchCurrentUser, login } from '../services/auth';
import { getDataPenggunaDetail } from '../../revisi/services/revisi';
import { getRevisiDashboard } from '../../dashboard/services/dashboard';

const LOGIN_ERROR_STORAGE_KEY = 'matrifix_login_error';

function unwrapUserCandidate(candidate = {}) {
  const candidates = [
    candidate,
    candidate?.user,
    candidate?.data,
    candidate?.profile,
    candidate?.user?.data,
    candidate?.data?.user,
    candidate?.data?.data,
    candidate?.profile?.data,
  ].filter((item) => item && typeof item === 'object');

  return candidates
    .map((item) => {
      const username = String(item?.username || item?.user_name || item?.badge || '').trim();
      const nama = String(item?.nama || item?.name || item?.full_name || '').trim();
      const role = String(item?.role || item?.jabatan || item?.user_role || '').trim();
      const unitkerja = String(item?.unitkerja || item?.unit_kerja || item?.department || '').trim();
      const kode = String(item?.kode || item?.code || '').trim();

      return {
        score: [username, nama, role, unitkerja, kode].filter(Boolean).length,
        value: item,
      };
    })
    .sort((left, right) => right.score - left.score)[0]?.value || {};
}

function pickLoginUser(data) {
  const directUser = data?.user;
  if (directUser?.data) {
    return directUser.data;
  }
  if (directUser) {
    return directUser;
  }

  const nestedUser = data?.data?.user;
  if (nestedUser?.data) {
    return nestedUser.data;
  }
  if (nestedUser) {
    return nestedUser;
  }

  if (data?.data?.data) {
    return data.data.data;
  }

  return data?.data || {};
}

function buildFallbackUser(usernameValue, candidate = {}) {
  const source = unwrapUserCandidate(candidate);
  const username = String(
    source?.username
    || source?.user_name
    || source?.badge
    || usernameValue
    || '',
  ).trim();
  const role = String(
    source?.role
    || source?.jabatan
    || source?.user_role
    || '',
  ).trim();
  const unitkerja = String(
    source?.unitkerja
    || source?.unit_kerja
    || source?.department
    || '',
  ).trim();
  const kode = String(
    source?.kode
    || source?.code
    || '',
  ).trim();
  const nama = String(
    source?.nama
    || source?.name
    || source?.full_name
    || username
    || '',
  ).trim();

  if (!username) {
    return {};
  }

  return {
    id: source?.id ?? null,
    nama,
    name: nama,
    username,
    role,
    unitkerja,
    kode,
  };
}

function persistSessionUser(user = {}) {
  const normalizedUser = {
    ...user,
    nama: String(user?.nama || user?.name || '').trim(),
    name: String(user?.name || user?.nama || '').trim(),
    role: String(user?.role || '').trim(),
    unitkerja: String(user?.unitkerja || '').trim(),
    kode: String(user?.kode || '').trim(),
    username: String(user?.username || '').trim(),
  };

  localStorage.setItem(
    'matrifix_user',
    JSON.stringify({
      ...normalizedUser,
      user: normalizedUser,
      data: normalizedUser,
      profile: normalizedUser,
    }),
  );

  return normalizedUser;
}

export default function LoginForm({ onLoginSuccess }) {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const storedError = sessionStorage.getItem(LOGIN_ERROR_STORAGE_KEY) || '';
      if (storedError) {
        setError(storedError);
        sessionStorage.removeItem(LOGIN_ERROR_STORAGE_KEY);
      }
    } catch {
      // no-op
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loginData = await login({ username, password });
      let user = buildFallbackUser(username, pickLoginUser(loginData));

      try {
        const meData = await fetchCurrentUser();
        const meUser = buildFallbackUser(username, pickLoginUser(meData) || pickLoginUser({ user: meData?.user }));
        if (meUser?.username) {
          user = meUser;
        }
      } catch {
        // Tetap pakai data user dari respons login jika /auth/me belum siap terbaca.
      }

      const profileIncomplete = !user?.nama || !user?.role || user?.nama === user?.username || user?.role === 'User';
      if (user?.username && profileIncomplete) {
        try {
          const detailData = await getDataPenggunaDetail(user.username);
          const detailedUser = buildFallbackUser(username, detailData);
          if (detailedUser?.username) {
            user = {
              ...user,
              ...detailedUser,
            };
          }
        } catch {
          // Tetap lanjut dengan data yang ada.
        }
      }

      const dashboardProfileIncomplete = !user?.nama || !user?.role || user?.nama === user?.username || user?.role === 'User';
      if (dashboardProfileIncomplete) {
        try {
          const dashboardData = await getRevisiDashboard();
          const dashboardUser = buildFallbackUser(username, dashboardData?.user);
          if (dashboardUser?.username) {
            user = {
              ...user,
              ...dashboardUser,
            };
          }
        } catch {
          // Tetap lanjut dengan data yang ada.
        }
      }

      if (!user?.username) {
        throw new Error('Login berhasil, tetapi data pengguna tidak dapat dibaca dari backend.');
      }

      const persistedUser = persistSessionUser(user);
      if (onLoginSuccess) {
        onLoginSuccess(persistedUser);
      }
    } catch (err) {
      localStorage.removeItem('matrifix_user');
      setError(err.message || 'Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="login-heading">Login</h1>
      <p className="login-subheading">Masuk untuk melanjutkan</p>
      <form className="login-form" onSubmit={handleSubmit}>
        {error ? <div className="login-error">{error}</div> : null}
        <label className="login-label" htmlFor="badge">Nomor Badge</label>
        <input
          id="badge"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Masukkan nomor badge"
          className="login-input"
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/\D/g, ''))}
        />
        <label className="login-label" htmlFor="password">Password</label>
        <div className="login-password">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            className="login-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="login-eye"
            aria-label="Toggle password"
            onClick={() => setShowPassword((v) => !v)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 5c5.5 0 9.8 3.5 11 7-1.2 3.5-5.5 7-11 7S2.2 15.5 1 12c1.2-3.5 5.5-7 11-7zm0 2C7.3 7 3.7 9.8 2.6 12 3.7 14.2 7.3 17 12 17s8.3-2.8 9.4-5C20.3 9.8 16.7 7 12 7zm0 2.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5z" />
            </svg>
          </button>
        </div>
        <button className="login-button" type="submit" disabled={loading}>
          {loading ? 'Memproses...' : 'Masuk'}
        </button>
        <p className="login-help">
          Untuk registrasi akun atau lupa password, hubungi Unit Kerja Identifikasi dan Standarisasi Material (ISM).
        </p>
      </form>
    </>
  );
}
