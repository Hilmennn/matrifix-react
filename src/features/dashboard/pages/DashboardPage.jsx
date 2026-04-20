import { useEffect, useMemo, useState } from 'react';
import { getRevisiDashboard } from '../services/dashboard';
import { parseStoredUser } from '../../../shared/layout/navigation';
import {
  isUserRole,
  normalizeRole,
  shouldShowMyRequestRole
} from '../../../shared/lib/roles';
import '../../../shared/styles/dashboard.css';

const STATUS_KEYS = [
  { key: 'menunggu_approval', label: 'Menunggu Approval' },
  { key: 'menunggu_revisi', label: 'Menunggu Revisi' },
  { key: 'gagal_approval', label: 'Gagal Approval' },
  { key: 'selesai', label: 'Selesai' }
];

const CHART_COLORS = ['#f59e0b', '#3b82f6', '#ef4444', '#10b981', '#8b5cf6'];

function toChartData(chartPayload) {
  const labels = Array.isArray(chartPayload?.labels) ? chartPayload.labels : [];
  const values = Array.isArray(chartPayload?.values) ? chartPayload.values : [];
  const length = Math.min(labels.length, values.length);

  return Array.from({ length }).map((_, index) => ({
    label: labels[index] || `Data ${index + 1}`,
    value: Number(values[index] || 0),
    color: CHART_COLORS[index % CHART_COLORS.length]
  }));
}

function toStatusChartData(statusPayload = {}, items = STATUS_KEYS) {
  return items
    .map((item, index) => ({
      label: item.label,
      value: Number(statusPayload?.[item.key] || 0),
      color: CHART_COLORS[index % CHART_COLORS.length]
    }))
    .filter((item) => item.value > 0);
}

function sumStatusValues(statusPayload = {}) {
  return STATUS_KEYS.reduce((total, item) => total + Number(statusPayload?.[item.key] || 0), 0);
}

function Doughnut({ data, title }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (!total) {
    return <p className="dashboard-no-data">No data available</p>;
  }

  const radius = 42;
  const strokeWidth = 15;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  let accumulatedOffset = 0;

  const segments = data.map((item, index) => {
    const fraction = item.value / total;
    const dash = fraction * circumference;
    const gap = circumference - dash;
    const segment = {
      ...item,
      index,
      percent: (fraction * 100).toFixed(1),
      dashArray: `${dash} ${gap}`,
      dashOffset: -accumulatedOffset
    };
    accumulatedOffset += dash;
    return segment;
  });

  const activeSegment = hoveredIndex === null ? null : segments[hoveredIndex];

  return (
    <div className="dashboard-doughnut-wrap">
      <div className="dashboard-doughnut" aria-label={title}>
        <svg
          className="dashboard-doughnut-svg"
          viewBox="0 0 100 100"
          role="img"
          aria-label={title}
        >
          <circle
            className="dashboard-doughnut-track"
            cx="50"
            cy="50"
            r={normalizedRadius}
          />
          {segments.map((item) => (
            <circle
              key={item.label}
              className={`dashboard-doughnut-segment${hoveredIndex === item.index ? ' is-active' : ''}`}
              cx="50"
              cy="50"
              r={normalizedRadius}
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={item.dashArray}
              strokeDashoffset={item.dashOffset}
              onMouseEnter={() => setHoveredIndex(item.index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}
        </svg>
        <div className={`dashboard-doughnut-center${activeSegment ? ' is-active' : ''}`}>
          {activeSegment ? (
            <>
              <strong>{activeSegment.value}</strong>
              <span>{activeSegment.label}</span>
            </>
          ) : (
            <>
              <strong>{total}</strong>
              <span>Total</span>
            </>
          )}
        </div>
      </div>
      <ul className="dashboard-legend">
        {segments.map((item) => (
          <li
            key={item.label}
            onMouseEnter={() => setHoveredIndex(item.index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <span
              className="dashboard-legend-dot"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SummaryCard({ title, total, details, statusItems = STATUS_KEYS }) {
  const [open, setOpen] = useState(false);

  return (
    <article className={`dashboard-card dashboard-summary-card${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="dashboard-card-main"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <h3>{title}</h3>
        <p>{total}</p>
      </button>
      <div className={`dashboard-card-detail${open ? ' is-open' : ''}`}>
        <div className="dashboard-card-detail-inner">
          {statusItems.map((item) => (
            <div key={item.key}>
              <span>{item.label}:</span>
              <strong>{details?.[item.key] || 0}</strong>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export default function DashboardPage({ sessionUser = null }) {
  const fallbackUser = useMemo(() => parseStoredUser(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError('');
        const data = await getRevisiDashboard();
        if (active) {
          setDashboardData(data);
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Gagal memuat dashboard.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  const user = dashboardData?.user || sessionUser || fallbackUser;
  const nama = user?.nama || 'User';
  const role = user?.role || 'User';
  const roleNormalized = normalizeRole(role);

  const showMyRequest =
    dashboardData?.visibility?.showMyRequest ?? shouldShowMyRequestRole(roleNormalized);
  const showProcessRequest =
    dashboardData?.visibility?.showProcessRequest ?? !isUserRole(roleNormalized);
  const processStatusItems = STATUS_KEYS;

  const myRequestStatus = {
    ...(dashboardData?.cards?.myRequest?.status || {})
  };

  const myRequest = {
    total: Number(dashboardData?.cards?.myRequest?.total ?? sumStatusValues(myRequestStatus)),
    ...myRequestStatus
  };

  const processStatus = {
    ...(dashboardData?.cards?.processRequest?.status || {})
  };

  const processRequest = {
    total: Number(dashboardData?.cards?.processRequest?.total ?? sumStatusValues(processStatus)),
    ...processStatus
  };

  const myChartData = (() => {
    const payload = toChartData(dashboardData?.charts?.myRequest);
    return payload.length ? payload : toStatusChartData(myRequestStatus);
  })();

  const processChartData = (() => {
    const payload = toChartData(dashboardData?.charts?.processRequest);
    return payload.length ? payload : toStatusChartData(processStatus);
  })();

  return (
    <>
      <section className="dashboard-welcome">
        <h2>Halo {nama}! Selamat Datang.</h2>
        <p>
          Role: <strong>{role}</strong>
        </p>
      </section>

      {loading || error ? (
        <section className="dashboard-status">
          {loading ? <p className="dashboard-meta">Memuat data dashboard...</p> : null}
          {error ? <p className="dashboard-error">{error}</p> : null}
        </section>
      ) : null}

      <section className="dashboard-grid">
        {showMyRequest ? (
          <SummaryCard title="My Request" total={myRequest.total} details={myRequest} />
        ) : null}

        {showProcessRequest ? (
          <SummaryCard
            title="Process Request"
            total={processRequest.total}
            details={processRequest}
            statusItems={processStatusItems}
          />
        ) : null}
      </section>

      <section className="dashboard-grid">
        {showMyRequest ? (
          <article className="dashboard-card dashboard-chart-card">
            <div className="dashboard-chart-head">My Request (Chart)</div>
            <Doughnut title="My Request Chart" data={myChartData} />
          </article>
        ) : null}

        {showProcessRequest ? (
          <article className="dashboard-card dashboard-chart-card">
            <div className="dashboard-chart-head">Process Request (Chart)</div>
            <Doughnut title="Process Request Chart" data={processChartData} />
          </article>
        ) : null}
      </section>
    </>
  );
}
