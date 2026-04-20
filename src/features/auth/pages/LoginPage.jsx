import bg from '../../../shared/assets/login-bg.jpg';
import LoginBrand from '../components/LoginBrand';
import LoginForm from '../components/LoginForm';

export default function LoginPage({ onLoginSuccess }) {
  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-panel login-panel-form">
          <div className="login-card">
            <LoginBrand />
            <LoginForm onLoginSuccess={onLoginSuccess} />
          </div>
        </section>

        <aside className="login-panel login-panel-visual">
          <div className="login-visual-frame">
            <img src={bg} alt="Ilustrasi login MatriFix" className="login-visual-image" />
          </div>
        </aside>
      </div>
    </div>
  );
}
