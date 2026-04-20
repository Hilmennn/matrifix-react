import { useEffect, useState } from 'react';
import { getStockPidList } from '../services/stock';
import '../../../shared/styles/stock.css';

const columns = ['Material Code', 'Material Description', 'Stock on Hand', 'Bin Loc'];

export default function CreatePidPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [drafts, setDrafts] = useState([]);

  useEffect(() => {
    let active = true;

    async function loadDrafts() {
      try {
        setLoading(true);
        setError('');
        setNotice('');
        const result = await getStockPidList({ status: 'ALL' });
        if (!active) {
          return;
        }
        setDrafts(Array.isArray(result?.data) ? result.data : []);
        if (result?.meta?.endpointReady === false) {
          setNotice(result.meta.message);
        }
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err.message || 'Gagal memuat daftar PID.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDrafts();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="stock-page-card">
      <div className="stock-page-head">
        <div>
          <h2 className="stock-page-title">Create PID</h2>
          <p className="stock-page-text">
            Form pembuatan PID sudah dipindah ke React dan siap integrasi endpoint `save-pid` Laravel.
          </p>
        </div>
        <span className="stock-tag">PID Draft</span>
      </div>

      <div className="stock-field-grid">
        <div className="stock-field">
          <label htmlFor="pid-number">PID Number</label>
          <input id="pid-number" className="stock-input" placeholder="Auto generated" />
        </div>
        <div className="stock-field">
          <label htmlFor="pid-date">Tanggal</label>
          <input id="pid-date" type="date" className="stock-input" />
        </div>
        <div className="stock-field">
          <label htmlFor="pid-plant">Plant</label>
          <select id="pid-plant" className="stock-select">
            <option>-- Pilih Plant --</option>
          </select>
        </div>
        <div className="stock-field">
          <label htmlFor="pid-storage">Storage</label>
          <select id="pid-storage" className="stock-select">
            <option>-- Pilih Storage --</option>
          </select>
        </div>
      </div>

      <div className="stock-toolbar">
        <div className="stock-toolbar-group">
          <input className="stock-input" placeholder="Filter Material" />
          <input className="stock-input" placeholder="Search..." />
        </div>
        <button type="button" className="stock-button">Buat PID</button>
      </div>

      <div className="stock-table-wrap">
        <table className="stock-table">
          <thead>
            <tr>
              <th>Pilih</th>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={columns.length + 1}>
                Data material belum tersedia dari API stock opname. Struktur view sudah siap untuk endpoint.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="stock-subtitle">Saved PID Drafts</h3>
      <div className="stock-table-wrap">
        <table className="stock-table">
          <thead>
            <tr>
              <th>PID</th>
              <th>Plant</th>
              <th>Storage</th>
              <th>Snapshot</th>
              <th>Status</th>
              <th>Items</th>
            </tr>
          </thead>
          <tbody>
            {drafts.length ? (
              drafts.map((row) => (
                <tr key={row.pid}>
                  <td>{row.pid || '-'}</td>
                  <td>{row.plant || '-'}</td>
                  <td>{row.storage || '-'}</td>
                  <td>{row.snapshot || '-'}</td>
                  <td>{row.status || '-'}</td>
                  <td>{row.item_count || 0}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6">Belum ada draft PID.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading ? <p className="stock-empty">Memuat daftar PID...</p> : null}
      {notice ? <p className="stock-warning">{notice}</p> : null}
      {error ? <p className="stock-error">{error}</p> : null}
    </section>
  );
}

