import { useEffect, useState } from 'react';
import { getStockDashboardCounts } from '../services/stock';
import '../../../shared/styles/stock.css';

export default function DashboardSoPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [counts, setCounts] = useState({
    Positif: 0,
    Negatif: 0,
    Balance: 0,
    Unknown: 0
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError('');
        setNotice('');
        const result = await getStockDashboardCounts();
        if (!active) {
          return;
        }
        setCounts(result?.data || {
          Positif: 0,
          Negatif: 0,
          Balance: 0,
          Unknown: 0
        });
        if (result?.meta?.endpointReady === false) {
          setNotice(result.meta.message);
        }
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err.message || 'Gagal memuat data dashboard SO.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const stats = [
    { label: 'Selisih Positif', value: Number(counts.Positif || 0) },
    { label: 'Selisih Negatif', value: Number(counts.Negatif || 0) },
    { label: 'Balance', value: Number(counts.Balance || 0) }
  ];

  return (
    <section className="stock-page-card">
      <div className="stock-page-head">
        <div>
          <h2 className="stock-page-title">Dashboard Stock Opname</h2>
          <p className="stock-page-text">
            View dashboard SO sudah dipindah ke React dan siap disambungkan ke endpoint Laravel.
          </p>
        </div>
        <span className="stock-tag">Migrated UI</span>
      </div>

      <div className="stock-kpi-grid">
        {stats.map((item) => (
          <article key={item.label} className="stock-kpi-card">
            <h3>{item.label}</h3>
            <p>{item.value}</p>
          </article>
        ))}
      </div>

      {loading ? <p className="stock-empty">Memuat data dashboard SO...</p> : null}
      {notice ? <p className="stock-warning">{notice}</p> : null}
      {error ? <p className="stock-error">{error}</p> : null}
    </section>
  );
}

