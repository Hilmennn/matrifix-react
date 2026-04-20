import { useEffect, useMemo, useRef, useState } from 'react';
import { parseStoredUser } from '../../../shared/layout/navigation';
import { normalizeRole } from '../../../shared/lib/roles';
import { getCreateRequestMeta, getDataPengguna, submitCreateRequest } from '../services/revisi';
import '../../../shared/styles/revisi-create-request.css';

const DOCUMENT_REQUIRED_TYPES = [
  'Perubahan Data MRP (MRP Type/Strategi Stok)',
  'Perubahan Data MRP (Min-Max)',
  'Perubahan PO Text/Spesifikasi'
];

function extractUserRows(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.rows)) {
    return payload.rows;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.data?.data)) {
    return payload.data.data;
  }

  if (Array.isArray(payload?.data?.rows)) {
    return payload.data.rows;
  }

  if (Array.isArray(payload?.data?.items)) {
    return payload.data.items;
  }

  return [];
}

function buildStafIdentifikasiOptions(rows) {
  const seen = new Set();

  return rows
    .filter((row) => normalizeRole(row?.role).includes('staf identifikasi dan standarisasi material'))
    .map((row) => {
      const name = String(row?.nama || row?.name || '').trim();
      if (!name) {
        return null;
      }

      const label = `${name} (Staf Identifikasi dan Standarisasi Material)`;
      if (seen.has(label)) {
        return null;
      }
      seen.add(label);

      return {
        value: label,
        label
      };
    })
    .filter(Boolean);
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]*>/g, '').trim();
}

function sanitizeMaterialCode(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 7);
}

function getFileExtension(fileName = '') {
  const value = String(fileName || '');
  const match = value.match(/(\.[^.]+)$/);
  return match ? match[1] : '';
}

