import { Link } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";

const START_KEY = "seomind_started";

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    background: "#ffffff",
    color: "#111827",
    overflow: "hidden",
  },
  panel: {
    width: "100%",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "40px 24px",
    background:
      "radial-gradient(circle at 18% 82%, rgba(124, 58, 237, 0.28), transparent 34%), radial-gradient(circle at 92% 64%, rgba(99, 102, 241, 0.22), transparent 28%), linear-gradient(180deg, #ffffff 0%, #fbfaff 58%, #f2ecff 100%)",
    boxShadow: "inset 0 -24px 48px rgba(99, 102, 241, 0.16)",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "14px",
    marginBottom: "28px",
  },
  logoMark: {
    width: "54px",
    height: "54px",
    display: "grid",
    placeItems: "center",
    borderRadius: "16px 16px 22px 22px",
    background: "linear-gradient(145deg, #8b5cf6, #4f46e5)",
    boxShadow: "0 14px 30px rgba(79, 70, 229, 0.26)",
  },
  brandText: {
    margin: 0,
    fontSize: "clamp(34px, 8vw, 48px)",
    lineHeight: 1,
    fontWeight: 850,
    letterSpacing: "0",
    color: "#111827",
  },
  brandAccent: {
    color: "#6366f1",
  },
  title: {
    margin: 0,
    maxWidth: "520px",
    fontSize: "clamp(20px, 4.5vw, 28px)",
    lineHeight: 1.45,
    fontWeight: 800,
    color: "#111827",
  },
  button: {
    marginTop: "34px",
    minHeight: "52px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "0 28px",
    borderRadius: "10px",
    background: "#6366f1",
    color: "#ffffff",
    textDecoration: "none",
    fontSize: "16px",
    fontWeight: 800,
    boxShadow: "0 14px 30px rgba(99, 102, 241, 0.3)",
  },
};

export default function Home() {
  const handleStart = () => {
    sessionStorage.setItem(START_KEY, "true");
  };

  return (
    <main style={styles.page}>
      <section style={styles.panel} aria-label="Accueil SEOMIND">
        <div style={styles.brand}>
          <div style={styles.logoMark} aria-hidden="true">
            <Search size={31} color="#ffffff" strokeWidth={2.8} />
          </div>
          <h1 style={styles.brandText}>
            SEO<span style={styles.brandAccent}>MIND</span>
          </h1>
        </div>

        <h2 style={styles.title}>
          Votre assistant SEO intelligent
          <br />
          pour plus de visibilit&eacute;
        </h2>

        <Link to="/login" style={styles.button} onClick={handleStart}>
          Commencer
          <ArrowRight size={19} aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}
