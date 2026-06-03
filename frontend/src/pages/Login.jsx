import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import PillyLogo from "../components/PillyLogo";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  // View state: false = login, true = register
  const [isRegister, setIsRegister] = useState(false);

  // Password visibility toggles
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showRegPw, setShowRegPw] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);

  // Register form fields (controlled for real-time match validation)
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  // Language toggle (non-functional placeholder)
  const [lang, setLang] = useState("EN");

  const passwordsMismatch = regConfirm.length > 0 && regPassword !== regConfirm;
  const canRegister =
    regPassword.length > 0 && regConfirm.length > 0 && !passwordsMismatch;

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    // No real auth yet — go straight to the pharmacist dashboard.
    navigate("/pharmacist/dashboard");
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!canRegister) return;
    // Hook up account creation here.
  };

  return (
    <div className={`auth-page ${isRegister ? "register-active" : ""}`}>
      {/* Language toggle — placeholder only */}
      <div className="lang-toggle" role="group" aria-label="Language">
        <button
          type="button"
          className={lang === "EN" ? "active" : ""}
          aria-pressed={lang === "EN"}
          onClick={() => setLang("EN")}
        >
          EN
        </button>
        <span className="lang-sep" aria-hidden="true">
          |
        </span>
        <button
          type="button"
          className={lang === "中文" ? "active" : ""}
          aria-pressed={lang === "中文"}
          onClick={() => setLang("中文")}
        >
          中文
        </button>
      </div>

      <div className="auth-shell">
        {/* Sliding image panel — replace gradients with images via .left-image / .right-image */}
        <div className="image-panel" aria-hidden="true">
          <div className="image-layer left-image">
            <span className="image-overlay-text">
              Pilly — Smarter Pharmacy Care
            </span>
          </div>
          <div className="image-layer right-image">
            <span className="image-overlay-text">Join Pilly Today</span>
          </div>
        </div>

        {/* Form side — holds both forms, swaps sides with the image panel */}
        <div className="form-side">
          {/* ---------------- LOGIN ---------------- */}
          <form
            className="auth-form login-form"
            onSubmit={handleLoginSubmit}
            aria-hidden={isRegister}
          >
            <div className="brand-row">
              <PillyLogo size={56} showName={false} />
              <span className="brand-title">Pilly</span>
            </div>
            <p className="form-subtitle">Pharmacist Portal</p>

            <div className="field">
              <label htmlFor="login-email">Email Address</label>
              <div className="input-wrap">
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@pharmacy.com"
                  required
                  tabIndex={isRegister ? -1 : 0}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="login-password">Password</label>
              <div className="input-wrap has-toggle">
                <input
                  id="login-password"
                  type={showLoginPw ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  tabIndex={isRegister ? -1 : 0}
                />
                <button
                  type="button"
                  className="toggle-eye"
                  onClick={() => setShowLoginPw((s) => !s)}
                  aria-label={showLoginPw ? "Hide password" : "Show password"}
                  aria-pressed={showLoginPw}
                  tabIndex={isRegister ? -1 : 0}
                >
                  {showLoginPw ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="forgot-row">
              <a href="#forgot">Forgot password?</a>
            </div>

            <button
              type="submit"
              className="btn-primary"
              tabIndex={isRegister ? -1 : 0}
            >
              Sign In
            </button>

            <p className="switch-line">
              New to Pilly?{" "}
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                tabIndex={isRegister ? -1 : 0}
              >
                Register here for a new account
              </button>
            </p>
          </form>

          {/* ---------------- REGISTER ---------------- */}
          <form
            className="auth-form register-form"
            onSubmit={handleRegisterSubmit}
            aria-hidden={!isRegister}
          >
            <div className="brand-row">
              <PillyLogo size={56} showName={false} />
              <h2 className="form-heading">Create Account</h2>
            </div>
            <p className="form-subtitle">Set up your pharmacist account</p>

            <div className="field">
              <label htmlFor="reg-email">Email Address</label>
              <div className="input-wrap">
                <input
                  id="reg-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@pharmacy.com"
                  required
                  tabIndex={isRegister ? 0 : -1}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="reg-password">Password</label>
              <div className="input-wrap has-toggle">
                <input
                  id="reg-password"
                  type={showRegPw ? "text" : "password"}
                  name="password"
                  autoComplete="new-password"
                  placeholder="Create a password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  tabIndex={isRegister ? 0 : -1}
                />
                <button
                  type="button"
                  className="toggle-eye"
                  onClick={() => setShowRegPw((s) => !s)}
                  aria-label={showRegPw ? "Hide password" : "Show password"}
                  aria-pressed={showRegPw}
                  tabIndex={isRegister ? 0 : -1}
                >
                  {showRegPw ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="field">
              <label htmlFor="reg-confirm">Confirm Password</label>
              <div className="input-wrap has-toggle">
                <input
                  id="reg-confirm"
                  type={showRegConfirm ? "text" : "password"}
                  name="confirmPassword"
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={regConfirm}
                  onChange={(e) => setRegConfirm(e.target.value)}
                  className={passwordsMismatch ? "invalid" : ""}
                  aria-invalid={passwordsMismatch}
                  aria-describedby="reg-confirm-error"
                  required
                  tabIndex={isRegister ? 0 : -1}
                />
                <button
                  type="button"
                  className="toggle-eye"
                  onClick={() => setShowRegConfirm((s) => !s)}
                  aria-label={
                    showRegConfirm ? "Hide password" : "Show password"
                  }
                  aria-pressed={showRegConfirm}
                  tabIndex={isRegister ? 0 : -1}
                >
                  {showRegConfirm ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <span id="reg-confirm-error" className="field-error" role="alert">
                {passwordsMismatch ? "Passwords do not match" : ""}
              </span>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={!canRegister}
              tabIndex={isRegister ? 0 : -1}
            >
              Create Account
            </button>

            <p className="switch-line">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                tabIndex={isRegister ? 0 : -1}
              >
                Sign in here.
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
