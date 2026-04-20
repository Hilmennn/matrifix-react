import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createDataPengguna,
  deleteDataPengguna,
  getDataPengguna,
  getDataPenggunaDetail,
  updateDataPengguna
} from '../services/revisi';
import '../../../shared/styles/revisi-data-pengguna.css';

const INITIAL_FORM = {
  nama: '',
  username: '',
  role: '',
  unitkerja: '',
  kode: '',
  password: ''
};

const ROLE_CODE_MAP = {
  User: 'FCM001',
  'AVP User': 'FCM002',
  'AVP Perencanaan': 'FCM003',
  'Staf Perencanaan': 'FCM004',
  'Officer Identifikasi dan Standarisasi Material': 'FCM005',
  'Staf Identifikasi dan Standarisasi Material': 'FCM006',
  'AVP Keandalan': 'FCM007',
  'AVP Pengendalian Biaya dan Jasa Pabrik': 'FCM008',
  'Staf Pergudangan': 'FCM009',
};

const ROLE_FIXED_UNIT_MAP = {
  'AVP Perencanaan': 'Perencanaan',
  'Staf Perencanaan': 'Perencanaan',
  'Officer Identifikasi dan Standarisasi Material': 'Identifikasi dan Standarisasi Material',
  'Staf Identifikasi dan Standarisasi Material': 'Identifikasi dan Standarisasi Material',
  'Staf Pergudangan': 'Pergudangan',
};

function shouldUseUnitKerjaPicker(role = '') {
  return role === 'User' || role === 'AVP User';
}

function resolveKodeByRole(role = '') {
  return ROLE_CODE_MAP[role] || '';
}

function resolveUnitKerjaByRole(role = '', currentValue = '') {
  if (shouldUseUnitKerjaPicker(role)) {
    return currentValue;
  }

  if (ROLE_FIXED_UNIT_MAP[role]) {
    return ROLE_FIXED_UNIT_MAP[role];
  }

  return '';
}

function getStoredUsername() {
  try {
    const raw = localStorage.getItem('matrifix_user');
    const parsed = raw ? JSON.parse(raw) : null;
    return String(parsed?.username || '').trim();
  } catch {
    return '';
  }
}

function mapValidationErrors(error) {
  const entries = Object.entries(error?.payload?.errors || {});
  return entries.reduce((result, [key, messages]) => {
    result[key] = Array.isArray(messages) ? messages[0] : String(messages || '');
    return result;
  }, {});
}

