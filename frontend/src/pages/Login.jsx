import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import PillyLogo from "../components/PillyLogo";
import { loginWithEmail, registerWithEmail } from "../services/authService";
import { useTranslation } from "../context/LanguageContext";
import "./Login.css";

function localizeAuthMessage(message, t) {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("invalid login credentials") ||
    normalizedMessage.includes("incorrect email or password")
  ) {
    return t("auth.errors.incorrectCredentials");
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return t("auth.errors.emailNotConfirmed");
  }

  if (
    normalizedMessage.includes("user already registered") ||
    normalizedMessage.includes("already registered") ||
    normalizedMessage.includes("already exists") ||
    normalizedMessage.includes("duplicate key value")
  ) {
    return t("auth.errors.accountExists");
  }

  if (normalizedMessage.includes("please enter your name before creating an account")) {
    return t("auth.errors.nameRequired");
  }

  if (normalizedMessage.includes("supabase profile table is missing or incomplete")) {
    return t("auth.errors.profileSetupMissing");
  }

  const roleMismatchMatch = message.match(
    /This account is registered as a (pharmacist|patient)\. Please switch to the (pharmacist|patient) login tab\./i
  );
  if (roleMismatchMatch) {
    const resolvedRole = roleMismatchMatch[1]?.toLowerCase() === "pharmacist" ? "pharmacist" : "patient";
    return t("auth.errors.roleMismatch", {
      role: t(`auth.roles.${resolvedRole}`),
    });
  }

  return message;
}

function getVisibleAuthMessage(error, fallbackKey, t) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  const trimmed = message.trim();
  if (!trimmed || trimmed === "[object Object]") {
    return t(fallbackKey);
  }

  return localizeAuthMessage(trimmed, t);
}

