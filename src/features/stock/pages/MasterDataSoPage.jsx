import { useEffect, useMemo, useState } from 'react';
import { getMasterStockData } from '../services/stock';
import '../../../shared/styles/stock.css';

const columns = [
  { key: 'no', label: 'No', headerClassName: 'is-blue is-narrow', filterable: false },
  { key: 'Material', label: 'Material', headerClassName: 'is-gold is-material' },
  { key: 'Bulan', label: 'Bulan', headerClassName: 'is-blue is-month' },
  { key: 'Material_Description', label: 'Material\nDescription', headerClassName: 'is-gold is-description' },
  { key: 'Stock_on_Hand', label: 'Stock\non\nHand', headerClassName: 'is-gold is-number' },
  { key: 'BUn', label: 'BUn', headerClassName: 'is-gold is-narrow' },
  { key: 'Bin_Loc', label: 'Bin\nLoc', headerClassName: 'is-gold is-code' },
  { key: 'Plant', label: 'Plant', headerClassName: 'is-gold is-code' },
  { key: 'Storage_Location', label: 'Storage\nLocation', headerClassName: 'is-blue is-description' },
  { key: 'Material_Type', label: 'Material\nType', headerClassName: 'is-blue is-code' },
  { key: 'Value_Unrestricted', label: 'Value\nUnrestricted', headerClassName: 'is-blue is-number' },
  { key: 'Nilai_Satuan', label: 'Nilai\nSatuan', headerClassName: 'is-blue is-number' },
  { key: 'Tanggal_Stok_SAP', label: 'Tanggal\nStok\nSAP', headerClassName: 'is-gold is-date' },
  { key: 'Tanggal_Cek_Fisik', label: 'Tanggal\nCek\nFisik', headerClassName: 'is-red is-date' },
  { key: 'Stok_Fisik', label: 'Stok\nFisik', headerClassName: 'is-red is-number' },
  { key: 'Selisih_Stok_Fisik_dan_SAP', label: 'Selisih\nStok\nFisik\ndan\nSAP', headerClassName: 'is-soft-green is-number' },
  { key: 'Status_Selisih', label: 'Status\nSelisih', headerClassName: 'is-soft-green is-status' },
  { key: 'Keterangan', label: 'Keterangan', headerClassName: 'is-gold is-description' },
  { key: 'In', label: 'In', headerClassName: 'is-green is-narrow' },
  { key: 'Out', label: 'Out', headerClassName: 'is-green is-narrow' },
  { key: 'Stok_Fisik_Telusur', label: 'Stok Fisik\nTelusur', headerClassName: 'is-green is-number' },
  { key: 'Selisih_Stok_Setelah_Telusur', label: 'Selisih\nStok\nSetelah\nTelusur', headerClassName: 'is-green is-number' },
  { key: 'Keterangan_Setelah_Telusur', label: 'Keterangan\nSetelah\nTelusur', headerClassName: 'is-green is-description' },
  { key: 'Status_Selisih_2', label: 'Status\nSelisih', headerClassName: 'is-green is-status' },
  { key: 'Nilai_Selisih_Setelah_Telusur', label: 'Nilai\nSelisih\nSetelah\nTelusur', headerClassName: 'is-green is-number' },
];

export default function MasterDataSoPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState('25');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError('');
        setNotice('');
        const result = await getMasterStockData({
          page: 1,
          rows: rowsPerPage,
          search
        });
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
        setError(err.message || 'Gagal memuat master data SO.');
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
  }, [rowsPerPage, search]);

  const visibleRows = useMemo(() => rows.slice(0, 200), [rows]);

  return (
    <section className="stock-page-card stock-master-page">
      <div className="stock-master-head">
        <h2 className="stock-master-title">Master Data Stock Opname</h2>
      </div>

      <div className="stock-toolbar stock-master-toolbar">
        <div className="stock-toolbar-group">
          <span className="stock-display-label">Display</span>
          <select
            className="stock-select"
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(e.target.value)}
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          <span className="stock-display-label">data</span>
        </div>

        <div className="stock-toolbar-group">
          <button type="button" className="stock-button">Import SAP</button>
          <button type="button" className="stock-button alt">Export Excel</button>
        </div>

        <input
          className="stock-input stock-master-search"
          placeholder="Search data..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="stock-table-wrap">
        <table className="stock-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={column.headerClassName || ''}>
                  <div className="stock-th-content">
                    <span className="stock-th-label">
                      {String(column.label || '').split('\n').map((line, index) => (
                        <span key={`${column.key}-line-${index}`} className="stock-th-line">
                          {line}
                        </span>
                      ))}
                    </span>
                    {column.filterable === false ? null : (
                      <span className="stock-th-filter" aria-hidden="true">
                        ▼
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length ? (
              visibleRows.map((row, index) => (
                <tr key={`${row.id || row.Material || 'row'}-${index}`}>
                  <td>{index + 1}</td>
                  {columns.slice(1).map((column) => (
                    <td key={`${column.key}-${index}`}>{row[column.key] || '-'}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length}>Belum ada data.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading ? <p className="stock-empty">Memuat master data...</p> : null}
      {notice ? <p className="stock-warning">{notice}</p> : null}
      {error ? <p className="stock-error">{error}</p> : null}
    </section>
  );
}

