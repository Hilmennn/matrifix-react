import logo from '../../../shared/assets/logo.png';
import pupukKujangLogo from '../../../shared/assets/logo-pupuk-kujang.png';

export default function LoginBrand() {
  return (
    <div className="login-brand">
      <img src={pupukKujangLogo} alt="Pupuk Kujang" className="login-brand-badge" />
      <img src={logo} alt="MatriFix" className="login-brand-logo" />
      <div className="login-tagline">Fix It Fast, Fix It Right</div>
    </div>
  );
}
