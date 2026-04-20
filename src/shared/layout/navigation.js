import {
  canSeeDataPenggunaRole,
  isAvpUserRole,
  isProcessOnlyRole,
  shouldHideStockRole
} from '../lib/roles';

const stockItems = [
  { label: 'Dashboard SO', path: '/stock-opname', icon: 'house' },
  { label: 'Master Data SO', path: '/stock-opname/master-data', icon: 'table' },
  { label: 'Create PID', path: '/stock-opname/create-pid', icon: 'journal' },
  { label: 'Input Fisik SO', path: '/stock-opname/input-fisik', icon: 'edit' },
  { label: 'Input Telusur', path: '/stock-opname/input-telusur', icon: 'search' },
  { label: 'Verifikasi Telusur', path: '/stock-opname/verifikasi-telusur', icon: 'shield' }
];

function buildRevisiItems(role) {
  const dashboard = { label: 'Dashboard', path: '/dashboard', icon: 'house' };

  if (isProcessOnlyRole(role)) {
    return [dashboard, { label: 'Process Request', path: '/butuhproses', icon: 'info' }];
  }

  if (role === 'user') {
    return [
      dashboard,
      { label: 'My Request', path: '/permintaan', icon: 'list' },
      { label: 'Create Request', path: '/inputpermintaan', icon: 'plus-square' }
    ];
  }

  if (isAvpUserRole(role)) {
    return [
      dashboard,
      { label: 'My Request', path: '/permintaan', icon: 'list' },
      { label: 'Create Request', path: '/inputpermintaan', icon: 'plus-square' },
      { label: 'Process Request', path: '/butuhproses', icon: 'info' }
    ];
  }

  return [
    dashboard,
    { label: 'My Request', path: '/permintaan', icon: 'list' },
    { label: 'Create Request', path: '/inputpermintaan', icon: 'plus-square' },
    { label: 'Process Request', path: '/butuhproses', icon: 'info' },
    { label: 'Request Report', path: '/report', icon: 'file' },
    { label: 'Collect Data', action: 'download-collect-data', icon: 'download' }
  ];
}

export function parseStoredUser() {
  try {
    const parsed = JSON.parse(localStorage.getItem('matrifix_user') || '{}');
    const candidates = [
      parsed,
      parsed?.user,
      parsed?.data,
      parsed?.profile,
      parsed?.user?.data,
      parsed?.data?.user,
      parsed?.data?.data,
      parsed?.profile?.data,
    ].filter((candidate) => candidate && typeof candidate === 'object');

    const bestCandidate = candidates
      .map((candidate) => {
        const username = String(candidate?.username || candidate?.user_name || candidate?.badge || '').trim();
        const nama = String(candidate?.nama || candidate?.name || candidate?.full_name || '').trim();
        const role = String(candidate?.role || candidate?.jabatan || candidate?.user_role || '').trim();
        const unitkerja = String(candidate?.unitkerja || candidate?.unit_kerja || candidate?.department || '').trim();
        const kode = String(candidate?.kode || candidate?.code || '').trim();
        const score = [username, nama, role, unitkerja, kode].filter(Boolean).length;

        return {
          score,
          value: {
            ...candidate,
            username,
            nama: nama || username,
            name: String(candidate?.name || nama || username).trim(),
            role,
            unitkerja,
            kode,
            email: String(candidate?.email || '').trim(),
            phone: String(candidate?.phone || candidate?.nomorhp || '').trim(),
          },
        };
      })
      .sort((left, right) => right.score - left.score)[0]?.value || {};

    if (typeof bestCandidate?.role === 'string') {
      bestCandidate.role = bestCandidate.role.replace(/Standardisasi/g, 'Standarisasi').replace(/standardisasi/g, 'standarisasi');
    }
    if (typeof bestCandidate?.unitkerja === 'string') {
      bestCandidate.unitkerja = bestCandidate.unitkerja.replace(/Standardisasi/g, 'Standarisasi').replace(/standardisasi/g, 'standarisasi');
    }

    return bestCandidate;
  } catch {
    return {};
  }
}

export function buildNavigation(role) {
  const isStafPergudangan = role === 'staf pergudangan';
  const groups = [];
  const singles = [];

  if (!isStafPergudangan) {
    groups.push({
      title: 'Revisi Material',
      icon: 'tools',
      items: buildRevisiItems(role)
    });
  }

  const showStock = isStafPergudangan || !shouldHideStockRole(role);
  if (showStock) {
    groups.push({
      title: 'Stock Opname',
      icon: 'box',
      items: stockItems
    });
  }

  if (!isStafPergudangan && canSeeDataPenggunaRole(role)) {
    singles.push({
      label: 'Data Pengguna',
      path: '/data-pengguna',
      icon: 'users'
    });
  }

  return {
    groups,
    singles
  };
}

export function getAllowedPaths(role) {
  const { groups, singles } = buildNavigation(role);
  const paths = [
    '/account',
    '/account/password',
    '/permintaan/detail',
    '/permintaan/ubah',
    '/permintaan/detail-revisi',
    '/butuhproses/detail',
    '/butuhproses/process'
  ];

  groups.forEach((group) => {
    group.items.forEach((item) => {
      if (item.path) {
        paths.push(item.path);
      }
    });
  });

  singles.forEach((item) => {
    paths.push(item.path);
  });

  return paths;
}

export function getDefaultPath(role) {
  if (role === 'staf pergudangan') {
    return '/stock-opname';
  }
  return '/dashboard';
}