function Login() {
  const navigate = useNavigate();
  const { language, setLanguage, t, LANGUAGES } = useTranslation();

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

  const languageOptions = LANGUAGES;
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
          "auth.errors.unableToSignIn",
          t
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
        setAuthNotice(t("auth.notices.accountCreatedConfirmEmail"));
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
          "auth.errors.unableToCreateAccount",
          t
        )
      );
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className={`auth-page ${isRegister ? "register-active" : ""}`}>
      <div className="lang-toggle" role="group" aria-label={t("auth.language")}>
        {languageOptions.map((option) => (
          <button
            key={option.code}
            type="button"
            className={language === option.code ? "active" : ""}
            aria-pressed={language === option.code}
            onClick={() => setLanguage(option.code)}
          >
            {option.nativeLabel}
          </button>
        ))}
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
              <div className="role-toggle" role="radiogroup" aria-label={t("auth.loginUserType")}>
                <button
                  type="button"
                  className={loginRole === "pharmacist" ? "active" : ""}
                  onClick={() => setLoginRole("pharmacist")}
                  role="radio"
                  aria-checked={loginRole === "pharmacist"}
                  tabIndex={isRegister ? -1 : 0}
                >
                  {t("auth.roles.pharmacist")}
                </button>
                <button
                  type="button"
                  className={loginRole === "patient" ? "active" : ""}
                  onClick={() => setLoginRole("patient")}
                  role="radio"
                  aria-checked={loginRole === "patient"}
                  tabIndex={isRegister ? -1 : 0}
                >
                  {t("auth.roles.patient")}
                </button>
              </div>
            </div>

            <div className="field">
              <label htmlFor="login-email">{t("auth.email")}</label>
              <div className="input-wrap">
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder={
                    loginRole === "patient" ? t("auth.placeholders.patientEmail") : t("auth.placeholders.pharmacistEmail")
                  }
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  tabIndex={isRegister ? -1 : 0}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="login-password">{t("auth.password")}</label>
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
                  aria-label={showLoginPw ? t("auth.hidePassword") : t("auth.showPassword")}
                  aria-pressed={showLoginPw}
                  tabIndex={isRegister ? -1 : 0}
                >
                  {showLoginPw ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="forgot-row">
              <a href="#forgot">{t("auth.forgotPassword")}</a>
            </div>

            <button
              type="submit"
              className="btn-primary"
              tabIndex={isRegister ? -1 : 0}
              disabled={authLoading}
            >
              {authLoading ? t("auth.signingIn") : t("auth.signIn")}
            </button>

            {(authError || authNotice) && (
              <p className={authError ? "field-error" : "form-subtitle"} role="alert">
                {authError || authNotice}
              </p>
            )}

            <p className="switch-line">
              {t("auth.newToPilly")}{" "}
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                tabIndex={isRegister ? -1 : 0}
              >
                {t("auth.registerHereForNewAccount")}
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
              <h2 className="form-heading">{t("auth.createAccount")}</h2>
            </div>
            <p className="form-subtitle">{t("auth.setupAccount")}</p>

            <div className="field">
              <div className="role-toggle" role="radiogroup" aria-label={t("auth.registrationUserType")}>
                <button
                  type="button"
                  className={regRole === "pharmacist" ? "active" : ""}
                  onClick={() => setRegRole("pharmacist")}
                  role="radio"
                  aria-checked={regRole === "pharmacist"}
                  tabIndex={isRegister ? 0 : -1}
                >
                  {t("auth.roles.pharmacist")}
                </button>
                <button
                  type="button"
                  className={regRole === "patient" ? "active" : ""}
                  onClick={() => setRegRole("patient")}
                  role="radio"
                  aria-checked={regRole === "patient"}
                  tabIndex={isRegister ? 0 : -1}
                >
                  {t("auth.roles.patient")}
                </button>
              </div>
            </div>

            <div className="field">
              <label htmlFor="reg-name">{t("auth.fullName")}</label>
              <div className="input-wrap">
                <input
                  id="reg-name"
                  type="text"
                  name="name"
                  autoComplete="name"
                  placeholder={t("auth.placeholders.fullName")}
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                  tabIndex={isRegister ? 0 : -1}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="reg-email">{t("auth.email")}</label>
              <div className="input-wrap">
                <input
                  id="reg-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder={regRole === "patient" ? t("auth.placeholders.patientEmail") : t("auth.placeholders.pharmacistEmail")}
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                  tabIndex={isRegister ? 0 : -1}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="reg-password">{t("auth.password")}</label>
              <div className="input-wrap has-toggle">
                <input
                  id="reg-password"
                  type={showRegPw ? "text" : "password"}
                  name="password"
                  autoComplete="new-password"
                  placeholder={t("auth.placeholders.createPassword")}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  tabIndex={isRegister ? 0 : -1}
                />
                <button
                  type="button"
                  className="toggle-eye"
                  onClick={() => setShowRegPw((s) => !s)}
                  aria-label={showRegPw ? t("auth.hidePassword") : t("auth.showPassword")}
                  aria-pressed={showRegPw}
                  tabIndex={isRegister ? 0 : -1}
                >
                  {showRegPw ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="field">
              <label htmlFor="reg-confirm">{t("auth.confirmPassword")}</label>
              <div className="input-wrap has-toggle">
                <input
                  id="reg-confirm"
                  type={showRegConfirm ? "text" : "password"}
                  name="confirmPassword"
                  autoComplete="new-password"
                  placeholder={t("auth.placeholders.reenterPassword")}
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
                    showRegConfirm ? t("auth.hidePassword") : t("auth.showPassword")
                  }
                  aria-pressed={showRegConfirm}
                  tabIndex={isRegister ? 0 : -1}
                >
                  {showRegConfirm ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <span id="reg-confirm-error" className="field-error" role="alert">
                {passwordsMismatch ? t("auth.errors.passwordsDoNotMatch") : ""}
              </span>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={!canRegister || authLoading}
              tabIndex={isRegister ? 0 : -1}
            >
              {authLoading ? t("auth.creating") : t("auth.createAccount")}
            </button>

            {(authError || authNotice) && (
              <p className={authError ? "field-error" : "form-subtitle"} role="alert">
                {authError || authNotice}
              </p>
            )}

            <p className="switch-line">
              {t("auth.alreadyHaveAccount")}{" "}
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                tabIndex={isRegister ? 0 : -1}
              >
                {t("auth.signInHere")}
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
