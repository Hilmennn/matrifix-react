import { useEffect, useMemo, useRef, useState } from 'react';
import { parseStoredUser } from '../../../shared/layout/navigation';
import { normalizeRole } from '../../../shared/lib/roles';
import {
  getCreateRequestMeta,
  getDataPengguna,
  getRequestDetail,
  updateMyRequestById
} from '../services/revisi';
import '../../../shared/styles/revisi-create-request.css';

const DOCUMENT_REQUIRED_TYPES = [
  'Perubahan Data MRP (MRP Type/Strategi Stok)',
  'Perubahan Data MRP (Min-Max)',
  'Perubahan PO Text/Spesifikasi'
];

const SELECTED_ROW_STORAGE_KEY = 'matrifix_my_request_selected_row';
const EDIT_CONTEXT_STORAGE_KEY = 'matrifix_my_request_edit_context';

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

function getBaseName(fileName = '') {
  return String(fileName || '').replace(/\.[^.]+$/, '');
}

function getDocumentPreviewName(documentItem) {
  const originalName = String(documentItem?.file?.name || documentItem?.existing || '');
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

function readStoredJson(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

function clearEditSession() {
  try {
    sessionStorage.removeItem(EDIT_CONTEXT_STORAGE_KEY);
    sessionStorage.removeItem(SELECTED_ROW_STORAGE_KEY);
  } catch {
    // no-op
  }
}

function buildInitialDocuments(documents = []) {
  return (Array.isArray(documents) ? documents : [])
    .slice(0, 10)
    .filter(Boolean)
    .map((fileName, index) => ({
      id: `existing-${index + 1}-${fileName}`,
      existing: String(fileName),
      name: getBaseName(fileName),
      file: null
    }));
}

export default function EditRequestPage({ onNavigate }) {
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
  const [requestId, setRequestId] = useState(0);
  const [editMode, setEditMode] = useState('edit');
  const [requestSummary, setRequestSummary] = useState({
    kodepermintaan: '',
    status: '',
    catatan: '',
    diapprovaloleh: ''
  });
  const [meta, setMeta] = useState({
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

    async function loadData() {
      try {
        setLoading(true);
        setError('');
        setNotice('');

        const selectedRow = readStoredJson(SELECTED_ROW_STORAGE_KEY);
        const editContext = readStoredJson(EDIT_CONTEXT_STORAGE_KEY);
        const id = Number(editContext?.id || selectedRow?.id || 0);

        if (id <= 0) {
          throw new Error('Data request untuk diubah tidak tersedia. Kembali ke My Request lalu pilih Edit/Revisi lagi.');
        }

        const [nextMeta, detail] = await Promise.all([
          getCreateRequestMeta(),
          getRequestDetail(id)
        ]);

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

        setRequestId(id);
        setEditMode(editContext?.mode === 'revisi' ? 'revisi' : 'edit');
        setMeta((prev) => ({
          ...prev,
          ...nextMeta,
          nama: detail?.nama || nextMeta?.nama || prev.nama,
          username: detail?.username || nextMeta?.username || prev.username,
          unitkerja: detail?.unitkerja || nextMeta?.unitkerja || prev.unitkerja,
          stafOptions: (nextMeta?.stafOptions || []).length ? nextMeta.stafOptions : fallbackStafOptions,
          requiresDiprosesOleh: isOfficerIdentifikasi || Boolean(nextMeta?.requiresDiprosesOleh)
        }));
        setRequestSummary({
          kodepermintaan: String(detail?.kodepermintaan || ''),
          status: String(detail?.status || ''),
          catatan: String(detail?.catatan || ''),
          diapprovaloleh: String(detail?.diapprovaloleh || '')
        });
        setForm({
          jenispermintaan: String(detail?.jenispermintaan || ''),
          materialcode: sanitizeMaterialCode(detail?.materialcode || ''),
          detailpermintaan: String(detail?.detailpermintaan || ''),
          diprosesoleh: String(detail?.diprosesoleh || '')
        });
        setDocuments(buildInitialDocuments(detail?.documents));
      } catch (err) {
        if (active) {
          setError(err.message || 'Gagal memuat data request untuk diubah.');
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
  }, [isOfficerIdentifikasi]);

  const isDocumentRequired = DOCUMENT_REQUIRED_TYPES.includes(form.jenispermintaan);
  const templateInfo = meta.templateMap?.[form.jenispermintaan] || null;
  const showRevisiNote = (editMode === 'revisi'
    || String(requestSummary.status || '').toLowerCase().includes('menunggu revisi'))
    && stripHtml(requestSummary.catatan);

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
        id: `upload-${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        existing: '',
        name: getBaseName(file.name)
      }));
      return [...prev, ...nextItems];
    });
  };

  const validateBeforeSubmit = () => {
    setError('');
    setNotice('');

    if (!requestId) {
      setError('ID request tidak tersedia.');
      return false;
    }

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
      await updateMyRequestById(requestId, {
        jenispermintaan: form.jenispermintaan,
        materialcode: form.materialcode,
        detailpermintaan: form.detailpermintaan,
        diprosesoleh: form.diprosesoleh,
        documents
      });
      setNotice('Request berhasil diperbarui.');
      window.setTimeout(() => {
        clearEditSession();
        onNavigate?.('/permintaan');
      }, 500);
    } catch (err) {
      setError(err.message || 'Gagal memperbarui request.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="create-request-page">
      <div className="create-request-card">
        {loading ? <p className="create-request-meta">Memuat form ubah request...</p> : null}
        {notice ? <p className="create-request-success">{notice}</p> : null}
        {error ? <p className="create-request-error">{error}</p> : null}

        {showRevisiNote ? (
          <div className="create-request-field">
            <span>Catatan Revisi</span>
            <div className="request-action-readonly-block">
              {stripHtml(requestSummary.catatan)}
              {requestSummary.diapprovaloleh ? (
                <>
                  {' '}
                  <strong>{`- ${requestSummary.diapprovaloleh}`}</strong>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        <form className="create-request-form" onSubmit={handleSubmit}>
          <div className="create-request-grid">
            <label className="create-request-field">
              <span>Kode Permintaan</span>
              <input type="text" value={requestSummary.kodepermintaan || '-'} readOnly />
            </label>
            <label className="create-request-field">
              <span>Status</span>
              <input type="text" value={requestSummary.status || '-'} readOnly />
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
              onDrop={(event) => {
                event.preventDefault();
                handleAddDocuments(event.dataTransfer.files);
              }}
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
              {saving ? 'Saving...' : 'Update'}
            </button>
            <button
              type="button"
              className="create-request-back"
              onClick={() => {
                clearEditSession();
                onNavigate?.('/permintaan');
              }}
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
            aria-labelledby="edit-request-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="edit-request-confirm-title" className="app-confirm-title">Simpan perubahan request?</h3>
            <p className="app-confirm-text">Perubahan pada request ini akan langsung diperbarui.</p>
            <div className="app-confirm-actions">
              <button type="button" className="app-confirm-cancel" onClick={() => setConfirmOpen(false)}>
                Batal
              </button>
              <button type="button" className="app-confirm-accept" onClick={handleConfirmSubmit}>
                Ya, Simpan
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
