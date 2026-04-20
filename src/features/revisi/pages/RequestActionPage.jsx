import { useEffect, useMemo, useState } from 'react';
import { parseStoredUser } from '../../../shared/layout/navigation';
import { normalizeRole } from '../../../shared/lib/roles';
import {
  getLegacyFileUrl,
  getMyRequestActionUrls,
  getProcessRequestActionUrls,
  getRequestDetail,
  submitProcessRequestActionById
} from '../services/revisi';
import '../../../shared/styles/revisi-request-action.css';

function getStorageKey(type) {
  return `matrifix_${type}_selected_row`;
}

function parseSelectedRow(type) {
  try {
    return JSON.parse(sessionStorage.getItem(getStorageKey(type)) || 'null');
  } catch {
    return null;
  }
}

function getRowDocuments(row) {
  if (Array.isArray(row?.documents) && row.documents.length) {
    return row.documents.filter(Boolean);
  }

  return Array.from({ length: 10 }, (_, index) => row?.[`dokumentambahan${index + 1}`]).filter(Boolean);
}

function getActionConfig(mode) {
  switch (mode) {
    case 'my-request-detail':
      return {
        storageType: 'my_request',
        heading: 'Request Detail',
        description: 'Detail permintaan ditampilkan dari data frontend React.',
        backPath: '/permintaan',
        isProcessMode: false
      };
    case 'my-request-detail-revisi':
      return {
        storageType: 'my_request',
        heading: 'Detail Revisi',
        description: 'Detail revisi ditampilkan dari data frontend React.',
        backPath: '/permintaan',
        isProcessMode: false
      };
    case 'process-request-detail':
      return {
        storageType: 'process_request',
        heading: 'Request Detail',
        description: 'Detail permintaan ditampilkan dari data frontend React.',
        backPath: '/butuhproses',
        isProcessMode: false
      };
    case 'process-request-action':
      return {
        storageType: 'process_request',
        heading: 'Process Request',
        description: 'Form proses ini mengikuti alur frontend React tanpa membuka halaman Laravel.',
        backPath: '/butuhproses',
        isProcessMode: true
      };
    default:
      return {
        storageType: 'my_request',
        heading: 'Request',
        description: 'Data request belum tersedia.',
        backPath: '/permintaan',
        isProcessMode: false
      };
  }
}

function buildDocumentHref(doc) {
  if (!doc) {
    return '';
  }
  return getLegacyFileUrl(doc);
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<li>/gi, '- ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[^\S\n]{2,}/g, ' ')
    .trim();
}

