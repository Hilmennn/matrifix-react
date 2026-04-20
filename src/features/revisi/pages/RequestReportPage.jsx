import { useEffect, useMemo, useState } from 'react';
import { downloadRequestReport, getRequestReports } from '../services/revisi';
import { parseStoredUser } from '../../../shared/layout/navigation';
import { normalizeRole } from '../../../shared/lib/roles';
import '../../../shared/styles/revisi-request-report.css';

const MONTHS = [
  { key: 1, label: 'Januari', triwulan: 'I' },
  { key: 2, label: 'Februari', triwulan: 'I' },
  { key: 3, label: 'Maret', triwulan: 'I' },
  { key: 4, label: 'April', triwulan: 'II' },
  { key: 5, label: 'Mei', triwulan: 'II' },
  { key: 6, label: 'Juni', triwulan: 'II' },
  { key: 7, label: 'Juli', triwulan: 'III' },
  { key: 8, label: 'Agustus', triwulan: 'III' },
  { key: 9, label: 'September', triwulan: 'III' },
  { key: 10, label: 'Oktober', triwulan: 'IV' },
  { key: 11, label: 'November', triwulan: 'IV' },
  { key: 12, label: 'Desember', triwulan: 'IV' }
];

const MONTH_NAME_TO_INDEX = {
  januari: 1,
  february: 2,
  februari: 2,
  maret: 3,
  march: 3,
  april: 4,
  mei: 5,
  may: 5,
  juni: 6,
  june: 6,
  juli: 7,
  july: 7,
  agustus: 8,
  august: 8,
  september: 9,
  oktober: 10,
  october: 10,
  november: 11,
  desember: 12,
  december: 12
};

function toRow(value = {}, fallbackIndex = 0) {
  return {
    id: value?.id || `report-${fallbackIndex}`,
    periode: value?.periode || value?.period || '-',
    triwulan: value?.triwulan || value?.quarter || '-',
    jumlahPermintaan: Number(value?.jumlah_permintaan ?? value?.jumlahPermintaan ?? value?.total ?? 0),
    jumlahSelesai: Number(value?.jumlah_selesai ?? value?.jumlahSelesai ?? value?.resolved ?? 0),
    presentase: Number(value?.presentase ?? value?.percentage ?? value?.presentase_selesai ?? 0)
  };
}

function normalizeRows(payload) {
  if (Array.isArray(payload?.data)) {
    return payload.data.map(toRow);
  }
  if (Array.isArray(payload?.rows)) {
    return payload.rows.map(toRow);
  }
  if (Array.isArray(payload)) {
    return payload.map(toRow);
  }
  return [];
}

function normalizePercentage(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '0%';
  }
  if (numeric === 0) {
    return '0%';
  }
  return `${numeric.toFixed(2)}%`;
}

function resolveMonthIndex(row) {
  const raw = String(row?.periode || '').trim().toLowerCase();
  if (MONTH_NAME_TO_INDEX[raw]) {
    return MONTH_NAME_TO_INDEX[raw];
  }

  const found = Object.entries(MONTH_NAME_TO_INDEX).find(([name]) => raw.includes(name));
  if (found) {
    return found[1];
  }

  return null;
}

function buildMonthlyRows(rows) {
  const rowMap = new Map();
  rows.forEach((row) => {
    const monthIndex = resolveMonthIndex(row);
    if (monthIndex) {
      rowMap.set(monthIndex, row);
    }
  });

  return MONTHS.map((month) => {
    const source = rowMap.get(month.key);
    return {
      ...month,
      jumlahPermintaan: Number(source?.jumlahPermintaan ?? 0),
      jumlahSelesai: Number(source?.jumlahSelesai ?? 0)
    };
  });
}

function buildQuarterRows(monthlyRows) {
  const groups = [
    { triwulan: 'I', months: monthlyRows.slice(0, 3) },
    { triwulan: 'II', months: monthlyRows.slice(3, 6) },
    { triwulan: 'III', months: monthlyRows.slice(6, 9) },
    { triwulan: 'IV', months: monthlyRows.slice(9, 12) }
  ];

  return groups.map((group) => {
    const jumlahPermintaan = group.months.reduce((total, item) => total + Number(item.jumlahPermintaan || 0), 0);
    const jumlahSelesai = group.months.reduce((total, item) => total + Number(item.jumlahSelesai || 0), 0);
    const presentase = jumlahPermintaan > 0 ? (jumlahSelesai / jumlahPermintaan) * 100 : 0;

    return {
      ...group,
      jumlahPermintaan,
      jumlahSelesai,
      presentase
    };
  });
}

