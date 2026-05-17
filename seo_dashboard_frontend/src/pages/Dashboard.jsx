import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { theme } from "../styles/theme";
import PeriodSelector from "../components/PeriodSelector";
import toast from "react-hot-toast";
import { BarChart3, Download, FileText, Globe2, LoaderCircle, MousePointerClick, PlusCircle } from "lucide-react";

const SELECTED_SITE_STORAGE_KEY = "selected_dashboard_site_id";
const SELECTED_SITE_URL_STORAGE_KEY = "selected_dashboard_site_url";
const SELECTED_SITE_NAME_STORAGE_KEY = "selected_dashboard_site_name";
const LEGACY_AI_SITE_STORAGE_KEY = "selected_ai_site_id";
const SITES_LOAD_ERROR_TOAST_ID = "dashboard-sites-load-error";
const PROPERTIES_TOAST_ID = "dashboard-properties";
const GOOGLE_CONNECTED_TOAST_ID = "google-analytics-connected";
const SESSION_EXPIRED_TOAST_ID = "session-expired";
const SHOW_CONFIGURATION_SECTION = false;

const clearSelectedSiteStorage = () => {
  localStorage.removeItem(SELECTED_SITE_STORAGE_KEY);
  localStorage.removeItem(SELECTED_SITE_URL_STORAGE_KEY);
  localStorage.removeItem(SELECTED_SITE_NAME_STORAGE_KEY);
  localStorage.removeItem(LEGACY_AI_SITE_STORAGE_KEY);
  sessionStorage.removeItem(SELECTED_SITE_STORAGE_KEY);
  sessionStorage.removeItem(SELECTED_SITE_URL_STORAGE_KEY);
  sessionStorage.removeItem(SELECTED_SITE_NAME_STORAGE_KEY);
  sessionStorage.removeItem(LEGACY_AI_SITE_STORAGE_KEY);
};

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const extractSiteNameFromUrl = (url) => {
  const domain = url
    .replace("https://", "")
    .replace("http://", "")
    .replace("www.", "")
    .split("/")[0];

  const name = domain.split(".")[0];

  const uselessWords = [
    "gamma",
    "beta",
    "app",
    "vercel",
    "netlify",
    "site",
    "web",
    "xi"
  ];

  return name
    .split("-")
    .filter((part) => !uselessWords.includes(part.toLowerCase()) && part.length > 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const buildSafeFilename = (name) => {
  const cleanName = (name || "site")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  const today = new Date().toISOString().slice(0, 10);
  return `${cleanName || "site"}-${today}`;
};

const calculateHalfTrend = (items, key) => {
  if (!Array.isArray(items) || items.length < 2) return null;

  const midpoint = Math.floor(items.length / 2);
  const firstHalf = items.slice(0, midpoint);
  const secondHalf = items.slice(midpoint);
  const sum = (rows) =>
    rows.reduce((total, item) => total + (Number(item[key]) || 0), 0);

  const previous = sum(firstHalf);
  const current = sum(secondHalf);

  if (previous === 0) {
    return current > 0 ? 100 : null;
  }

  return ((current - previous) / previous) * 100;
};

function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const requestedSection =
    new URLSearchParams(location.search).get("section") || "dashboard";
  const activeSection = ["dashboard", "analyses"].includes(
    requestedSection
  )
    ? requestedSection
    : "dashboard";
  const isDashboardSection = activeSection === "dashboard";
  const isAnalysesSection = activeSection === "analyses";

  const [url, setUrl] = useState("");
  const [nomSite, setNomSite] = useState("");
  const [sites, setSites] = useState([]);
  const [currentWebsiteId, setCurrentWebsiteId] = useState(null);

  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedPropertyName, setSelectedPropertyName] = useState("");

  const [gaData, setGaData] = useState([]);
  const [seoData, setSeoData] = useState([]);
  const [topPages, setTopPages] = useState([]);
  const [organicUsers, setOrganicUsers] = useState(0);
  const [seoScore, setSeoScore] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingTopPages, setLoadingTopPages] = useState(false);
  const [deletingSiteId, setDeletingSiteId] = useState(null);
  const [googleConnected, setGoogleConnected] = useState(null);
  const [exportingType, setExportingType] = useState(null);
  const [currentPeriod, setCurrentPeriod] = useState("last30Days");
  const [currentSiteUrl, setCurrentSiteUrl] = useState("");
  const [addSiteError, setAddSiteError] = useState("");

  const [showUsers, setShowUsers] = useState(true);
  const [showSessions, setShowSessions] = useState(true);
  const [showViews, setShowViews] = useState(true);
  const restoredSelectedSiteRef = useRef(false);

  const getAuthHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem("access")}`,
  });

  useEffect(() => {
    const token = localStorage.getItem("access");

    if (!token) {
      setSites([]);
      setGaData([]);
      setSeoData([]);
      setTopPages([]);
      setOrganicUsers(0);
      setSeoScore(null);
      setCurrentWebsiteId(null);
      setCurrentSiteUrl("");
      window.location.replace("/login");
    }
  }, []);

  const fetchSearchConsole = useCallback(async (siteUrl, startDate = null, endDate = null) => {
    if (!siteUrl) return;

    setLoading(true);
    try {
      let endpoint = `/search-console/data/?site_url=${encodeURIComponent(siteUrl)}`;
      if (startDate && endDate) {
        endpoint += `&start_date=${startDate}&end_date=${endDate}`;
      }
      const response = await api.get(endpoint, { headers: getAuthHeader() });
      setSeoData(response.data || []);
    } catch (error) {
      console.error(error);
      setSeoData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGAData = useCallback(async (propertyId, startDate = null, endDate = null) => {
    if (!propertyId) return;

    setLoading(true);
    try {
      let endpoint = `/google-analytics/data/${propertyId}/`;
      if (startDate && endDate) {
        endpoint += `?start_date=${startDate}&end_date=${endDate}`;
      }
      const res = await api.get(endpoint, { headers: getAuthHeader() });
      setGaData(res.data || []);
    } catch (error) {
      console.error(error);
      setGaData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTopPages = useCallback(async (propertyId, startDate = null, endDate = null) => {
    if (!propertyId) return;

    setLoadingTopPages(true);
    try {
      let endpoint = `/top-pages/${propertyId}/`;
      if (startDate && endDate) {
        endpoint += `?start_date=${startDate}&end_date=${endDate}`;
      }
      const res = await api.get(endpoint, { headers: getAuthHeader() });
      setTopPages(res.data || []);
    } catch (error) {
      console.error(error);
      setTopPages([]);
    } finally {
      setLoadingTopPages(false);
    }
  }, []);

  const fetchOrganicTraffic = useCallback(async (propertyId, startDate = null, endDate = null) => {
    if (!propertyId) return;

    try {
      let endpoint = `/organic-traffic/${propertyId}/`;
      if (startDate && endDate) {
        endpoint += `?start_date=${startDate}&end_date=${endDate}`;
      }
      const res = await api.get(endpoint, { headers: getAuthHeader() });
      setOrganicUsers(res.data?.organic_users || 0);
    } catch (error) {
      console.error(error);
      setOrganicUsers(0);
    }
  }, []);

  const fetchSEOScore = useCallback(async (websiteId) => {
    if (!websiteId) return null;

    try {
      const res = await api.get(`/seo-score/${websiteId}/`, {
        headers: getAuthHeader(),
      });
      setSeoScore(res.data);
      return res.data;
    } catch (error) {
      console.error(error);
      setSeoScore(null);
      return null;
    }
  }, []);

  const fetchSites = useCallback(async () => {
    try {
      const res = await api.get("/sites/", { headers: getAuthHeader() });
      setSites(res.data || []);
    } catch (error) {
      console.error(error);
      setSites([]);
      toast.error("Impossible de charger vos sites.", {
        id: SITES_LOAD_ERROR_TOAST_ID,
      });
    }
  }, []);

  const fetchProperties = useCallback(async ({ silent = false } = {}) => {
    try {
      const res = await api.get("/google-analytics/properties/", {
        headers: getAuthHeader(),
      });
      const loadedProperties = res.data || [];
      setProperties(loadedProperties);

      if (silent) {
        return;
      }

      if (loadedProperties.length === 0) {
        toast("Aucune propriété Google Analytics trouvée pour ce compte.", {
          id: PROPERTIES_TOAST_ID,
        });
      } else {
        toast.success(`${loadedProperties.length} propriété(s) chargée(s).`, {
          id: PROPERTIES_TOAST_ID,
        });
      }
    } catch (error) {
      console.error(error);
      setProperties([]);
      const apiMessage =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        "Erreur lors de la recuperation des proprietes.";
      const normalizedMessage = apiMessage.toLowerCase();
      const reconnectRequired = Boolean(error.response?.data?.reconnect_required);

      if (reconnectRequired) {
        setGoogleConnected(false);
      }

      if (error.response?.status === 401) {
        toast.error("Session expirée. Veuillez vous reconnecter.", {
          id: SESSION_EXPIRED_TOAST_ID,
        });
        window.location.replace("/login");
      } else if (
        reconnectRequired ||
        normalizedMessage.includes("aucun compte google") ||
        normalizedMessage.includes("connecté") ||
        normalizedMessage.includes("connecte")
      ) {
        if (!silent) {
          toast.error(`${apiMessage} Connectez Google puis réessayez.`, {
            id: PROPERTIES_TOAST_ID,
          });
        }
      } else if (apiMessage.toLowerCase().includes("google")) {
        if (!silent) {
          toast.error(apiMessage, { id: PROPERTIES_TOAST_ID });
        }
      } else if (!silent) {
        toast.error(`${apiMessage} Connectez Google puis réessayez.`, {
          id: PROPERTIES_TOAST_ID,
        });
      }
    }
  }, []);

  const checkGoogleConnection = useCallback(async () => {
    if (!localStorage.getItem("access")) return;

    try {
      const res = await api.get("/google-analytics/status/", {
        headers: getAuthHeader(),
      });
      const isConnected = Boolean(res.data?.connected);
      setGoogleConnected(isConnected);

      if (isConnected) {
        await fetchProperties({ silent: true });
      } else {
        setProperties([]);
      }
    } catch (error) {
      console.error(error);
      setGoogleConnected(false);
    }
  }, [fetchProperties]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("google") === "connected") {
      toast.success("Google Analytics connecté avec succès", {
        id: GOOGLE_CONNECTED_TOAST_ID,
      });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("google") === "scope_error") {
      toast.error(
        "Google n'a pas accordé l'accès Analytics. Reconnectez Google Analytics et acceptez les autorisations demandées.",
        { id: GOOGLE_CONNECTED_TOAST_ID }
      );
      window.history.replaceState({}, "", window.location.pathname);
    }

    checkGoogleConnection();
  }, [checkGoogleConnection]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const saveSelectedSite = useCallback((site) => {
    localStorage.setItem(SELECTED_SITE_STORAGE_KEY, String(site.id));
    localStorage.setItem(SELECTED_SITE_URL_STORAGE_KEY, site.url || "");
    localStorage.setItem(SELECTED_SITE_NAME_STORAGE_KEY, site.nom_site || "");
    localStorage.setItem(LEGACY_AI_SITE_STORAGE_KEY, String(site.id));
    sessionStorage.setItem(SELECTED_SITE_STORAGE_KEY, String(site.id));
    sessionStorage.setItem(SELECTED_SITE_URL_STORAGE_KEY, site.url || "");
    sessionStorage.setItem(SELECTED_SITE_NAME_STORAGE_KEY, site.nom_site || "");
    sessionStorage.setItem(LEGACY_AI_SITE_STORAGE_KEY, String(site.id));
  }, []);

  const handleUrlChange = (e) => {
    const newUrl = e.target.value;
    setUrl(newUrl);

    if (!nomSite.trim()) {
      setNomSite(extractSiteNameFromUrl(newUrl));
    }
  };

  const handleAddSite = async (e) => {
  e.preventDefault();
  setAddSiteError("");

  const finalNomSite = nomSite.trim() || extractSiteNameFromUrl(url);

  if (!url || !finalNomSite || !selectedPropertyId) {
    const message = "Tous les champs sont requis.";
    setAddSiteError(message);
    toast.error(message);
    return;
  }

  if (sites.some((site) => site.url === url)) {
    const message = "Ce site existe déjà.";
    setAddSiteError(message);
    toast.error(message);
    return;
  }

  navigate("/site-analysis-loading", {
    state: {
      site: {
        request_id:
          window.crypto?.randomUUID?.() ||
          `${Date.now()}-${Math.random()}`,
        url,
        nom_site: finalNomSite,
        property_id: selectedPropertyId,
        property_name: selectedPropertyName,
      },
    },
  });
};

  const handlePropertyChange = (e) => {
    const id = e.target.value;
    setSelectedPropertyId(id);
    const prop = properties.find((p) => p.property_id === id);
    setSelectedPropertyName(prop?.display_name || "");
  };

  const handlePeriodChange = (startDate, endDate, periodKey) => {
    setCurrentPeriod(periodKey);

    if (selectedPropertyId) {
      fetchGAData(selectedPropertyId, startDate, endDate);
      fetchTopPages(selectedPropertyId, startDate, endDate);
      fetchOrganicTraffic(selectedPropertyId, startDate, endDate);
    }

    if (currentSiteUrl) {
      fetchSearchConsole(currentSiteUrl, startDate, endDate);
    }
  };

  const handleSiteSelect = useCallback(async (site, showToast = true) => {
    saveSelectedSite(site);
    setSelectedPropertyId(site.property_id);
    setSelectedPropertyName(site.property_name);
    setCurrentSiteUrl(site.url);
    setCurrentWebsiteId(site.id);

    fetchGAData(site.property_id);
    fetchSearchConsole(site.url);
    fetchTopPages(site.property_id);
    fetchOrganicTraffic(site.property_id);

    await fetchSEOScore(site.id);
    if (showToast) {
      toast.success(`Site sélectionné : ${site.nom_site}`);
    }
  }, [
    fetchGAData,
    fetchOrganicTraffic,
    fetchSearchConsole,
    fetchSEOScore,
    fetchTopPages,
    saveSelectedSite,
  ]);

  useEffect(() => {
    if (currentWebsiteId || restoredSelectedSiteRef.current || sites.length === 0) {
      return;
    }

    const savedSiteId =
      sessionStorage.getItem(SELECTED_SITE_STORAGE_KEY) ||
      localStorage.getItem(SELECTED_SITE_STORAGE_KEY) ||
      sessionStorage.getItem(LEGACY_AI_SITE_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_AI_SITE_STORAGE_KEY);

    if (!savedSiteId) {
      return;
    }

    const savedSite = sites.find((site) => String(site.id) === String(savedSiteId));

    if (!savedSite) {
      clearSelectedSiteStorage();
      return;
    }

    restoredSelectedSiteRef.current = true;
    handleSiteSelect(savedSite, false);
  }, [currentWebsiteId, handleSiteSelect, sites]);

  const connectGoogle = async () => {
    try {
      const res = await api.get("/google-analytics/login/", {
        headers: getAuthHeader(),
      });
      window.location.href = res.data.auth_url;
    } catch (error) {
      console.error(error);
      toast.error("Impossible de lancer la connexion Google.");
    }
  };

  const handleDeleteSite = async (siteId, siteName) => {
  toast(
    (t) => (
      <div>
        <p style={{ marginBottom: "12px", fontWeight: "600" }}>
          Voulez-vous vraiment supprimer le site "{siteName}" ?
        </p>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            onClick={() => toast.dismiss(t.id)}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Annuler
          </button>

          <button
            onClick={async () => {
              toast.dismiss(t.id);
              setDeletingSiteId(siteId);

              try {
                await api.delete(`/delete-site/${siteId}/`, {
                  headers: getAuthHeader(),
                });

                if (currentWebsiteId === siteId) {
                  localStorage.removeItem(SELECTED_SITE_STORAGE_KEY);
                  localStorage.removeItem(SELECTED_SITE_URL_STORAGE_KEY);
                  localStorage.removeItem(SELECTED_SITE_NAME_STORAGE_KEY);
                  localStorage.removeItem(LEGACY_AI_SITE_STORAGE_KEY);
                  sessionStorage.removeItem(SELECTED_SITE_STORAGE_KEY);
                  sessionStorage.removeItem(SELECTED_SITE_URL_STORAGE_KEY);
                  sessionStorage.removeItem(SELECTED_SITE_NAME_STORAGE_KEY);
                  sessionStorage.removeItem(LEGACY_AI_SITE_STORAGE_KEY);

                  setCurrentWebsiteId(null);
                  setCurrentSiteUrl("");
                  setSelectedPropertyId("");
                  setSelectedPropertyName("");
                  setGaData([]);
                  setSeoData([]);
                  setTopPages([]);
                  setOrganicUsers(0);
                  setSeoScore(null);
                }

                await fetchSites();
                toast.success("Site supprimé avec succès");
              } catch (error) {
                console.error(error);
                toast.error("Erreur lors de la suppression du site");
              } finally {
                setDeletingSiteId(null);
              }
            }}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "none",
              background: "#dc2626",
              color: "#fff",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Supprimer
          </button>
        </div>
      </div>
    ),
    {
      duration: 10000,
    }
  );
};

  const handleExport = async (endpoint, filename, mimeType = null, exportType = "export") => {
    if (!currentWebsiteId) {
      toast.error("Sélectionnez d'abord un site");
      return;
    }

    setExportingType(exportType);

    try {
      const response = await api.get(endpoint, {
        responseType: "blob",
        headers: getAuthHeader(),
      });

      const blob = mimeType
        ? new Blob([response.data], { type: mimeType })
        : new Blob([response.data]);

      downloadBlob(blob, filename);
      toast.success("Export terminé");
    } catch (error) {
      console.error(error);

      if (error.response?.status === 401) {
        toast.error("Votre session a expiré. Veuillez vous reconnecter.");
        window.location.replace("/login");
      } else {
        toast.error(
          error.response?.data?.error || "Erreur lors de l'export"
        );
      }
    } finally {
      setExportingType(null);
    }
  };

  const activeSite = sites.find(
    (site) => String(site.id) === String(currentWebsiteId)
  );
  const exportBaseName = buildSafeFilename(activeSite?.nom_site || currentSiteUrl);

  const exportSEOCSV = () =>
    handleExport(
      `/export/seo-csv/${currentWebsiteId}/`,
      `${exportBaseName}-seo.csv`,
      null,
      "seo"
    );

  const exportAnalyticsCSV = () =>
    handleExport(
      `/export/analytics-csv/${currentWebsiteId}/`,
      `${exportBaseName}-analytics.csv`,
      null,
      "analytics"
    );

  const exportFullPDF = () =>
    handleExport(
      `/export/full-pdf/${currentWebsiteId}/`,
      `${exportBaseName}-rapport-complet.pdf`,
      "application/pdf",
      "pdf"
    );

  const formattedChartData = [...gaData]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((item) => ({
      ...item,
      date: `${item.date.slice(6, 8)}/${item.date.slice(4, 6)}`,
      users: Number(item.users),
      sessions: Number(item.sessions),
      views: Number(item.views),
    }));

  const seenPageKeys = new Set();
  const validTopPages = topPages
    .filter((page) => {
      const path = page.path || "/";
      const title = page.title || "Page sans titre";
      const views = Number(page.views) || 0;
      const pageKey = `${path}-${title}`;

      if (!path || path.startsWith("/_")) {
        return false;
      }
      if (views <= 0) {
        return false;
      }
      if (seenPageKeys.has(pageKey)) {
        return false;
      }
      seenPageKeys.add(pageKey);
      return true;
    })
    .map((page) => ({
      ...page,
      path: page.path || "/",
      title: page.title || "Page sans titre",
      views: Number(page.views) || 0,
    }))
    .sort((a, b) => b.views - a.views);
  const visibleTopPages = validTopPages.slice(0, 8);
  const visibleTopPagesViews = visibleTopPages.reduce(
    (sum, page) => sum + page.views,
    0
  );

  const totalUsers = gaData.reduce((sum, day) => sum + (Number(day.users) || 0), 0);
  const totalSessions = gaData.reduce((sum, day) => sum + (Number(day.sessions) || 0), 0);
  const totalViews = gaData.reduce((sum, day) => sum + (Number(day.views) || 0), 0);
  const usersTrend = calculateHalfTrend(formattedChartData, "users");
  const sessionsTrend = calculateHalfTrend(formattedChartData, "sessions");
  const viewsTrend = calculateHalfTrend(formattedChartData, "views");

  const bounceRateValues = gaData
    .map((item) => Number(item.bounceRate))
    .filter((r) => !isNaN(r) && r != null);

  const avgBounceRate =
    bounceRateValues.length > 0
      ? (bounceRateValues.reduce((a, b) => a + b, 0) / bounceRateValues.length) * 100
      : null;

  const hasSimulatedSeoData = seoData.some((item) => item.is_simulated);

  const priorityActions = [];

  if (!currentWebsiteId) {
    priorityActions.push({
      title: "Sélectionner un site",
      description:
        "Choisissez un site dans la liste pour afficher les données Analytics, Search Console et le score SEO.",
      priority: "high",
      source: "Configuration",
    });
  }

  if (currentWebsiteId && !selectedPropertyId) {
    priorityActions.push({
      title: "Associer une propriété Google Analytics",
      description:
        "Le dashboard a besoin d'une propriété GA pour afficher le trafic, les pages vues et les pages populaires.",
      priority: "high",
      source: "Google Analytics",
    });
  }

  if (seoScore) {
    const scoreChecks = [
      {
        key: "score_global",
        label: "Score global",
        limit: 60,
        priority: "high",
        description:
          "Le score global est faible. Ouvrez les recommandations IA pour traiter les corrections les plus importantes.",
      },
      {
        key: "score_visibilite",
        label: "Visibilité",
        limit: 55,
        priority: "medium",
        description:
          "La visibilité peut progresser. Priorisez les requêtes proches de la première page et améliorez les titles/meta.",
      },
      {
        key: "score_contenu",
        label: "Contenu",
        limit: 60,
        priority: "medium",
        description:
          "Le contenu peut être renforcé avec des sections utiles, des mots-clés naturels et un meilleur maillage interne.",
      },
      {
        key: "score_trafic",
        label: "Trafic",
        limit: 45,
        priority: "medium",
        description:
          "Le trafic reste bas. Optimisez les pages déjà visibles et ajoutez des appels à l'action clairs.",
      },
    ];

    scoreChecks.forEach((check) => {
      const value = Number(seoScore[check.key]);
      if (!Number.isNaN(value) && value < check.limit) {
        priorityActions.push({
          title: `Améliorer ${check.label.toLowerCase()} (${Math.round(value)}/100)`,
          description: check.description,
          priority: check.priority,
          source: "Score SEO",
        });
      }
    });
  }

  const ctrOpportunity = seoData
    .filter((row) => Number(row.impressions) >= 50 && Number(row.ctr) < 0.03)
    .sort((a, b) => Number(b.impressions) - Number(a.impressions))[0];

  if (ctrOpportunity) {
    priorityActions.push({
      title: `Améliorer le CTR de "${ctrOpportunity.keyword}"`,
      description: `${ctrOpportunity.impressions} impressions avec un CTR de ${(
        Number(ctrOpportunity.ctr) * 100
      ).toFixed(1)}%. Travaillez le title et la meta description de la page ciblée.`,
      priority: "high",
      source: "Search Console",
    });
  }

  const rankingOpportunity = seoData
    .filter((row) => {
      const position = Number(row.position);
      return position > 8 && position <= 20 && Number(row.impressions) >= 30;
    })
    .sort((a, b) => Number(a.position) - Number(b.position))[0];

  if (rankingOpportunity) {
    priorityActions.push({
      title: `Faire progresser "${rankingOpportunity.keyword}"`,
      description: `Position moyenne ${Number(rankingOpportunity.position).toFixed(
        1
      )}. Ajoutez du contenu utile et des liens internes vers la page concernée.`,
      priority: "medium",
      source: "Search Console",
    });
  }

  if (validTopPages.length > 0) {
    const topPage = validTopPages[0];
    priorityActions.push({
      title: `Optimiser la page "${topPage.title}"`,
      description: `${topPage.views.toLocaleString()} vues. Cette page reçoit déjà du trafic : améliorez son contenu, son CTA et ses liens internes.`,
      priority: "medium",
      source: "Analytics",
    });
  }

  const seoQuickWins = seoData
    .map((row) => {
      const impressions = Number(row.impressions) || 0;
      const ctr = Number(row.ctr) || 0;
      const position = Number(row.position) || 0;
      let type = "";
      let action = "";
      let priority = "medium";

      if (impressions >= 50 && ctr < 0.03) {
        type = "CTR faible";
        action = "Réécrire le title et la meta description pour rendre le résultat plus cliquable.";
        priority = "high";
      } else if (position > 8 && position <= 20) {
        type = "Proche page 1";
        action = "Renforcer le contenu et ajouter des liens internes vers la page ciblée.";
      } else if (impressions >= 80 && Number(row.clicks) <= 2) {
        type = "Visibilité non convertie";
        action = "Clarifier l'intention de recherche et améliorer l'extrait affiché sur Google.";
      }

      if (!type) return null;

      return {
        keyword: row.keyword,
        impressions,
        ctr,
        position,
        clicks: Number(row.clicks) || 0,
        type,
        action,
        priority,
        score: impressions + Math.max(0, 20 - position) * 10,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const dedupedPriorityActions = [];
  const seenActionTitles = new Set();
  for (const action of priorityActions) {
    if (seenActionTitles.has(action.title)) continue;
    seenActionTitles.add(action.title);
    dedupedPriorityActions.push(action);
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const visiblePriorityActions = dedupedPriorityActions
    .sort(
      (a, b) =>
        (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9)
    )
    .slice(0, 3);

  const priorityBadgeConfig = {
    high: { label: "Priorité haute", color: "#dc2626", bg: "#fee2e2" },
    medium: { label: "Priorité moyenne", color: "#d97706", bg: "#fef3c7" },
    low: { label: "Priorité basse", color: "#059669", bg: "#d1fae5" },
  };

  const styles = {
    searchContainer: {
      background: "var(--bg-secondary)",
      padding: "22px",
      borderRadius: "12px",
      marginTop: "20px",
      border: "1px solid var(--border)",
      overflowX: "auto",
      boxShadow: "0 12px 30px rgba(15, 23, 42, 0.05)",
    },
    searchHeader: {
      marginBottom: "20px",
      padding: "18px 20px",
      borderRadius: "12px",
      border: "1px solid rgba(99, 102, 241, 0.22)",
      background:
        "linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(16, 185, 129, 0.08), rgba(245, 158, 11, 0.1))",
    },
    searchTitle: {
      color: "var(--text-primary)",
      margin: 0,
      fontSize: "24px",
      lineHeight: "1.18",
      fontWeight: "900",
    },
    tableWrap: {
      border: "1px solid var(--border)",
      borderRadius: "12px",
      overflow: "hidden",
    },
    table: { width: "100%", borderCollapse: "collapse", minWidth: "500px" },
    th: {
      background: "var(--bg-primary)",
      padding: "13px 16px",
      textAlign: "left",
      fontWeight: "800",
      fontSize: "12px",
      textTransform: "uppercase",
      letterSpacing: "0",
      borderBottom: "1px solid var(--border)",
      color: "var(--text-secondary)",
    },
    td: {
      padding: "14px 16px",
      borderBottom: "1px solid var(--border)",
      textAlign: "left",
      color: "var(--text-primary)",
      fontSize: "14px",
    },
    tdNumber: {
      padding: "14px 16px",
      borderBottom: "1px solid var(--border)",
      textAlign: "left",
      color: "var(--text-primary)",
      fontSize: "14px",
      fontWeight: "700",
      fontVariantNumeric: "tabular-nums",
    },
    keywordCell: {
      padding: "14px 16px",
      borderBottom: "1px solid var(--border)",
      color: "var(--text-primary)",
      fontSize: "14px",
      fontWeight: "700",
    },
    topPagesHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "16px",
      flexWrap: "wrap",
      marginBottom: "20px",
      padding: "18px 20px",
      borderRadius: "12px",
      border: "1px solid rgba(99, 102, 241, 0.22)",
      background:
        "linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(16, 185, 129, 0.08), rgba(245, 158, 11, 0.1))",
    },
    topPagesKicker: {
      margin: "0 0 6px",
      color: "#6366f1",
      fontSize: "12px",
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: "0",
    },
    topPagesTitle: {
      color: "var(--text-primary)",
      margin: 0,
      fontSize: "24px",
      lineHeight: "1.18",
      fontWeight: "900",
    },
    topPagesSummary: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      flexWrap: "wrap",
    },
    topPagesMetric: {
      padding: "8px 11px",
      borderRadius: "999px",
      background: "rgba(255, 255, 255, 0.7)",
      border: "1px solid rgba(99, 102, 241, 0.16)",
      color: "var(--text-primary)",
      fontSize: "13px",
      fontWeight: "800",
      boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)",
    },
    topPagesTableWrap: {
      overflowX: "auto",
      border: "1px solid var(--border)",
      borderRadius: "12px",
      boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
    },
    topPagesTable: {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: 0,
      minWidth: "680px",
    },
    topPagesTh: {
      background: "rgba(99, 102, 241, 0.08)",
      padding: "14px 16px",
      textAlign: "left",
      fontWeight: "900",
      fontSize: "12px",
      textTransform: "uppercase",
      letterSpacing: "0",
      borderBottom: "1px solid var(--border)",
      color: "var(--text-secondary)",
    },
    topPagesTd: {
      padding: "16px",
      borderBottom: "1px solid var(--border)",
      color: "var(--text-primary)",
      fontSize: "14px",
      verticalAlign: "middle",
    },
    topPageTitleText: {
      display: "block",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      fontWeight: "700",
      lineHeight: "1.35",
    },
    pathPill: {
      display: "inline-flex",
      maxWidth: "100%",
      padding: "6px 9px",
      borderRadius: "8px",
      background: "var(--bg-primary)",
      color: "var(--text-secondary)",
      fontFamily: "monospace",
      fontSize: "12px",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      border: "1px solid var(--border)",
    },
    viewsPill: {
      display: "inline-flex",
      justifyContent: "center",
      minWidth: "44px",
      padding: "6px 10px",
      borderRadius: "999px",
      background: "rgba(245, 158, 11, 0.12)",
      color: "#d97706",
      fontWeight: "900",
      fontVariantNumeric: "tabular-nums",
    },
    popularityTrack: {
      flex: 1,
      minWidth: "120px",
      background: "var(--bg-primary)",
      borderRadius: "999px",
      height: "10px",
      overflow: "hidden",
      border: "1px solid var(--border)",
    },
    popularityFill: {
      height: "100%",
      borderRadius: "999px",
      transition: "width 0.4s ease",
    },
    popularityValue: {
      fontSize: "12px",
      color: "var(--text-secondary)",
      minWidth: "36px",
      fontWeight: "800",
      textAlign: "right",
    },
    siteButton: {
      marginLeft: "10px",
      padding: "5px 10px",
      background: "var(--bg-secondary)",
      border: "1px solid var(--border)",
      borderRadius: "6px",
      cursor: "pointer",
      color: "var(--text-primary)",
      fontWeight: "600",
    },
    deleteButton: {
      marginLeft: "8px",
      padding: "5px 10px",
      background: "#fee2e2",
      border: "1px solid #fecaca",
      borderRadius: "6px",
      cursor: "pointer",
      color: "#b91c1c",
      fontWeight: "600",
    },
    exportButtons: {
      display: "flex",
      gap: "8px",
      margin: "4px auto 24px",
      padding: "8px",
      flexWrap: "wrap",
      justifyContent: "center",
      width: "fit-content",
      maxWidth: "100%",
      background: "var(--bg-secondary)",
      border: "1px solid var(--border)",
      borderRadius: "14px",
      boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
    },
    exportBtnSEO: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      background: "var(--bg-primary)",
      color: "var(--text-primary)",
      border: "1px solid var(--border)",
      padding: "10px 13px",
      borderRadius: "10px",
      cursor: "pointer",
      fontWeight: "800",
      fontSize: "14px",
    },
    exportBtnAnalytics: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      background: "var(--bg-primary)",
      color: "var(--text-primary)",
      border: "1px solid var(--border)",
      padding: "10px 13px",
      borderRadius: "10px",
      cursor: "pointer",
      fontWeight: "800",
      fontSize: "14px",
    },
    exportBtnPDF: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      background: "var(--bg-primary)",
      color: "var(--text-primary)",
      border: "1px solid var(--border)",
      padding: "10px 13px",
      borderRadius: "10px",
      cursor: "pointer",
      fontWeight: "800",
      fontSize: "14px",
    },
    exportIcon: {
      width: "18px",
      height: "18px",
      flex: "0 0 auto",
    },
    disabledButton: {
      opacity: 0.65,
      cursor: "not-allowed",
    },
    cards: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
      gap: "20px",
      marginBottom: "20px",
    },
    cardStat: {
      background: "var(--bg-secondary)",
      padding: "20px",
      borderRadius: "12px",
      border: "1px solid var(--border)",
      textAlign: "center",
      color: "var(--text-primary)",
    },
    cardTrend: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      marginTop: "10px",
      padding: "5px 8px",
      borderRadius: "999px",
      fontSize: "12px",
      fontWeight: "700",
    },
    cardHint: {
      margin: "8px 0 0",
      color: "var(--text-secondary)",
      fontSize: "12px",
      lineHeight: "1.35",
    },
    headerRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "16px",
      flexWrap: "wrap",
    },
    headerMeta: {
      margin: "6px 0 0",
      color: "var(--text-secondary)",
      fontSize: "13px",
    },
    refreshButton: {
      border: "none",
      padding: "11px 15px",
      borderRadius: "9px",
      background: "var(--accent)",
      color: "#fff",
      cursor: "pointer",
      fontWeight: "800",
    },
    setupGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "14px",
    },
    setupCard: {
      background: "var(--bg-primary)",
      border: "1px solid var(--border)",
      borderRadius: "12px",
      padding: "16px",
    },
    setupLabel: {
      margin: "0 0 10px",
      color: "var(--text-secondary)",
      fontSize: "13px",
      fontWeight: "700",
    },
    setupStatus: {
      display: "inline-flex",
      padding: "7px 10px",
      borderRadius: "999px",
      fontSize: "13px",
      fontWeight: "800",
    },
    setupDescription: {
      margin: "10px 0 0",
      color: "var(--text-secondary)",
      fontSize: "13px",
      lineHeight: "1.45",
    },
    graphHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
      flexWrap: "wrap",
      gap: "15px",
    },
    filterGroup: { display: "flex", gap: "15px" },
    filterLabel: {
      display: "flex",
      alignItems: "center",
      gap: "5px",
      fontSize: "13px",
      cursor: "pointer",
      color: "var(--text-primary)",
    },
    miniStats: {
      display: "flex",
      justifyContent: "space-around",
      marginTop: "20px",
      padding: "15px",
      background: "var(--bg-primary)",
      borderRadius: "12px",
      flexWrap: "wrap",
      gap: "15px",
    },
    miniStatItem: { textAlign: "center" },
    miniStatValue: { fontSize: "20px", fontWeight: "bold" },
    miniStatLabel: { fontSize: "12px", color: "var(--text-secondary)" },
    errorText: {
      color: "#dc2626",
      fontSize: "13px",
      marginTop: "8px",
      background: "#fee2e2",
      padding: "8px 12px",
      borderRadius: "8px",
    },
    emptyText: { color: "var(--text-secondary)", fontSize: "14px" },
    siteManagerCard: {
      ...theme.dashboardCard,
      overflow: "hidden",
      border: "1px solid rgba(99, 102, 241, 0.16)",
      boxShadow: "0 18px 45px rgba(15, 23, 42, 0.07)",
    },
    siteManagerHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "14px",
      flexWrap: "wrap",
      marginBottom: "18px",
    },
    siteManagerTitleRow: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    siteIconBox: {
      width: "42px",
      height: "42px",
      borderRadius: "12px",
      display: "grid",
      placeItems: "center",
      color: "#4338ca",
      background: "#eef2ff",
      border: "1px solid #c7d2fe",
      flex: "0 0 auto",
    },
    siteSectionTitle: {
      margin: 0,
      color: "var(--text-primary)",
      fontSize: "20px",
      fontWeight: "900",
      lineHeight: "1.2",
    },
    siteSectionSubtitle: {
      margin: "4px 0 0",
      color: "var(--text-secondary)",
      fontSize: "13px",
      lineHeight: "1.4",
    },
    siteCountPill: {
      padding: "7px 10px",
      borderRadius: "999px",
      color: "#0f766e",
      background: "#ccfbf1",
      border: "1px solid #99f6e4",
      fontSize: "12px",
      fontWeight: "900",
    },
    siteFormGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "12px",
      alignItems: "stretch",
    },
    siteFormButton: {
      minHeight: "48px",
      alignSelf: "stretch",
    },
    siteEmptyState: {
      display: "grid",
      placeItems: "center",
      minHeight: "150px",
      padding: "24px",
      borderRadius: "16px",
      border: "1px dashed rgba(99, 102, 241, 0.32)",
      background:
        "linear-gradient(135deg, rgba(238, 242, 255, 0.85), rgba(240, 253, 250, 0.78))",
      textAlign: "center",
    },
    siteEmptyIcon: {
      width: "48px",
      height: "48px",
      borderRadius: "14px",
      display: "grid",
      placeItems: "center",
      marginBottom: "12px",
      color: "#4338ca",
      background: "#ffffff",
      border: "1px solid #e0e7ff",
      boxShadow: "0 12px 24px rgba(99, 102, 241, 0.12)",
    },
    siteEmptyTitle: {
      margin: "0 0 6px",
      color: "var(--text-primary)",
      fontSize: "16px",
      fontWeight: "900",
    },
    siteEmptyText: {
      margin: 0,
      color: "var(--text-secondary)",
      fontSize: "14px",
      lineHeight: "1.5",
      maxWidth: "520px",
    },
    selectionEmptyState: {
      display: "flex",
      alignItems: "center",
      gap: "18px",
      padding: "24px",
      borderRadius: "18px",
      border: "1px solid #dbe3ee",
      background:
        "linear-gradient(135deg, rgba(248, 250, 252, 0.96), rgba(238, 242, 255, 0.92))",
      boxShadow: "0 16px 38px rgba(15, 23, 42, 0.06)",
      color: "var(--text-secondary)",
      flexWrap: "wrap",
    },
    selectionEmptyIcon: {
      width: "58px",
      height: "58px",
      borderRadius: "18px",
      display: "grid",
      placeItems: "center",
      color: "#ffffff",
      background: "linear-gradient(135deg, #6366f1, #14b8a6)",
      boxShadow: "0 16px 28px rgba(99, 102, 241, 0.22)",
      flex: "0 0 auto",
    },
    selectionEmptyContent: {
      flex: "1 1 320px",
      minWidth: 0,
    },
    selectionEmptyTitle: {
      margin: "0 0 6px",
      color: "var(--text-primary)",
      fontSize: "22px",
      lineHeight: "1.2",
      fontWeight: "900",
    },
    selectionEmptyText: {
      margin: 0,
      color: "var(--text-secondary)",
      fontSize: "15px",
      lineHeight: "1.55",
    },
    selectionEmptyHint: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      padding: "9px 12px",
      borderRadius: "999px",
      color: "#4338ca",
      background: "#eef2ff",
      border: "1px solid #c7d2fe",
      fontSize: "13px",
      fontWeight: "900",
      whiteSpace: "nowrap",
    },
    analysisEmptyState: {
      background: "linear-gradient(135deg, #f8fafc, #eef2ff)",
      border: "1px solid #dbe3ee",
      borderRadius: "14px",
      padding: "18px",
      color: "var(--text-secondary)",
      fontSize: "14px",
      lineHeight: "1.6",
    },
    analysisEmptyTitle: {
      margin: "0 0 6px",
      color: "var(--text-primary)",
      fontSize: "16px",
      fontWeight: "800",
    },
    analysisEmptyText: {
      margin: 0,
      color: "var(--text-secondary)",
    },
    quickWinGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "12px",
      marginBottom: "20px",
    },
    quickWinCard: {
      background: "var(--bg-primary)",
      border: "1px solid var(--border)",
      borderRadius: "12px",
      padding: "16px",
      boxShadow: "0 8px 18px rgba(15, 23, 42, 0.04)",
    },
    quickWinKeyword: {
      margin: "10px 0 8px",
      color: "var(--text-primary)",
      fontSize: "16px",
      lineHeight: "1.35",
      fontWeight: "800",
    },
    quickWinAction: {
      margin: 0,
      color: "var(--text-secondary)",
      fontSize: "13px",
      lineHeight: "1.45",
    },
    quickWinStats: {
      display: "flex",
      gap: "8px",
      flexWrap: "wrap",
      marginTop: "10px",
    },
    quickWinStat: {
      padding: "5px 8px",
      borderRadius: "7px",
      background: "var(--bg-secondary)",
      color: "var(--text-secondary)",
      fontSize: "12px",
      fontWeight: "700",
    },
    sectionIntro: {
      margin: "8px 0 0",
      color: "var(--text-secondary)",
      fontSize: "15px",
      lineHeight: "1.55",
      maxWidth: "760px",
    },
    infoBanner: {
      background: "#fef3c7",
      color: "#92400e",
      border: "1px solid #fcd34d",
      borderRadius: "10px",
      padding: "12px 14px",
      marginBottom: "14px",
      fontSize: "14px",
      lineHeight: "1.5",
    },
    analysisLoading: {
      marginTop: "18px",
      padding: "18px",
      borderRadius: "14px",
      border: "1px solid rgba(99, 102, 241, 0.16)",
      background:
        "linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(20, 184, 166, 0.07), rgba(255, 255, 255, 0))",
      overflow: "hidden",
    },
    analysisLoadingHeader: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      marginBottom: "16px",
    },
    analysisLoadingIcon: {
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
    analysisLoadingTitle: {
      margin: 0,
      color: "var(--text-primary)",
      fontSize: "15px",
      fontWeight: "800",
      lineHeight: "1.3",
    },
    analysisLoadingText: {
      margin: "3px 0 0",
      color: "var(--text-secondary)",
      fontSize: "13px",
      lineHeight: "1.4",
    },
    analysisLoadingTrack: {
      position: "relative",
      height: "8px",
      borderRadius: "999px",
      background: "rgba(99, 102, 241, 0.12)",
      overflow: "hidden",
      marginBottom: "16px",
    },
    analysisLoadingFill: {
      position: "absolute",
      inset: 0,
      width: "44%",
      borderRadius: "999px",
      background: "linear-gradient(90deg, #14b8a6, #6366f1)",
      animation: "analysisLoadingBar 1.2s ease-in-out infinite",
    },
    analysisSkeletonStack: {
      display: "grid",
      gap: "10px",
    },
    analysisSkeletonLine: {
      height: "12px",
      borderRadius: "999px",
      background:
        "linear-gradient(90deg, rgba(148, 163, 184, 0.14), rgba(99, 102, 241, 0.2), rgba(148, 163, 184, 0.14))",
      backgroundSize: "220% 100%",
      animation: "analysisSkeleton 1.35s ease-in-out infinite",
    },
    priorityHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "16px",
      flexWrap: "wrap",
      marginBottom: "20px",
      padding: "18px 20px",
      borderRadius: "12px",
      border: "1px solid rgba(99, 102, 241, 0.22)",
      background:
        "linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(16, 185, 129, 0.08), rgba(245, 158, 11, 0.1))",
    },
    priorityHeadingTitle: {
      color: "var(--text-primary)",
      margin: 0,
      fontSize: "24px",
      lineHeight: "1.18",
      fontWeight: "900",
    },
    prioritySubtitle: {
      margin: "6px 0 0",
      color: "var(--text-secondary)",
      fontSize: "14px",
      lineHeight: "1.5",
      maxWidth: "760px",
    },
    priorityGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
      gap: "14px",
    },
    priorityCard: {
      background: "var(--bg-primary)",
      border: "1px solid var(--border)",
      borderRadius: "12px",
      padding: "16px",
      minHeight: "150px",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    },
    priorityMetaRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
      flexWrap: "wrap",
    },
    priorityBadge: {
      display: "inline-flex",
      alignItems: "center",
      padding: "6px 9px",
      borderRadius: "999px",
      fontSize: "12px",
      fontWeight: "700",
    },
    prioritySource: {
      color: "var(--text-secondary)",
      fontSize: "12px",
      fontWeight: "700",
    },
    priorityTitle: {
      margin: 0,
      color: "var(--text-primary)",
      fontSize: "16px",
      lineHeight: "1.35",
    },
    priorityDescription: {
      margin: 0,
      color: "var(--text-secondary)",
      fontSize: "14px",
      lineHeight: "1.55",
    },
    priorityLink: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "10px 14px",
      borderRadius: "8px",
      background: "var(--accent)",
      color: "#fff",
      textDecoration: "none",
      fontWeight: "700",
      fontSize: "14px",
    },

    spinner: {
      width: "18px",
      height: "18px",
      border: "3px solid rgba(255,255,255,0.4)",
      borderTop: "3px solid white",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    },
    buttonContent: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
    },
  };

  const renderAnalysisLoading = (title, description, lines = 3) => (
    <div style={styles.analysisLoading}>
      <div style={styles.analysisLoadingHeader}>
        <div style={styles.analysisLoadingIcon}>
          <LoaderCircle size={21} className="analysis-loading-spin" />
        </div>
        <div>
          <p style={styles.analysisLoadingTitle}>{title}</p>
          <p style={styles.analysisLoadingText}>{description}</p>
        </div>
      </div>
      <div style={styles.analysisLoadingTrack}>
        <div style={styles.analysisLoadingFill} />
      </div>
      <div style={styles.analysisSkeletonStack}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            style={{
              ...styles.analysisSkeletonLine,
              width: `${index === lines - 1 ? 58 : 100 - index * 12}%`,
            }}
          />
        ))}
      </div>
    </div>
  );

  const renderSitesSection = () => (
    <>
      <div style={styles.siteManagerCard}>
        <div style={styles.siteManagerHeader}>
          <div style={styles.siteManagerTitleRow}>
            <div style={styles.siteIconBox}>
              <PlusCircle size={23} />
            </div>
            <div>
              <h3 style={styles.siteSectionTitle}>Ajouter un site</h3>
              <p style={styles.siteSectionSubtitle}>
                Connectez un site à sa propriété Analytics pour démarrer l'analyse.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleAddSite} style={styles.siteFormGrid}>
          <input
            style={theme.input}
            placeholder="URL du site *"
            value={url}
            onChange={handleUrlChange}
          />
          <input
            style={theme.input}
            placeholder="Nom du site *"
            value={nomSite}
            onChange={(e) => setNomSite(e.target.value)}
          />
          <select
            style={theme.select}
            value={selectedPropertyId}
            onChange={handlePropertyChange}
          >
            <option value="">Choisir propriété GA *</option>
            {properties.map((p) => (
              <option key={p.property_id} value={p.property_id}>
                {p.display_name}
              </option>
            ))}
          </select>
          {addSiteError && <div style={styles.errorText}>{addSiteError}</div>}
          <button style={{ ...theme.button, ...styles.siteFormButton }} type="submit">
            <span style={styles.buttonContent}>Ajouter</span>
          </button>
        </form>
      </div>

      <div style={styles.siteManagerCard}>
        <div style={styles.siteManagerHeader}>
          <div style={styles.siteManagerTitleRow}>
            <div style={styles.siteIconBox}>
              <Globe2 size={23} />
            </div>
            <div>
              <h3 style={styles.siteSectionTitle}>Sites</h3>
              <p style={styles.siteSectionSubtitle}>
                Choisissez le site à analyser dans votre tableau de bord.
              </p>
            </div>
          </div>
          <span style={styles.siteCountPill}>
            {sites.length} site{sites.length > 1 ? "s" : ""}
          </span>
        </div>

        {sites.length === 0 && (
          <div style={styles.siteEmptyState}>
            <div style={styles.siteEmptyIcon}>
              <Globe2 size={25} />
            </div>
            <p style={styles.siteEmptyTitle}>Aucun site ajouté pour l'instant</p>
            <p style={styles.siteEmptyText}>
              Ajoutez votre premier site avec le formulaire ci-dessus. Les
              statistiques et recommandations apparaîtront après la sélection.
            </p>
          </div>
        )}
        {sites.map((site) => (
          <div key={site.id} style={theme.siteItem}>
            <strong style={{ color: "var(--text-primary)" }}>
              {site.nom_site}
            </strong>
            <span style={{ color: "var(--text-secondary)" }}> - {site.url}</span>

            <button
              style={{
                ...styles.siteButton,
                ...(currentWebsiteId === site.id
                  ? {
                      background: "var(--accent)",
                      color: "#fff",
                      borderColor: "var(--accent)",
                    }
                  : {}),
              }}
              onClick={() => handleSiteSelect(site)}
            >
              {currentWebsiteId === site.id ? "Sélectionné" : "Sélectionner"}
            </button>

            <button
              style={styles.deleteButton}
              onClick={() => handleDeleteSite(site.id, site.nom_site)}
              disabled={deletingSiteId === site.id}
            >
              {deletingSiteId === site.id ? "Suppression..." : "Supprimer"}
            </button>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div style={theme.page}>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @keyframes analysisLoadingBar {
            0% { transform: translateX(-110%); }
            55%, 100% { transform: translateX(230%); }
          }

          @keyframes analysisSkeleton {
            0% { background-position: 220% 0; }
            100% { background-position: -220% 0; }
          }

          .analysis-loading-spin {
            animation: spin 0.85s linear infinite;
          }
        `}
      </style>
      <div style={theme.container}>
        {SHOW_CONFIGURATION_SECTION && isDashboardSection && (
          <>
        <div style={theme.dashboardCard}>
          <div style={styles.priorityHeader}>
            <div>
              <h3 style={{ color: "var(--text-primary)", margin: 0 }}>
                État de configuration
              </h3>
              <p style={styles.prioritySubtitle}>
                Vérifiez rapidement si le dashboard utilise vos données réelles.
              </p>
            </div>
            {googleConnected === false && (
              <button
                type="button"
                style={{
                  ...styles.priorityLink,
                  border: "none",
                  cursor: "pointer",
                }}
                onClick={connectGoogle}
              >
                Connecter Google
              </button>
            )}
          </div>

          <div style={styles.setupGrid}>
            {[
              {
                label: "Compte Google",
                ok: googleConnected === true,
                pending: googleConnected === null,
                status:
                  googleConnected === null
                    ? "Vérification..."
                    : googleConnected
                    ? "Connecté"
                    : "Non connecté",
                description:
                  "Nécessaire pour charger Analytics et Search Console.",
              },
              {
                label: "Propriétés Analytics",
                ok: properties.length > 0,
                pending: googleConnected === null,
                status:
                  properties.length > 0
                    ? `${properties.length} propriété(s)`
                    : "Aucune propriété",
                description:
                  "Une propriété GA doit être associée au site sélectionné.",
              },
              {
                label: "Site actif",
                ok: Boolean(currentWebsiteId),
                status: activeSite?.nom_site || "Aucun site sélectionné",
                description:
                  "Sélectionnez un site pour afficher les métriques et actions.",
              },
              {
                label: "Search Console",
                ok: seoData.length > 0 && !hasSimulatedSeoData,
                pending: seoData.length === 0,
                status:
                  seoData.length === 0
                    ? "Aucune donnée"
                    : hasSimulatedSeoData
                    ? "Données simulées"
                    : "Données réelles",
                description:
                  "Les clics, impressions, CTR et positions viennent de Search Console quand disponible.",
              },
            ].map((item) => {
              const statusStyle = item.pending
                ? { color: "#92400e", background: "#fef3c7" }
                : item.ok
                ? { color: "#065f46", background: "#d1fae5" }
                : { color: "#b91c1c", background: "#fee2e2" };

              return (
                <div key={item.label} style={styles.setupCard}>
                  <p style={styles.setupLabel}>{item.label}</p>
                  <span style={{ ...styles.setupStatus, ...statusStyle }}>
                    {item.status}
                  </span>
                  <p style={styles.setupDescription}>{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>

          </>
        )}

        {isDashboardSection && (
          <>
        {renderSitesSection()}

        {!currentWebsiteId ? (
          <div style={styles.selectionEmptyState}>
            <div style={styles.selectionEmptyIcon}>
              <MousePointerClick size={28} />
            </div>
            <div style={styles.selectionEmptyContent}>
              <p style={styles.selectionEmptyTitle}>Aucun site sélectionné</p>
              <p style={styles.selectionEmptyText}>
                Sélectionnez un site dans la liste ci-dessus pour afficher le
                tableau de bord, les exports, les statistiques et les graphiques.
              </p>
            </div>
            <span style={styles.selectionEmptyHint}>
              <Globe2 size={15} />
              En attente de sélection
            </span>
          </div>
        ) : (
          <>
        <div style={theme.dashboardCard}>
          <div style={styles.priorityHeader}>
            <div>
              <h3 style={styles.priorityHeadingTitle}>
                Actions prioritaires
              </h3>
              <p style={styles.prioritySubtitle}>
                Les prochaines actions calculées depuis votre score, Analytics
                et Search Console.
              </p>
            </div>

            {currentWebsiteId && (
              <Link
                to="/ai-recommendations?fromDashboard=1"
                style={styles.priorityLink}
              >
                Voir recommandations IA
              </Link>
            )}
          </div>

          {visiblePriorityActions.length === 0 && (
            <p style={styles.emptyText}>
              Aucune action prioritaire détectée pour le moment. Sélectionnez un
              site ou chargez vos données Google pour obtenir des suggestions.
            </p>
          )}

          {visiblePriorityActions.length > 0 && (
            <div style={styles.priorityGrid}>
              {visiblePriorityActions.map((action) => {
                const badge =
                  priorityBadgeConfig[action.priority] ||
                  priorityBadgeConfig.medium;

                return (
                  <div key={action.title} style={styles.priorityCard}>
                    <div style={styles.priorityMetaRow}>
                      <span
                        style={{
                          ...styles.priorityBadge,
                          color: badge.color,
                          background: badge.bg,
                        }}
                      >
                        {badge.label}
                      </span>
                      <span style={styles.prioritySource}>{action.source}</span>
                    </div>
                    <h4 style={styles.priorityTitle}>{action.title}</h4>
                    <p style={styles.priorityDescription}>
                      {action.description}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={styles.exportButtons}>
          <button
            style={{
              ...styles.exportBtnSEO,
              ...(exportingType ? styles.disabledButton : {}),
            }}
            onClick={exportSEOCSV}
            disabled={Boolean(exportingType)}
          >
            <FileText style={{ ...styles.exportIcon, color: "#10b981" }} />
            {exportingType === "seo" ? "Export..." : "SEO CSV"}
          </button>
          <button
            style={{
              ...styles.exportBtnAnalytics,
              ...(exportingType ? styles.disabledButton : {}),
            }}
            onClick={exportAnalyticsCSV}
            disabled={Boolean(exportingType)}
          >
            <BarChart3 style={{ ...styles.exportIcon, color: "#3b82f6" }} />
            {exportingType === "analytics" ? "Export..." : "Analytics CSV"}
          </button>
          <button
            style={{
              ...styles.exportBtnPDF,
              ...(exportingType ? styles.disabledButton : {}),
            }}
            onClick={exportFullPDF}
            disabled={Boolean(exportingType)}
          >
            <Download style={{ ...styles.exportIcon, color: "#ef4444" }} />
            {exportingType === "pdf" ? "Export..." : "Rapport PDF"}
          </button>
        </div>

        <PeriodSelector
          onPeriodChange={handlePeriodChange}
          currentPeriod={currentPeriod}
        />

        <div style={styles.cards}>
          {[
            {
              label: "Utilisateurs",
              value: totalUsers,
              trend: usersTrend,
              hint: "Visiteurs actifs mesurés par Google Analytics.",
            },
            {
              label: "Sessions",
              value: totalSessions,
              trend: sessionsTrend,
              hint: "Visites ouvertes sur le site pendant la pèriode.",
            },
            {
              label: "Pages vues",
              value: totalViews,
              trend: viewsTrend,
              hint: "Nombre total de pages consultées.",
            },
            {
              label: "Taux de rebond",
              value: avgBounceRate !== null ? `${avgBounceRate.toFixed(1)}%` : "N/A",
              trend: null,
              hint: "Part des sessions avec peu ou pas d'interaction.",
            },
            {
              label: "Trafic organique",
              value: organicUsers,
              trend: null,
              hint: "Utilisateurs provenant de la recherche naturelle.",
            },
          ].map(({ label, value, trend, hint }) => {
            const trendColor =
              trend === null
                ? null
                : trend >= 0
                ? { color: "#065f46", background: "#d1fae5" }
                : { color: "#b91c1c", background: "#fee2e2" };

            return (
            <div key={label} style={styles.cardStat}>
              <h4
                style={{
                  margin: "0 0 8px",
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                }}
              >
                {label}
              </h4>
              <p style={{ margin: 0, fontSize: "22px", fontWeight: "bold" }}>
                {value}
              </p>
              <p style={styles.cardHint}>{hint}</p>
              {trend !== null && (
                <span style={{ ...styles.cardTrend, ...trendColor }}>
                  {trend >= 0 ? "+" : ""}
                  {trend.toFixed(1)}% vs début période
                </span>
              )}
            </div>
            );
          })}
        </div>

        <div style={theme.dashboardCard}>
          <div style={styles.graphHeader}>
            <h3 style={{ color: "var(--text-primary)", margin: 0 }}>
              Évolution du trafic
            </h3>
            <div style={styles.filterGroup}>
              {[
                {
                  key: "u",
                  state: showUsers,
                  setter: setShowUsers,
                  color: "#6366f1",
                  label: "Utilisateurs",
                },
                {
                  key: "s",
                  state: showSessions,
                  setter: setShowSessions,
                  color: "#10b981",
                  label: "Sessions",
                },
                {
                  key: "v",
                  state: showViews,
                  setter: setShowViews,
                  color: "#f59e0b",
                  label: "Pages vues",
                },
              ].map(({ key, state, setter, color, label }) => (
                <label key={key} style={styles.filterLabel}>
                  <input
                    type="checkbox"
                    checked={state}
                    onChange={() => setter(!state)}
                  />
                  <span style={{ color }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {loading &&
            renderAnalysisLoading(
              "Analyse du trafic en cours",
              "Preparation des donnees Analytics et Search Console.",
              3
            )}

          {!loading && formattedChartData.length === 0 && (
            <p style={styles.emptyText}>
              Aucune donnée disponible pour cette période.
            </p>
          )}

          {!loading && formattedChartData.length > 0 && (
            <>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart
                  data={formattedChartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <defs>
                    {[
                      { id: "colorUsers", color: "#6366f1" },
                      { id: "colorSessions", color: "#10b981" },
                      { id: "colorViews", color: "#f59e0b" },
                    ].map(({ id, color }) => (
                      <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    stroke="var(--text-secondary)"
                    tick={{ fill: "var(--text-secondary)" }}
                  />
                  <YAxis
                    stroke="var(--text-secondary)"
                    tick={{ fill: "var(--text-secondary)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-secondary)",
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                      borderRadius: "8px",
                      padding: "10px",
                    }}
                    formatter={(value, name) => {
                      const names = {
                        users: "Utilisateurs",
                        sessions: "Sessions",
                        views: "Pages vues",
                      };
                      return [`${value}`, names[name] || name];
                    }}
                  />
                  <Legend
                    wrapperStyle={{ color: "var(--text-primary)" }}
                    formatter={(v) =>
                      ({ users: "Utilisateurs", sessions: "Sessions", views: "Pages vues" }[v] || v)
                    }
                  />

                  {showUsers && (
                    <Area
                      type="monotone"
                      dataKey="users"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fill="url(#colorUsers)"
                      dot={{ r: 3, fill: "#6366f1" }}
                      activeDot={{ r: 5 }}
                    />
                  )}

                  {showSessions && (
                    <Area
                      type="monotone"
                      dataKey="sessions"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#colorSessions)"
                      dot={{ r: 3, fill: "#10b981" }}
                      activeDot={{ r: 5 }}
                    />
                  )}

                  {showViews && (
                    <Area
                      type="monotone"
                      dataKey="views"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fill="url(#colorViews)"
                      dot={{ r: 3, fill: "#f59e0b" }}
                      activeDot={{ r: 5 }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>

              <div style={styles.miniStats}>
                {[
                  { color: "#6366f1", key: "users", label: "Total Utilisateurs" },
                  { color: "#10b981", key: "sessions", label: "Total Sessions" },
                  { color: "#f59e0b", key: "views", label: "Total Pages vues" },
                ].map(({ color, key, label }) => (
                  <div key={key} style={styles.miniStatItem}>
                    <div style={{ ...styles.miniStatValue, color }}>
                      {formattedChartData.reduce((sum, d) => sum + (d[key] || 0), 0)}
                    </div>
                    <div style={styles.miniStatLabel}>{label}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

          </>
        )}
          </>
        )}

        {isAnalysesSection && (
          <>
        <div style={theme.dashboardCard}>
          <div style={styles.topPagesHeader}>
            <div>
              <p style={styles.topPagesKicker}>Performance contenu</p>
              <h3 style={styles.topPagesTitle}>Pages les plus consultées</h3>
            </div>
            {visibleTopPages.length > 0 && (
              <div style={styles.topPagesSummary}>
                <span
                  style={{
                    ...styles.topPagesMetric,
                    borderColor: "rgba(99, 102, 241, 0.22)",
                    color: "#4f46e5",
                  }}
                >
                  {visibleTopPages.length} pages
                </span>
                <span
                  style={{
                    ...styles.topPagesMetric,
                    borderColor: "rgba(245, 158, 11, 0.28)",
                    color: "#d97706",
                  }}
                >
                  {visibleTopPagesViews.toLocaleString()} vues
                </span>
              </div>
            )}
          </div>

          {loadingTopPages && (
            renderAnalysisLoading(
              "Analyse des pages en cours",
              "Analyse des pages les plus consultees et calcul de popularite.",
              3
            )
          )}

          {!loadingTopPages && validTopPages.length === 0 && (
            <div style={styles.analysisEmptyState}>
              <p style={styles.analysisEmptyTitle}>
                {!currentWebsiteId
                  ? "Aucun site sélectionné"
                  : !selectedPropertyId
                  ? "Analytics non associé"
                  : "Aucune page consultée"}
              </p>
              <p style={styles.analysisEmptyText}>
                {!currentWebsiteId
                  ? "Sélectionnez un site dans le tableau de bord pour afficher les pages les plus consultées."
                  : !selectedPropertyId
                  ? "Associez une propriété Google Analytics au site sélectionné pour charger les pages consultées."
                  : "Aucune donnée Analytics n'est disponible pour cette période."}
              </p>
            </div>
          )}

          {!loadingTopPages && validTopPages.length > 0 && (
            <div style={styles.topPagesTableWrap}>
              <table style={styles.topPagesTable}>
                <thead>
                  <tr>
                    <th style={styles.topPagesTh}>Page</th>
                    <th style={styles.topPagesTh}>Chemin</th>
                    <th style={{ ...styles.topPagesTh, textAlign: "right", whiteSpace: "nowrap" }}>
                      Vues
                    </th>
                    <th style={{ ...styles.topPagesTh, width: "240px" }}>Popularité</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTopPages.map((page, index) => {
                    const maxViews = validTopPages[0]?.views || 1;
                    const barWidth = Math.round((page.views / maxViews) * 100);
                    const barColor =
                      barWidth > 66 ? "#10b981" : barWidth > 33 ? "#6366f1" : "#f59e0b";

                    return (
                      <tr key={index}>
                        <td style={{ ...styles.topPagesTd, maxWidth: "360px" }}>
                          <span
                            title={page.title}
                            style={styles.topPageTitleText}
                          >
                            {page.title}
                          </span>
                        </td>
                        <td style={styles.topPagesTd}>
                          <span title={page.path} style={styles.pathPill}>
                            {page.path}
                          </span>
                        </td>
                        <td
                          style={{
                            ...styles.topPagesTd,
                            textAlign: "right",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span style={styles.viewsPill}>
                            {page.views.toLocaleString()}
                          </span>
                        </td>
                        <td style={styles.topPagesTd}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            <div style={styles.popularityTrack}>
                              <div
                                style={{
                                  ...styles.popularityFill,
                                  width: `${barWidth}%`,
                                  background: barColor,
                                }}
                              />
                            </div>
                            <span style={styles.popularityValue}>
                              {barWidth}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={styles.searchContainer}>
          <div style={styles.searchHeader}>
            <div>
              <h3 style={styles.searchTitle}>Search Console - Mots-clés</h3>
              <p style={styles.sectionIntro}>
                Requêtes à traiter en priorité selon les impressions, le CTR
                et la position moyenne.
              </p>
            </div>
          </div>

          {hasSimulatedSeoData && (
            <div style={styles.infoBanner}>
              Les données SEO affichées sont actuellement simulées, car Google Search Console
              ne retourne pas encore assez de données réelles pour ce site.
            </div>
          )}

          {loading &&
            renderAnalysisLoading(
              "Analyse SEO en cours",
              "Lecture des requetes Search Console, impressions, CTR et positions.",
              3
            )}

          {!loading && seoData.length === 0 && (
            <div style={styles.analysisEmptyState}>
              <p style={styles.analysisEmptyTitle}>
                {!currentWebsiteId
                  ? "Aucun site sélectionné"
                  : "Aucune requête Search Console"}
              </p>
              <p style={styles.analysisEmptyText}>
                {!currentWebsiteId
                  ? "Sélectionnez un site dans le tableau de bord pour afficher les mots-clés Search Console."
                  : "Aucune donnée SEO n'est disponible pour cette période. Essayez une période plus large ou vérifiez la connexion Search Console."}
              </p>
            </div>
          )}

          {!loading && seoData.length > 0 && (
            <>
              {seoQuickWins.length > 0 && (
                <>
                  <div style={styles.quickWinGrid}>
                    {seoQuickWins.map((item) => {
                      const badge =
                        priorityBadgeConfig[item.priority] ||
                        priorityBadgeConfig.medium;

                      return (
                        <div key={`${item.keyword}-${item.type}`} style={styles.quickWinCard}>
                          <span
                            style={{
                              ...styles.priorityBadge,
                              color: badge.color,
                              background: badge.bg,
                            }}
                          >
                            {item.type}
                          </span>
                          <h4 style={styles.quickWinKeyword}>{item.keyword}</h4>
                          <p style={styles.quickWinAction}>{item.action}</p>
                          <div style={styles.quickWinStats}>
                            <span style={styles.quickWinStat}>
                              {item.impressions} impressions
                            </span>
                            <span style={styles.quickWinStat}>
                              {(item.ctr * 100).toFixed(1)}% CTR
                            </span>
                            <span style={styles.quickWinStat}>
                              Pos. {item.position.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <colgroup>
                    <col style={{ width: "40%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "15%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {["Mot-clé", "Clics", "Impressions", "CTR", "Position"].map((h) => (
                        <th key={h} style={styles.th}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {seoData.map((row, i) => (
                      <tr key={i}>
                        <td style={styles.keywordCell}>{row.keyword}</td>
                        <td style={styles.tdNumber}>{row.clicks}</td>
                        <td style={styles.tdNumber}>{row.impressions}</td>
                        <td style={styles.tdNumber}>{(row.ctr * 100).toFixed(2)}%</td>
                        <td style={styles.tdNumber}>
                          {typeof row.position === "number"
                            ? row.position.toFixed(2)
                            : Number(row.position).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