function getDocumentPreviewName(documentItem) {
  const originalName = String(documentItem?.file?.name || '');
  const customName = String(documentItem?.name || '').trim();
  const extension = getFileExtension(originalName);

  if (!customName) {
    return originalName || 'Dokumen';
  }

  if (extension && !customName.toLowerCase().endsWith(extension.toLowerCase())) {
    return `${customName}${extension}`;
  }

  return customName;
}

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function CreateRequestPage({ onNavigate }) {
  const storedUser = useMemo(() => parseStoredUser(), []);
  const normalizedRole = useMemo(() => normalizeRole(storedUser?.role), [storedUser]);
  const isOfficerIdentifikasi = normalizedRole.includes('officer identifikasi')
    && normalizedRole.includes('standarisasi material');
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [meta, setMeta] = useState({
    csrfToken: '',
    tanggalPermintaan: getTodayDateString(),
    nama: storedUser?.nama || '',
    username: storedUser?.username || '',
    unitkerja: storedUser?.unitkerja || '',
    jenisPermintaanOptions: [],
    stafOptions: [],
    requiresDiprosesOleh: isOfficerIdentifikasi,
    templateMap: {}
  });
  const [form, setForm] = useState({
    jenispermintaan: '',
    materialcode: '',
    detailpermintaan: '',
    diprosesoleh: ''
  });
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    let active = true;

    async function loadMeta() {
      try {
        setLoading(true);
        setError('');
        const nextMeta = await getCreateRequestMeta();
        let fallbackStafOptions = [];

        if (isOfficerIdentifikasi && !(nextMeta?.stafOptions || []).length) {
          try {
            const userData = await getDataPengguna();
            fallbackStafOptions = buildStafIdentifikasiOptions(extractUserRows(userData));
          } catch {
            fallbackStafOptions = [];
          }
        }

        if (!active) {
          return;
        }

        setMeta((prev) => ({
          ...prev,
          ...nextMeta,
          nama: nextMeta?.nama || prev.nama,
          username: nextMeta?.username || prev.username,
          unitkerja: nextMeta?.unitkerja || prev.unitkerja,
          stafOptions: (nextMeta?.stafOptions || []).length ? nextMeta.stafOptions : fallbackStafOptions,
          requiresDiprosesOleh: isOfficerIdentifikasi || Boolean(nextMeta?.requiresDiprosesOleh)
        }));
        if (nextMeta?.metaWarning) {
          setNotice(nextMeta.metaWarning);
        }
      } catch (err) {
        if (active) {
          setNotice(err.message || 'Form berjalan dengan data fallback karena backend belum bisa dijangkau.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadMeta();
    return () => {
      active = false;
    };
  }, []);

  const isDocumentRequired = DOCUMENT_REQUIRED_TYPES.includes(form.jenispermintaan);
  const templateInfo = meta.templateMap?.[form.jenispermintaan] || null;

  const handleFieldChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: key === 'materialcode' ? sanitizeMaterialCode(value) : value
    }));
  };

  const handleAddDocuments = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) {
      return;
    }

    setDocuments((prev) => {
      const availableSlots = Math.max(0, 10 - prev.length);
      const nextItems = incoming.slice(0, availableSlots).map((file) => ({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        name: file.name.replace(/\.[^.]+$/, '')
      }));
      return [...prev, ...nextItems];
    });
  };

  const handleDrop = (event) => {
    event.preventDefault();
    handleAddDocuments(event.dataTransfer.files);
  };

  const validateBeforeSubmit = () => {
    try {
      setError('');
      setNotice('');

      if (!form.jenispermintaan) {
        setError('Jenis Permintaan wajib dipilih.');
        return false;
      }

      if (!/^\d{7}$/.test(form.materialcode)) {
        setError('Material code is invalid due to incorrect format!');
        return false;
      }

      if (!stripHtml(form.detailpermintaan)) {
        setError('Detail Permintaan is required!');
        return false;
      }

      if (meta.requiresDiprosesOleh && !form.diprosesoleh) {
        setError('Diproses Oleh wajib dipilih.');
        return false;
      }

      if (isDocumentRequired && !documents.length) {
        setError(`At least one reference document must be uploaded for the request type ${form.jenispermintaan}!`);
        return false;
      }

      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validateBeforeSubmit()) {
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    try {
      setSaving(true);
      setConfirmOpen(false);
      await submitCreateRequest({
        csrfToken: meta.csrfToken,
        tanggalPermintaan: meta.tanggalPermintaan,
        nama: meta.nama,
        username: meta.username,
        unitkerja: meta.unitkerja,
        ...form,
        documents
      });
      setNotice('Request berhasil disimpan.');
      window.setTimeout(() => {
        onNavigate?.('/permintaan');
      }, 500);
    } catch (err) {
      setError(err.message || 'Failed to submit request.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="create-request-page">
      <div className="create-request-card">
        {loading ? <p className="create-request-meta">Memuat form create request...</p> : null}
        {notice ? <p className="create-request-success">{notice}</p> : null}
        {error ? <p className="create-request-error">{error}</p> : null}

        <form className="create-request-form" onSubmit={handleSubmit}>
          <div className="create-request-grid">
            <label className="create-request-field">
              <span>Tanggal Permintaan *</span>
              <input type="text" value={meta.tanggalPermintaan || '-'} readOnly />
            </label>
            <label className="create-request-field">
              <span>Nama *</span>
              <input type="text" value={meta.nama || '-'} readOnly />
            </label>
            <label className="create-request-field">
              <span>Nomor Badge *</span>
              <input type="text" value={meta.username || '-'} readOnly />
            </label>
            <label className="create-request-field">
              <span>Unit Kerja *</span>
              <input type="text" value={meta.unitkerja || '-'} readOnly />
            </label>
            <label className="create-request-field">
              <span>Jenis Permintaan *</span>
              <select
                value={form.jenispermintaan}
                onChange={(event) => handleFieldChange('jenispermintaan', event.target.value)}
                disabled={loading || saving}
              >
                <option value="">-- Pilih Jenis Permintaan --</option>
                {meta.jenisPermintaanOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="create-request-field">
              <span>Material Code *</span>
              <input
                type="text"
                placeholder="Masukkan material code"
                value={form.materialcode}
                onChange={(event) => handleFieldChange('materialcode', event.target.value)}
                maxLength={7}
                inputMode="numeric"
                disabled={saving}
              />
            </label>
          </div>

          {meta.requiresDiprosesOleh ? (
            <label className="create-request-field">
              <span>Diproses Oleh *</span>
              <select
                value={form.diprosesoleh}
                onChange={(event) => handleFieldChange('diprosesoleh', event.target.value)}
                disabled={loading || saving}
              >
                <option value="">-- Pilih Staf --</option>
                {meta.stafOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="create-request-field">
            <span>Detail Permintaan *</span>
            <textarea
              rows="9"
              placeholder="Masukkan detail permintaan"
              value={form.detailpermintaan}
              onChange={(event) => handleFieldChange('detailpermintaan', event.target.value)}
              disabled={saving}
            />
          </label>

          <div className="create-request-field">
            <span>{`Dokumen Referensi${isDocumentRequired ? ' *' : ''}`}</span>
            {templateInfo ? (
              <a
                className="create-request-template-link"
                href={templateInfo.href}
                download={templateInfo.download}
                target="_blank"
                rel="noreferrer"
              >
                {templateInfo.label}
              </a>
            ) : null}

            <div
              className={`create-request-dropzone${documents.length >= 10 ? ' is-disabled' : ''}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              onClick={() => {
                if (documents.length < 10) {
                  fileInputRef.current?.click();
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if ((event.key === 'Enter' || event.key === ' ') && documents.length < 10) {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              Drag and drop files here or click to select (Max 10 files)
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(event) => {
                handleAddDocuments(event.target.files);
                event.target.value = '';
              }}
            />

            {documents.length ? (
              <div className="create-request-documents">
                {documents.map((documentItem, index) => (
                  <div key={documentItem.id} className="create-request-document-row">
                    <input
                      type="text"
                      value={documentItem.name}
                      onChange={(event) => {
                        const nextName = event.target.value;
                        setDocuments((prev) => prev.map((item) => (
                          item.id === documentItem.id ? { ...item, name: nextName } : item
                        )));
                      }}
                      placeholder="Nama dokumen"
                      disabled={saving}
                    />
                    <span
                      className="create-request-document-file"
                      title={getDocumentPreviewName(documentItem)}
                    >
                      {getDocumentPreviewName(documentItem) || `Dokumen ${index + 1}`}
                    </span>
                    <button
                      type="button"
                      className="create-request-remove"
                      onClick={() => {
                        setDocuments((prev) => prev.filter((item) => item.id !== documentItem.id));
                      }}
                      disabled={saving}
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="create-request-actions">
            <button type="submit" className="create-request-save" disabled={saving || loading}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              className="create-request-back"
              onClick={() => onNavigate?.('/permintaan')}
              disabled={saving}
            >
              Back
            </button>
          </div>
        </form>
      </div>

      {confirmOpen ? (
        <div
          className="app-confirm-overlay"
          role="presentation"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="app-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-request-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="create-request-confirm-title" className="app-confirm-title">Simpan request ini?</h2>
            <p className="app-confirm-text">
              Pastikan data dan dokumen yang kamu isi sudah benar sebelum request dikirim.
            </p>
            <div className="app-confirm-actions">
              <button
                type="button"
                className="app-confirm-button is-secondary"
                onClick={() => setConfirmOpen(false)}
                disabled={saving}
              >
                Batal
              </button>
              <button
                type="button"
                className="app-confirm-button is-primary"
                onClick={handleConfirmSubmit}
                disabled={saving}
              >
                Ya, Simpan
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