function normalizeMultilineValue(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

function formatDetailPermintaan(value) {
  const plainText = stripHtml(value || '-')
    .replace(/&gt;/gi, '>')
    .replace(/&lt;/gi, '<')
    .replace(/&amp;/gi, '&')
    .replace(/\u00a0/g, ' ');

  const repairedText = plainText
    .replace(/([A-Z])\n([A-Z]{2,}(?:\s+[A-Z]{2,})*\s*:)/g, '$1$2')
    .replace(/([A-Z0-9])\n([A-Z0-9][a-z])/g, '$1 $2')
    .replace(/\n[ \t]+\n/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n');

  const hasStructuredLines = repairedText.split('\n').filter((line) => line.trim()).length >= 6;

  const normalizedText = hasStructuredLines
    ? repairedText
        .replace(/\s*(PO Text awal\s*:|PO Text Awal adalah\s*:|PO Text Memo|ACTUATOR DATA|POSITIONER DATA|Manufacturer Reference|Perubahan detil terdapat pada\s*:|dirubah menjadi\s*:)\s*/gi, '\n$1\n')
        .replace(/\n{3,}/g, '\n\n')
    : repairedText
        .replace(/\s*(===\s*[^=\n]+?\s*===)\s*/g, '\n$1\n')
        .replace(/\s*(PO Text awal\s*:|PO Text Awal adalah\s*:|PO Text Memo|ACTUATOR DATA|POSITIONER DATA|Manufacturer Reference|Perubahan detil terdapat pada\s*:|dirubah menjadi\s*:)\s*/gi, '\n$1\n')
        .replace(/;\s*(?=[A-Z][A-Z0-9/&(),.#\- ]{2,40}\s*:)/g, ';\n')
        .replace(/(?<!\n)([A-Z][A-Z0-9/&(),.#\- ]{2,40}\s*:)/g, '\n$1')
        .replace(/\s+dan\s+(?=[A-Z][A-Z0-9/&(),.#\- ]{2,40}\s*:)/g, ' dan\n')
        .replace(/\n{3,}/g, '\n\n');

  return normalizedText
    .trim();
}

function normalizeApproverSegment(value) {
  return String(value || '')
    .replace(/\((AVP|Officer|Staf)\s+(.+?)\s+\2\)$/i, '($1 $2)')
    .replace(/\((.+?)\s+\1\)$/i, '($1)')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function expandUserDisplay(value, user = {}) {
  const rawValue = String(value || '')
    .split(',')
    .map((segment) => normalizeApproverSegment(segment))
    .filter(Boolean)
    .join(', ');
  const fullName = String(user?.nama || '').trim();
  const role = String(user?.role || '').trim();

  if (!rawValue || !fullName) {
    return rawValue;
  }

  const firstName = fullName.split(/\s+/)[0];
  if (!firstName) {
    return rawValue;
  }

  const fullDisplay = role ? `${fullName} (${role})` : fullName;
  if (rawValue.includes(fullName) || rawValue.includes(fullDisplay)) {
    return rawValue;
  }

  const escapedFirstName = firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(^|,\\s*)${escapedFirstName}(?=\\s*(,|$))`, 'g');

  return rawValue
    .replace(pattern, (match, prefix = '') => `${prefix}${fullDisplay}`)
    .split(',')
    .map((segment) => normalizeApproverSegment(segment))
    .filter(Boolean)
    .join(', ');
}

function splitStaffOptions(value) {
  const text = String(value || '').replace(/Standardisasi/g, 'Standarisasi').trim();
  if (!text) {
    return [];
  }

  const cleaned = text.replace(/^--\s*Pilih Staf\s*--/i, '').trim();
  if (!cleaned) {
    return [];
  }

  const rolePattern = /\b[^,()]+?\s*\(Staf Identifikasi dan Standarisasi Material\)/gi;
  const matches = cleaned.match(rolePattern);
  if (matches?.length) {
    return matches.map((item) => item.trim()).filter(Boolean);
  }

  return cleaned
    .split(/\s{2,}|,(?=\s*[A-Z])/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function ReadonlyField({ label, value, multiline = false, fieldClassName = '', inputClassName = '' }) {
  return (
    <div className={`request-action-field ${fieldClassName}`.trim()}>
      <label className="request-action-label">{label}</label>
      {multiline ? (
        <div className={`request-action-input is-textarea is-readonly-block ${inputClassName}`.trim()}>{normalizeMultilineValue(value) || '-'}</div>
      ) : (
        <input className={`request-action-input ${inputClassName}`.trim()} value={value || '-'} readOnly />
      )}
    </div>
  );
}

function getProcessConfirmCopy(approvalValue) {
  switch (approvalValue) {
    case 'Ya':
      return {
        title: 'Yakin ingin menyetujui request ini?',
        text: 'Request akan diproses sebagai disetujui. Pastikan data approval dan keterangan yang diisi sudah benar.'
      };
    case 'Tidak':
      return {
        title: 'Yakin ingin menolak request ini?',
        text: 'Request akan ditandai sebagai ditolak. Pastikan keputusan ini sudah sesuai sebelum melanjutkan.'
      };
    case 'Revisi':
      return {
        title: 'Yakin ingin mengirim revisi?',
        text: 'Request akan dikembalikan ke requester dan status berubah menjadi Menunggu Revisi.'
      };
    default:
      return {
        title: 'Konfirmasi proses request',
        text: 'Pastikan data yang diisi sudah benar sebelum melanjutkan.'
      };
  }
}

export default function RequestActionPage({ mode = 'my-request-detail', onNavigate }) {
  const config = useMemo(() => getActionConfig(mode), [mode]);
  const row = useMemo(() => parseSelectedRow(config.storageType), [config.storageType]);
  const user = useMemo(() => parseStoredUser(), []);
  const role = String(user?.role || '').trim();
  const roleNormalized = useMemo(() => normalizeRole(role), [role]);
  const [detailRow, setDetailRow] = useState(row);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const documents = useMemo(() => getRowDocuments(detailRow), [detailRow]);
  const [catatanApproval, setCatatanApproval] = useState(() => row?.catatan && row.catatan !== '<p><br></p>' ? stripHtml(row.catatan) : '');
  const [keteranganProses, setKeteranganProses] = useState(() => stripHtml(row?.keterangan || ''));
  const [diprosesOleh, setDiprosesOleh] = useState(() => String(row?.diprosesoleh || '').trim());
  const [actionNotice, setActionNotice] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [pendingApprovalAction, setPendingApprovalAction] = useState('');
  const diapprovalolehDisplay = useMemo(
    () => expandUserDisplay(detailRow?.diapprovaloleh || '-', user),
    [detailRow, user]
  );
  const diprosesOlehDisplay = useMemo(
    () => expandUserDisplay(detailRow?.diprosesoleh || '-', user),
    [detailRow, user]
  );

  useEffect(() => {
    setDetailRow(row);
  }, [row]);

  useEffect(() => {
    let active = true;

    async function loadDetail() {
      if (!row) {
        return;
      }

      const actionUrls = config.storageType === 'process_request'
        ? getProcessRequestActionUrls(row)
        : getMyRequestActionUrls(row);

      const detailUrl = config.isProcessMode
        ? actionUrls.process
        : (mode === 'my-request-detail-revisi' ? actionUrls.detailRevisi : actionUrls.detail);
      const requestId = Number(row?.id || 0);

      if (!requestId && !detailUrl) {
        return;
      }

      try {
        setDetailLoading(true);
        setDetailError('');
        const fetchedDetail = await getRequestDetail(requestId, detailUrl);
        if (!active || !fetchedDetail || typeof fetchedDetail !== 'object') {
          return;
        }

        setDetailRow((current) => ({
          ...(current || {}),
          ...fetchedDetail
        }));
      } catch (error) {
        if (active) {
          setDetailError(error?.message || 'Gagal memuat detail request.');
        }
      } finally {
        if (active) {
          setDetailLoading(false);
        }
      }
    }

    loadDetail();
    return () => {
      active = false;
    };
  }, [config.isProcessMode, config.storageType, mode, row]);

  useEffect(() => {
    setCatatanApproval(detailRow?.catatan && detailRow.catatan !== '<p><br></p>' ? stripHtml(detailRow.catatan) : '');
    setKeteranganProses(stripHtml(detailRow?.keterangan || ''));
    setDiprosesOleh(String(detailRow?.diprosesoleh || '').trim());
  }, [detailRow]);

  const canUseRevisi = config.isProcessMode && Boolean(detailRow?.processMeta?.canUseRevisi ?? true);
  const isOfficerIdentifikasi = roleNormalized.includes('officer identifikasi');
  const isStafIdentifikasi = roleNormalized.includes('staf identifikasi');
  const requiresKeterangan = Boolean(detailRow?.processMeta?.requiresKeterangan ?? isStafIdentifikasi);
  const showDiprosesSelect = config.isProcessMode && Boolean(detailRow?.processMeta?.requiresDiprosesOleh ?? isOfficerIdentifikasi);
  const showDiprosesDetail = isOfficerIdentifikasi;
  const confirmCopy = useMemo(
    () => getProcessConfirmCopy(pendingApprovalAction),
    [pendingApprovalAction]
  );
  const staffOptions = useMemo(() => {
    const raw = Array.isArray(detailRow?.stafOptions) ? detailRow.stafOptions : [];
    const normalized = raw
      .flatMap((option) => splitStaffOptions(option))
      .filter(Boolean);

    if (normalized.length) {
      return Array.from(new Set(normalized));
    }

    const fallback = splitStaffOptions(diprosesOleh);
    return fallback.length ? Array.from(new Set(fallback)) : [];
  }, [detailRow, diprosesOleh]);

  const validateProcessAction = (approvalValue) => {
    const actionUrls = getProcessRequestActionUrls(detailRow || row || {});
    const processUrl = actionUrls.process;

    if (!processUrl) {
      setActionNotice('URL proses request tidak tersedia.');
      return false;
    }

    if (requiresKeterangan && !stripHtml(keteranganProses)) {
      setActionNotice('Keterangan Proses wajib diisi sebelum memproses request.');
      return false;
    }

    if (showDiprosesSelect && approvalValue === 'Ya' && !diprosesOleh) {
      setActionNotice('Pilih Staf Identifikasi dan Standarisasi Material pada field Diproses Oleh terlebih dahulu sebelum menyetujui request.');
      return false;
    }

    if (approvalValue === 'Revisi' && !stripHtml(catatanApproval)) {
      setActionNotice('Catatan Approval wajib diisi sebelum mengirim revisi.');
      return false;
    }

    return true;
  };

  const handleOpenProcessConfirm = (approvalValue) => {
    if (!validateProcessAction(approvalValue)) {
      return;
    }
    setPendingApprovalAction(approvalValue);
  };

  const handleProcessAction = async () => {
    const approvalValue = pendingApprovalAction;
    if (!approvalValue) {
      return;
    }

    const actionUrls = getProcessRequestActionUrls(detailRow || row || {});
    const processUrl = actionUrls.process;
    const requestId = Number(detailRow?.id || row?.id || 0);

    try {
      setSubmittingAction(true);
      setPendingApprovalAction('');
      setActionNotice('');
      const result = await submitProcessRequestActionById(requestId, {
        approval: approvalValue,
        catatan: catatanApproval,
        keterangan: keteranganProses,
        diprosesoleh: showDiprosesSelect ? diprosesOleh : ''
      }, processUrl);
      onNavigate?.(result?.redirectTo || '/butuhproses');
    } catch (error) {
      setActionNotice(error?.message || 'Gagal memproses request.');
    } finally {
      setSubmittingAction(false);
    }
  };

  if (!detailRow) {
    return (
      <section className="request-action-card">
        <h2 className="request-action-title">{config.heading}</h2>
        <p className="request-action-subtitle">Data detail belum tersedia. Buka kembali dari tabel agar data terpilih tersimpan di frontend.</p>
        <div className="request-action-actions">
          <button
            type="button"
            className="request-action-button"
            onClick={() => onNavigate?.(config.backPath)}
          >
            Back
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="request-action-card">
      {detailLoading ? <div className="request-action-notice">Memuat detail terbaru...</div> : null}
      {detailError ? <div className="request-action-notice">{detailError}</div> : null}
      {actionNotice ? <div className="request-action-notice">{actionNotice}</div> : null}

      <div className="request-action-grid">
        <ReadonlyField label="Kode Permintaan" value={detailRow.kodepermintaan} />
        <ReadonlyField label="Tanggal Permintaan" value={detailRow.tanggalpermintaan} />
        <ReadonlyField label="Nama" value={detailRow.nama || user?.nama || '-'} />
        <ReadonlyField label="Nomor Badge" value={detailRow.username || user?.username || '-'} />
        <ReadonlyField label="Unit Kerja" value={detailRow.unitkerja || user?.unitkerja || user?.role || '-'} />
        <ReadonlyField label="Jenis Permintaan" value={detailRow.jenispermintaan} />
        <ReadonlyField label="Material Code" value={detailRow.materialcode} />
        <ReadonlyField label="Status" value={detailRow.status} />
      </div>

      <div className="request-action-grid request-action-grid-detail">
        <ReadonlyField
          label="Detail Permintaan"
          value={formatDetailPermintaan(detailRow.detailpermintaan || '-')}
          multiline
          fieldClassName="request-action-field-detail"
          inputClassName="request-action-input-detail"
        />

        <div className="request-action-field request-action-field-docs">
          <label className="request-action-label">Dokumen Referensi</label>
          {documents.length ? (
            <div className="request-action-docs">
              {documents.map((doc, index) => (
                <a
                  key={`${doc}-${index}`}
                  href={buildDocumentHref(doc)}
                  target="_blank"
                  rel="noreferrer"
                  className="request-action-doc"
                >
                  {doc}
                </a>
              ))}
            </div>
          ) : (
            <div className="request-action-empty">Tidak ada dokumen referensi.</div>
          )}
        </div>
      </div>

      <div className="request-action-grid">
        <ReadonlyField label="Diapproval Oleh" value={diapprovalolehDisplay || '-'} multiline />
        <ReadonlyField label="Approval Terakhir" value={detailRow.approval || '-'} />
      </div>

      {!config.isProcessMode ? (
        <>
          <ReadonlyField label="Catatan Approval Terakhir" value={stripHtml(detailRow.catatan || '-')} multiline />
          <div className="request-action-grid">
            <ReadonlyField label="Tanggal Approval Terakhir" value={detailRow.tanggalapproval || '-'} />
            {showDiprosesDetail ? (
              <ReadonlyField label="Diproses Oleh" value={detailRow?.diprosesolehDisplay || diprosesOlehDisplay || '-'} />
            ) : null}
          </div>
          <ReadonlyField label="Keterangan Proses" value={stripHtml(detailRow.keterangan || '-')} multiline />
          <ReadonlyField label="Tanggal Selesai" value={detailRow.tanggalproses && detailRow.tanggalproses !== '0000-00-00' ? detailRow.tanggalproses : '-'} />
        </>
      ) : (
        <>
          <div className="request-action-field">
            <label className="request-action-label">Tanggal Approval</label>
            <input className="request-action-input" value={new Date().toISOString().slice(0, 10)} readOnly />
          </div>

          <div className="request-action-field">
            <label className="request-action-label">Catatan Approval</label>
            <textarea
              className="request-action-input is-textarea"
              value={catatanApproval}
              onChange={(event) => setCatatanApproval(event.target.value)}
              placeholder="Masukkan catatan approval"
            />
          </div>

          {requiresKeterangan ? (
            <div className="request-action-field">
              <label className="request-action-label">Keterangan Proses <span className="request-action-required">*</span></label>
              <textarea
                className="request-action-input is-textarea"
                value={keteranganProses}
                onChange={(event) => setKeteranganProses(event.target.value)}
                placeholder="Masukkan keterangan proses"
              />
            </div>
          ) : null}

          {showDiprosesSelect ? (
            <div className="request-action-field">
              <label className="request-action-label">Diproses Oleh <span className="request-action-required">*</span></label>
              <select
                className="request-action-input"
                value={diprosesOleh}
                onChange={(event) => setDiprosesOleh(event.target.value)}
              >
                <option value="">-- Pilih Staf --</option>
                {staffOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          ) : null}
        </>
      )}

      <div className="request-action-actions">
        {config.isProcessMode ? (
          <div className="request-action-approval-buttons">
            <button type="button" className="request-action-pill is-approve" onClick={() => handleOpenProcessConfirm('Ya')} disabled={submittingAction}>Disetujui</button>
            <button type="button" className="request-action-pill is-reject" onClick={() => handleOpenProcessConfirm('Tidak')} disabled={submittingAction}>Ditolak</button>
            {canUseRevisi ? (
              <button type="button" className="request-action-pill is-revisi" onClick={() => handleOpenProcessConfirm('Revisi')} disabled={submittingAction}>Revisi</button>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          className="request-action-button is-secondary"
          onClick={() => onNavigate?.(config.backPath)}
          disabled={submittingAction}
        >
          Back
        </button>
      </div>

      {pendingApprovalAction ? (
        <div
          className="app-confirm-overlay"
          role="presentation"
          onClick={() => setPendingApprovalAction('')}
        >
          <div
            className="app-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="process-request-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="process-request-confirm-title" className="app-confirm-title">{confirmCopy.title}</h2>
            <p className="app-confirm-text">{confirmCopy.text}</p>
            <div className="app-confirm-actions">
              <button
                type="button"
                className="app-confirm-button is-secondary"
                onClick={() => setPendingApprovalAction('')}
                disabled={submittingAction}
              >
                Batal
              </button>
              <button
                type="button"
                className="app-confirm-button is-primary"
                onClick={handleProcessAction}
                disabled={submittingAction}
              >
                {submittingAction ? 'Memproses...' : 'Ya, Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
