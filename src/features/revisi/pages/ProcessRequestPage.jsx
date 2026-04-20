import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getProcessRequestActionUrls,
  getProcessRequests,
  getLegacyFileUrl
} from '../services/revisi';
import { parseStoredUser } from '../../../shared/layout/navigation';
import { isAvpRole, isIdentifikasiRole, normalizeRole } from '../../../shared/lib/roles';
import '../../../shared/styles/revisi-my-request.css';
import '../../../shared/styles/revisi-process-request.css';

const STATUS_TABS = [
  { key: 'Diproses', label: 'Diproses' },
  { key: 'WaitingProcess', label: 'Waiting Process' },
  { key: 'Selesai', label: 'Selesai' },
  { key: 'Ditolak', label: 'Ditolak' }
];

const TAB_STORAGE_KEY = 'butuhproses_active_tab';
const POLL_INTERVAL_MS = 15000;
const DOC_FIELDS = Array.from({ length: 10 }, (_, index) => `dokumentambahan${index + 1}`);
const EMPTY_TAB_COUNTS = {
  Diproses: 0,
  WaitingProcess: 0,
  Selesai: 0,
  Ditolak: 0
};

function getBackendStatusKey(tabKey, role = '') {
  switch (String(tabKey || '')) {
    case 'Diproses':
      return 'Diproses';
    case 'WaitingProcess':
      return isIdentifikasiRole(role) ? 'WaitingProcess' : 'Revisi';
    case 'Selesai':
      return 'Selesai';
    case 'Ditolak':
      return 'Ditolak';
    default:
      return String(tabKey || '');
  }
}

function resolveInitialStatus() {
  const valid = STATUS_TABS.map((tab) => tab.key.toLowerCase());
  const hash = decodeURIComponent(window.location.hash || '')
    .replace('#', '')
    .trim()
    .toLowerCase();

  if (valid.includes(hash)) {
    const tab = STATUS_TABS.find((item) => item.key.toLowerCase() === hash);
    if (tab) {
      return tab.key;
    }
  }

  try {
    const saved = String(sessionStorage.getItem(TAB_STORAGE_KEY) || '').trim().toLowerCase();
    if (valid.includes(saved)) {
      const tab = STATUS_TABS.find((item) => item.key.toLowerCase() === saved);
      if (tab) {
        return tab.key;
      }
    }
  } catch {
    return 'Diproses';
  }

  return 'Diproses';
}

function normalizeRowsPerPage(value) {
  if (value === 'all') {
    return 'all';
  }
  const parsed = Number(value || 5);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}

function getTotalRows(data, rows) {
  const total = data?.meta?.total ?? data?.total;
  if (Number.isFinite(Number(total))) {
    return Number(total);
  }
  return rows.length;
}

function getInfoText(page, rowsPerPage, totalRows, fallbackInfo) {
  if (fallbackInfo) {
    return fallbackInfo;
  }

  if (!totalRows) {
    return 'Display 0 to 0 out of 0 data';
  }

  const perPage = rowsPerPage === 'all' ? totalRows : Number(rowsPerPage || 5);
  const start = (page - 1) * perPage + 1;
  const end = Math.min(start + perPage - 1, totalRows);
  return `Display ${start} to ${end} out of ${totalRows} data`;
}

function getRowDocuments(row) {
  if (Array.isArray(row?.documents) && row.documents.length) {
    return row.documents.filter(Boolean);
  }
  return DOC_FIELDS.map((field) => row?.[field]).filter(Boolean);
}

function getSortIndicator(column, sortColumn, sortDirection) {
  if (column !== sortColumn) {
    return '';
  }
  if (sortDirection === 'ASC') {
    return '^';
  }
  if (sortDirection === 'DESC') {
    return 'v';
  }
  return '';
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M1.5 3.25A1.25 1.25 0 0 1 2.75 2h10.5a1.25 1.25 0 0 1 .95 2.06L10 8.92v3.58a.75.75 0 0 1-1.16.63l-2-1.25A.75.75 0 0 1 6.5 11.25V8.92L1.8 4.06a1.25 1.25 0 0 1-.3-.81Z" />
    </svg>
  );
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getColumnValue(row, column) {
  switch (column) {
    case 'kodepermintaan':
      return String(row?.kodepermintaan || '-').trim() || '-';
    case 'tanggalpermintaan':
      return String(row?.tanggalpermintaan || '-').trim() || '-';
    case 'nama':
      return String(row?.nama || '-').trim() || '-';
    case 'username':
      return String(row?.username || '-').trim() || '-';
    case 'jenispermintaan':
      return String(row?.jenispermintaan || '-').trim() || '-';
    case 'materialcode':
      return String(row?.materialcode || '-').trim() || '-';
    case 'tanggalproses': {
      const statusValue = String(row?.status || '');
      const showTanggalProses = statusValue.includes('Selesai')
        && row?.tanggalproses
        && row.tanggalproses !== '0000-00-00';
      return showTanggalProses ? String(row.tanggalproses).trim() : '-';
    }
    case 'status':
      return String(row?.status || '-').trim() || '-';
    default:
      return stripHtml(row?.[column] || '-') || '-';
  }
}

