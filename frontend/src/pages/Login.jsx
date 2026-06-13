import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import PillyLogo from "../components/PillyLogo";
import { loginWithEmail, registerWithEmail } from "../services/authService";
import "./Login.css";

function getVisibleAuthMessage(error, fallbackMessage) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  const trimmed = message.trim();
  return trimmed && trimmed !== "[object Object]" ? trimmed : fallbackMessage;
}

function Login() {
  const navigate = useNavigate();

  // View state: false = login, true = register
  const [isRegister, setIsRegister] = useState(false);

  // Password visibility toggles
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showRegPw, setShowRegPw] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);

  // Register form fields (controlled for real-time match validation)
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regRole, setRegRole] = useState("pharmacist");

  // Login email (controlled so we can persist it on submit)
  const [loginRole, setLoginRole] = useState("pharmacist");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Language toggle (non-functional placeholder)
  const [lang, setLang] = useState("EN");
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const passwordsMismatch = regConfirm.length > 0 && regPassword !== regConfirm;
  const canRegister =
    regName.trim().length > 0 &&
    regPassword.length > 0 &&
    regConfirm.length > 0 &&
    !passwordsMismatch;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthNotice("");
    setAuthLoading(true);

    try {
      const { role } = await loginWithEmail({
        email: loginEmail,
        password: loginPassword,
        expectedRole: loginRole,
      });

      navigate(role === "patient" ? "/patient/app" : "/pharmacist/dashboard");
    } catch (error) {
      setAuthError(
        getVisibleAuthMessage(
          error,
          "Unable to sign in. Please check your email and password."
        )
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!canRegister) return;

    setAuthError("");
    setAuthNotice("");
    setAuthLoading(true);

    try {
      const { role, requiresEmailConfirmation } = await registerWithEmail({
        name: regName,
        email: regEmail,
        password: regPassword,
        role: regRole,
      });

      if (requiresEmailConfirmation) {
        setAuthNotice("Account created. Confirm your email, then sign in.");
        setIsRegister(false);
        setLoginRole(role);
        setLoginEmail(regEmail.trim());
        setLoginPassword("");
        return;
      }

      navigate(role === "patient" ? "/patient/app" : "/pharmacist/dashboard");
    } catch (error) {
      setAuthError(
        getVisibleAuthMessage(
          error,
          "Unable to create account. Please try another email or password."
        )
      );
    } finally {
      setAuthLoading(false);
    }
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

            <div className="field">
              <div className="role-toggle" role="radiogroup" aria-label="Login user type">
                <button
                  type="button"
                  className={loginRole === "pharmacist" ? "active" : ""}
                  onClick={() => setLoginRole("pharmacist")}
                  role="radio"
                  aria-checked={loginRole === "pharmacist"}
                  tabIndex={isRegister ? -1 : 0}
                >
                  Pharmacist
                </button>
                <button
                  type="button"
                  className={loginRole === "patient" ? "active" : ""}
                  onClick={() => setLoginRole("patient")}
                  role="radio"
                  aria-checked={loginRole === "patient"}
                  tabIndex={isRegister ? -1 : 0}
                >
                  Patient
                </button>
              </div>
            </div>

            <div className="field">
              <label htmlFor="login-email">Email Address</label>
              <div className="input-wrap">
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder={
                    loginRole === "patient" ? "you@email.com" : "you@pharmacy.com"
                  }
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
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
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
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
              disabled={authLoading}
            >
              {authLoading ? "Signing In..." : "Sign In"}
            </button>

            {(authError || authNotice) && (
              <p className={authError ? "field-error" : "form-subtitle"} role="alert">
                {authError || authNotice}
              </p>
            )}

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
            <p className="form-subtitle">Set up your Pilly account</p>

            <div className="field">
              <div className="role-toggle" role="radiogroup" aria-label="Registration user type">
                <button
                  type="button"
                  className={regRole === "pharmacist" ? "active" : ""}
                  onClick={() => setRegRole("pharmacist")}
                  role="radio"
                  aria-checked={regRole === "pharmacist"}
                  tabIndex={isRegister ? 0 : -1}
                >
                  Pharmacist
                </button>
                <button
                  type="button"
                  className={regRole === "patient" ? "active" : ""}
                  onClick={() => setRegRole("patient")}
                  role="radio"
                  aria-checked={regRole === "patient"}
                  tabIndex={isRegister ? 0 : -1}
                >
                  Patient
                </button>
              </div>
            </div>

            <div className="field">
              <label htmlFor="reg-name">Full Name</label>
              <div className="input-wrap">
                <input
                  id="reg-name"
                  type="text"
                  name="name"
                  autoComplete="name"
                  placeholder="Tan Wei Ming"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                  tabIndex={isRegister ? 0 : -1}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="reg-email">Email Address</label>
              <div className="input-wrap">
                <input
                  id="reg-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder={regRole === "patient" ? "you@email.com" : "you@pharmacy.com"}
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
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
              disabled={!canRegister || authLoading}
              tabIndex={isRegister ? 0 : -1}
            >
              {authLoading ? "Creating..." : "Create Account"}
            </button>

            {(authError || authNotice) && (
              <p className={authError ? "field-error" : "form-subtitle"} role="alert">
                {authError || authNotice}
              </p>
            )}

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
