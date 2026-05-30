import { createElement } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  GitPullRequest,
  LineChart,
  Search,
  ShieldCheck,
} from "lucide-react";

const START_KEY = "seomind_started";

const features = [
  {
    icon: BarChart3,
    title: "Google Analytics",
    text: "Suivi des utilisateurs, sessions, pages vues et trafic organique pour comprendre la performance du site.",
  },
  {
    icon: Search,
    title: "Search Console",
    text: "Analyse des clics, impressions, CTR, position moyenne et mots cles qui apportent de la visibilite.",
  },
  {
    icon: BrainCircuit,
    title: "Recommandations IA",
    text: "Generation de conseils SEO clairs pour ameliorer les balises, le contenu, la vitesse et la structure.",
  },
  {
    icon: GitPullRequest,
    title: "Integration GitHub",
    text: "Preparation de corrections et creation de Pull Requests pour appliquer certaines optimisations plus vite.",
  },
];

const steps = [
  "Connecter son compte et autoriser les donnees Google.",
  "Ajouter le site web et choisir la propriete Analytics.",
  "Consulter les indicateurs, le score SEO et les recommandations.",
  "Exporter les rapports ou appliquer les corrections proposees.",
];

const styles = {
  page: {
    minHeight: "100vh",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    background: "#f7f9fc",
    color: "#0f172a",
  },
  hero: {
    minHeight: "100vh",
    position: "relative",
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
    justifyContent: "center",
    background: "#eaf7f5",
  },
  heroBottomPattern: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "170px",
    zIndex: 0,
    opacity: 0.72,
    background:
      "repeating-linear-gradient(90deg, rgba(139, 92, 246, 0.3) 0 2px, transparent 2px 13px)",
    maskImage: "linear-gradient(180deg, transparent 0%, #000 52%, #000 100%)",
    WebkitMaskImage:
      "linear-gradient(180deg, transparent 0%, #000 52%, #000 100%)",
    pointerEvents: "none",
  },
  topNav: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    padding: "16px 20px",
    background: "rgba(247, 249, 252, 0.88)",
    borderBottom: "1px solid rgba(203, 213, 225, 0.72)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
  },
  navInner: {
    width: "min(1120px, 100%)",
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
  navBrand: {
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    color: "#111827",
    textDecoration: "none",
  },
  navLogoMark: {
    width: "42px",
    height: "42px",
    display: "grid",
    placeItems: "center",
    borderRadius: "13px",
    background: "linear-gradient(145deg, #6d5dfc, #3246d3)",
    boxShadow: "0 10px 20px rgba(50, 70, 211, 0.2)",
  },
  navBrandText: {
    margin: 0,
    fontSize: "28px",
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: "0",
  },
  navActions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  navButton: {
    minHeight: "42px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 18px",
    borderRadius: "10px",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 850,
  },
  loginButton: {
    border: "1px solid #cbd5e1",
    background: "rgba(255, 255, 255, 0.82)",
    color: "#1e293b",
  },
  registerButton: {
    border: "1px solid #4f46e5",
    background: "#4f46e5",
    color: "#ffffff",
    boxShadow: "0 12px 24px rgba(79, 70, 229, 0.22)",
  },
  heroInner: {
    width: "min(1180px, calc(100% - 40px))",
    margin: "0 auto",
    padding: "132px 0 84px",
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  topLine: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    minHeight: "34px",
    padding: "0 12px",
    border: "1px solid #dbe3ef",
    borderRadius: "999px",
    background: "rgba(255, 255, 255, 0.76)",
    color: "#475569",
    fontSize: "14px",
    fontWeight: 700,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginTop: "24px",
    marginBottom: "22px",
  },
  logoMark: {
    width: "58px",
    height: "58px",
    display: "grid",
    placeItems: "center",
    borderRadius: "18px",
    background: "linear-gradient(145deg, #6d5dfc, #3246d3)",
    boxShadow: "0 18px 34px rgba(50, 70, 211, 0.26)",
  },
  brandText: {
    margin: 0,
    fontSize: "clamp(42px, 8vw, 70px)",
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: "0",
    color: "#111827",
  },
  brandAccent: {
    color: "#5b63f1",
  },
  title: {
    maxWidth: "860px",
    margin: 0,
    fontSize: "clamp(34px, 5vw, 72px)",
    lineHeight: 1.08,
    fontWeight: 900,
    letterSpacing: "0",
    color: "#0f172a",
  },
  description: {
    maxWidth: "680px",
    margin: "20px 0 0",
    fontSize: "clamp(16px, 1.7vw, 20px)",
    lineHeight: 1.55,
    color: "#1f2937",
    fontWeight: 500,
  },
  primaryButton: {
    minHeight: "52px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "0 24px",
    borderRadius: "10px",
    background: "#4f46e5",
    color: "#ffffff",
    textDecoration: "none",
    fontSize: "16px",
    fontWeight: 850,
    boxShadow: "0 16px 32px rgba(79, 70, 229, 0.28)",
  },
  section: {
    padding: "76px 20px",
    background: "#ffffff",
  },
  sectionAlt: {
    padding: "76px 20px",
    background: "#eef4fb",
  },
  sectionInner: {
    width: "min(1120px, 100%)",
    margin: "0 auto",
  },
  sectionHeader: {
    maxWidth: "740px",
    marginBottom: "34px",
  },
  eyebrow: {
    margin: "0 0 10px",
    color: "#4f46e5",
    fontSize: "13px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0",
  },
  sectionTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "clamp(26px, 4vw, 38px)",
    lineHeight: 1.16,
    fontWeight: 900,
    letterSpacing: "0",
  },
  sectionText: {
    margin: "14px 0 0",
    color: "#64748b",
    fontSize: "17px",
    lineHeight: 1.7,
    fontWeight: 500,
  },
  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "16px",
  },
  featureCard: {
    minHeight: "222px",
    padding: "22px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    background: "#ffffff",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
  },
  iconBox: {
    width: "44px",
    height: "44px",
    display: "grid",
    placeItems: "center",
    borderRadius: "8px",
    background: "#eef2ff",
    color: "#4f46e5",
    marginBottom: "18px",
  },
  cardTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "18px",
    fontWeight: 900,
  },
  cardText: {
    margin: "10px 0 0",
    color: "#64748b",
    fontSize: "14px",
    lineHeight: 1.65,
    fontWeight: 500,
  },
  split: {
    display: "grid",
    gridTemplateColumns: "0.95fr 1.05fr",
    gap: "34px",
    alignItems: "center",
  },
  workflow: {
    display: "grid",
    gap: "14px",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  workflowItem: {
    display: "grid",
    gridTemplateColumns: "42px 1fr",
    gap: "14px",
    alignItems: "start",
    padding: "18px",
    border: "1px solid #dbe3ef",
    borderRadius: "8px",
    background: "#ffffff",
  },
  stepNumber: {
    width: "42px",
    height: "42px",
    display: "grid",
    placeItems: "center",
    borderRadius: "8px",
    background: "#0f172a",
    color: "#ffffff",
    fontWeight: 900,
  },
  stepText: {
    margin: 0,
    color: "#334155",
    fontSize: "16px",
    lineHeight: 1.55,
    fontWeight: 700,
  },
  insightPanel: {
    padding: "28px",
    borderRadius: "8px",
    background: "#0f172a",
    color: "#ffffff",
    boxShadow: "0 22px 46px rgba(15, 23, 42, 0.2)",
  },
  insightHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "24px",
  },
  insightTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 900,
  },
  scoreRow: {
    display: "grid",
    gridTemplateColumns: "96px 1fr",
    gap: "20px",
    alignItems: "center",
    marginBottom: "22px",
  },
  scoreCircle: {
    width: "96px",
    height: "96px",
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    border: "10px solid #22c55e",
    color: "#ffffff",
  },
  insightCopy: {
    margin: 0,
    color: "#cbd5e1",
    fontSize: "15px",
    lineHeight: 1.65,
    fontWeight: 500,
  },
  checklist: {
    display: "grid",
    gap: "12px",
    margin: "20px 0 0",
    padding: 0,
    listStyle: "none",
  },
  checklistItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "#e2e8f0",
    fontSize: "14px",
    fontWeight: 700,
  },
  cta: {
    padding: "70px 20px",
    background: "#ffffff",
  },
  ctaInner: {
    width: "min(1120px, 100%)",
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "22px",
    padding: "34px",
    border: "1px solid #dbe3ef",
    borderRadius: "8px",
    background: "#f8fafc",
  },
  ctaTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "28px",
    lineHeight: 1.2,
    fontWeight: 900,
  },
  ctaText: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: "16px",
    lineHeight: 1.55,
    fontWeight: 500,
  },
};