export default function RequestReportPage() {
  const user = useMemo(() => parseStoredUser(), []);
  const roleNormalized = useMemo(() => normalizeRole(user?.role), [user]);
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rows, setRows] = useState([]);
  const [availableYears, setAvailableYears] = useState([currentYear]);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  useEffect(() => {
    if (roleNormalized === 'user') {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError('');
        setNotice('');

        const data = await getRequestReports({ year: selectedYear });
        if (!active) {
          return;
        }

        setRows(normalizeRows(data));
        const yearsFromMeta = Array.isArray(data?.meta?.available_years)
          ? data.meta.available_years
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value > 0)
          : [];

        if (yearsFromMeta.length) {
          setAvailableYears(yearsFromMeta);
          if (!yearsFromMeta.includes(selectedYear)) {
            setSelectedYear(yearsFromMeta[0]);
          }
        } else {
          setAvailableYears([currentYear]);
        }

        setNotice(data?.meta?.endpointReady === false ? data.meta.message : '');
      } catch (err) {
        if (active) {
          setError(err.message || 'Gagal memuat data report.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [roleNormalized, selectedYear, currentYear]);

  const monthlyRows = useMemo(() => buildMonthlyRows(rows), [rows]);
  const quarterRows = useMemo(() => buildQuarterRows(monthlyRows), [monthlyRows]);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setError('');
      await downloadRequestReport({ year: selectedYear });
    } catch (err) {
      setError(err.message || 'Gagal mengunduh report.');
    } finally {
      setDownloading(false);
    }
  };

  if (roleNormalized === 'user') {
    return (
      <section className="request-report-role-message">
        This feature is not available for User role.
      </section>
    );
  }

  return (
    <section className="request-report-card">
      <header className="request-report-header">
        <h2>Request Report</h2>
      </header>

      <div className="request-report-toolbar">
        <label className="request-report-filter">
          <span>Tahun</span>
          <select
            value={selectedYear}
            onChange={(event) => setSelectedYear(Number(event.target.value))}
            disabled={loading || downloading}
          >
            {availableYears.map((yearOption) => (
              <option key={yearOption} value={yearOption}>
                {yearOption}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? <p className="request-report-meta">Memuat data report...</p> : null}
      {notice ? <p className="request-report-warning">{notice}</p> : null}
      {error ? <p className="request-report-error">{error}</p> : null}

      <div className="request-report-table-wrap">
        <table className="request-report-table">
          <thead>
            <tr>
              <th>{`Periode Jan - Des ${selectedYear}`}</th>
              <th>Triwulan</th>
              <th>Jumlah Permintaan (item)</th>
              <th>Jumlah Permintaan yang Diselesaikan (item)</th>
              <th>Presentase yang Diselesaikan (%)</th>
            </tr>
          </thead>
          <tbody>
            {quarterRows.map((quarter) => (
              quarter.months.map((month, index) => (
                <tr key={`${quarter.triwulan}-${month.key}`}>
                  <td>{month.label}</td>
                  {index === 0 ? (
                    <td rowSpan={3} className="request-report-quarter-cell">{quarter.triwulan}</td>
                  ) : null}
                  {index === 0 ? (
                    <td rowSpan={3} className="request-report-summary-cell">{quarter.jumlahPermintaan}</td>
                  ) : null}
                  <td>{month.jumlahSelesai}</td>
                  {index === 0 ? (
                    <td rowSpan={3} className="request-report-summary-cell">{normalizePercentage(quarter.presentase)}</td>
                  ) : null}
                </tr>
              ))
            ))}
          </tbody>
        </table>
      </div>

      <div className="request-report-actions">
        <button
          type="button"
          className="request-report-download"
          onClick={handleDownload}
          disabled={loading || downloading}
        >
          {downloading ? 'Downloading...' : 'Download Report'}
        </button>
      </div>
    </section>
  );
}
