import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await api.post("/auth/forgot-password/", { email });

      setIsSent(true);

      toast.success(res.data.message || "Email de réinitialisation envoyé.", {
        duration: 3500,
      });
    } catch (error) {
      console.error(error);

      toast.error(
        error.response?.data?.error || "Erreur lors de l'envoi du mail.",
        {
          duration: 3500,
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const styles = {
    page: {
      minHeight: "100vh",
      background:
        "linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Segoe UI', sans-serif",
      padding: "20px",
    },
    card: {
      width: "100%",
      maxWidth: "450px",
      background: "var(--bg-secondary)",
      borderRadius: "20px",
      padding: "40px",
      boxShadow: "var(--card-shadow)",
      textAlign: "center",
    },
    title: {
      fontSize: "28px",
      fontWeight: "bold",
      marginBottom: "12px",
      color: "var(--text-primary)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
    },
    subtitle: {
      color: "var(--text-secondary)",
      marginBottom: "28px",
      fontSize: "14px",
      lineHeight: "1.5",
    },
    inputWrapper: {
      display: "flex",
      alignItems: "center",
      border: "1px solid var(--border)",
      borderRadius: "12px",
      padding: "0 16px",
      marginBottom: "20px",
      background: "var(--bg-primary)",
      transition: "all 0.2s",
    },
    inputIcon: {
      color: "var(--text-secondary)",
      marginRight: "12px",
      display: "flex",
      alignItems: "center",
    },
    input: {
      flex: 1,
      border: "none",
      outline: "none",
      padding: "14px 0",
      fontSize: "15px",
      background: "transparent",
      color: "var(--text-primary)",
    },
    button: {
      width: "100%",
      background: "var(--accent)",
      color: "#fff",
      border: "none",
      padding: "14px",
      borderRadius: "12px",
      fontSize: "16px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.2s",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
    },
    buttonDisabled: {
      opacity: 0.7,
      cursor: "not-allowed",
    },
    backLink: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      marginTop: "24px",
      color: "var(--accent)",
      textDecoration: "none",
      fontSize: "14px",
      transition: "color 0.2s",
    },
    successBox: {
      background: "#d1fae5",
      color: "#065f46",
      padding: "14px",
      borderRadius: "12px",
      marginBottom: "20px",
      fontSize: "14px",
      textAlign: "center",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      lineHeight: "1.5",
    },
    emailText: {
      fontWeight: "700",
      wordBreak: "break-word",
    },
  };

  if (isSent) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.title}>
            <span>📧</span> Email envoyé
          </div>

          <div style={styles.successBox}>
            ✉️ Un lien de réinitialisation a été envoyé à{" "}
            <span style={styles.emailText}>{email}</span>
          </div>

          <p style={styles.subtitle}>
            Vérifiez votre boîte de réception, puis cliquez sur le lien reçu
            pour changer votre mot de passe.
          </p>

          <Link to="/login" style={styles.backLink}>
            ← Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.title}>
          <span>🔐</span> Mot de passe oublié
        </div>

        <p style={styles.subtitle}>
          Entrez votre adresse email et nous vous enverrons un lien pour
          réinitialiser votre mot de passe.
        </p>

        <form onSubmit={handleSubmit} autoComplete="off">
          <div style={styles.inputWrapper}>
            <div style={styles.inputIcon}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>

            <input
              style={styles.input}
              type="email"
              name="email"
              placeholder="Entrez votre adresse email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <button
            type="submit"
            style={{
              ...styles.button,
              ...(isLoading ? styles.buttonDisabled : {}),
            }}
            disabled={isLoading}
          >
            {isLoading ? "Envoi en cours..." : "Envoyer le lien"}
          </button>
        </form>

        <Link to="/login" style={styles.backLink}>
          ← Retour à la connexion
        </Link>
      </div>
    </div>
  );
}

export default ForgotPassword;