export default function Home() {
  const handleStart = () => {
    sessionStorage.setItem(START_KEY, "true");
  };

  return (
    <main style={styles.page}>
      <style>
        {`
          @media (max-width: 980px) {
            .home-hero {
              min-height: 100vh !important;
            }

            .home-feature-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }

            .home-split {
              grid-template-columns: 1fr !important;
            }
          }

          @media (max-width: 640px) {
            .home-hero {
              min-height: auto !important;
            }

            .home-hero-inner {
              width: min(100% - 28px, 1120px) !important;
              padding: 112px 0 56px !important;
            }

            .home-brand {
              align-items: flex-start !important;
              flex-direction: column !important;
              gap: 12px !important;
            }

            .home-cta-inner {
              align-items: stretch !important;
              flex-direction: column !important;
            }

            .home-cta-inner a {
              width: 100% !important;
            }

            .home-feature-grid {
              grid-template-columns: 1fr !important;
            }

            .home-top-nav {
              padding: 16px 14px !important;
            }

            .home-top-nav-inner {
              gap: 10px !important;
            }

            .home-nav-brand-text {
              font-size: 22px !important;
            }

            .home-nav-logo {
              width: 36px !important;
              height: 36px !important;
            }

            .home-nav-actions {
              gap: 8px !important;
            }

            .home-nav-actions a {
              min-height: 38px !important;
              padding: 0 12px !important;
              font-size: 13px !important;
            }

            .home-hero-bottom-pattern {
              height: 130px !important;
            }

            .home-section,
            .home-section-alt,
            .home-cta {
              padding: 52px 16px !important;
            }

            .home-score-row {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>

      <section className="home-hero" style={styles.hero} aria-label="Accueil SEOMIND">
        <div className="home-hero-bottom-pattern" style={styles.heroBottomPattern} aria-hidden="true" />

        <header className="home-top-nav" style={styles.topNav}>
          <nav className="home-top-nav-inner" style={styles.navInner} aria-label="Acces rapides">
            <Link to="/" style={styles.navBrand} aria-label="Accueil SEOMIND">
              <span className="home-nav-logo" style={styles.navLogoMark} aria-hidden="true">
                <Search size={24} color="#ffffff" strokeWidth={2.8} />
              </span>
              <span className="home-nav-brand-text" style={styles.navBrandText}>
                SEO<span style={styles.brandAccent}>MIND</span>
              </span>
            </Link>

            <div className="home-nav-actions" style={styles.navActions}>
              <Link
                to="/register"
                style={{ ...styles.navButton, ...styles.registerButton }}
                onClick={handleStart}
              >
                Inscription
              </Link>
              <Link
                to="/login"
                style={{ ...styles.navButton, ...styles.loginButton }}
                onClick={handleStart}
              >
                Connexion
              </Link>
            </div>
          </nav>
        </header>

        <div className="home-hero-inner" style={styles.heroInner}>
          <h1 style={styles.title}>
            Donnez plus de visibilite a votre site.
          </h1>

          <p style={styles.description}>
            SeoMind transforme vos donnees SEO en indicateurs clairs, recommandations utiles et actions faciles a suivre.
          </p>

        </div>
      </section>

      <section className="home-section" style={styles.section}>
        <div style={styles.sectionInner}>
          <div style={styles.sectionHeader}>
            <p style={styles.eyebrow}>Fonctionnalites</p>
            <h2 style={styles.sectionTitle}>
              Une vue claire sur les donnees qui comptent pour le referencement.
            </h2>
            <p style={styles.sectionText}>
              La page dashboard rassemble les indicateurs essentiels pour suivre l'evolution du site, comprendre les problemes et prioriser les actions.
            </p>
          </div>

          <div className="home-feature-grid" style={styles.featureGrid}>
            {features.map((feature) => (
              <article key={feature.title} style={styles.featureCard}>
                <div style={styles.iconBox} aria-hidden="true">
                  {createElement(feature.icon, { size: 23 })}
                </div>
                <h3 style={styles.cardTitle}>{feature.title}</h3>
                <p style={styles.cardText}>{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section-alt" style={styles.sectionAlt}>
        <div className="home-split" style={{ ...styles.sectionInner, ...styles.split }}>
          <div>
            <p style={styles.eyebrow}>Parcours utilisateur</p>
            <h2 style={styles.sectionTitle}>
              De la connexion au rapport SEO en quelques etapes.
            </h2>
            <p style={styles.sectionText}>
              Le flux est pense pour un utilisateur qui veut connecter un site, lire rapidement les resultats et passer a l'action sans manipulations techniques complexes.
            </p>
          </div>

          <ol style={styles.workflow}>
            {steps.map((step, index) => (
              <li key={step} style={styles.workflowItem}>
                <span style={styles.stepNumber}>{index + 1}</span>
                <p style={styles.stepText}>{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="home-section" style={styles.section}>
        <div className="home-split" style={{ ...styles.sectionInner, ...styles.split }}>
          <div style={styles.insightPanel}>
            <div style={styles.insightHeader}>
              <ShieldCheck size={28} color="#93c5fd" aria-hidden="true" />
              <h2 style={styles.insightTitle}>Synthese SEO</h2>
            </div>

            <div className="home-score-row" style={styles.scoreRow}>
              <div style={styles.scoreCircle} aria-hidden="true">
                <LineChart size={34} color="#22c55e" strokeWidth={2.8} />
              </div>
              <p style={styles.insightCopy}>
                Exemple de score centralise combinant donnees Analytics, Search Console, contenu, vitesse et signaux techniques.
              </p>
            </div>

            <ul style={styles.checklist}>
              {[
                "Pages les plus consultees",
                "Trafic organique et tendance",
                "Mots cles performants",
                "Export CSV et rapport PDF",
              ].map((item) => (
                <li key={item} style={styles.checklistItem}>
                  <CheckCircle2 size={18} color="#22c55e" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p style={styles.eyebrow}>Resultats</p>
            <h2 style={styles.sectionTitle}>
              Des recommandations directement reliees aux donnees du site.
            </h2>
            <p style={styles.sectionText}>
              SeoMind aide a reperer les points faibles : titres, meta descriptions, contenu, maillage interne, performance et presence dans les resultats Google.
            </p>
            <p style={styles.sectionText}>
              L'objectif est simple : donner une lecture rapide au proprietaire du site et fournir des pistes concretes pour ameliorer le referencement.
            </p>
          </div>
        </div>
      </section>

      <section className="home-cta" style={styles.cta}>
        <div className="home-cta-inner" style={styles.ctaInner}>
          <div>
            <h2 style={styles.ctaTitle}>Pret a analyser un site avec SeoMind ?</h2>
            <p style={styles.ctaText}>
              Connectez-vous, ajoutez votre site et commencez a suivre vos donnees SEO depuis le dashboard.
            </p>
          </div>
          <Link to="/login" style={styles.primaryButton} onClick={handleStart}>
            Commencer maintenant
            <ArrowRight size={19} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
