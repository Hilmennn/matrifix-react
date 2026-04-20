import { useEffect, useState } from 'react';
import { getStockVerifikasiTelusur } from '../services/stock';
import '../../../shared/styles/stock.css';

const columns = [
  'No',
  'Material',
  'Description',
  'Bin Loc',
  'Stok SAP',
  'Stok Fisik Telusur',
  'Selisih Awal',
  'In',
  'Out',
  'Keterangan Penelusuran',
  'Stok Akhir',
  'Selisih Akhir',
  'Aksi'
];

export default function VerifikasiTelusurPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError('');
        setNotice('');
        const result = await getStockVerifikasiTelusur();
        if (!active) {
          return;
        }
        setRows(Array.isArray(result?.data) ? result.data : []);
        if (result?.meta?.endpointReady === false) {
          setNotice(result.meta.message);
        }
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err.message || 'Gagal memuat data verifikasi telusur.');
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

  return (
    <section className="stock-page-card">
      <div className="stock-page-head">
        <div>
          <h2 className="stock-page-title">Verifikasi Telusur</h2>
          <p className="stock-page-text">
            Halaman verifikasi telusur sudah dimigrasi ke React dan siap untuk endpoint final approval.
          </p>
        </div>
        <span className="stock-tag">Verifikasi</span>
      </div>

      <div className="stock-toolbar">
        <div className="stock-toolbar-group">
          <select className="stock-select" defaultValue="25">
            <option value="10">10 / page</option>
            <option value="25">25 / page</option>
            <option value="50">50 / page</option>
          </select>
          <input className="stock-input" placeholder="Cari kode/deskripsi material..." />
        </div>
        <div className="stock-toolbar-group">
          <button type="button" className="stock-button alt">Print Selisih</button>
          <button type="button" className="stock-button">Simpan Semua</button>
        </div>
      </div>

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
                <tr key={`${row.id || row.Material || 'row'}-${index}`}>
                  <td>{index + 1}</td>
                  <td>{row.Material || '-'}</td>
                  <td>{row.Material_Description || '-'}</td>
                  <td>{row.Bin_Loc || '-'}</td>
                  <td>{row.Stock_on_Hand || '-'}</td>
                  <td>{row.Stok_Fisik_Telusur || '-'}</td>
                  <td>{row.Selisih_Stok_Fisik_dan_SAP || '-'}</td>
                  <td>
                    <input type="number" className="stock-input" defaultValue={row.In || 0} />
                  </td>
                  <td>
                    <input type="number" className="stock-input" defaultValue={row.Out || 0} />
                  </td>
                  <td>
                    <input
                      className="stock-input"
                      defaultValue={row.Keterangan_Setelah_Telusur || ''}
                    />
                  </td>
                  <td>{row.Stok_Fisik_Telusur || '-'}</td>
                  <td>{row.Selisih_Stok_Setelah_Telusur || '-'}</td>
                  <td>
                    <button type="button" className="stock-button alt">Simpan</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length}>Belum ada data verifikasi telusur.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading ? <p className="stock-empty">Memuat data verifikasi...</p> : null}
      {notice ? <p className="stock-warning">{notice}</p> : null}
      {error ? <p className="stock-error">{error}</p> : null}
    </section>
  );
}

