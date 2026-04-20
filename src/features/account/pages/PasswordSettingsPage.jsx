import { useState } from 'react';
import '../../../shared/styles/account-settings.css';

function getPasswordStrength(value) {
  const password = String(value || '');
  let score = 0;

  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (!password) {
    return { label: 'Belum diisi', level: 'empty', percent: 0 };
  }
  if (score <= 1) {
    return { label: 'Sangat Lemah', level: 'weak', percent: 20 };
  }
  if (score === 2) {
    return { label: 'Cukup', level: 'fair', percent: 45 };
  }
  if (score === 3) {
    return { label: 'Baik', level: 'good', percent: 70 };
  }
  return { label: 'Kuat', level: 'strong', percent: 100 };
}

export default function PasswordSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');
  const [hasTypedNewPassword, setHasTypedNewPassword] = useState(false);
  const strength = getPasswordStrength(newPassword);
  const showPasswordGuidance = hasTypedNewPassword && newPassword.trim().length > 0;

  const handlePasswordUpdate = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordNotice('Mohon lengkapi semua field password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordNotice('Konfirmasi password baru belum sama.');
      return;
    }

    setPasswordNotice('Fitur update password siap dihubungkan ke backend.');
  };

  return (
    <section className="account-settings-page">
      <header className="account-settings-head">
        <h2>Settings</h2>
        <p>Manage your profile and account settings</p>
      </header>

      <div className="account-settings-layout">
        <aside className="account-settings-nav">
          <a href="/account" className="account-settings-nav-item">Profile</a>
          <a href="/account/password" className="account-settings-nav-item is-active">Password</a>
        </aside>

        <div className="account-settings-content">
          <div className="account-settings-main">
            <article className="account-card account-password-card">
              <h3>Update password</h3>
              <p>Ensure your account is using a long, random password to stay secure</p>

              <label className="account-field">
                <span>Current password</span>
                <input
                  type="password"
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </label>

              <label className="account-field">
                <span>New password</span>
                <input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  autoComplete="new-password"
                  onChange={(event) => {
                    const { value } = event.target;
                    setNewPassword(value);
                    setHasTypedNewPassword(value.trim().length > 0);
                  }}
                />
              </label>

              {showPasswordGuidance ? (
                <>
                  <div className="account-password-strength">
                    <div className="account-password-strength-bar">
                      <span
                        className={`account-password-strength-fill is-${strength.level}`}
                        style={{ width: `${strength.percent}%` }}
                      />
                    </div>
                    <strong>Tingkat Keamanan: {strength.label}</strong>
                    <ul className="account-password-hints">
                      <li>Minimal 8 karakter</li>
                      <li>Kombinasi huruf besar dan kecil</li>
                      <li>Angka atau karakter khusus</li>
                    </ul>
                  </div>

                  <div className="account-password-note-box">
                    Password Anda harus lebih kuat untuk keamanan akun Anda.
                    <br />
                    Pastikan password memiliki:
                    <ul>
                      <li>Minimal 8 karakter</li>
                      <li>Kombinasi huruf besar dan kecil</li>
                      <li>Angka atau karakter khusus</li>
                    </ul>
                  </div>
                </>
              ) : null}

              <label className="account-field">
                <span>Confirm password</span>
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>

              {passwordNotice ? <p className="account-password-notice">{passwordNotice}</p> : null}

              <button type="button" className="account-update-btn" onClick={handlePasswordUpdate}>
                Save password
              </button>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
