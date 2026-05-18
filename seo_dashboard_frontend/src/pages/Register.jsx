import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import api from "../services/api";
import toast from "react-hot-toast";

const AUTH_FORM_WIDTH = 400;

function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      await api.post("/auth/register/", {
        username,
        email,
        password,
      });

      setUsername("");
      setEmail("");
      setPassword("");
      setIsRegistered(true);
      toast.success(
        "Inscription envoyee. Attendez l'activation par l'administrateur."
      );
    } catch (error) {
      const message =
        error.response?.data?.error || "Erreur lors de l'inscription.";
      setErrorMessage(message);
      toast.error(message);
      setTimeout(() => setErrorMessage(""), 3000);
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
      padding: "16px",
    },
    container: {
      width: "100%",
      maxWidth: "1180px",
      minHeight: "min(680px, calc(100vh - 32px))",
      display: "flex",
      borderRadius: "24px",
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
      padding: "40px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      color: "#fff",
      overflow: "hidden",
    },
    leftAccentLine: {
      position: "absolute",
      inset: "0 auto 0 0",
      width: "8px",
      background: "linear-gradient(180deg, #c4b5fd, rgba(255, 255, 255, 0))",
      opacity: 0.9,
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
    leftContent: {
      position: "relative",
      zIndex: 1,
    },
    leftTitle: {
      fontSize: "clamp(34px, 4vw, 48px)",
      fontWeight: "800",
      margin: "0 0 16px",
      lineHeight: 1.2,
      letterSpacing: "0",
    },
    leftText: {
      maxWidth: "440px",
      fontSize: "16px",
      opacity: 0.92,
      margin: 0,
      lineHeight: 1.55,
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
      padding: "14px",
      borderRadius: "16px",
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
      marginBottom: "9px",
    },
    statNum: {
      fontSize: "21px",
      fontWeight: "800",
      lineHeight: 1,
    },
    statLabel: {
      fontSize: "13px",
      opacity: 0.82,
      marginTop: "6px",
    },
    rightPanel: {
      flex: 1,
      background: "var(--bg-secondary)",
      padding: "34px 52px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    },
    formShell: {
      width: "100%",
      maxWidth: `${AUTH_FORM_WIDTH}px`,
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
      marginBottom: "12px",
    },
    title: {
      fontSize: "32px",
      fontWeight: "800",
      margin: "0 0 8px",
      color: "var(--text-primary)",
      letterSpacing: "0",
    },
    subtitle: {
      fontSize: "16px",
      color: "var(--text-secondary)",
      margin: "0 0 20px",
      lineHeight: 1.45,
    },
    inputGroup: {
      marginBottom: "12px",
    },
    label: {
      display: "block",
      fontSize: "14px",
      fontWeight: "700",
      color: "var(--text-primary)",
      marginBottom: "6px",
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
      padding: "13px 0",
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
      minHeight: "50px",
      padding: "0 18px",
      background: "linear-gradient(135deg, #6366f1, #4f46e5)",
      color: "#fff",
      border: "none",
      borderRadius: "13px",
      fontSize: "16px",
      fontWeight: "800",
      cursor: "pointer",
      transition: "all 0.2s",
      marginTop: "8px",
      boxShadow: "0 16px 30px rgba(79, 70, 229, 0.24)",
    },
    submitBtnDisabled: {
      opacity: 0.7,
      cursor: "not-allowed",
    },
    errorBox: {
      background: "#fee2e2",
      color: "#b91c1c",
      padding: "13px 14px",
      borderRadius: "12px",
      marginBottom: "14px",
      fontSize: "14px",
      border: "1px solid #fecaca",
    },
    successBox: {
      background: "#d1fae5",
      color: "#065f46",
      padding: "16px",
      borderRadius: "14px",
      marginBottom: "16px",
      fontSize: "15px",
      border: "1px solid #a7f3d0",
      lineHeight: 1.6,
    },
    loginLink: {
      textAlign: "center",
      marginTop: "12px",
      fontSize: "15px",
      color: "var(--text-secondary)",
    },
    linkText: {
      color: "#4f46e5",
      textDecoration: "none",
      fontWeight: 700,
    },
  };

  const leftPanel = (
    <div style={styles.leftPanel}>
      <div style={styles.leftAccentLine} />

      <div style={styles.brandBadge}>
        <Sparkles size={16} aria-hidden="true" />
        Assistant SEO intelligent
      </div>

      <div style={styles.leftContent}>
        <h1 style={styles.leftTitle}>
          Rejoignez
          <br />
          SEO<span style={{ color: "#c4b5fd" }}>mind</span>
        </h1>

        <p style={styles.leftText}>
          Créez votre compte, connectez vos données Google et commencez à suivre
          la visibilité de votre site avec des recommandations claires.
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
  );

  if (isRegistered) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          {leftPanel}

          <div style={styles.rightPanel}>
            <div style={styles.formShell}>
              <div style={styles.formBadge}>
                <CheckCircle2 size={15} aria-hidden="true" />
                Demande envoyée
              </div>

              <h2 style={styles.title}>Compte créé</h2>
              <div style={styles.successBox}>
                Votre compte est en attente d'activation par l'administrateur.
                Vous recevrez un email dès qu'il sera activé.
              </div>

              <Link
                to="/login"
                style={{
                  ...styles.submitBtn,
                  textAlign: "center",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                Retour à la connexion
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {leftPanel}

        <div style={styles.rightPanel}>
          <div style={styles.formShell}>
            <div style={styles.formBadge}>
              <UserRound size={15} aria-hidden="true" />
              Nouveau compte
            </div>

            <h2 style={styles.title}>Inscription</h2>
            <p style={styles.subtitle}>
              Créez votre espace SEOmind. Votre compte devra être activé par
              l'administrateur avant la première connexion.
            </p>

            {errorMessage && <div style={styles.errorBox}>{errorMessage}</div>}

            <form onSubmit={handleSubmit} autoComplete="off">
              <div style={styles.inputGroup}>
                <label style={styles.label} htmlFor="username">
                  Nom d'utilisateur
                </label>
                <div style={styles.inputWrapper}>
                  <UserRound
                    size={19}
                    style={styles.inputIcon}
                    aria-hidden="true"
                  />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Choisissez un nom d'utilisateur"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={styles.input}
                    autoComplete="off"
                    required
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label} htmlFor="email">
                  Email
                </label>
                <div style={styles.inputWrapper}>
                  <Mail size={19} style={styles.inputIcon} aria-hidden="true" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Entrez votre adresse email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={styles.input}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label} htmlFor="password">
                  Mot de passe
                </label>
                <div style={styles.inputWrapper}>
                  <LockKeyhole
                    size={19}
                    style={styles.inputIcon}
                    aria-hidden="true"
                  />
                  <input
                    id="password"
                    name="password"
                    type={showPass ? "text" : "password"}
                    placeholder="Créez un mot de passe sécurisé"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={styles.input}
                    autoComplete="new-password"
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
                {isLoading ? "Inscription..." : "S'inscrire"}
              </button>
            </form>

            <div style={styles.loginLink}>
              Déjà un compte ?{" "}
              <Link to="/login" style={styles.linkText}>
                Se connecter
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
