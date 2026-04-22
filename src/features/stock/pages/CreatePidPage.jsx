import { useEffect, useMemo, useState } from 'react';
import {
  getMasterStockData,
  getStockPidDetail,
  getStockPidList,
  saveStockPid,
} from '../services/stock';
import '../../../shared/styles/stock.css';

const MATERIAL_COLUMNS = ['Material', 'Material Description', 'Stock on Hand', 'Bin Loc', 'BUn'];

function toRowArray(payload) {
  return Array.isArray(payload?.data) ? payload.data : [];
}

function getString(value) {
  return String(value ?? '').trim();
}

function mapMaterialRow(row = {}) {
  return {
    material: getString(row.Material),
    materialDescription: getString(row.Material_Description),
    stockOnHand: Number(row.Stock_on_Hand || 0),
    binLoc: getString(row.Bin_Loc),
    bun: getString(row.BUn),
    plant: getString(row.Plant),
    storage: getString(row.Storage_Location),
  };
}

function mapPidMaterial(row = {}) {
  return {
    material: getString(row.Material || row.material),
    materialDescription: getString(row.Material_Description || row.material_description),
    stockOnHand: Number(row.Stock_on_Hand || row.stock_on_hand || 0),
    binLoc: getString(row.Bin_Loc || row.bin_loc),
    bun: getString(row.BUn || row.bun),
    plant: getString(row.Plant || row.plant),
    storage: getString(row.Storage_Location || row.storage),
  };
}

function materialKey(row = {}) {
  return [
    getString(row.material),
    getString(row.plant),
    getString(row.storage),
    getString(row.binLoc),
  ].join('::');
}

