import { useCallback, useEffect, useMemo, useState } from 'react';
import '../shared/styles/app-shell.css';
import LoginPage from '../features/auth/pages/LoginPage';
import DashboardPage from '../features/dashboard/pages/DashboardPage';
import { getRevisiDashboard } from '../features/dashboard/services/dashboard';
import AppLayout from '../shared/layout/AppLayout';
import MyRequestPage from '../features/revisi/pages/MyRequestPage';
import CreateRequestPage from '../features/revisi/pages/CreateRequestPage';
import EditRequestPage from '../features/revisi/pages/EditRequestPage';
import ProcessRequestPage from '../features/revisi/pages/ProcessRequestPage';
import RequestReportPage from '../features/revisi/pages/RequestReportPage';
import DataPenggunaPage from '../features/revisi/pages/DataPenggunaPage';
import RequestActionPage from '../features/revisi/pages/RequestActionPage';
import { exportCollectDataExcel, getDataPenggunaDetail } from '../features/revisi/services/revisi';
import AccountSettingsPage from '../features/account/pages/AccountSettingsPage';
import PasswordSettingsPage from '../features/account/pages/PasswordSettingsPage';
import DashboardSoPage from '../features/stock/pages/DashboardSoPage';
import MasterDataSoPage from '../features/stock/pages/MasterDataSoPage';
import CreatePidPage from '../features/stock/pages/CreatePidPage';
import InputFisikSoPage from '../features/stock/pages/InputFisikSoPage';
import InputTelusurPage from '../features/stock/pages/InputTelusurPage';
import VerifikasiTelusurPage from '../features/stock/pages/VerifikasiTelusurPage';
import {
  getAllowedPaths,
  getDefaultPath,
  parseStoredUser
} from '../shared/layout/navigation';
import { normalizeRole } from '../shared/lib/roles';
import { clearAuthToken, getUnauthorizedEventName } from '../shared/lib/api';
import { fetchCurrentUser, logout as logoutSession } from '../features/auth/services/auth';

const LOGIN_PATH = '/login';
const THEME_STORAGE_KEY = 'matrifix_theme';
const LOGIN_ERROR_STORAGE_KEY = 'matrifix_login_error';

const ROUTE_CONFIG = {
  '/dashboard': {
    title: 'Revisi Dashboard',
    component: DashboardPage
  },
  '/permintaan': {
    title: 'My Request',
    component: MyRequestPage
  },
  '/permintaan/detail': {
    title: 'Detail Request',
    component: (props) => <RequestActionPage {...props} mode="my-request-detail" />
  },
  '/permintaan/ubah': {
    title: 'Ubah Request',
    component: EditRequestPage
  },
  '/permintaan/detail-revisi': {
    title: 'Detail Revisi',
    component: (props) => <RequestActionPage {...props} mode="my-request-detail-revisi" />
  },
  '/inputpermintaan': {
    title: 'Create Request',
    component: CreateRequestPage
  },
  '/butuhproses': {
    title: 'Process Request',
    component: ProcessRequestPage
  },
  '/butuhproses/detail': {
    title: 'Detail Process Request',
    component: (props) => <RequestActionPage {...props} mode="process-request-detail" />
  },
  '/butuhproses/process': {
    title: 'Process Request',
    component: (props) => <RequestActionPage {...props} mode="process-request-action" />
  },
  '/report': {
    title: 'Request Report',
    component: RequestReportPage
  },
  '/data-pengguna': {
    title: 'Data Pengguna',
    component: DataPenggunaPage
  },
  '/account': {
    title: 'Profile settings',
    component: AccountSettingsPage
  },
  '/account/password': {
    title: 'Password settings',
    component: PasswordSettingsPage
  },
  '/stock-opname': {
    title: 'Dashboard SO',
    component: DashboardSoPage
  },
  '/stock-opname/master-data': {
    title: 'Master Data SO',
    component: MasterDataSoPage
  },
  '/stock-opname/create-pid': {
    title: 'Create PID',
    component: CreatePidPage
  },
  '/stock-opname/input-fisik': {
    title: 'Input Fisik SO',
    component: InputFisikSoPage
  },
  '/stock-opname/input-telusur': {
    title: 'Input Telusur',
    component: InputTelusurPage
  },
  '/stock-opname/verifikasi-telusur': {
    title: 'Verifikasi Telusur',
    component: VerifikasiTelusurPage
  }
};

function normalizePath(pathname) {
  const path = String(pathname || '/').trim();
  if (!path || path === '/') {
    return '/';
  }
  return path.endsWith('/') ? path.slice(0, -1) : path;
}

