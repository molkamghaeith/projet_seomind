import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { theme } from "../styles/theme";
import SEORecommendations from "../components/SEORecommendations";
import toast from "react-hot-toast";
import { Bot, Globe2, LoaderCircle, Sparkles } from "lucide-react";

const SELECTED_SITE_STORAGE_KEY = "selected_dashboard_site_id";
const SELECTED_SITE_URL_STORAGE_KEY = "selected_dashboard_site_url";
const SELECTED_SITE_NAME_STORAGE_KEY = "selected_dashboard_site_name";
const LEGACY_AI_SITE_STORAGE_KEY = "selected_ai_site_id";
const AI_PAGE_CACHE_KEY = "ai_recommendations_page_cache";
const GITHUB_CONNECTED_MESSAGE = "SEOMIND_GITHUB_CONNECTED";
const MISSING_SITE_TOAST_ID = "selected-site-missing";
const SITES_LOAD_ERROR_TOAST_ID = "ai-sites-load-error";

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

const scoreCardConfig = {
  score_global: {
    label: "Score global",
    accent: "#4f46e5",
    bg: "#eef2ff",
  },
  score_technique: {
    label: "Technique",
    accent: "#0f766e",
    bg: "#ccfbf1",
  },
  score_contenu: {
    label: "Contenu",
    accent: "#7c3aed",
    bg: "#f3e8ff",
  },
  score_visibilite: {
    label: "Visibilité",
    accent: "#0284c7",
    bg: "#e0f2fe",
  },
  score_trafic: {
    label: "Trafic",
    accent: "#d97706",
    bg: "#fef3c7",
  },
};

const getScoreStatus = (score) => {
  const value = Number(score) || 0;
  if (value >= 80) return { color: "#059669" };
  if (value >= 60) return { color: "#d97706" };
  return { color: "#dc2626" };
};