export default function CreatePidPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedStorage, setSelectedStorage] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');
  const [pidDate, setPidDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    let active = true;

    async function loadPageData() {
      try {
        setLoading(true);
        setError('');
        setNotice('');

        const [draftResult, masterResult] = await Promise.all([
          getStockPidList({ status: 'ALL' }),
          getMasterStockData({ rows: 'all' }),
        ]);

        if (!active) {
          return;
        }

        setDrafts(toRowArray(draftResult));
        setMaterials(toRowArray(masterResult).map(mapMaterialRow).filter((row) => row.material));

        if (draftResult?.meta?.endpointReady === false) {
          setNotice(draftResult.meta.message);
        } else if (masterResult?.meta?.endpointReady === false) {
          setNotice(masterResult.meta.message);
        }
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err.message || 'Gagal memuat data Create PID.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPageData();
    return () => {
      active = false;
    };
  }, []);

  const plantOptions = useMemo(() => (
    Array.from(new Set(materials.map((row) => row.plant).filter(Boolean))).sort()
  ), [materials]);

  const storageOptions = useMemo(() => {
    const source = selectedPlant
      ? materials.filter((row) => row.plant === selectedPlant)
      : materials;

    return Array.from(new Set(source.map((row) => row.storage).filter(Boolean))).sort();
  }, [materials, selectedPlant]);

  const filteredMaterials = useMemo(() => {
    const search = materialFilter.toLowerCase();
    return materials.filter((row) => {
      if (selectedPlant && row.plant !== selectedPlant) {
        return false;
      }
      if (selectedStorage && row.storage !== selectedStorage) {
        return false;
      }
      if (!search) {
        return true;
      }

      const haystack = [
        row.material,
        row.materialDescription,
        row.binLoc,
        row.bun,
      ].join(' ').toLowerCase();

      return haystack.includes(search);
    });
  }, [materialFilter, materials, selectedPlant, selectedStorage]);

  const selectedMaterials = useMemo(() => {
    const set = new Set(selectedKeys);
    return filteredMaterials.filter((row) => set.has(materialKey(row)));
  }, [filteredMaterials, selectedKeys]);

  const displayedMaterials = useMemo(() => filteredMaterials.slice(0, 300), [filteredMaterials]);

  const toggleMaterial = (row) => {
    const key = materialKey(row);
    setSelectedKeys((current) => (
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    ));
  };

  const toggleVisibleMaterials = () => {
    const visibleKeys = displayedMaterials.map(materialKey);
    const allVisibleSelected = visibleKeys.every((key) => selectedKeys.includes(key));

    setSelectedKeys((current) => {
      if (allVisibleSelected) {
        return current.filter((key) => !visibleKeys.includes(key));
      }

      return Array.from(new Set([...current, ...visibleKeys]));
    });
  };

  const handleSavePid = async () => {
    if (!selectedMaterials.length) {
      setError('Pilih minimal satu material untuk membuat PID.');
      return;
    }

    const effectivePlant = selectedPlant || selectedMaterials[0]?.plant || '';
    const effectiveStorage = selectedStorage || selectedMaterials[0]?.storage || '';

    if (!effectivePlant || !effectiveStorage) {
      setError('Pilih Plant dan Storage terlebih dahulu.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const response = await saveStockPid({
        plant: effectivePlant,
        storage: effectiveStorage,
        snapshot: pidDate,
        status: 'OPEN',
        materials: selectedMaterials.map((row) => ({
          Material: row.material,
          Material_Description: row.materialDescription,
          Stock_on_Hand: row.stockOnHand,
          Bin_Loc: row.binLoc,
          BUn: row.bun,
          Plant: row.plant,
          Storage_Location: row.storage,
        })),
      });

      setNotice(`PID ${response?.pid || ''} berhasil disimpan sebagai draft.`);
      setSelectedKeys([]);

      const latestDrafts = await getStockPidList({ status: 'ALL' });
      setDrafts(toRowArray(latestDrafts));
    } catch (err) {
      setError(err.message || 'Gagal menyimpan PID.');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadDraft = async (pid) => {
    try {
      setError('');
      setNotice('');
      const result = await getStockPidDetail(pid);
      const draft = result?.data;
      if (!draft) {
        throw new Error('Draft PID tidak ditemukan.');
      }

      const nextMaterials = Array.isArray(draft.materials) ? draft.materials.map(mapPidMaterial) : [];
      const nextKeys = nextMaterials.map(materialKey);

      setPidDate(getString(draft.snapshot) || new Date().toISOString().slice(0, 10));
      setSelectedPlant(getString(draft.plant));
      setSelectedStorage(getString(draft.storage));
      setMaterialFilter('');
      setMaterials((current) => {
        const currentMap = new Map(current.map((row) => [materialKey(row), row]));
        nextMaterials.forEach((row) => {
          currentMap.set(materialKey(row), row);
        });
        return Array.from(currentMap.values());
      });
      setSelectedKeys(nextKeys);
      setNotice(`Draft PID ${draft.pid} berhasil dimuat.`);
    } catch (err) {
      setError(err.message || 'Gagal memuat draft PID.');
    }
  };

  useEffect(() => {
    setSelectedStorage((current) => (
      current && !storageOptions.includes(current) ? '' : current
    ));
  }, [storageOptions]);

  return (
    <section className="stock-page-card">
      <div className="stock-page-head">
        <div>
          <h2 className="stock-page-title">Create PID</h2>
          <p className="stock-page-text">
            Pilih material dari master stock opname, lalu simpan sebagai draft PID untuk proses input fisik.
          </p>
        </div>
        <span className="stock-tag">PID Draft</span>
      </div>

      <div className="stock-field-grid">
        <div className="stock-field">
          <label htmlFor="pid-date">Tanggal Snapshot</label>
          <input
            id="pid-date"
            type="date"
            className="stock-input"
            value={pidDate}
            onChange={(event) => setPidDate(event.target.value)}
          />
        </div>
        <div className="stock-field">
          <label htmlFor="pid-plant">Plant</label>
          <select
            id="pid-plant"
            className="stock-select"
            value={selectedPlant}
            onChange={(event) => setSelectedPlant(event.target.value)}
          >
            <option value="">-- Semua Plant --</option>
            {plantOptions.map((plant) => (
              <option key={plant} value={plant}>{plant}</option>
            ))}
          </select>
        </div>
        <div className="stock-field">
          <label htmlFor="pid-storage">Storage</label>
          <select
            id="pid-storage"
            className="stock-select"
            value={selectedStorage}
            onChange={(event) => setSelectedStorage(event.target.value)}
          >
            <option value="">-- Semua Storage --</option>
            {storageOptions.map((storage) => (
              <option key={storage} value={storage}>{storage}</option>
            ))}
          </select>
        </div>
        <div className="stock-field">
          <label htmlFor="pid-material-filter">Cari Material</label>
          <input
            id="pid-material-filter"
            className="stock-input"
            placeholder="Material / Description / Bin"
            value={materialFilter}
            onChange={(event) => setMaterialFilter(event.target.value)}
          />
        </div>
      </div>

      <div className="stock-toolbar">
        <div className="stock-toolbar-group">
          <span className="stock-display-label">
            {selectedKeys.length} material terpilih dari {filteredMaterials.length} hasil filter
          </span>
          {filteredMaterials.length > displayedMaterials.length ? (
            <span className="stock-display-label">
              Menampilkan {displayedMaterials.length} baris pertama
            </span>
          ) : null}
        </div>
        <div className="stock-toolbar-group">
          <button type="button" className="stock-button alt" onClick={toggleVisibleMaterials}>
            {displayedMaterials.every((row) => selectedKeys.includes(materialKey(row)))
              ? 'Batalkan Pilih Visible'
              : 'Pilih Visible'}
          </button>
          <button type="button" className="stock-button" onClick={handleSavePid} disabled={saving}>
            {saving ? 'Menyimpan...' : 'Buat PID'}
          </button>
        </div>
      </div>

      <div className="stock-table-wrap">
        <table className="stock-table stock-pid-table">
          <thead>
            <tr>
              <th>Pilih</th>
              {MATERIAL_COLUMNS.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedMaterials.length ? (
              displayedMaterials.map((row) => {
                const key = materialKey(row);
                const checked = selectedKeys.includes(key);

                return (
                  <tr key={key}>
                    <td className="stock-cell-check">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMaterial(row)}
                      />
                    </td>
                    <td>{row.material || '-'}</td>
                    <td>{row.materialDescription || '-'}</td>
                    <td>{row.stockOnHand || 0}</td>
                    <td>{row.binLoc || '-'}</td>
                    <td>{row.bun || '-'}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={MATERIAL_COLUMNS.length + 1}>Tidak ada material yang cocok dengan filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h3 className="stock-subtitle">Saved PID Drafts</h3>
      <div className="stock-table-wrap">
        <table className="stock-table stock-draft-table">
          <thead>
            <tr>
              <th>PID</th>
              <th>Plant</th>
              <th>Storage</th>
              <th>Snapshot</th>
              <th>Status</th>
              <th>Items</th>
              <th>Aksi</th>
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
                  <td>
                    <button
                      type="button"
                      className="stock-button alt stock-inline-button"
                      onClick={() => handleLoadDraft(row.pid)}
                    >
                      Load
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7">Belum ada draft PID.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading ? <p className="stock-empty">Memuat data Create PID...</p> : null}
      {notice ? <p className="stock-warning">{notice}</p> : null}
      {error ? <p className="stock-error">{error}</p> : null}
    </section>
  );
}