export default function DataPenggunaPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState('');
  const [rows, setRows] = useState([]);
  const [roles, setRoles] = useState([]);
  const [units, setUnits] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [form, setForm] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const currentUsername = useMemo(() => getStoredUsername(), []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setNotice('');
      const data = await getDataPengguna({
        q: search,
        role: roleFilter,
        unitkerja: unitFilter
      });
      setRows(data?.data || []);
      setRoles(data?.filters?.roles || []);
      setUnits(data?.filters?.units || []);
      setNotice(data?.meta?.endpointReady === false ? data.meta.message : '');
    } catch (err) {
      setError(err.message || 'Gagal memuat data pengguna.');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search, unitFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM);
    setFormError('');
    setFieldErrors({});
  }, []);

  const handleCreateClick = useCallback(() => {
    setSuccess('');
    setFormMode('create');
    resetForm();
    setFormOpen(true);
  }, [resetForm]);

  const handleEditClick = useCallback(async (username) => {
    try {
      setSubmitting(true);
      setSuccess('');
      setFormError('');
      setFieldErrors({});
      const detail = await getDataPenggunaDetail(username);
      setFormMode('edit');
      setForm({
        nama: detail?.nama || '',
        username: detail?.username || '',
        role: detail?.role || '',
        unitkerja: detail?.unitkerja || '',
        kode: detail?.kode || '',
        password: ''
      });
      setFormOpen(true);
    } catch (err) {
      setError(err.message || 'Gagal memuat detail pengguna.');
    } finally {
      setSubmitting(false);
    }
  }, []);

  const handleDeleteClick = useCallback(async (username) => {
    if (!window.confirm('Hapus pengguna ini?')) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      const response = await deleteDataPengguna(username);
      setSuccess(response?.message || 'Pengguna berhasil dihapus.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Gagal menghapus pengguna.');
    } finally {
      setSubmitting(false);
    }
  }, [loadData]);

  const handleFormChange = useCallback((event) => {
    const { name, value } = event.target;
    setForm((current) => {
      const next = {
        ...current,
        [name]: value
      };

      if (name === 'role') {
        next.kode = resolveKodeByRole(value);
        next.unitkerja = resolveUnitKerjaByRole(value, current.unitkerja);
      }

      if (name === 'unitkerja' && !shouldUseUnitKerjaPicker(current.role)) {
        next.unitkerja = resolveUnitKerjaByRole(current.role, value);
      }

      return next;
    });
    setFieldErrors((current) => {
      if (!current[name]) {
        return current;
      }
      return {
        ...current,
        [name]: ''
      };
    });
  }, []);

  const handleFormSubmit = useCallback(async (event) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      setFormError('');
      setFieldErrors({});
      setError('');
      setSuccess('');

      const payload = {
        nama: form.nama,
        role: form.role,
        unitkerja: resolveUnitKerjaByRole(form.role, form.unitkerja),
        kode: resolveKodeByRole(form.role) || form.kode,
        ...(formMode === 'create' ? { username: form.username, password: form.password } : {}),
        ...(formMode === 'edit' && form.password ? { password: form.password } : {})
      };

      const response = formMode === 'create'
        ? await createDataPengguna(payload)
        : await updateDataPengguna(form.username, payload);

      setSuccess(response?.message || (formMode === 'create' ? 'Pengguna berhasil ditambahkan.' : 'Pengguna berhasil diperbarui.'));
      setFormOpen(false);
      resetForm();
      await loadData();
    } catch (err) {
      const validationErrors = mapValidationErrors(err);
      setFieldErrors(validationErrors);
      setFormError(err.message || 'Gagal menyimpan data pengguna.');
    } finally {
      setSubmitting(false);
    }
  }, [form, formMode, loadData, resetForm]);

  const unitOptions = useMemo(() => {
    const merged = new Set(units.filter(Boolean));
    if (form.unitkerja) {
      merged.add(form.unitkerja);
    }
    return Array.from(merged);
  }, [form.unitkerja, units]);

  const showUnitKerjaField = shouldUseUnitKerjaPicker(form.role);

  return (
    <section className="user-page">
      <div className="user-page__header">
        <div>
          <h2 className="user-page__title">Data Pengguna</h2>
          <p className="user-page__text">Manajemen user pengguna aplikasi revisi material.</p>
        </div>
        <button
          type="button"
          className="user-page__primary-button"
          onClick={handleCreateClick}
          disabled={submitting}
        >
          Tambah Pengguna
        </button>
      </div>

      <div className="user-page__filters">
        <input
          type="text"
          className="user-page__input"
          placeholder="Cari nama, username, role, unit kerja..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="user-page__input"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
        >
          <option value="">Semua Role</option>
          {roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        <select
          className="user-page__input"
          value={unitFilter}
          onChange={(event) => setUnitFilter(event.target.value)}
        >
          <option value="">Semua Unit Kerja</option>
          {units.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </div>

      {formOpen ? (
        <form className="user-form" onSubmit={handleFormSubmit}>
          <div className="user-form__header">
            <h3 className="user-form__title">
              {formMode === 'create' ? 'Tambah Pengguna' : 'Edit Pengguna'}
            </h3>
            <button
              type="button"
              className="user-form__ghost-button"
              onClick={() => {
                setFormOpen(false);
                resetForm();
              }}
              disabled={submitting}
            >
              Tutup
            </button>
          </div>

          {formError ? <p className="user-page__error">{formError}</p> : null}

          <div className="user-form__grid">
            <label className="user-form__field">
              <span>Nama</span>
              <input className="user-page__input" name="nama" value={form.nama} onChange={handleFormChange} />
              {fieldErrors.nama ? <small className="user-page__field-error">{fieldErrors.nama}</small> : null}
            </label>

            <label className="user-form__field">
              <span>Username (Badge)</span>
              <input
                className="user-page__input"
                name="username"
                value={form.username}
                onChange={handleFormChange}
                readOnly={formMode === 'edit'}
              />
              {fieldErrors.username ? <small className="user-page__field-error">{fieldErrors.username}</small> : null}
            </label>

            <label className="user-form__field">
              <span>Role</span>
              <select className="user-page__input" name="role" value={form.role} onChange={handleFormChange}>
                <option value="">-- Pilih Role --</option>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              {fieldErrors.role ? <small className="user-page__field-error">{fieldErrors.role}</small> : null}
            </label>

            {showUnitKerjaField ? (
              <label className="user-form__field">
                <span>Unit Kerja</span>
                <select className="user-page__input" name="unitkerja" value={form.unitkerja} onChange={handleFormChange}>
                  <option value="">-- Pilih Unit Kerja --</option>
                  {unitOptions.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
                {fieldErrors.unitkerja ? <small className="user-page__field-error">{fieldErrors.unitkerja}</small> : null}
              </label>
            ) : null}

            <label className="user-form__field">
              <span>Kode</span>
              <input className="user-page__input" name="kode" value={form.kode} onChange={handleFormChange} readOnly />
              {fieldErrors.kode ? <small className="user-page__field-error">{fieldErrors.kode}</small> : null}
            </label>

            <label className="user-form__field">
              <span>{formMode === 'create' ? 'Password' : 'Password (kosongkan jika tidak diubah)'}</span>
              <input className="user-page__input" type="password" name="password" value={form.password} onChange={handleFormChange} />
              <div className="user-form__hint">
                <span>- Minimal 8 karakter</span>
                <span>- Mengandung huruf kecil (a-z), huruf besar (A-Z), angka (0-9)</span>
                <span>- Harus mengandung minimal 1 simbol (mis. @ # ! % & ?)</span>
              </div>
              {fieldErrors.password ? <small className="user-page__field-error">{fieldErrors.password}</small> : null}
            </label>
          </div>

          <div className="user-form__actions">
            <button type="submit" className="user-page__primary-button" disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? <p className="user-page__meta">Memuat data...</p> : null}
      {notice ? <p className="user-page__warning">{notice}</p> : null}
      {success ? <p className="user-page__success">{success}</p> : null}
      {error ? <p className="user-page__error">{error}</p> : null}

      <div className="user-table-wrap">
        <table className="user-table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Username</th>
              <th>Role</th>
              <th>Unit Kerja</th>
              <th>Kode</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.username}>
                  <td>{row.nama || '-'}</td>
                  <td>{row.username || '-'}</td>
                  <td>{row.role || '-'}</td>
                  <td>{row.unitkerja || '-'}</td>
                  <td>{row.kode || '-'}</td>
                  <td>
                    <div className="user-table__actions">
                      <button
                        type="button"
                        className="user-table__button is-edit"
                        onClick={() => handleEditClick(row.username)}
                        disabled={submitting}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="user-table__button is-delete"
                        onClick={() => handleDeleteClick(row.username)}
                        disabled={submitting || row.username === currentUsername}
                        title={row.username === currentUsername ? 'Tidak bisa menghapus akun sendiri.' : 'Hapus pengguna'}
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6">Belum ada data.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
