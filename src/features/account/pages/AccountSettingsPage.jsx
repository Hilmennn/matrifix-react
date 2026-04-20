import { useMemo, useState } from 'react';
import { parseStoredUser } from '../../../shared/layout/navigation';
import '../../../shared/styles/account-settings.css';

function readUserValue(user, keys, fallback = '-') {
  for (const key of keys) {
    const value = user?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value);
    }
  }
  return fallback;
}

export default function AccountSettingsPage() {
  const storedUser = useMemo(() => parseStoredUser(), []);
  const [name, setName] = useState(() => readUserValue(storedUser, ['nama', 'name'], ''));
  const [email, setEmail] = useState(() => readUserValue(storedUser, ['email'], ''));
  const [whatsapp, setWhatsapp] = useState(() => readUserValue(storedUser, ['phone', 'nomorhp', 'nohp', 'hp', 'telp'], ''));
  const [badge, setBadge] = useState(() => readUserValue(storedUser, ['username', 'badge', 'nomorbadge', 'nomor_badge'], ''));
  const [role, setRole] = useState(() => readUserValue(storedUser, ['role'], ''));
  const [code, setCode] = useState(() => readUserValue(storedUser, ['kode', 'code'], ''));

  const identity = {
    role: readUserValue(storedUser, ['role'])
  };

  const handleUpdate = () => {
    const nextUser = {
      ...storedUser,
      nama: name,
      email,
      username: badge,
      badge,
      nomorbadge: badge,
      nomor_badge: badge,
      phone: whatsapp,
      nomorhp: whatsapp,
      nohp: whatsapp,
      hp: whatsapp,
      telp: whatsapp,
      role,
      kode: code,
      code
    };
    localStorage.setItem('matrifix_user', JSON.stringify(nextUser));
    window.location.reload();
  };

  return (
    <section className="account-settings-page">
      <header className="account-settings-head">
        <h2>Settings</h2>
        <p>Manage your profile and account settings</p>
      </header>

      <div className="account-settings-layout">
        <aside className="account-settings-nav">
          <a href="/account" className="account-settings-nav-item is-active">Profile</a>
          <a href="/account/password" className="account-settings-nav-item">Password</a>
        </aside>

        <div className="account-settings-content">
          <div className="account-settings-main">
            <article className="account-card">
              <h3>Profile information</h3>
              <p>Update your profile</p>

              <div className="account-profile-grid">
                <label className="account-field">
                  <span>Nama *</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} />
                </label>

                <label className="account-field">
                  <span>Email *</span>
                  <input value={email} onChange={(event) => setEmail(event.target.value)} />
                </label>

                <label className="account-field">
                  <span>No. WhatsApp *</span>
                  <input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} />
                </label>

                <label className="account-field">
                  <span>Nomor Badge *</span>
                  <input value={badge} onChange={(event) => setBadge(event.target.value)} />
                </label>

                <label className="account-field">
                  <span>Role *</span>
                  <input value={role} onChange={(event) => setRole(event.target.value)} />
                </label>

                <label className="account-field">
                  <span>Kode *</span>
                  <input value={code} onChange={(event) => setCode(event.target.value)} />
                </label>
              </div>

              <button type="button" className="account-update-btn" onClick={handleUpdate}>
                Update
              </button>
            </article>

            <article className="account-card">
              <h3>Account information</h3>
              <p>Dikelola oleh admin aplikasi</p>
              <div className="account-role-chip-wrap">
                <span className="account-role-label">Role</span>
                <span className="account-role-chip">{identity.role}</span>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