function normalizeSessionUser(user = {}) {
  const sourceCandidates = [
    user,
    user?.user,
    user?.data,
    user?.profile,
    user?.user?.data,
    user?.data?.user,
    user?.data?.data,
    user?.profile?.data,
  ].filter((candidate) => candidate && typeof candidate === 'object');

  const source = sourceCandidates
    .map((candidate) => {
      const usernameValue = String(candidate?.username || candidate?.user_name || candidate?.badge || '').trim();
      const namaValue = String(candidate?.nama || candidate?.name || candidate?.full_name || '').trim();
      const roleValue = String(candidate?.role || candidate?.jabatan || candidate?.user_role || '').trim();
      const unitValue = String(candidate?.unitkerja || candidate?.unit_kerja || candidate?.department || '').trim();
      const kodeValue = String(candidate?.kode || candidate?.code || '').trim();

      return {
        score: [usernameValue, namaValue, roleValue, unitValue, kodeValue].filter(Boolean).length,
        value: candidate,
      };
    })
    .sort((left, right) => right.score - left.score)[0]?.value || {};

  const username = String(
    source?.username
    || source?.user_name
    || source?.badge
    || '',
  ).trim();
  const nama = String(
    source?.nama
    || source?.name
    || source?.full_name
    || username
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
    email: String(source?.email || '').trim(),
    phone: String(source?.phone || source?.nomorhp || '').trim(),
  };
}

