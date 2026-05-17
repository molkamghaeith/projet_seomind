import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Download,
  GitPullRequest,
  Pause,
  Play,
} from "lucide-react";

const videoSteps = [
  {
    title: "Connecter les données",
    text: "Le dashboard vérifie Google Analytics, Search Console et le site actif avant d'afficher les métriques.",
    metric: "Sources prêtes",
  },
  {
    title: "Lire les priorités",
    text: "Les actions importantes remontent automatiquement : extrait à améliorer, page à optimiser ou contenu à renforcer.",
    metric: "Priorités détectées",
  },
  {
    title: "Suivre les priorités",
    text: "La synthèse SEO rassemble technique, contenu, visibilité et trafic pour guider les prochaines actions.",
    metric: "Synthèse prête",
  },
  {
    title: "Passer à l'action",
    text: "Une correction IA peut être copiée ou envoyée vers GitHub via une branche et une Pull Request.",
    metric: "PR prête",
  },
];

const S = {
  page: {
    minHeight: "100vh",
    background: "var(--bg-primary)",
    color: "var(--text-primary)",
    padding: "96px 24px 48px",
    fontFamily: "'Segoe UI', sans-serif",
  },
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "18px",
  },
  pageTitle: {
    margin: 0,
    fontSize: "28px",
    fontWeight: "800",
  },
  subtitle: {
    margin: "6px 0 0",
    color: "var(--text-secondary)",
    fontSize: "14px",
    lineHeight: "1.5",
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "9px 12px",
    borderRadius: "999px",
    background: "#eef2ff",
    color: "#4f46e5",
    fontSize: "13px",
    fontWeight: "800",
  },
  actionRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "18px",
  },
  primaryLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "11px 16px",
    borderRadius: "9px",
    background: "var(--accent)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: "800",
    fontSize: "14px",
  },
  secondaryButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "11px 16px",
    borderRadius: "9px",
    border: "1px solid var(--border)",
    background: "var(--bg-secondary)",
    color: "var(--text-primary)",
    fontWeight: "800",
    fontSize: "14px",
    cursor: "pointer",
  },
  videoLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.5fr) minmax(260px, 0.8fr)",
    gap: "18px",
    alignItems: "stretch",
  },
  videoFrame: {
    position: "relative",
    minHeight: "330px",
    borderRadius: "14px",
    overflow: "hidden",
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    border: "1px solid rgba(255,255,255,0.12)",
    padding: "22px",
    color: "#e2e8f0",
  },
  videoTopBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
  },
  videoWindowDots: {
    display: "flex",
    gap: "6px",
  },
  videoDot: {
    width: "9px",
    height: "9px",
    borderRadius: "999px",
    background: "#64748b",
  },
  videoMainGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
  },
  videoPanel: {
    borderRadius: "12px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.1)",
    padding: "16px",
  },
  videoMetric: {
    margin: "8px 0 0",
    fontSize: "34px",
    fontWeight: "900",
    color: "#a5b4fc",
  },
  videoStepList: {
    display: "grid",
    gap: "10px",
  },
  videoStep: {
    width: "100%",
    textAlign: "left",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    padding: "12px",
    background: "var(--bg-primary)",
    color: "var(--text-primary)",
    cursor: "pointer",
  },
  activeVideoStep: {
    borderColor: "#6366f1",
    background: "#eef2ff",
    color: "#312e81",
  },
  videoProgressTrack: {
    height: "7px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    marginTop: "20px",
  },
  videoProgress: {
    height: "100%",
    borderRadius: "999px",
    background: "#818cf8",
    transition: "width 0.3s ease",
  },
  card: {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "18px",
    boxShadow: "var(--card-shadow)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "14px",
    marginBottom: "18px",
  },
  metricCard: {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: "14px",
    padding: "18px",
  },
  metricLabel: {
    margin: 0,
    color: "var(--text-secondary)",
    fontSize: "13px",
    fontWeight: "700",
  },
  metricValue: {
    margin: "8px 0 0",
    color: "var(--text-primary)",
    fontSize: "28px",
    fontWeight: "800",
  },
  trend: {
    display: "inline-flex",
    marginTop: "10px",
    padding: "5px 8px",
    borderRadius: "999px",
    background: "#d1fae5",
    color: "#065f46",
    fontSize: "12px",
    fontWeight: "800",
  },
  sectionHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "16px",
  },
  title: {
    margin: 0,
    color: "var(--text-primary)",
    fontSize: "18px",
    fontWeight: "800",
  },
  sectionHint: {
    margin: "5px 0 0",
    color: "var(--text-secondary)",
    fontSize: "13px",
  },
  setupGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "12px",
  },
  setupItem: {
    background: "var(--bg-primary)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    padding: "14px",
  },
  status: {
    display: "inline-flex",
    padding: "6px 9px",
    borderRadius: "999px",
    background: "#d1fae5",
    color: "#065f46",
    fontSize: "12px",
    fontWeight: "800",
  },
  priorityGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "12px",
  },
  priorityCard: {
    background: "var(--bg-primary)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "16px",
  },
  badge: {
    display: "inline-flex",
    padding: "6px 9px",
    borderRadius: "999px",
    background: "#fee2e2",
    color: "#dc2626",
    fontSize: "12px",
    fontWeight: "800",
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    minWidth: "680px",
    borderCollapse: "collapse",
  },
  th: {
    padding: "12px",
    textAlign: "left",
    borderBottom: "2px solid var(--border)",
    color: "var(--text-secondary)",
    fontSize: "12px",
    textTransform: "uppercase",
  },
  td: {
    padding: "12px",
    borderBottom: "1px solid var(--border)",
    color: "var(--text-primary)",
    fontSize: "14px",
  },
};

