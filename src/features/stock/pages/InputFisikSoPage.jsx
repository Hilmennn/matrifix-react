import { useEffect, useState } from 'react';
import { getStockPidDetail, getStockPidList } from '../services/stock';
import '../../../shared/styles/stock.css';

const columns = [
  'No',
  'Material',
  'Material Description',
  'Bin Loc',
  'Stock On Hand',
  'Tanggal Cek Fisik',
  'Stok Fisik',
  'Selisih',
  'Status',
  'Keterangan'
];

export default function InputFisikSoPage() {
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pidOptions, setPidOptions] = useState([]);
  const [selectedPid, setSelectedPid] = useState('');
  const [pidDetail, setPidDetail] = useState(null);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let active = true;

    async function loadPidList() {
      try {
        setLoading(true);
        setError('');
        setNotice('');
        const result = await getStockPidList({ status: 'OPEN' });
        if (!active) {
          return;
        }
        const rows = Array.isArray(result?.data) ? result.data : [];
        setPidOptions(rows);
        setSelectedPid(rows[0]?.pid || '');
        if (result?.meta?.endpointReady === false) {
          setNotice(result.meta.message);
        }
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err.message || 'Gagal memuat draft PID.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPidList();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadPidDetail() {
      if (!selectedPid) {
        setPidDetail(null);
        setRows([]);
        return;
      }

      try {
        setDetailLoading(true);
        setError('');
        const result = await getStockPidDetail(selectedPid);
        if (!active) {
          return;
        }

        const detail = result?.data || null;
        setPidDetail(detail);
        const materials = Array.isArray(detail?.materials) ? detail.materials : [];
        setRows(
          materials.map((item, index) => ({
            ...item,
            __rowKey: `${detail?.pid || selectedPid}-${item?.Material || 'row'}-${index}`,
          })),
        );
      } catch (err) {
        if (!active) {
          return;
        }
        setPidDetail(null);
        setRows([]);
        setError(err.message || 'Gagal memuat detail PID.');
      } finally {
        if (active) {
          setDetailLoading(false);
        }
      }
    }

    loadPidDetail();
    return () => {
      active = false;
    };
  }, [selectedPid]);

  return (
    <section className="stock-page-card">
      <div className="stock-page-head">
        <div>
          <h2 className="stock-page-title">Input Fisik Stock Opname</h2>
          <p className="stock-page-text">
            Draft PID aktif sekarang dimuat langsung dari backend Laravel agar material yang dicek fisik tampil aktual.
          </p>
        </div>
        <span className="stock-tag">Input Fisik</span>
      </div>

      <div className="stock-toolbar">
        <div className="stock-toolbar-group">
          <select
            className="stock-select"
            value={selectedPid}
            onChange={(e) => setSelectedPid(e.target.value)}
          >
            {pidOptions.length ? (
              pidOptions.map((row) => (
                <option key={row.pid} value={row.pid}>
                  {row.pid}
                </option>
              ))
            ) : (
              <option value="">-- Pilih Draft PID --</option>
            )}
          </select>
          <input className="stock-input" placeholder="Search material..." />
        </div>
        <button type="button" className="stock-button alt">Print Input</button>
      </div>

      {pidDetail ? (
        <div className="stock-toolbar" style={{ marginTop: '-4px' }}>
          <div className="stock-toolbar-group">
            <span className="stock-tag">PID: {pidDetail.pid || '-'}</span>
            <span className="stock-tag">Plant: {pidDetail.plant || '-'}</span>
            <span className="stock-tag">Storage: {pidDetail.storage || '-'}</span>
            <span className="stock-tag">Snapshot: {pidDetail.snapshot || '-'}</span>
          </div>
        </div>
      ) : null}

      <div className="stock-table-wrap">
        <table className="stock-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, index) => (
                <tr key={row.__rowKey}>
                  <td>{index + 1}</td>
                  <td>{row.Material || '-'}</td>
                  <td>{row.Material_Description || '-'}</td>
                  <td>{row.Bin_Loc || '-'}</td>
                  <td>{row.Stock_on_Hand || '-'}</td>
                  <td>
                    <input type="date" className="stock-input" />
                  </td>
                  <td>
                    <input type="number" className="stock-input" placeholder="0" />
                  </td>
                  <td>-</td>
                  <td>
                    <strong>Belum Input</strong>
                  </td>
                  <td>
                    <input className="stock-input" placeholder="Catatan..." />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length}>Belum ada item material dari draft PID yang dipilih.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading ? <p className="stock-empty">Memuat draft PID...</p> : null}
      {detailLoading ? <p className="stock-empty">Memuat detail item PID...</p> : null}
      {notice ? <p className="stock-warning">{notice}</p> : null}
      {error ? <p className="stock-error">{error}</p> : null}
    </section>
  );
}

