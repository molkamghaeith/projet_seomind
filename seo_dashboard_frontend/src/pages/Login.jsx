import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BarChart3, BrainCircuit, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import api from "../services/api";
import toast from "react-hot-toast";

const START_KEY = "seomind_started";
const SELECTED_SITE_STORAGE_KEY = "selected_dashboard_site_id";
const SELECTED_SITE_URL_STORAGE_KEY = "selected_dashboard_site_url";
const SELECTED_SITE_NAME_STORAGE_KEY = "selected_dashboard_site_name";
const LEGACY_AI_SITE_STORAGE_KEY = "selected_ai_site_id";
const AI_PAGE_CACHE_KEY = "ai_recommendations_page_cache";

const clearSelectedSiteStorage = () => {
  localStorage.removeItem(SELECTED_SITE_STORAGE_KEY);
  localStorage.removeItem(SELECTED_SITE_URL_STORAGE_KEY);
  localStorage.removeItem(SELECTED_SITE_NAME_STORAGE_KEY);
  localStorage.removeItem(LEGACY_AI_SITE_STORAGE_KEY);
  sessionStorage.removeItem(SELECTED_SITE_STORAGE_KEY);
  sessionStorage.removeItem(SELECTED_SITE_URL_STORAGE_KEY);
  sessionStorage.removeItem(SELECTED_SITE_NAME_STORAGE_KEY);
  sessionStorage.removeItem(LEGACY_AI_SITE_STORAGE_KEY);
  sessionStorage.removeItem(AI_PAGE_CACHE_KEY);
};

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showActivationInfo, setShowActivationInfo] = useState(false);

  const googleBtnRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const hasStarted = sessionStorage.getItem(START_KEY) === "true";
    const isAuthenticated = Boolean(localStorage.getItem("access"));

    if (!hasStarted && !isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };

  const handleGoogleResponse = useCallback(async (response) => {
    setIsLoading(true);
    setShowActivationInfo(false);

    try {
      const res = await api.post("/auth/google/", {
        credential: response.credential,
      });

      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      clearSelectedSiteStorage();

      setEmail("");
      setPassword("");
      setErrorMessage("");
      toast.success("Connexion Google réussie");
      try {
        const gaRes = await api.get("/google-analytics/login/", {
          headers: {
            Authorization: `Bearer ${res.data.access}`,
          },
        });
        window.location.href = gaRes.data.auth_url;
      } catch (gaError) {
        console.error(gaError);
        navigate("/dashboard");
      }
    } catch (error) {
      console.error(error);
      const errorMsg =
        error.response?.data?.error || "Erreur lors de la connexion Google.";

      setErrorMessage(errorMsg);
      setShowActivationInfo(errorMsg.includes("attente d'activation"));
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const renderGoogleButton = () => {
      if (!window.google || !googleBtnRef.current) return false;

      googleBtnRef.current.innerHTML = "";

      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });

      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: 360,
        text: "continue_with",
        shape: "rectangular",
      });

      return true;
    };

    if (renderGoogleButton()) return undefined;

    const intervalId = window.setInterval(() => {
      if (renderGoogleButton()) {
        window.clearInterval(intervalId);
      }
    }, 300);

    return () => window.clearInterval(intervalId);
  }, [handleGoogleResponse]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsLoading(true);
    setShowActivationInfo(false);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setErrorMessage("Email non valide.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.post("/auth/login/", {
        username: email,
        password,
      });

      localStorage.setItem("access", response.data.access);
      localStorage.setItem("refresh", response.data.refresh);
      clearSelectedSiteStorage();

      setEmail("");
      setPassword("");
      setErrorMessage("");
      toast.success("Connexion reussie");
      navigate("/dashboard");
    } catch (error) {
      const errorMsg =
        error.response?.data?.detail ||
        error.response?.data?.error ||
        "Erreur de connexion.";

      if (errorMsg.includes("attente d'activation")) {
        setErrorMessage(
          "Votre compte est en attente d'activation par l'administrateur."
        );
        setShowActivationInfo(true);
      } else {
        setErrorMessage("Email ou mot de passe incorrect.");
        setShowActivationInfo(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const styles = {
    page: {
      minHeight: "100vh",
      background:
        "linear-gradient(135deg, #f8fafc 0%, #eef2ff 52%, #f8fafc 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Segoe UI', sans-serif",
      padding: "28px",
    },
    container: {
      width: "100%",
      maxWidth: "1180px",
      minHeight: "720px",
      display: "flex",
      borderRadius: "30px",
      overflow: "hidden",
      background: "#ffffff",
      border: "1px solid rgba(226, 232, 240, 0.9)",
      boxShadow: "0 30px 90px rgba(15, 23, 42, 0.12)",
    },
    leftPanel: {
      flex: "0 0 48%",
      position: "relative",
      background:
        "linear-gradient(145deg, #4f46e5 0%, #6366f1 48%, #7c3aed 100%)",
      padding: "58px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      color: "#fff",
      overflow: "hidden",
    },
    brandBadge: {
      position: "relative",
      zIndex: 1,
      width: "fit-content",
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      padding: "10px 14px",
      border: "1px solid rgba(255, 255, 255, 0.24)",
      borderRadius: "999px",
      background: "rgba(255, 255, 255, 0.12)",
      fontSize: "13px",
      fontWeight: 700,
      letterSpacing: "0",
    },
    leftAccentLine: {
      position: "absolute",
      inset: "0 auto 0 0",
      width: "8px",
      background: "linear-gradient(180deg, #c4b5fd, rgba(255, 255, 255, 0))",
      opacity: 0.9,
    },
    leftContent: {
      position: "relative",
      zIndex: 1,
    },
    leftTitle: {
      fontSize: "clamp(42px, 5vw, 58px)",
      fontWeight: "800",
      margin: "0 0 22px",
      lineHeight: 1.2,
      letterSpacing: "0",
    },
    leftText: {
      maxWidth: "430px",
      fontSize: "18px",
      opacity: 0.92,
      margin: 0,
      lineHeight: 1.7,
    },
    leftStats: {
      position: "relative",
      zIndex: 1,
      display: "flex",
      gap: "14px",
      flexWrap: "wrap",
    },
    statBox: {
      minWidth: "132px",
      padding: "18px",
      borderRadius: "18px",
      background: "rgba(255, 255, 255, 0.13)",
      border: "1px solid rgba(255, 255, 255, 0.18)",
      backdropFilter: "blur(10px)",
    },
    statIcon: {
      width: "34px",
      height: "34px",
      display: "grid",
      placeItems: "center",
      borderRadius: "11px",
      background: "rgba(255, 255, 255, 0.18)",
      marginBottom: "12px",
    },
    statNum: {
      fontSize: "24px",
      fontWeight: "800",
      lineHeight: 1,
    },
    statLabel: {
      fontSize: "13px",
      opacity: 0.82,
      marginTop: "8px",
    },
    rightPanel: {
      flex: "1",
      background: "var(--bg-secondary)",
      padding: "62px 58px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    },
    formShell: {
      width: "100%",
      maxWidth: "520px",
      margin: "0 auto",
    },
    formBadge: {
      width: "fit-content",
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 12px",
      borderRadius: "999px",
      background: "rgba(99, 102, 241, 0.1)",
      color: "#4f46e5",
      fontSize: "13px",
      fontWeight: 700,
      marginBottom: "18px",
    },
    title: {
      fontSize: "38px",
      fontWeight: "800",
      margin: "0 0 10px",
      color: "var(--text-primary)",
      letterSpacing: "0",
    },
    subtitle: {
      fontSize: "16px",
      color: "var(--text-secondary)",
      margin: "0 0 34px",
      lineHeight: 1.6,
    },
    inputGroup: {
      marginBottom: "18px",
    },
    label: {
      display: "block",
      fontSize: "14px",
      fontWeight: "700",
      color: "var(--text-primary)",
      marginBottom: "8px",
    },
    inputWrapper: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      border: "1px solid #dbe3ee",
      borderRadius: "14px",
      padding: "0 14px",
      transition: "all 0.2s",
      background: "#f8fafc",
      boxShadow: "0 1px 0 rgba(15, 23, 42, 0.02)",
    },
    inputIcon: {
      color: "#64748b",
      flex: "0 0 auto",
    },
    input: {
      flex: 1,
      border: "none",
      outline: "none",
      padding: "17px 0",
      fontSize: "16px",
      background: "transparent",
      color: "var(--text-primary)",
    },
    eyeBtn: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "8px 4px",
      display: "flex",
      alignItems: "center",
      color: "#64748b",
    },
    submitBtn: {
      width: "100%",
      minHeight: "58px",
      padding: "0 18px",
      background: "linear-gradient(135deg, #6366f1, #4f46e5)",
      color: "#fff",
      border: "none",
      borderRadius: "15px",
      fontSize: "16px",
      fontWeight: "800",
      cursor: "pointer",
      transition: "all 0.2s",
      marginTop: "14px",
      boxShadow: "0 16px 30px rgba(79, 70, 229, 0.24)",
    },
    submitBtnDisabled: {
      opacity: 0.7,
      cursor: "not-allowed",
    },
    divider: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      margin: "26px 0 22px",
    },
    dividerLine: {
      flex: 1,
      height: "1px",
      background: "#e2e8f0",
    },
    dividerText: {
      fontSize: "13px",
      color: "var(--text-secondary)",
      fontWeight: 600,
    },
    errorBox: {
      background: "#fee2e2",
      color: "#b91c1c",
      padding: "13px 14px",
      borderRadius: "12px",
      marginBottom: "20px",
      fontSize: "14px",
      border: "1px solid #fecaca",
    },
    activationBox: {
      background: "#fef3c7",
      color: "#92400e",
      padding: "13px 14px",
      borderRadius: "12px",
      marginBottom: "20px",
      fontSize: "14px",
      border: "1px solid #fde68a",
    },
    forgotLink: {
      textAlign: "center",
      marginTop: "18px",
      fontSize: "15px",
    },
    linkText: {
      color: "#4f46e5",
      textDecoration: "none",
      fontWeight: 700,
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.leftPanel}>
          <div style={styles.leftAccentLine} />

          <div style={styles.brandBadge}>
            <Sparkles size={16} aria-hidden="true" />
            Assistant SEO intelligent
          </div>

          <div style={styles.leftContent}>
            <h1 style={styles.leftTitle}>
              Bienvenue sur
              <br />
              SEO<span style={{ color: "#c4b5fd" }}>mind</span>
            </h1>

            <p style={styles.leftText}>
              Connectez-vous pour accéder à votre dashboard, suivre vos données
              SEO et prioriser les actions qui comptent.
            </p>
          </div>

          <div style={styles.leftStats}>
            {[
              { num: "GA4", label: "Analytics", icon: BarChart3 },
              { num: "GSC", label: "Search Console", icon: ShieldCheck },
              { num: "IA", label: "Recommandations", icon: BrainCircuit },
            ].map(({ num, label, icon: Icon }) => (
              <div key={num} style={styles.statBox}>
                <div style={styles.statIcon}>
                  <Icon size={18} aria-hidden="true" />
                </div>
                <div style={styles.statNum}>{num}</div>
                <div style={styles.statLabel}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.rightPanel}>
          <div style={styles.formShell}>
            <div style={styles.formBadge}>
              <LockKeyhole size={15} aria-hidden="true" />
              Espace sécurisé
            </div>

            <h2 style={styles.title}>Connexion</h2>
            <p style={styles.subtitle}>
              Accédez à votre espace SEOmind et reprenez votre analyse là où
              vous l'avez laissée.
            </p>

          {showActivationInfo && (
            <div style={styles.activationBox}>
              Votre compte est en attente d'activation. Vous recevrez un email.
            </div>
          )}

          {errorMessage && !showActivationInfo && (
            <div style={styles.errorBox}>{errorMessage}</div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off">
            <div style={styles.inputGroup}>
              <label style={styles.label} htmlFor="login-email">
                Email
              </label>

              <div style={styles.inputWrapper}>
                <Mail size={19} style={styles.inputIcon} aria-hidden="true" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  placeholder="Entrez votre email"
                  value={email}
                  onChange={handleEmailChange}
                  style={styles.input}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label} htmlFor="login-password">
                Mot de passe
              </label>

              <div style={styles.inputWrapper}>
                <LockKeyhole
                  size={19}
                  style={styles.inputIcon}
                  aria-hidden="true"
                />
                <input
                  id="login-password"
                  name="password"
                  type={showPass ? "text" : "password"}
                  placeholder="Entrez votre mot de passe"
                  value={password}
                  onChange={handlePasswordChange}
                  style={styles.input}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={styles.eyeBtn}
                  aria-label={
                    showPass
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                >
                  {showPass ? (
                    <EyeOff size={19} aria-hidden="true" />
                  ) : (
                    <Eye size={19} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              style={{
                ...styles.submitBtn,
                ...(isLoading ? styles.submitBtnDisabled : {}),
              }}
              disabled={isLoading}
            >
              {isLoading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>ou</span>
            <div style={styles.dividerLine} />
          </div>

          <div
            ref={googleBtnRef}
            style={{ display: "flex", justifyContent: "center" }}
          />

          <div style={styles.forgotLink}>
            <Link to="/forgot-password" style={styles.linkText}>
              Mot de passe oublié ?
            </Link>
          </div>

          <div style={styles.forgotLink}>
            Pas de compte ?{" "}
            <Link to="/register" style={styles.linkText}>
              S'inscrire
            </Link>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