function Demo() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const currentVideoStep = videoSteps[activeStep];

  useEffect(() => {
    if (!isPlaying) return undefined;

    const timer = window.setInterval(() => {
      setActiveStep((step) => (step + 1) % videoSteps.length);
    }, 2800);

    return () => window.clearInterval(timer);
  }, [isPlaying]);

  return (
    <div style={S.page}>
      <div style={S.container}>
        <div style={S.topBar}>
          <div>
            <h1 style={S.pageTitle}>Dashboard de démonstration</h1>
            <p style={S.subtitle}>
              Aperçu général du parcours SeoMind avec données d'exemple,
              recommandations IA, suivi SEO et workflow de correction.
            </p>
            </div>
        </div>

        <div style={S.actionRow}>
          <Link to="/register" style={S.primaryLink}>
            <CheckCircle2 size={17} />
            Créer un compte
          </Link>
          <button type="button" style={S.secondaryButton}>
            <Download size={17} />
            Export PDF exemple
          </button>
          <button type="button" style={S.secondaryButton}>
            <GitPullRequest size={17} />
            Pull Request SEO
          </button>
        </div>

        <div style={S.card}>
          <div style={S.sectionHead}>
            <div>
              <h2 style={S.title}>Présentation vidéo du dashboard</h2>
              <p style={S.sectionHint}>
                Une démo animée qui montre le parcours principal sans spécialiser le site dans un secteur.
              </p>
            </div>
            <button
              type="button"
              style={S.secondaryButton}
              onClick={() => setIsPlaying((value) => !value)}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              {isPlaying ? "Pause" : "Lire"}
            </button>
          </div>

          <div style={S.videoLayout}>
            <div style={S.videoFrame}>
              <div style={S.videoTopBar}>
                <div style={S.videoWindowDots}>
                  <span style={{ ...S.videoDot, background: "#ef4444" }} />
                  <span style={{ ...S.videoDot, background: "#f59e0b" }} />
                  <span style={{ ...S.videoDot, background: "#10b981" }} />
                </div>
                <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 800 }}>
                  SEOmind / Dashboard
                </span>
              </div>

              <div style={S.videoMainGrid}>
                <div style={S.videoPanel}>
                  <p style={{ margin: 0, color: "#94a3b8", fontSize: 13 }}>
                    Étape active
                  </p>
                  <h3 style={{ margin: "10px 0 8px", fontSize: 24 }}>
                    {currentVideoStep.title}
                  </h3>
                  <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.55 }}>
                    {currentVideoStep.text}
                  </p>
                  <p style={S.videoMetric}>{currentVideoStep.metric}</p>
                </div>

                <div style={S.videoPanel}>
                  <p style={{ margin: 0, color: "#94a3b8", fontSize: 13 }}>
                    Aperçu dashboard
                  </p>
                  <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                    {[
                      ["Diagnostic SEO", "synthèse prête"],
                      ["Trafic", "à connecter"],
                      ["Extrait à améliorer", "requête prioritaire"],
                      ["GitHub", "branche prête"],
                    ].map(([label, value], index) => (
                      <div
                        key={label}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          padding: "11px 12px",
                          borderRadius: 10,
                          background:
                            index === activeStep
                              ? "rgba(129,140,248,0.24)"
                              : "rgba(255,255,255,0.07)",
                        }}
                      >
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={S.videoProgressTrack}>
                <div
                  style={{
                    ...S.videoProgress,
                    width: `${((activeStep + 1) / videoSteps.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div style={S.videoStepList}>
              {videoSteps.map((step, index) => (
                <button
                  key={step.title}
                  type="button"
                  style={{
                    ...S.videoStep,
                    ...(index === activeStep ? S.activeVideoStep : {}),
                  }}
                  onClick={() => {
                    setActiveStep(index);
                    setIsPlaying(false);
                  }}
                >
                  <strong>{step.title}</strong>
                  <p style={{ margin: "5px 0 0", color: "inherit", opacity: 0.76 }}>
                    {step.metric}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.sectionHead}>
            <div>
              <h2 style={S.title}>État de configuration</h2>
              <p style={S.sectionHint}>Ce que l'utilisateur voit après connexion Google.</p>
            </div>
          </div>
          <div style={S.setupGrid}>
            {["Google connecté", "Analytics actif", "Search Console actif", "Site sélectionné"].map(
              (item) => (
                <div key={item} style={S.setupItem}>
                  <span style={S.status}>Prêt</span>
                  <p style={{ margin: "10px 0 0", fontWeight: 800 }}>{item}</p>
                </div>
              )
            )}
          </div>

        
          
            <div style={S.priorityCard}>
              <span style={{ ...S.status, background: "#d1fae5", color: "#065f46" }}>GitHub prêt</span>
              <h3 style={{ margin: "12px 0 8px", fontSize: 16 }}>Branche proposée</h3>
            </div>
  
        </div>

        </div>
        </div>
    );
}

export default Demo;