function SortHeader({
  column,
  label,
  sortColumn,
  sortDirection,
  onSort,
  enableFilter = true,
  filterValues = [],
  activeValues = [],
  isFilterOpen = false,
  onToggleFilter,
  onFilterChange
}) {
  const activeFilterCount = activeValues?.length || 0;

  return (
    <th className="my-request-th">
      <div className="my-request-th-inner">
        <button
          type="button"
          className="my-request-sort-btn"
          onClick={() => onSort(column)}
        >
          <span>{label}</span>
          <span className={`my-request-sort${sortColumn === column ? ' is-active' : ''}`}>
            {getSortIndicator(column, sortColumn, sortDirection)}
          </span>
        </button>
        {enableFilter ? (
          <button
            type="button"
            className={`my-request-filter-btn${activeFilterCount ? ' is-active' : ''}`}
            onClick={() => onToggleFilter(column)}
            aria-label={`Filter ${label}`}
            aria-expanded={isFilterOpen}
          >
            <FilterIcon />
          </button>
        ) : null}
        {enableFilter && isFilterOpen ? (
          <div className="my-request-filter-menu">
            <button
              type="button"
              className="my-request-filter-option is-action"
              onClick={() => onFilterChange(column, [...filterValues].sort((a, b) => a.localeCompare(b)))}
            >
              Sort A to Z
            </button>
            <button
              type="button"
              className="my-request-filter-option is-action"
              onClick={() => onFilterChange(column, [...filterValues].sort((a, b) => b.localeCompare(a)))}
            >
              Sort Z to A
            </button>
            <button
              type="button"
              className="my-request-filter-option is-clear"
              onClick={() => onFilterChange(column, [...filterValues])}
            >
              Select All
            </button>
            <button
              type="button"
              className="my-request-filter-option is-action"
              onClick={() => onFilterChange(column, [])}
            >
              Tampilkan semua
            </button>
            <div className="my-request-filter-list">
              {filterValues.length ? (
                filterValues.map((value) => {
                  const checked = activeValues.includes(value);
                  return (
                    <label key={value} className="my-request-filter-option">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          const nextValues = event.target.checked
                            ? [...activeValues, value]
                            : activeValues.filter((item) => item !== value);
                          onFilterChange(column, nextValues);
                        }}
                      />
                      <span title={value}>{value}</span>
                    </label>
                  );
                })
              ) : (
                <div className="my-request-filter-empty">Tidak ada data</div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </th>
  );
}

function includesInsensitive(source, target) {
  return String(source || '').toLowerCase().includes(String(target || '').toLowerCase());
}

function isIdentifikasiStatusTarget(status = '') {
  const value = String(status || '').toLowerCase();
  return value.includes('officer identifikasi') || value.includes('staf identifikasi');
}

function isWaitingStatus(status) {
  return includesInsensitive(status, 'Menunggu Konfirmasi') || includesInsensitive(status, 'Menunggu Approval');
}

function getStatusClass(status) {
  const lower = String(status || '').toLowerCase();
  if (!lower) {
    return '';
  }
  if (lower.includes('selesai')) {
    return 'is-selesai';
  }
  if (lower.includes('revisi')) {
    return 'is-revisi';
  }
  if (lower.includes('ditolak') || lower.includes('gagal')) {
    return 'is-ditolak';
  }
  if (lower.includes('menunggu') || lower.includes('diproses')) {
    return 'is-waiting';
  }
  return '';
}

function getStatusDisplay(row, activeTab, role) {
  if (String(activeTab).toLowerCase() !== 'diproses') {
    return String(row?.status || '-');
  }

  const status = String(row?.status || '');
  const posisi = String(row?.posisipermintaan || '');
  const roleValue = String(role || '');
  if (!isWaitingStatus(status)) {
    return status || '-';
  }

  if (isIdentifikasiRole(roleValue) && isIdentifikasiStatusTarget(posisi)) {
    return `Data Sedang Diproses oleh ${roleValue}`;
  }
  if (posisi && includesInsensitive(posisi, roleValue)) {
    return `Data Sedang Diproses oleh ${roleValue}`;
  }
  return status || '-';
}

function canShowProcess(row, activeTab, role, nama) {
  const rowStatus = String(row?.status || '');
  const diprosesOleh = String(row?.diprosesoleh || '');
  const posisi = String(row?.posisipermintaan || '');
  const roleValue = String(role || '');
  const roleLower = normalizeRole(roleValue);
  const namaLower = String(nama || '').toLowerCase();

  let showProcess = false;
  let suppressProcessInWaiting = false;

  if (String(activeTab || '').toLowerCase() === 'waitingprocess') {
    if (includesInsensitive(rowStatus, 'Data Sedang Diproses oleh')) {
      suppressProcessInWaiting = true;
    }
  }

  if (
    includesInsensitive(rowStatus, 'Data Sedang Diproses oleh')
    && (
      includesInsensitive(rowStatus, roleValue)
      || (isIdentifikasiRole(roleValue) && isIdentifikasiStatusTarget(rowStatus))
    )
  ) {
    showProcess = true;
  }

  if (diprosesOleh.toLowerCase().includes(namaLower) && namaLower) {
    showProcess = true;
  }

  if ((includesInsensitive(posisi, roleValue) || (isIdentifikasiRole(roleValue) && isIdentifikasiStatusTarget(posisi))) && isWaitingStatus(rowStatus)) {
    if (diprosesOleh) {
      showProcess = diprosesOleh.toLowerCase().includes(namaLower) && namaLower !== '';
    } else {
      showProcess = true;
    }
  }

  if (!showProcess || rowStatus === 'Selesai' || suppressProcessInWaiting) {
    return false;
  }

  if (isAvpRole(roleLower)) {
    let canProcessForAvp = false;
    const avpTargets = ['AVP User', 'AVP Keandalan', 'AVP Pengendalian Biaya dan Jasa Pabrik', 'AVP Perencanaan'];

    if (includesInsensitive(rowStatus, 'Data Sedang Diproses oleh') && avpTargets.some((target) => includesInsensitive(rowStatus, target))) {
      canProcessForAvp = true;
    }
    if (diprosesOleh.toLowerCase().includes(namaLower) && namaLower) {
      canProcessForAvp = true;
    }
    if (includesInsensitive(posisi, role) && isWaitingStatus(rowStatus)) {
      canProcessForAvp = true;
    }
    if (includesInsensitive(rowStatus, 'Menunggu Konfirmasi Officer') || includesInsensitive(rowStatus, 'Menunggu Approval Officer')) {
      canProcessForAvp = false;
    }
    return canProcessForAvp;
  }

  return true;
}

function persistSelectedRow(row) {
  try {
    sessionStorage.setItem('matrifix_process_request_selected_row', JSON.stringify(row || null));
  } catch {
    // no-op
  }
}

export default function ProcessRequestPage({ onNavigate }) {
  const user = useMemo(() => parseStoredUser(), []);
  const role = String(user?.role || '').trim();
  const roleNormalized = useMemo(() => normalizeRole(user?.role), [user]);
  const nama = String(user?.nama || '').trim();

  const [status, setStatus] = useState(() => resolveInitialStatus());
  const [search, setSearch] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const hasLoadedOnceRef = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [infoText, setInfoText] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const [tabCounts, setTabCounts] = useState(EMPTY_TAB_COUNTS);
  const [columnFilters, setColumnFilters] = useState({});
  const [openFilterColumn, setOpenFilterColumn] = useState('');
  const filterWrapRef = useRef(null);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setRefreshTick((current) => current + 1);
    }, POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(TAB_STORAGE_KEY, status);
    } catch {
      // no-op
    }

    const encoded = encodeURIComponent(status);
    if (window.location.hash !== `#${encoded}`) {
      window.history.replaceState(null, '', `#${encoded}`);
    }
  }, [status]);

  useEffect(() => {
    if (roleNormalized === 'user') {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadData() {
      try {
        if (!hasLoadedOnceRef.current) {
          setLoading(true);
        }
        setError('');
        setNotice('');

        const query = {
          page,
          rows: rowsPerPage === 'all' ? 'all' : rowsPerPage,
          search,
          sortColumn,
          sortDirection,
          status: getBackendStatusKey(status, roleNormalized)
        };

        const data = await getProcessRequests(query);
        if (!active) {
          return;
        }

        const nextRows = Array.isArray(data?.data) ? data.data : [];
        const nextTotal = getTotalRows(data, nextRows);
        setRows(nextRows);
        setTotalRows(nextTotal);
        setInfoText(getInfoText(page, rowsPerPage, nextTotal, data?.meta?.info));
        setNotice(data?.meta?.endpointReady === false ? data.meta.message : '');
      } catch (err) {
        if (active) {
          setError(err.message || 'Gagal memuat data Process Request.');
        }
      } finally {
        if (active) {
          setLoading(false);
          hasLoadedOnceRef.current = true;
        }
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [page, rowsPerPage, search, sortColumn, sortDirection, status, roleNormalized, refreshTick]);

  useEffect(() => {
    if (roleNormalized === 'user') {
      return undefined;
    }

    let active = true;

    async function loadCounts() {
      try {
        if (!active) {
          return;
        }

        const requests = STATUS_TABS.map((tab) => (
          getProcessRequests({
            page: 1,
            rows: 1,
            search,
            status: getBackendStatusKey(tab.key, roleNormalized)
          })
        ));
        const responses = await Promise.all(requests);
        if (!active) {
          return;
        }

        const nextCounts = {};
        STATUS_TABS.forEach((tab, index) => {
          const response = responses[index];
          const total = response?.meta?.total ?? response?.total;
          nextCounts[tab.key] = Number.isFinite(Number(total)) ? Number(total) : 0;
        });
        setTabCounts(nextCounts);
      } catch {
        if (active) {
          setTabCounts(EMPTY_TAB_COUNTS);
        }
      }
    }

    loadCounts();
    return () => {
      active = false;
    };
  }, [roleNormalized, refreshTick]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const currentCount = Number(tabCounts[status] || 0);
    if (currentCount > 0 || rows.length > 0) {
      return;
    }

    const firstAvailableTab = STATUS_TABS.find((tab) => Number(tabCounts[tab.key] || 0) > 0);
    if (firstAvailableTab && firstAvailableTab.key !== status) {
      setStatus(firstAvailableTab.key);
      setActionNotice('');
    }
  }, [loading, rows.length, status, tabCounts]);

  useEffect(() => {
    setPage(1);
  }, [status, rowsPerPage, sortColumn, sortDirection, columnFilters]);

  useEffect(() => {
    setColumnFilters({});
    setOpenFilterColumn('');
  }, [status]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!filterWrapRef.current?.contains(event.target)) {
        setOpenFilterColumn('');
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  const totalPages = useMemo(() => {
    if (rowsPerPage === 'all') {
      return 1;
    }
    return Math.max(1, Math.ceil(totalRows / Number(rowsPerPage || 5)));
  }, [rowsPerPage, totalRows]);

  const paginationItems = useMemo(() => {
    if (rowsPerPage === 'all' || totalPages <= 1) {
      return [];
    }
    const startPage = Math.max(1, Math.floor((page - 1) / 10) * 10 + 1);
    const endPage = Math.min(startPage + 9, totalPages);
    const items = [];
    for (let p = startPage; p <= endPage; p += 1) {
      items.push(p);
    }
    return items;
  }, [page, rowsPerPage, totalPages]);

  const filterOptions = useMemo(() => {
    const columns = [
      'kodepermintaan',
      'tanggalpermintaan',
      'nama',
      'username',
      'jenispermintaan',
      'materialcode',
      'tanggalproses',
      'status'
    ];

    return columns.reduce((accumulator, column) => {
      accumulator[column] = Array.from(
        new Set(
          rows
            .map((row) => getColumnValue(row, column))
            .filter(Boolean)
        )
      );
      return accumulator;
    }, {});
  }, [rows]);

  const filteredRows = useMemo(() => (
    rows
      .filter((row) => Object.entries(columnFilters).every(([column, selectedValues]) => {
        if (!Array.isArray(selectedValues) || !selectedValues.length) {
          return true;
        }
        return selectedValues.includes(getColumnValue(row, column));
      }))
  ), [rows, columnFilters]);

  const handleSort = (column) => {
    if (sortColumn !== column) {
      setSortColumn(column);
      setSortDirection('ASC');
      return;
    }
    if (sortDirection === 'ASC') {
      setSortDirection('DESC');
      return;
    }
    if (sortDirection === 'DESC') {
      setSortColumn('');
      setSortDirection('');
      return;
    }
    setSortDirection('ASC');
  };

  const handleFilterChange = (column, nextValues) => {
    setColumnFilters((prev) => {
      if (!nextValues.length) {
        const next = { ...prev };
        delete next[column];
        return next;
      }

      return {
        ...prev,
        [column]: nextValues
      };
    });
  };

  const handleAction = (action, row) => {
    const actionUrls = getProcessRequestActionUrls(row);
    const actionHref = action === 'detail' ? actionUrls.detail : actionUrls.process;

    if (action === 'detail' || action === 'process') {
      persistSelectedRow(row);
      const targetPath = action === 'detail'
        ? '/butuhproses/detail'
        : '/butuhproses/process';
      onNavigate?.(targetPath);
      return;
    }

    if (actionHref) {
      window.location.assign(actionHref);
      return;
    }

    setActionNotice(`Endpoint aksi ${action === 'detail' ? 'Detail' : 'Process'} untuk request #${row?.id || '-'} belum tersedia.`);
  };

  if (roleNormalized === 'user') {
    return (
      <section className="process-request-role-message">
        This feature is not available for User role.
      </section>
    );
  }

  return (
    <section className="my-request-card process-request-card">
      <div className="my-request-toolbar">
        <div className="my-request-display">
          <span>Display</span>
          <select
            className="my-request-select"
            value={String(rowsPerPage)}
            onChange={(e) => setRowsPerPage(normalizeRowsPerPage(e.target.value))}
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="all">All</option>
          </select>
          <span>data</span>
        </div>
        <input
          type="text"
          className="my-request-search"
          placeholder="Search data..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <ul className="my-request-tabs" role="tablist">
        {STATUS_TABS.map((tab) => (
          <li key={tab.key}>
            <button
              type="button"
              className={`my-request-tab${status === tab.key ? ' is-active' : ''}`}
              onClick={() => {
                setStatus(tab.key);
                setActionNotice('');
              }}
            >
              {tab.label} <span>({tabCounts[tab.key] || 0})</span>
            </button>
          </li>
        ))}
      </ul>

      {loading ? <p className="my-request-meta">Memuat data...</p> : null}
      {notice ? <p className="my-request-warning">{notice}</p> : null}
      {error ? <p className="my-request-error">{error}</p> : null}
      {actionNotice ? <p className="my-request-meta">{actionNotice}</p> : null}

      <div className="my-request-table-wrap" ref={filterWrapRef}>
        <table className="my-request-table process-request-table">
          <thead>
            <tr>
              <th>No</th>
              <SortHeader column="kodepermintaan" label="Kode Permintaan" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} filterValues={filterOptions.kodepermintaan || []} activeValues={columnFilters.kodepermintaan || []} isFilterOpen={openFilterColumn === 'kodepermintaan'} onToggleFilter={(column) => setOpenFilterColumn((current) => current === column ? '' : column)} onFilterChange={handleFilterChange} />
              <SortHeader column="tanggalpermintaan" label="Tanggal Permintaan" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} filterValues={filterOptions.tanggalpermintaan || []} activeValues={columnFilters.tanggalpermintaan || []} isFilterOpen={openFilterColumn === 'tanggalpermintaan'} onToggleFilter={(column) => setOpenFilterColumn((current) => current === column ? '' : column)} onFilterChange={handleFilterChange} />
              <SortHeader column="nama" label="Nama Requester" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} filterValues={filterOptions.nama || []} activeValues={columnFilters.nama || []} isFilterOpen={openFilterColumn === 'nama'} onToggleFilter={(column) => setOpenFilterColumn((current) => current === column ? '' : column)} onFilterChange={handleFilterChange} />
              <SortHeader column="username" label="Nomor Badge" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} filterValues={filterOptions.username || []} activeValues={columnFilters.username || []} isFilterOpen={openFilterColumn === 'username'} onToggleFilter={(column) => setOpenFilterColumn((current) => current === column ? '' : column)} onFilterChange={handleFilterChange} />
              <SortHeader column="jenispermintaan" label="Jenis Permintaan" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} filterValues={filterOptions.jenispermintaan || []} activeValues={columnFilters.jenispermintaan || []} isFilterOpen={openFilterColumn === 'jenispermintaan'} onToggleFilter={(column) => setOpenFilterColumn((current) => current === column ? '' : column)} onFilterChange={handleFilterChange} />
              <SortHeader column="materialcode" label="Material Code" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} filterValues={filterOptions.materialcode || []} activeValues={columnFilters.materialcode || []} isFilterOpen={openFilterColumn === 'materialcode'} onToggleFilter={(column) => setOpenFilterColumn((current) => current === column ? '' : column)} onFilterChange={handleFilterChange} />
              <th>Detail Permintaan</th>
              <th>Dokumen Referensi</th>
              <th>Catatan Approval</th>
              <SortHeader column="tanggalproses" label="Tanggal Selesai" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} filterValues={filterOptions.tanggalproses || []} activeValues={columnFilters.tanggalproses || []} isFilterOpen={openFilterColumn === 'tanggalproses'} onToggleFilter={(column) => setOpenFilterColumn((current) => current === column ? '' : column)} onFilterChange={handleFilterChange} />
              <SortHeader column="status" label="Status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} filterValues={filterOptions.status || []} activeValues={columnFilters.status || []} isFilterOpen={openFilterColumn === 'status'} onToggleFilter={(column) => setOpenFilterColumn((current) => current === column ? '' : column)} onFilterChange={handleFilterChange} />
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length ? (
              filteredRows.map((row, index) => {
                const rowKey = row?.id || `${row?.kodepermintaan || 'req'}-${index}`;
                const no = rowsPerPage === 'all'
                  ? index + 1
                  : ((page - 1) * Number(rowsPerPage || 5)) + index + 1;
                const documents = getRowDocuments(row);
                const catatan = row?.catatan && String(row.catatan).trim() && row.catatan !== '<p><br></p>'
                  ? row.catatan
                  : '-';
                const statusDisplay = getStatusDisplay(row, status, role);
                const showTanggalProses = includesInsensitive(row?.status, 'Selesai')
                  && row?.tanggalproses
                  && row.tanggalproses !== '0000-00-00';
                const showProcessAction = canShowProcess(row, status, role, nama);

                return (
                  <tr key={rowKey}>
                    <td>{no}</td>
                    <td>{row.kodepermintaan || '-'}</td>
                    <td>{row.tanggalpermintaan || '-'}</td>
                    <td>{row.nama || '-'}</td>
                    <td>{row.username || '-'}</td>
                    <td>{row.jenispermintaan || '-'}</td>
                    <td>{row.materialcode || '-'}</td>
                    <td>
                      <div
                        className="my-request-detail"
                        dangerouslySetInnerHTML={{ __html: row.detailpermintaan || '-' }}
                      />
                    </td>
                    <td>
                      {documents.length ? (
                        <div className="my-request-docs">
                          {documents.map((doc, docIndex) => (
                            <a
                              key={`${doc}-${docIndex}`}
                              href={getLegacyFileUrl(doc)}
                              target="_blank"
                              rel="noreferrer"
                              title={doc}
                            >
                              {doc}
                            </a>
                          ))}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <div
                        className="my-request-detail"
                        dangerouslySetInnerHTML={{ __html: catatan }}
                      />
                    </td>
                    <td>{showTanggalProses ? row.tanggalproses : '-'}</td>
                    <td>
                      <span className={`my-request-status ${getStatusClass(statusDisplay)}`}>
                        {statusDisplay || '-'}
                      </span>
                    </td>
                    <td>
                      <div className="my-request-actions">
                        <button
                          type="button"
                          className="my-request-btn is-detail"
                          onClick={() => handleAction('detail', row)}
                        >
                          Detail
                        </button>
                        {showProcessAction ? (
                          <button
                            type="button"
                            className="my-request-btn is-ubah"
                            onClick={() => handleAction('process', row)}
                          >
                            Process
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="13">No data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="my-request-footer">
        <div>{infoText || getInfoText(page, rowsPerPage, totalRows, '')}</div>
        {paginationItems.length ? (
          <div className="my-request-pagination">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </button>
            {paginationItems.map((p) => (
              <button
                key={p}
                type="button"
                className={p === page ? 'is-active' : ''}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
