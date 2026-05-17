import { useEffect, useState } from "react";

const GITHUB_CONNECTED_MESSAGE = "SEOMIND_GITHUB_CONNECTED";
const GITHUB_CONNECTED_STORAGE_KEY = "seomind_github_connected_at";

function GitHubConnected() {
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    const payload = { type: GITHUB_CONNECTED_MESSAGE };

    localStorage.setItem(GITHUB_CONNECTED_STORAGE_KEY, String(Date.now()));

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(payload, window.location.origin);
    }

    const timer = window.setTimeout(() => {
      window.close();
      setCanClose(true);
    }, 350);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <div>
        <h1 style={{ marginBottom: "12px", fontSize: "24px" }}>
          Synchronisation GitHub...
        </h1>
        <p style={{ color: "var(--text-secondary)", margin: 0 }}>
          {canClose
            ? "GitHub est connecté. Vous pouvez fermer cette fenêtre."
            : "Connexion terminée, retour à la page IA SEO."}
        </p>
      </div>
    </div>
  );
}

export default GitHubConnected;