function persistSessionUser(user = {}) {
  const normalizedUser = normalizeSessionUser(user);
  if (!normalizedUser?.username) {
    return {};
  }

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

function getStoredTheme() {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme === 'dark' ? 'dark' : 'light';
}

export default function App() {
  const [currentPath, setCurrentPath] = useState(() => normalizePath(window.location.pathname));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(() => parseStoredUser());
  const [theme, setTheme] = useState(() => getStoredTheme());
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [appLoading, setAppLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Loading ...');

  const role = useMemo(() => normalizeRole(user?.role), [user]);
  const allowedPaths = useMemo(() => getAllowedPaths(role), [role]);
  const defaultPath = useMemo(() => getDefaultPath(role), [role]);
  const activePath = useMemo(() => {
    if (!isAuthenticated) {
      return LOGIN_PATH;
    }

    if (currentPath === '/' || currentPath === LOGIN_PATH) {
      return defaultPath;
    }

    if (!allowedPaths.includes(currentPath)) {
      return defaultPath;
    }

    return currentPath;
  }, [allowedPaths, currentPath, defaultPath, isAuthenticated]);

  const navigate = useCallback((to, replace = false) => {
    const target = normalizePath(to);
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method](null, '', target);
    setCurrentPath(target);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(normalizePath(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrapAuth() {
      try {
        const response = await fetchCurrentUser();
        let nextUser = normalizeSessionUser(response?.user || response || parseStoredUser());
        const profileIncomplete = !nextUser?.nama || !nextUser?.role || nextUser?.nama === nextUser?.username || nextUser?.role === 'User';

        if (nextUser?.username && profileIncomplete) {
          try {
            const detailResponse = await getDataPenggunaDetail(nextUser.username);
            const detailedUser = normalizeSessionUser(detailResponse);
            if (detailedUser?.username) {
              nextUser = {
                ...nextUser,
                ...detailedUser,
              };
            }
          } catch {
            // Tetap lanjut dengan profil yang ada.
          }
        }

        const dashboardProfileIncomplete = !nextUser?.nama || !nextUser?.role || nextUser?.nama === nextUser?.username || nextUser?.role === 'User';
        if (dashboardProfileIncomplete) {
          try {
            const dashboardResponse = await getRevisiDashboard();
            const dashboardUser = normalizeSessionUser(dashboardResponse?.user);
            if (dashboardUser?.username) {
              nextUser = {
                ...nextUser,
                ...dashboardUser,
              };
            }
          } catch {
            // Tetap lanjut dengan profil yang ada.
          }
        }

        if (!active) {
          return;
        }

        if (nextUser?.username) {
          const normalizedUser = persistSessionUser(nextUser);
          setUser(normalizedUser);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('matrifix_user');
          clearAuthToken();
          setUser({});
          setIsAuthenticated(false);
        }
      } catch {
        if (!active) {
          return;
        }
        localStorage.removeItem('matrifix_user');
        clearAuthToken();
        setUser({});
        setIsAuthenticated(false);
      } finally {
        if (active) {
          setAuthReady(true);
        }
      }
    }

    bootstrapAuth();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const unauthorizedEventName = getUnauthorizedEventName();
    const handleUnauthorized = () => {
      try {
        sessionStorage.setItem(LOGIN_ERROR_STORAGE_KEY, 'Sesi login Anda sudah berakhir. Silakan login kembali.');
      } catch {
        // no-op
      }
      setLogoutConfirmOpen(false);
      setAppLoading(false);
      setLoadingLabel('Loading ...');
      setUser({});
      setIsAuthenticated(false);
      localStorage.removeItem('matrifix_user');
      clearAuthToken();
      navigate(LOGIN_PATH, true);
    };

    window.addEventListener(unauthorizedEventName, handleUnauthorized);
    return () => {
      window.removeEventListener(unauthorizedEventName, handleUnauthorized);
    };
  }, [navigate]);

  const handleLoginSuccess = (nextUserOverride = null) => {
    const nextUser = nextUserOverride?.username
      ? normalizeSessionUser(nextUserOverride)
      : normalizeSessionUser(parseStoredUser());
    const nextRole = normalizeRole(nextUser?.role);
    const nextDefaultPath = getDefaultPath(nextRole);
    setLoadingLabel('Loading ...');
    setAppLoading(true);
    setUser(nextUser);
    setIsAuthenticated(true);
    navigate(nextDefaultPath, true);
    window.setTimeout(() => {
      setAppLoading(false);
    }, 1600);
  };

  const performLogout = useCallback(() => {
    localStorage.removeItem('matrifix_user');
    clearAuthToken();
    setUser({});
    setIsAuthenticated(false);
    navigate(LOGIN_PATH, true);
  }, [navigate]);

  const handleLogout = useCallback(() => {
    setLogoutConfirmOpen(true);
  }, []);

  const handleSidebarAction = useCallback(async (action) => {
    if (action !== 'download-collect-data') {
      return;
    }

    try {
      setLoadingLabel('Menyiapkan Collect Data ...');
      setAppLoading(true);
      await exportCollectDataExcel();
    } catch (error) {
      window.alert(error?.message || 'Gagal mengunduh Collect Data.');
    } finally {
      setAppLoading(false);
      setLoadingLabel('Loading ...');
    }
  }, []);

  const handleLogoutCancel = useCallback(() => {
    setLogoutConfirmOpen(false);
  }, []);

  const handleLogoutConfirm = useCallback(async () => {
    setLogoutConfirmOpen(false);
    setLoadingLabel('Signing out ...');
    setAppLoading(true);
    try {
      await logoutSession();
    } catch {
      // no-op
    } finally {
      performLogout();
      setAppLoading(false);
      setLoadingLabel('Loading ...');
    }
  }, [performLogout]);

  useEffect(() => {
    const target = isAuthenticated ? activePath : LOGIN_PATH;
    if (normalizePath(window.location.pathname) !== target) {
      window.history.replaceState(null, '', target);
    }
  }, [activePath, isAuthenticated]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!logoutConfirmOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setLogoutConfirmOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [logoutConfirmOpen]);

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  }, []);

  if (!authReady) {
    return (
      <div className="app-loading-overlay" role="status" aria-live="polite">
        <div className="app-loading-content">
          <div className="app-loading-spinner">
            <span className="app-loading-arc is-dark" />
            <span className="app-loading-arc is-pink" />
            <span className="app-loading-arc is-green" />
            <span className="app-loading-dot is-blue" />
            <span className="app-loading-dot is-yellow" />
            <span className="app-loading-dot is-green" />
            <span className="app-loading-dot is-orange" />
          </div>
          <p className="app-loading-text">Loading session ...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const route = ROUTE_CONFIG[activePath] || ROUTE_CONFIG[defaultPath];
  const PageComponent = route.component;

  return (
    <>
      <AppLayout
        title={route.title}
        user={user}
        onLogout={handleLogout}
        currentPath={activePath}
        onNavigate={navigate}
        onSidebarAction={handleSidebarAction}
        theme={theme}
        onToggleTheme={toggleTheme}
      >
        <PageComponent onNavigate={navigate} currentPath={activePath} sessionUser={user} />
      </AppLayout>

      {appLoading ? (
        <div className="app-loading-overlay" role="status" aria-live="polite">
          <div className="app-loading-content">
            <div className="app-loading-spinner">
              <span className="app-loading-arc is-dark" />
              <span className="app-loading-arc is-pink" />
              <span className="app-loading-arc is-green" />
              <span className="app-loading-dot is-blue" />
              <span className="app-loading-dot is-yellow" />
              <span className="app-loading-dot is-green" />
              <span className="app-loading-dot is-orange" />
            </div>
            <p className="app-loading-text">{loadingLabel}</p>
          </div>
        </div>
      ) : null}

      {logoutConfirmOpen ? (
        <div
          className="app-confirm-overlay"
          role="presentation"
          onClick={handleLogoutCancel}
        >
          <div
            className="app-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="logout-confirm-title" className="app-confirm-title">Keluar dari aplikasi?</h2>
            <p className="app-confirm-text">Apakah Anda yakin ingin logout dari MatriFix?</p>
            <div className="app-confirm-actions">
              <button type="button" className="app-confirm-button is-secondary" onClick={handleLogoutCancel}>
                Batal
              </button>
              <button type="button" className="app-confirm-button is-primary" onClick={handleLogoutConfirm}>
                Ya, Logout
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
