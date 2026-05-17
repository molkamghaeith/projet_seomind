import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { LoaderCircle, Sparkles } from "lucide-react";
import api from "../services/api";
import { theme } from "../styles/theme";

const runningAnalyses = new Map();
const MIN_LOADING_TIME = 1400;

const getAuthHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("access")}`,
});

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const buildAnalysisKey = (site) =>
  site?.request_id || `${site?.url || ""}-${site?.property_id || ""}`;

const runSiteAnalysis = (site, onProgress) => {
  const key = buildAnalysisKey(site);

  if (runningAnalyses.has(key)) {
    return runningAnalyses.get(key);
  }

  const analysis = (async () => {
    const startedAt = Date.now();

    onProgress?.(34, 1);
    const verify = await api.post(
      "/google-analytics/verify-url/",
      { site_url: site.url, property_id: site.property_id },
      { headers: getAuthHeader() }
    );

    if (!verify.data.match) {
      throw new Error("L'URL ne correspond pas a la propriete GA selectionnee.");
    }

    onProgress?.(58, 2);
    await api.post(
      "/add-site/",
      {
        url: site.url,
        nom_site: site.nom_site,
        property_id: site.property_id,
        property_name: site.property_name,
      },
      { headers: getAuthHeader() }
    );

    onProgress?.(92, 3);

    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_LOADING_TIME) {
      await wait(MIN_LOADING_TIME - elapsed);
    }

    onProgress?.(100, 4);
    return true;
  })().finally(() => {
    runningAnalyses.delete(key);
  });

  runningAnalyses.set(key, analysis);
  return analysis;
};

function SiteAnalysisLoading() {
  const location = useLocation();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(18);

  useEffect(() => {
    const site = location.state?.site;

    if (!site) {
      toast.error("Aucune analyse en cours.");
      navigate("/dashboard", { replace: true });
      return undefined;
    }

    let isMounted = true;
    const timer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 92) return current;
        return Math.min(current + (current < 60 ? 5 : 2), 92);
      });
    }, 220);

    runSiteAnalysis(site, (nextProgress) => {
      if (!isMounted) return;
      setProgress(nextProgress);
    })
      .then(() => {
        if (!isMounted) return;
        toast.success("Site ajoute avec succes");
        window.setTimeout(() => {
          navigate("/dashboard", { replace: true });
        }, 450);
      })
      .catch((error) => {
        if (!isMounted) return;
        const message =
          error.response?.data?.error ||
          error.message ||
          "Erreur lors de l'ajout du site.";
        toast.error(message);
        navigate("/dashboard", { replace: true });
      })
      .finally(() => {
        window.clearInterval(timer);
      });

    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, [location.state, navigate]);

  const safeProgress = Math.max(Math.min(Math.round(progress), 100), 8);

  return (
    <div style={theme.page}>
      <style>
        {`
          @keyframes siteLoadingSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @keyframes siteLoadingBar {
            0% { transform: translateX(-110%); }
            55%, 100% { transform: translateX(230%); }
          }

          @keyframes siteLoadingSkeleton {
            0% { background-position: 220% 0; }
            100% { background-position: -220% 0; }
          }

          @media (max-width: 720px) {
            .site-analysis-card {
              grid-template-columns: 1fr !important;
              padding: 26px !important;
              gap: 26px !important;
            }

            .site-analysis-meta {
              justify-content: flex-start !important;
            }
          }
        `}
      </style>
      <div style={styles.container}>
        <div className="site-analysis-card" style={styles.loadingCard}>
          <div>
            <div style={styles.badge}>
              <Sparkles size={16} />
              Assistant SEO
            </div>
            <h1 style={styles.title}>Preparation de l'audit SEO</h1>
            <p style={styles.subtitle}>
              Verification du site, association Google Analytics et preparation
              des donnees avant le retour vers vos sites.
            </p>
          </div>

          <div style={styles.loadingPanel}>
            <div style={styles.loadingHeader}>
              <div style={styles.loadingIcon}>
                <LoaderCircle size={24} style={styles.spinIcon} />
              </div>
              <div>
                <p style={styles.loadingTitle}>Traitement du site</p>
                <p style={styles.loadingText}>{safeProgress}% termine</p>
              </div>
            </div>
            <div style={styles.progressTrack}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${safeProgress}%`,
                }}
              />
              <div style={styles.progressShine} />
            </div>
            <div style={styles.skeletonStack}>
              {[100, 82, 64].map((width) => (
                <div
                  key={width}
                  style={{ ...styles.skeletonLine, width: `${width}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: "min(780px, 100%)",
    margin: "0 auto",
    paddingTop: "24px",
  },
  loadingCard: {
    width: "100%",
    padding: "38px",
    borderRadius: "24px",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    boxShadow: "var(--card-shadow)",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 0.82fr)",
    alignItems: "center",
    gap: "34px",
    boxSizing: "border-box",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    borderRadius: "999px",
    color: "#4338ca",
    background: "#eef2ff",
    border: "1px solid #c7d2fe",
    fontSize: "13px",
    fontWeight: "800",
    marginBottom: "18px",
  },
  title: {
    margin: "0 0 12px",
    color: "var(--text-primary)",
    fontSize: "30px",
    lineHeight: 1.15,
    fontWeight: "900",
  },
  subtitle: {
    margin: 0,
    color: "var(--text-secondary)",
    fontSize: "15px",
    lineHeight: "1.6",
    maxWidth: "540px",
  },
  loadingPanel: {
    padding: "20px",
    borderRadius: "18px",
    border: "1px solid rgba(99, 102, 241, 0.16)",
    background:
      "linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(20, 184, 166, 0.07), rgba(255, 255, 255, 0))",
    overflow: "hidden",
  },
  loadingHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "18px",
  },
  loadingIcon: {
    width: "46px",
    height: "46px",
    borderRadius: "14px",
    display: "grid",
    placeItems: "center",
    color: "#4338ca",
    background: "#eef2ff",
    border: "1px solid #c7d2fe",
    flex: "0 0 auto",
  },
  spinIcon: {
    animation: "siteLoadingSpin 0.85s linear infinite",
  },
  loadingTitle: {
    margin: 0,
    color: "var(--text-primary)",
    fontSize: "16px",
    fontWeight: "900",
  },
  loadingText: {
    margin: "4px 0 0",
    color: "var(--text-secondary)",
    fontSize: "13px",
    fontWeight: "700",
  },
  progressTrack: {
    position: "relative",
    height: "10px",
    borderRadius: "999px",
    background: "rgba(99, 102, 241, 0.12)",
    overflow: "hidden",
    marginBottom: "18px",
  },
  progressFill: {
    position: "absolute",
    inset: "0 auto 0 0",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #14b8a6, #6366f1)",
    transition: "width 0.25s ease",
  },
  progressShine: {
    position: "absolute",
    inset: 0,
    width: "44%",
    borderRadius: "999px",
    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)",
    animation: "siteLoadingBar 1.2s ease-in-out infinite",
  },
  skeletonStack: {
    display: "grid",
    gap: "10px",
  },
  skeletonLine: {
    height: "12px",
    borderRadius: "999px",
    background:
      "linear-gradient(90deg, rgba(148, 163, 184, 0.14), rgba(99, 102, 241, 0.2), rgba(148, 163, 184, 0.14))",
    backgroundSize: "220% 100%",
    animation: "siteLoadingSkeleton 1.35s ease-in-out infinite",
  },
};

export default SiteAnalysisLoading;