const formatScore = (score) => {
  const value = Number(score) || 0;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

const readAiPageCache = () => {
  try {
    return JSON.parse(sessionStorage.getItem(AI_PAGE_CACHE_KEY) || "null");
  } catch {
    return null;
  }
};

const writeAiPageCache = (websiteId, data) => {
  const previous = readAiPageCache();
  const base =
    previous && String(previous.websiteId) === String(websiteId) ? previous : {};

  sessionStorage.setItem(
    AI_PAGE_CACHE_KEY,
    JSON.stringify({
      ...base,
      ...data,
      websiteId,
      updatedAt: Date.now(),
    })
  );
};

function AIRecommendations() {
  const isGithubPopupCallback =
    new URLSearchParams(window.location.search).get("github") === "connected" &&
    window.opener &&
    !window.opener.closed;
  const [sites, setSites] = useState([]);
  const [currentWebsiteId, setCurrentWebsiteId] = useState(null);
  const [currentSiteUrl, setCurrentSiteUrl] = useState("");
  const [currentSiteName, setCurrentSiteName] = useState("");
  const [selectedSiteMissing, setSelectedSiteMissing] = useState(false);
  const [sitesLoaded, setSitesLoaded] = useState(false);
  const [resolvingSelectedSite, setResolvingSelectedSite] = useState(true);
  const [seoOpportunities, setSeoOpportunities] = useState([]);
  const [, setLoadingOpportunities] = useState(false);
  const [seoScore, setSeoScore] = useState(null);
  const [loadingSeoScore, setLoadingSeoScore] = useState(false);
  const loadedWebsiteIdRef = useRef(null);

  const getAuthHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem("access")}`,
  });
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      window.location.replace("/login");
    }
  }, []);

  const fetchSites = useCallback(async () => {
    setSitesLoaded(false);
    try {
      const res = await api.get("/sites/", {
        headers: getAuthHeader(),
      });
      setSites(res.data || []);
    } catch (error) {
      console.error(error);
      setSites([]);
      toast.error("Impossible de charger vos sites.", {
        id: SITES_LOAD_ERROR_TOAST_ID,
      });
    } finally {
      setSitesLoaded(true);
    }
  }, []);
  

  useEffect(() => {
    if (isGithubPopupCallback) return;
    fetchSites();
  }, [fetchSites, isGithubPopupCallback]);

  const fetchSEOOpportunities = useCallback(async (websiteId) => {
    if (!websiteId) return;

    setLoadingOpportunities(true);
    try {
      const res = await api.get(`/seo-opportunities/${websiteId}/`, {
        headers: getAuthHeader(),
      });
      const opportunities = res.data?.opportunities || [];
      setSeoOpportunities(opportunities);
      writeAiPageCache(websiteId, { seoOpportunities: opportunities });
    } catch (error) {
      console.error(error);
      setSeoOpportunities([]);
      toast.error("Impossible de charger les opportunités SEO.");
    } finally {
      setLoadingOpportunities(false);
    }
  }, []);

  const fetchSEOScore = useCallback(async (websiteId) => {
    if (!websiteId) return;

    setLoadingSeoScore(true);
    try {
      const res = await api.get(`/seo-score/${websiteId}/`, {
        headers: getAuthHeader(),
      });
      const score = res.data || null;
      setSeoScore(score);
      writeAiPageCache(websiteId, { seoScore: score });
    } catch (error) {
      console.error(error);
      setSeoScore(null);
      toast.error("Impossible de charger le score SEO.");
    } finally {
      setLoadingSeoScore(false);
    }
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isGithubConnected = params.get("github") === "connected";

    if (isGithubConnected) {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { type: GITHUB_CONNECTED_MESSAGE },
          window.location.origin
        );
        window.close();
        return;
      }

      toast.success("GitHub connecté avec succès");
      window.history.replaceState({}, "", window.location.pathname);
    }

    const savedSiteId =
      sessionStorage.getItem(SELECTED_SITE_STORAGE_KEY) ||
      localStorage.getItem(SELECTED_SITE_STORAGE_KEY) ||
      sessionStorage.getItem(LEGACY_AI_SITE_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_AI_SITE_STORAGE_KEY);

    if (savedSiteId && !sitesLoaded) {
      setResolvingSelectedSite(true);
      return;
    }

    if (savedSiteId && sitesLoaded) {
      const savedSite = sites.find((s) => String(s.id) === String(savedSiteId));

      if (savedSite) {
        if (String(loadedWebsiteIdRef.current) === String(savedSite.id)) {
          return;
        }

        loadedWebsiteIdRef.current = savedSite.id;
        setResolvingSelectedSite(false);
        setSelectedSiteMissing(false);
        setCurrentWebsiteId(savedSite.id);
        setCurrentSiteUrl(savedSite.url);
        setCurrentSiteName(savedSite.nom_site);
        writeAiPageCache(savedSite.id, {
          siteUrl: savedSite.url,
          siteName: savedSite.nom_site,
        });
        localStorage.setItem(SELECTED_SITE_STORAGE_KEY, String(savedSite.id));
        localStorage.setItem(SELECTED_SITE_URL_STORAGE_KEY, savedSite.url || "");
        localStorage.setItem(
          SELECTED_SITE_NAME_STORAGE_KEY,
          savedSite.nom_site || ""
        );
        localStorage.setItem(LEGACY_AI_SITE_STORAGE_KEY, String(savedSite.id));
        sessionStorage.setItem(SELECTED_SITE_STORAGE_KEY, String(savedSite.id));
        sessionStorage.setItem(SELECTED_SITE_URL_STORAGE_KEY, savedSite.url || "");
        sessionStorage.setItem(
          SELECTED_SITE_NAME_STORAGE_KEY,
          savedSite.nom_site || ""
        );
        sessionStorage.setItem(LEGACY_AI_SITE_STORAGE_KEY, String(savedSite.id));
        const cached = readAiPageCache();
        if (
          isGithubConnected &&
          cached &&
          String(cached.websiteId) === String(savedSite.id)
        ) {
          if (cached.seoScore) {
            setSeoScore(cached.seoScore);
            setLoadingSeoScore(false);
          } else {
            fetchSEOScore(savedSite.id);
          }

          if (Array.isArray(cached.seoOpportunities)) {
            setSeoOpportunities(cached.seoOpportunities);
            setLoadingOpportunities(false);
          } else {
            fetchSEOOpportunities(savedSite.id);
          }
        } else {
          fetchSEOScore(savedSite.id);
          fetchSEOOpportunities(savedSite.id);
        }
      } else {
        loadedWebsiteIdRef.current = null;
        clearSelectedSiteStorage();
        setResolvingSelectedSite(false);
        setSelectedSiteMissing(true);
        setCurrentWebsiteId(null);
        setCurrentSiteUrl("");
        setCurrentSiteName("");
        setSeoScore(null);
        setSeoOpportunities([]);
        toast.error(
          "Le site sélectionné n'existe plus. Sélectionnez un autre site dans le Dashboard.",
          { id: MISSING_SITE_TOAST_ID }
        );
      }
    } else if (!savedSiteId) {
      loadedWebsiteIdRef.current = null;
      setResolvingSelectedSite(false);
      setSelectedSiteMissing(false);
      setCurrentWebsiteId(null);
      setCurrentSiteUrl("");
      setCurrentSiteName("");
      setSeoScore(null);
      setSeoOpportunities([]);
    }
  }, [fetchSEOOpportunities, fetchSEOScore, sites, sitesLoaded]);

  const styles = {
    pageHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "24px",
      flexWrap: "wrap",
    },
    heroCard: {
      ...theme.dashboardCard,
      position: "relative",
      overflow: "hidden",
      border: "1px solid rgba(99, 102, 241, 0.16)",
      boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
    },
    heroAccent: {
      position: "absolute",
      inset: "0 auto 0 0",
      width: "6px",
      background: "#14b8a6",
    },
    heroContent: {
      display: "flex",
      alignItems: "flex-start",
      gap: "18px",
      minWidth: "280px",
      flex: "1 1 520px",
      paddingLeft: "12px",
    },
    heroIcon: {
      width: "52px",
      height: "52px",
      borderRadius: "14px",
      display: "grid",
      placeItems: "center",
      flex: "0 0 auto",
      color: "#0f766e",
      background: "#ccfbf1",
      border: "1px solid #99f6e4",
    },
    eyebrow: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "6px 10px",
      marginBottom: "10px",
      borderRadius: "999px",
      color: "#4338ca",
      background: "#eef2ff",
      border: "1px solid #c7d2fe",
      fontSize: "12px",
      fontWeight: "700",
    },
    sectionTitle: {
      color: "var(--text-primary)",
      marginTop: 0,
      marginBottom: "10px",
      fontSize: "32px",
      lineHeight: "1.1",
      fontWeight: "800",
    },
    sectionSubtitle: {
      color: "var(--text-secondary)",
      margin: 0,
      fontSize: "15px",
      lineHeight: "1.45",
    },
    activeSiteRow: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      flexWrap: "wrap",
      marginBottom: "6px",
      color: "var(--text-secondary)",
      fontSize: "15px",
    },
    siteName: {
      color: "var(--text-primary)",
      fontWeight: "800",
    },
    urlBadge: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      maxWidth: "100%",
      padding: "5px 9px",
      borderRadius: "999px",
      color: "#0369a1",
      background: "#e0f2fe",
      border: "1px solid #bae6fd",
      fontSize: "13px",
      fontWeight: "700",
      overflowWrap: "anywhere",
    },
    emptyText: {
      color: "var(--text-secondary)",
      fontSize: "14px",
    },
    siteButton: {
      marginLeft: "10px",
      padding: "6px 12px",
      background: "var(--bg-secondary)",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      cursor: "pointer",
      color: "var(--text-primary)",
      fontWeight: "600",
    },
    scoreGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: "14px",
      marginTop: "20px",
    },
    scoreCard: {
      position: "relative",
      overflow: "hidden",
      background: "var(--bg-secondary)",
      border: "1px solid var(--border)",
      borderRadius: "12px",
      padding: "18px",
      minHeight: "112px",
      boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
    },
    scoreCardAccent: {
      position: "absolute",
      inset: "0 auto 0 0",
      width: "4px",
    },
    scoreHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      marginBottom: "0",
    },
    scoreLabel: {
      color: "var(--text-secondary)",
      fontSize: "13px",
      fontWeight: "700",
      marginBottom: "6px",
    },
    scoreValue: {
      fontSize: "30px",
      fontWeight: "800",
      color: "var(--text-primary)",
      lineHeight: "1",
    },
    scoreUnit: {
      color: "var(--text-secondary)",
      fontSize: "16px",
      fontWeight: "800",
      marginLeft: "2px",
    },
    infoBox: {
      background: "var(--bg-secondary)",
      border: "1px solid var(--border)",
      borderRadius: "12px",
      padding: "16px",
      color: "var(--text-secondary)",
      fontSize: "14px",
      lineHeight: "1.6",
    },
    emptyState: {
      background: "linear-gradient(135deg, #f8fafc, #eef2ff)",
      border: "1px solid #dbe3ee",
      borderRadius: "14px",
      padding: "18px",
      color: "var(--text-secondary)",
      fontSize: "14px",
      lineHeight: "1.6",
    },
    emptyStateTitle: {
      margin: "0 0 6px",
      color: "var(--text-primary)",
      fontSize: "16px",
      fontWeight: "800",
    },
    emptyStateText: {
      margin: "0 0 14px",
      color: "var(--text-secondary)",
    },
    emptyStateButton: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "38px",
      padding: "0 14px",
      borderRadius: "10px",
      background: "#4f46e5",
      color: "#ffffff",
      textDecoration: "none",
      fontSize: "13px",
      fontWeight: "800",
    },
    loadingPanel: {
      border: "1px solid rgba(99, 102, 241, 0.16)",
      borderRadius: "14px",
      padding: "18px",
      background:
        "linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(20, 184, 166, 0.07), rgba(255, 255, 255, 0))",
      overflow: "hidden",
    },
    loadingHeader: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      marginBottom: "16px",
    },
    loadingIcon: {
      width: "38px",
      height: "38px",
      borderRadius: "12px",
      display: "grid",
      placeItems: "center",
      color: "#4338ca",
      background: "#eef2ff",
      border: "1px solid #c7d2fe",
      flex: "0 0 auto",
    },
    loadingTitle: {
      margin: 0,
      color: "var(--text-primary)",
      fontSize: "15px",
      fontWeight: "800",
      lineHeight: "1.3",
    },
    loadingText: {
      margin: "3px 0 0",
      color: "var(--text-secondary)",
      fontSize: "13px",
      lineHeight: "1.4",
    },
    loadingTrack: {
      position: "relative",
      height: "8px",
      borderRadius: "999px",
      background: "rgba(99, 102, 241, 0.12)",
      overflow: "hidden",
      marginBottom: "16px",
    },
    loadingFill: {
      position: "absolute",
      inset: 0,
      width: "44%",
      borderRadius: "999px",
      background: "linear-gradient(90deg, #14b8a6, #6366f1)",
      animation: "aiLoadingBar 1.2s ease-in-out infinite",
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
      animation: "aiSkeleton 1.35s ease-in-out infinite",
    },
  };

  const renderLoadingBlock = (title, description, lines = 3) => (
    <div style={styles.loadingPanel}>
      <div style={styles.loadingHeader}>
        <div style={styles.loadingIcon}>
          <LoaderCircle size={21} className="ai-loading-spin" />
        </div>
        <div>
          <p style={styles.loadingTitle}>{title}</p>
          <p style={styles.loadingText}>{description}</p>
        </div>
      </div>
      <div style={styles.loadingTrack}>
        <div style={styles.loadingFill} />
      </div>
      <div style={styles.skeletonStack}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            style={{
              ...styles.skeletonLine,
              width: `${index === lines - 1 ? 58 : 100 - index * 12}%`,
            }}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div style={theme.page}>
      <style>
        {`
          @keyframes aiLoadingSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @keyframes aiLoadingBar {
            0% { transform: translateX(-110%); }
            55%, 100% { transform: translateX(230%); }
          }

          @keyframes aiSkeleton {
            0% { background-position: 220% 0; }
            100% { background-position: -220% 0; }
          }

          .ai-loading-spin {
            animation: aiLoadingSpin 0.85s linear infinite;
          }
        `}
      </style>
      <div style={theme.container}>
        <div style={styles.heroCard}>
          <div style={styles.heroAccent} />
          <div style={styles.pageHeader}>
            <div style={styles.heroContent}>
              <div style={styles.heroIcon}>
                <Bot size={28} />
              </div>
              <div>
                <div style={styles.eyebrow}>
                  <Sparkles size={14} />
                  Assistant SEO intelligent
                </div>
                <h2 style={styles.sectionTitle}>Recommandations IA SEO</h2>
                {currentWebsiteId && (
                  <div style={styles.activeSiteRow}>
                    <span>Site actif :</span>
                    <span style={styles.siteName}>{currentSiteName}</span>
                    {currentSiteUrl && (
                      <span style={styles.urlBadge}>
                        <Globe2 size={14} />
                        {currentSiteUrl}
                      </span>
                    )}
                  </div>
                )}
                <p style={styles.sectionSubtitle}>
                  Analyse intelligente, opportunités SEO et corrections automatiques.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div style={theme.dashboardCard}>
          <h3 style={{ color: "var(--text-primary)", marginTop: 0 }}>
            Résumé IA
          </h3>

          {!loadingSeoScore && resolvingSelectedSite && (
            renderLoadingBlock(
              "Chargement du site selectionne",
              "Recuperation du dernier site actif avant de preparer les recommandations.",
              2
            )
          )}

          {loadingSeoScore && (
            renderLoadingBlock(
              "Analyse du score SEO en cours",
              "Lecture des signaux techniques, contenu, trafic et visibilité.",
              4
            )
          )}

          {!loadingSeoScore && !resolvingSelectedSite && !currentWebsiteId && (
            <div style={styles.emptyState}>
              <p style={styles.emptyStateTitle}>
                {selectedSiteMissing ? "Site introuvable" : "Aucun site sélectionné"}
              </p>
              <p style={styles.emptyStateText}>
                {selectedSiteMissing
                  ? "Le site sélectionné dans le Dashboard n'existe plus. Choisissez un autre site pour générer vos recommandations IA."
                  : "Sélectionnez un site depuis le Dashboard pour générer vos recommandations IA."}
              </p>
              <Link to="/dashboard" style={styles.emptyStateButton}>
                Choisir un site
              </Link>
            </div>
          )}

          {!loadingSeoScore && currentWebsiteId && !seoScore && (
            <p style={styles.emptyText}>
              Sélectionnez un site pour afficher l’analyse IA.
            </p>
          )}

          {!loadingSeoScore && seoScore && (
            <div style={styles.scoreGrid}>
              {Object.entries(scoreCardConfig).map(([key, config]) => {
                const value = Math.max(0, Math.min(100, Number(seoScore[key]) || 0));
                const status = getScoreStatus(value);

                return (
                  <div key={key} style={styles.scoreCard}>
                    <div
                      style={{
                        ...styles.scoreCardAccent,
                        background: status.color,
                      }}
                    />
                    <div style={styles.scoreHeader}>
                      <div>
                        <div style={styles.scoreLabel}>{config.label}</div>
                        <div style={styles.scoreValue}>
                          {formatScore(value)}
                          <span style={styles.scoreUnit}>/100</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {currentWebsiteId && (
          <SEORecommendations
            websiteId={currentWebsiteId}
            token={localStorage.getItem("access")}
            siteUrl={currentSiteUrl}
            seoOpportunities={seoOpportunities}
          />
        )}
      </div>
    </div>
  );
}

export default AIRecommendations;
