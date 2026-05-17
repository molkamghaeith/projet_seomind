 import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

const GITHUB_CONNECTED_MESSAGE = "SEOMIND_GITHUB_CONNECTED";
const GITHUB_CONNECTED_STORAGE_KEY = "seomind_github_connected_at";

const priorityConfig = {
  high: { label: "Priorité haute", color: "#dc2626", bg: "#fee2e2" },
  medium: { label: "Priorité moyenne", color: "#d97706", bg: "#fef3c7" },
  low: { label: "Priorité basse", color: "#059669", bg: "#d1fae5" },
};

const opportunityPriorityConfig = {
  high: { label: "Priorité haute", color: "#2563eb", bg: "#dbeafe" },
  medium: { label: "Priorité moyenne", color: "#7c3aed", bg: "#ede9fe" },
  low: { label: "Priorité basse", color: "#0f766e", bg: "#ccfbf1" },
};

const recommendationTabs = [
  { key: "all", label: "Toutes" },
  { key: "errors", label: "Erreurs" },
  { key: "warnings", label: "Avertissements" },
  { key: "opportunities", label: "Opportunités" },
];

const isTopPageOptimization = (recommendation) => {
  const title = (recommendation.title || "").toLowerCase();
  return (
    recommendation.type === "top_page_optimization" ||
    title.includes("optimiser la page populaire")
  );
};

const getRecommendationTabKey = (recommendation) => {
  if (["global", "benchmark"].includes(recommendation.category)) {
    return "all";
  }

  if (isTopPageOptimization(recommendation)) {
    return "opportunities";
  }

  if (recommendation.tab === "warnings" || recommendation.category === "warning") {
    return "warnings";
  }

  if (
    recommendation.tab === "opportunities" ||
    recommendation.category === "opportunity"
  ) {
    return "opportunities";
  }

  if (recommendation.priority === "high") return "errors";
  if (recommendation.priority === "medium") return "warnings";
  return "opportunities";
};

const impactLabels = {
  high: "Impact élevé",
  medium: "Impact moyen",
  low: "Impact faible",
};

const difficultyLabels = {
  easy: "Facile",
  medium: "Moyen",
  hard: "Difficile",
};

const sortByPriority = (items) => {
  const order = { high: 0, medium: 1, low: 2 };
  return [...items].sort(
    (a, b) => (order[a.priority] ?? 99) - (order[b.priority] ?? 99)
  );
};

const sortAllRecommendationItems = (items) => {
  const priorityOrder = { high: 0, medium: 1, low: 2 };

  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aTabKey = getRecommendationTabKey(a.item.recommendation);
      const bTabKey = getRecommendationTabKey(b.item.recommendation);
      const aRank =
        aTabKey === "opportunities"
          ? 3
          : priorityOrder[a.item.recommendation.priority] ?? 2;
      const bRank =
        bTabKey === "opportunities"
          ? 3
          : priorityOrder[b.item.recommendation.priority] ?? 2;

      return aRank - bRank || a.index - b.index;
    })
    .map(({ item }) => item);
};

const AI_PAGE_CACHE_KEY = "ai_recommendations_page_cache";
const CACHE_TTL = 15 * 60 * 1000;

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

const isRealCode = (text) => {
  if (!text) return false;
  const clean = text.trim().toLowerCase();

  if (!clean) return false;
  if (clean.startsWith("<!--") && clean.endsWith("-->")) return false;
  if (clean.includes("correction seo proposée")) return false;
  if (clean.includes("optimisation recommandée")) return false;
  if (clean.includes("amélioration seo suggérée")) return false;
  if (clean.includes("aucune correction")) return false;

  return true;
};

const isAutoFixEligible = (recommendation) => {
  const category = recommendation.category;
  const text = `${recommendation.title || ""} ${
    recommendation.message || recommendation.description || ""
  }`.toLowerCase();

  if (["traffic", "seo", "global", "benchmark", "performance"].includes(category)) {
    return false;
  }

  if (["title", "meta", "structure", "content", "semantic", "technical"].includes(category)) {
    return true;
  }

  return [
    "titre",
    "title",
    "meta",
    "h1",
    "image",
    "contenu",
    "liens internes",
    "temps de réponse",
    "pertinence sémantique",
    "termes connexes",
  ].some((keyword) => text.includes(keyword));
};

const hasUsefulGeneratedMessage = (message) => {
  if (!message) return false;

  const normalized = message.trim().toLowerCase();
  return ![
    "suggestion seo générée",
    "cette recommandation nécessite une amélioration manuelle.",
  ].includes(normalized);
};

const countLogicalLines = (text) => Math.max(1, (text || "").split(/\r?\n/).length);

const countVisibleLines = (text, textarea) => {
  if (!textarea || typeof window === "undefined") {
    return countLogicalLines(text);
  }

  const computedStyle = window.getComputedStyle(textarea);
  const fontSize = parseFloat(computedStyle.fontSize) || 13;
  const availableWidth =
    textarea.clientWidth -
    (parseFloat(computedStyle.paddingLeft) || 0) -
    (parseFloat(computedStyle.paddingRight) || 0);
  const approxCharWidth = fontSize * 0.62;
  const charsPerLine = Math.max(1, Math.floor(availableWidth / approxCharWidth));

  return (text || "").split(/\r?\n/).reduce((total, line) => {
    return total + Math.max(1, Math.ceil(line.length / charsPerLine));
  }, 0);
};

const areLineCountsEqual = (current, next) => {
  const currentKeys = Object.keys(current);
  const nextKeys = Object.keys(next);

  return (
    currentKeys.length === nextKeys.length &&
    nextKeys.every((key) => current[key] === next[key])
  );
};

const normalizeSeoOpportunities = (seoOpportunities) =>
  (Array.isArray(seoOpportunities) ? seoOpportunities : []).map(
    (opportunity, index) => {
      return {
        ...opportunity,
        title: opportunity.title || "Opportunite SEO",
        message: opportunity.message || opportunity.description || "",
        description: opportunity.description || opportunity.message || "",
        priority: opportunity.priority || "low",
        tab: "opportunities",
        category: "opportunity",
        source: "seo-opportunity",
        needs_fix: false,
        generated_fix: "",
        generated_variants: [],
        selected_variant_index: 0,
        generated_message: "",
        recommendation_key:
          opportunity.id || `seo-opportunity-${index}-${opportunity.title || ""}`,
      };
    }
  );

function SEORecommendations({ websiteId, token, seoOpportunities = [] }) {
  const initialCache = readAiPageCache();
  const initialRecommendations =
    initialCache &&
    String(initialCache.websiteId) === String(websiteId) &&
    Array.isArray(initialCache.recommendations) &&
    Date.now() - (initialCache.recommendationsUpdatedAt || 0) < CACHE_TTL
      ? initialCache.recommendations
      : [];

  const [recommendations, setRecommendations] = useState(initialRecommendations);
  const [loading, setLoading] = useState(false);
  const [loadingFixId, setLoadingFixId] = useState(null);
  const [activeRecommendationTab, setActiveRecommendationTab] = useState("all");
  const regeneratingFixRef = useRef(false);
  const codeTextareaRefs = useRef({});
  const [visibleLineCounts, setVisibleLineCounts] = useState({});

  const [showGithubPanel, setShowGithubPanel] = useState(null);
  const [repos, setRepos] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [filePath, setFilePath] = useState("");
  const [connectingGithub, setConnectingGithub] = useState(false);
  const [loadingGithub, setLoadingGithub] = useState(false);

  const authHeaders = {
    Authorization: `Bearer ${token || localStorage.getItem("access")}`,
  };

  const generateFix = async (recommendation) => {
    const res = await api.post(
      `/auto-fix/${websiteId}/`,
      { recommendation },
      { headers: authHeaders }
    );

    const generatedFix = res.data.correction_code || "";
    const backendVariants = Array.isArray(res.data.correction_variants)
      ? res.data.correction_variants
      : [];
    const generatedVariants = [generatedFix, ...backendVariants].filter(
      (variant, variantIndex, variants) =>
        variant && variants.indexOf(variant) === variantIndex
    );
    const realVariants = generatedVariants.filter(isRealCode);
    const backendNeedsFix = res.data.needs_fix ?? true;
    const selectedFix = realVariants[0] || generatedFix;

    return {
      ...recommendation,
      generated_fix: selectedFix,
      generated_variants: realVariants.length ? realVariants : generatedVariants,
      selected_variant_index: 0,
      generated_message: res.data.message || "",
      needs_fix: backendNeedsFix && realVariants.length > 0,
      target_file: res.data.target_file,
    };
  };

  const fetchRecommendations = async () => {
    if (!websiteId) return;

    const cached = readAiPageCache();
    if (
      cached &&
      String(cached.websiteId) === String(websiteId) &&
      Array.isArray(cached.recommendations) &&
      Date.now() - (cached.recommendationsUpdatedAt || 0) < CACHE_TTL
    ) {
      setRecommendations(cached.recommendations);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const res = await api.get(`/recommendations/${websiteId}/?fast=1`, {
        headers: authHeaders,
      });

      const data = Array.isArray(res.data) ? sortByPriority(res.data) : [];
      const generateFixesImmediately =
        new URLSearchParams(window.location.search).get("autoFix") === "1";

      if (!generateFixesImmediately) {
        const dataWithoutFixes = data.map((rec) => ({
          ...rec,
          generated_fix: rec.generated_fix || "",
          generated_variants: Array.isArray(rec.generated_variants)
            ? rec.generated_variants
            : [],
          selected_variant_index: rec.selected_variant_index || 0,
          generated_message: rec.generated_message || "",
          needs_fix: rec.needs_fix ?? null,
        }));

        setRecommendations(dataWithoutFixes);
        writeAiPageCache(websiteId, {
          recommendations: dataWithoutFixes,
          recommendationsUpdatedAt: Date.now(),
        });
      } else {

      const dataWithFixes = await Promise.all(
        data.map(async (rec) => {
          try {
            return await generateFix(rec);
          } catch (error) {
            console.error("Erreur génération correction:", error);
            return {
              ...rec,
              generated_fix: "",
              generated_message:
                "Cette recommandation nécessite une amélioration manuelle.",
              needs_fix: false,
            };
          }
        })
      );

      setRecommendations(sortByPriority(dataWithFixes));
      writeAiPageCache(websiteId, {
        recommendations: sortByPriority(dataWithFixes),
        recommendationsUpdatedAt: Date.now(),
      });
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la recuperation des recommandations");
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [websiteId]);

  useEffect(() => {
    const updateLineCounts = () => {
      const nextCounts = {};

      recommendations.forEach((rec, index) => {
        const generatedFix = rec.generated_fix || "";

        if (rec.needs_fix === true && isRealCode(generatedFix)) {
          nextCounts[index] = countVisibleLines(
            generatedFix,
            codeTextareaRefs.current[index]
          );
        }
      });

      setVisibleLineCounts((currentCounts) =>
        areLineCountsEqual(currentCounts, nextCounts) ? currentCounts : nextCounts
      );
    };

    updateLineCounts();
    window.addEventListener("resize", updateLineCounts);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateLineCounts)
        : null;

    Object.values(codeTextareaRefs.current).forEach((textarea) => {
      if (textarea && resizeObserver) {
        resizeObserver.observe(textarea);
      }
    });

    return () => {
      window.removeEventListener("resize", updateLineCounts);
      resizeObserver?.disconnect();
    };
  }, [recommendations]);

  useEffect(() => {
  const savedPanel = localStorage.getItem("github_panel_open");
  const savedRepo = localStorage.getItem("github_selected_repo");
  const savedBranch = localStorage.getItem("github_selected_branch");

  if (savedPanel !== null) {
    setShowGithubPanel(Number(savedPanel));
  }

  if (savedRepo) {
    setSelectedRepo(savedRepo);
  }

  if (savedBranch) {
    setSelectedBranch(savedBranch);
  }

  localStorage.removeItem("github_panel_open");
  localStorage.removeItem("github_selected_repo");
  localStorage.removeItem("github_selected_branch");
}, []);

  const handleRegenerate = async (recommendation, index) => {
    if (regeneratingFixRef.current) return;

    regeneratingFixRef.current = true;
    setLoadingFixId(index);

    try {
      const fixed = await generateFix(recommendation);
      const currentFix = recommendations[index]?.generated_fix || "";
      const nextVariant =
        fixed.generated_variants?.find((variant) => variant !== currentFix) ||
        fixed.generated_fix;
      const nextSelectedIndex = Math.max(
        0,
        fixed.generated_variants?.findIndex((variant) => variant === nextVariant) ?? 0
      );
      const updated = [...recommendations];
      updated[index] = {
        ...fixed,
        generated_fix: nextVariant,
        selected_variant_index: nextSelectedIndex,
        show_fix_details: true,
      };
      const sorted = sortByPriority(updated);

      setRecommendations(sorted);
      writeAiPageCache(websiteId, {
        recommendations: sorted,
        recommendationsUpdatedAt: Date.now(),
      });
      toast.success("Correction IA régénérée");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la régénération");
    } finally {
      regeneratingFixRef.current = false;
      setLoadingFixId(null);
    }
  };

  const handleCopy = async (text) => {
    if (!isRealCode(text)) {
      toast.error("Aucun vrai code à copier");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      toast.success("Code copié");
    } catch (error) {
      console.error(error);
      toast.error("Impossible de copier");
    }
  };
const connectGithub = async () => {
  let popup = null;

  try {
    setConnectingGithub(true);
    popup = window.open(
      "",
      "seomind_github_oauth",
      "width=640,height=760,left=120,top=80"
    );

    if (!popup) {
      setConnectingGithub(false);
      toast.error("Autorisez la fenêtre GitHub pour continuer la connexion.");
      return;
    }

    localStorage.setItem("github_panel_open", showGithubPanel);
    localStorage.setItem("github_selected_repo", selectedRepo);
    localStorage.setItem("github_selected_branch", selectedBranch);

    writeAiPageCache(websiteId, {
      recommendations,
      recommendationsUpdatedAt: Date.now(),
    });

    const res = await api.get(
      `/github/login/?next=${encodeURIComponent(
        "/github-connected"
      )}`,
      { headers: authHeaders }
    );

    popup.location.href = res.data.auth_url;
    popup.focus();

    const popupWatcher = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(popupWatcher);
        setConnectingGithub(false);
      }
    }, 500);
  } catch (error) {
    if (popup && !popup.closed) {
      popup.close();
    }
    setConnectingGithub(false);
    console.error(error);
    toast.error("Erreur connexion GitHub");
  }
};

  const loadRepos = async () => {
    try {
      const res = await api.get("/github/repos/", { headers: authHeaders });
      setRepos(res.data || []);
      toast.success("Dépôts chargés");
    } catch (error) {
      console.error(error);
      toast.error("Connecte GitHub d'abord");
    }
  };

  useEffect(() => {
    const finishGithubConnection = () => {
      setConnectingGithub(false);
      toast.success("GitHub connecté avec succès");
      loadRepos();
    };

    const handleGithubConnected = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== GITHUB_CONNECTED_MESSAGE) return;

      finishGithubConnection();
    };

    const handleGithubStorage = (event) => {
      if (event.key !== GITHUB_CONNECTED_STORAGE_KEY) return;

      finishGithubConnection();
    };

    window.addEventListener("message", handleGithubConnected);
    window.addEventListener("storage", handleGithubStorage);

    return () => {
      window.removeEventListener("message", handleGithubConnected);
      window.removeEventListener("storage", handleGithubStorage);
    };
  }, []);

  const loadBranches = async (fullName) => {
    setSelectedRepo(fullName);
    setSelectedBranch("");
    setBranches([]);
    setFilePath("");

    const repo = repos.find((r) => r.full_name === fullName);
    if (!repo) return;

    try {
      const res = await api.get(`/github/branches/${repo.owner}/${repo.name}/`, {
        headers: authHeaders,
      });

      setBranches(res.data || []);
      setSelectedBranch(repo.default_branch);
    } catch (error) {
      console.error(error);
      toast.error("Impossible de charger les branches");
    }
  };

  const getAutomaticFilePath = async (repo) => {
    if (filePath.trim()) {
      return filePath.trim();
    }

    const res = await api.get(
      `/github/candidate-files/${repo.owner}/${repo.name}/?branch=${encodeURIComponent(selectedBranch)}`,
      { headers: authHeaders }
    );
    const files = res.data || [];
    const targetPath = files[0]?.path || "";

    setFilePath(targetPath);

    return targetPath;
  };

  const applyOnGithub = async (recommendation) => {
    const repo = repos.find((r) => r.full_name === selectedRepo);

    if (!repo || !selectedBranch || !recommendation.generated_fix) {
      toast.error("Choisis un dépôt et une branche");
      return;
    }

    setLoadingGithub(true);

    try {
      const targetFilePath = await getAutomaticFilePath(repo);

      if (!targetFilePath) {
        toast.error("Aucun fichier SEO trouvé automatiquement dans ce dépôt");
        return;
      }

      const res = await api.post(
        "/github/create-branch-pr/",
        {
          owner: repo.owner,
          repo: repo.name,
          base_branch: selectedBranch,
          file_path: targetFilePath,
          recommendation,
          generated_fix: recommendation.generated_fix,
        },
        { headers: authHeaders }
      );

      toast.success("Branche créée et Pull Request ouverte");

      if (res.data.pull_request_url) {
        window.open(res.data.pull_request_url, "_blank");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur création Pull Request");
    } finally {
      setLoadingGithub(false);
    }
  };

  const styles = {
    wrapper: {
      background: "var(--bg-secondary)",
      border: "1px solid var(--border)",
      borderRadius: "18px",
      padding: "24px",
      marginTop: "20px",
      boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
    },
    panelTitle: {
      margin: "0 0 20px",
      color: "var(--text-primary)",
      fontSize: "24px",
      fontWeight: "900",
    },
    tabs: {
      display: "flex",
      alignItems: "center",
      gap: "28px",
      borderBottom: "1px solid var(--border)",
      marginBottom: "18px",
      overflowX: "auto",
    },
    tab: {
      position: "relative",
      border: "none",
      background: "transparent",
      padding: "0 0 13px",
      color: "var(--text-secondary)",
      fontSize: "14px",
      fontWeight: "900",
      cursor: "pointer",
      whiteSpace: "nowrap",
    },
    activeTab: {
      color: "#4f46e5",
    },
    activeTabLine: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: "-1px",
      height: "3px",
      borderRadius: "999px 999px 0 0",
      background: "#6d5dfc",
    },
    list: {
      display: "grid",
      gap: "14px",
    },
    card: {
      background: "var(--bg-secondary)",
      borderRadius: "14px",
      padding: "18px",
      border: "1px solid var(--border)",
      boxShadow: "0 12px 26px rgba(15, 23, 42, 0.05)",
    },
    cardMain: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: "16px",
      flexWrap: "wrap",
    },
    cardCopy: {
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
      minWidth: "240px",
      flex: "1 1 420px",
    },
    statusDot: {
      width: "10px",
      height: "10px",
      borderRadius: "999px",
      marginTop: "7px",
      flex: "0 0 auto",
      border: "2px solid currentColor",
      background: "#ffffff",
    },
    titleRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: "12px",
      marginBottom: "10px",
      flexWrap: "wrap",
    },
    title: {
      margin: 0,
      color: "var(--text-primary)",
      fontSize: "16px",
      fontWeight: "800",
      lineHeight: "1.35",
    },
    description: {
      margin: 0,
      color: "var(--text-secondary)",
      fontSize: "14px",
      lineHeight: "1.55",
    },
    badge: {
      padding: "7px 10px",
      borderRadius: "999px",
      fontSize: "13px",
      fontWeight: "800",
      whiteSpace: "nowrap",
    },
    cardActions: {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: "10px",
      flexWrap: "wrap",
      flex: "0 1 260px",
    },
    insightRow: {
      display: "flex",
      gap: "8px",
      flexWrap: "wrap",
      margin: "14px 0 0",
    },
    insightChip: {
      padding: "7px 10px",
      borderRadius: "8px",
      background: "var(--bg-primary)",
      color: "var(--text-secondary)",
      border: "1px solid var(--border)",
      fontSize: "12px",
      fontWeight: "700",
    },
    actionList: {
      margin: "14px 0 0",
      padding: "12px 16px 12px 28px",
      borderRadius: "10px",
      background: "var(--bg-primary)",
      color: "var(--text-primary)",
      border: "1px solid var(--border)",
      fontSize: "14px",
      lineHeight: "1.6",
    },
    fixBox: {
      border: "1px solid #e2e8f0",
      borderRadius: "16px",
      marginTop: "16px",
      background: "#ffffff",
      padding: "18px",
      boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
    },
    fixHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      marginBottom: "14px",
      flexWrap: "wrap",
    },
    fixTitle: {
      margin: 0,
      color: "#111827",
      fontSize: "15px",
      fontWeight: "900",
    },
    targetBadge: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "8px 11px",
      borderRadius: "10px",
      background: "#eef2ff",
      color: "#374151",
      border: "1px solid #e0e7ff",
      fontSize: "13px",
      fontWeight: "800",
    },
    targetPath: {
      color: "#111827",
      fontFamily: "monospace",
      fontWeight: "900",
    },
    codeShell: {
      display: "grid",
      gridTemplateColumns: "44px minmax(0, 1fr)",
      minHeight: "150px",
      borderRadius: "12px",
      overflow: "hidden",
      background: "#0f172a",
      border: "1px solid #1e293b",
      boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
    },
    codeGutter: {
      padding: "14px 0",
      background: "#111827",
      color: "#64748b",
      borderRight: "1px solid rgba(148, 163, 184, 0.16)",
      fontFamily: "monospace",
      fontSize: "13px",
      lineHeight: "1.65",
      textAlign: "right",
      userSelect: "none",
    },
    codeLineNumber: {
      display: "block",
      paddingRight: "12px",
    },
    code: {
      margin: 0,
      padding: "14px 16px",
      background: "#0f172a",
      color: "#e5e7eb",
      fontFamily: "Consolas, 'SFMono-Regular', monospace",
      fontSize: "13px",
      lineHeight: "1.65",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      overflowX: "auto",
      border: "none",
      outline: "none",
      resize: "vertical",
      minHeight: "150px",
      width: "100%",
      boxSizing: "border-box",
    },
    actionRow: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
      gap: "12px",
      marginTop: "16px",
    },
    btn: {
      border: "none",
      minHeight: "44px",
      padding: "0 16px",
      borderRadius: "10px",
      cursor: "pointer",
      color: "#fff",
      fontWeight: "800",
      fontSize: "14px",
      background: "linear-gradient(135deg, #6366f1, #7c3aed)",
      boxShadow: "0 12px 22px rgba(99, 102, 241, 0.18)",
    },
    btnDark: {
      background: "linear-gradient(135deg, #111827, #1f2937)",
      boxShadow: "0 12px 22px rgba(15, 23, 42, 0.2)",
    },
    btnLight: {
      background: "#ffffff",
      color: "#111827",
      border: "1px solid #e2e8f0",
      boxShadow: "0 10px 20px rgba(15, 23, 42, 0.06)",
    },
    githubBox: {
      marginTop: "16px",
      padding: "16px",
      borderRadius: "14px",
      border: "1px solid var(--border)",
      background: "var(--bg-primary)",
    },
    input: {
      width: "100%",
      padding: "12px",
      borderRadius: "10px",
      border: "1px solid var(--border)",
      marginBottom: "10px",
      boxSizing: "border-box",
    },
    githubActions: {
      display: "flex",
      gap: "8px",
      flexWrap: "wrap",
      marginBottom: "10px",
    },
    githubLoading: {
      margin: "4px 0 12px",
      color: "var(--text-secondary)",
      fontSize: "14px",
      fontWeight: "700",
    },
    noFixBox: {
      marginTop: "12px",
      padding: "14px 16px",
      borderRadius: "12px",
      background: "#ecfdf5",
      color: "#065f46",
      border: "1px solid #a7f3d0",
      fontSize: "15px",
      fontWeight: "700",
      lineHeight: "1.6",
    },
    emptyState: {
      background: "var(--bg-secondary)",
      borderRadius: "16px",
      padding: "24px",
      color: "var(--text-secondary)",
    },
    tabEmptyState: {
      padding: "24px",
      borderRadius: "14px",
      border: "1px dashed var(--border)",
      color: "var(--text-secondary)",
      textAlign: "center",
      fontSize: "14px",
      background: "var(--bg-primary)",
    },
    loadingState: {
      background: "var(--bg-secondary)",
      borderRadius: "16px",
      padding: "24px",
      color: "var(--text-secondary)",
      border: "1px solid rgba(99, 102, 241, 0.16)",
      boxShadow: "0 12px 30px rgba(15, 23, 42, 0.05)",
      overflow: "hidden",
    },
    loadingTop: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      marginBottom: "16px",
    },
    loadingDot: {
      width: "38px",
      height: "38px",
      borderRadius: "12px",
      border: "3px solid rgba(99, 102, 241, 0.18)",
      borderTopColor: "#14b8a6",
      flex: "0 0 auto",
      animation: "seoRecommendationsSpin 0.85s linear infinite",
    },
    loadingTitle: {
      margin: 0,
      color: "var(--text-primary)",
      fontSize: "16px",
      fontWeight: "800",
    },
    loadingCopy: {
      margin: "4px 0 0",
      color: "var(--text-secondary)",
      fontSize: "14px",
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
      animation: "seoRecommendationsBar 1.2s ease-in-out infinite",
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
      animation: "seoRecommendationsSkeleton 1.35s ease-in-out infinite",
    },
  };

  if (!websiteId) return null;

  if (loading) {
    return (
      <div style={styles.loadingState}>
        <style>
          {`
            @keyframes seoRecommendationsSpin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }

            @keyframes seoRecommendationsBar {
              0% { transform: translateX(-110%); }
              55%, 100% { transform: translateX(230%); }
            }

            @keyframes seoRecommendationsSkeleton {
              0% { background-position: 220% 0; }
              100% { background-position: -220% 0; }
            }
          `}
        </style>
        <div style={styles.loadingTop}>
          <span style={styles.loadingDot} />
          <div>
            <p style={styles.loadingTitle}>
              Generation des recommandations IA en cours
            </p>
            <p style={styles.loadingCopy}>
              Analyse des donnees SEO et preparation des actions correctives.
            </p>
          </div>
        </div>
        <div style={styles.loadingTrack}>
          <div style={styles.loadingFill} />
        </div>
        <div style={styles.skeletonStack}>
          {[100, 86, 72].map((width) => (
            <div
              key={width}
              style={{ ...styles.skeletonLine, width: `${width}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  const seoOpportunityRecommendations =
    normalizeSeoOpportunities(seoOpportunities);
  const recommendationItems = [
    ...recommendations.map((recommendation, index) => ({
      recommendation,
      originalIndex: index,
    })),
    ...seoOpportunityRecommendations.map((recommendation, index) => ({
      recommendation,
      originalIndex: `seo-opportunity-${index}`,
    })),
  ];

  if (!recommendationItems.length) {
    return (
      <div style={styles.emptyState}>
        Aucune recommandation disponible pour ce site.
      </div>
    );
  }

  const filteredRecommendations =
    activeRecommendationTab === "all"
      ? sortAllRecommendationItems(recommendationItems)
      : recommendationItems.filter(
          ({ recommendation }) =>
            getRecommendationTabKey(recommendation) === activeRecommendationTab
        );
  const tabCounts = recommendationItems.reduce(
    (counts, recommendation) => {
      const tabKey = getRecommendationTabKey(recommendation.recommendation);
      return {
        ...counts,
        all: counts.all + 1,
        ...(tabKey !== "all" ? { [tabKey]: counts[tabKey] + 1 } : {}),
      };
    },
    { all: 0, errors: 0, warnings: 0, opportunities: 0 }
  );

  return (
    <div style={styles.wrapper}>
      <h3 style={styles.panelTitle}>Recommandations</h3>

      <div style={styles.tabs}>
        {recommendationTabs.map((tab) => {
          const isActive = activeRecommendationTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              style={{
                ...styles.tab,
                ...(isActive ? styles.activeTab : {}),
              }}
              onClick={() => setActiveRecommendationTab(tab.key)}
            >
              {tab.label}
              {tabCounts[tab.key] > 0 ? ` (${tabCounts[tab.key]})` : ""}
              {isActive && <span style={styles.activeTabLine} />}
            </button>
          );
        })}
      </div>

      <div style={styles.list}>
      {filteredRecommendations.length === 0 && (
        <div style={styles.tabEmptyState}>
          Aucune recommandation dans cette catégorie.
        </div>
      )}

      {filteredRecommendations.map(({ recommendation: rec, originalIndex: index }) => {
        const tabKey = getRecommendationTabKey(rec);
        const prioritySource =
          tabKey === "opportunities" ? opportunityPriorityConfig : priorityConfig;
        const priority = prioritySource[rec.priority] || prioritySource.medium;
        const generatedFix = rec.generated_fix || "";
        const showCodeBlock = rec.needs_fix === true && isRealCode(generatedFix);
        const hasFixResult =
          (rec.needs_fix !== null && rec.needs_fix !== undefined) ||
          Boolean(rec.generated_message) ||
          Boolean(generatedFix);
        const isGeneratingAnyFix = loadingFixId !== null;
        const isGeneratingFix = loadingFixId === index;
        const canGenerateFix =
          rec.source !== "seo-opportunity" && isAutoFixEligible(rec);
        const shouldShowNoFixMessage =
          canGenerateFix &&
          !showCodeBlock &&
          hasFixResult &&
          hasUsefulGeneratedMessage(rec.generated_message);
        const canCreateGithubPr = Boolean(
          selectedRepo && selectedBranch
        );
        const codeLineCount =
          visibleLineCounts[index] || countLogicalLines(generatedFix);
        const shouldShowFixDetails = rec.show_fix_details === true;
        const targetFileLabel = rec.target_file || "fichier cible";
        const showPriorityBadge = !isTopPageOptimization(rec);

        return (
          <div
            key={`${rec.title}-${index}`}
            style={{ ...styles.card, borderLeft: `4px solid ${priority.color}` }}
          >
            <div style={styles.cardMain}>
              <div style={styles.cardCopy}>
                <span style={{ ...styles.statusDot, color: priority.color }} />
                <div>
                  <div style={styles.titleRow}>
                    <h3 style={styles.title}>{rec.title}</h3>
                  </div>

                  <p style={{ ...styles.description, whiteSpace: "pre-line" }}>
                    {rec.message || rec.description}
                  </p>
                </div>
              </div>

              <div style={styles.cardActions}>
                {showPriorityBadge && (
                  <span
                    style={{
                      ...styles.badge,
                      color: priority.color,
                      background: priority.bg,
                    }}
                  >
                    {priority.label}
                  </span>
                )}

                {canGenerateFix && (
                  <button
                    style={styles.btn}
                    onClick={() => {
                      if (!hasFixResult) {
                        handleRegenerate(rec, index);
                        return;
                      }

                      const updated = [...recommendations];
                      updated[index].show_fix_details = !shouldShowFixDetails;
                      setRecommendations(updated);
                      writeAiPageCache(websiteId, {
                        recommendations: updated,
                        recommendationsUpdatedAt: Date.now(),
                      });
                    }}
                    disabled={isGeneratingAnyFix}
                  >
                    {isGeneratingFix
                      ? "Préparation..."
                      : shouldShowFixDetails
                      ? "Masquer la correction IA"
                      : "Voir la correction IA"}
                  </button>
                )}
              </div>
            </div>

            <div style={styles.insightRow}>
              {rec.impact && (
                <span style={styles.insightChip}>
                  {impactLabels[rec.impact] || rec.impact}
                </span>
              )}
              {rec.difficulty && (
                <span style={styles.insightChip}>
                  Difficulté : {difficultyLabels[rec.difficulty] || rec.difficulty}
                </span>
              )}
              {Number(rec.estimated_gain) > 0 && (
                <span style={styles.insightChip}>
                  Gain estimé : +{rec.estimated_gain}/100
                </span>
              )}
            </div>

            {Array.isArray(rec.action_steps) && rec.action_steps.length > 0 && (
              <ol style={styles.actionList}>
                {rec.action_steps.slice(0, 3).map((step, stepIndex) => (
                  <li key={`${rec.title}-step-${stepIndex}`}>{step}</li>
                ))}
              </ol>
            )}

            {false && (
              <button
                style={styles.btn}
                onClick={() => handleRegenerate(rec, index)}
                disabled={isGeneratingAnyFix}
              >
                {isGeneratingFix
                  ? "Génération de la correction..."
                  : "Générer correction IA"}
              </button>
            )}

            {shouldShowFixDetails && shouldShowNoFixMessage && (
              <div style={styles.noFixBox}>
                {rec.generated_message ||
                  "Cette recommandation nécessite une amélioration manuelle, pas un code direct à copier."}
              </div>
            )}

            {shouldShowFixDetails && showCodeBlock && (
              <>
                <div style={styles.fixBox}>
                  <div style={styles.fixHeader}>
                    <p style={styles.fixTitle}>
                      Correction IA générée automatiquement
                    </p>
                    <div style={styles.targetBadge}>
                      <span>À coller dans :</span>
                      <strong style={styles.targetPath}>{targetFileLabel}</strong>
                    </div>
                  </div>

                  <div style={styles.codeShell}>
                    <div style={styles.codeGutter} aria-hidden="true">
                      {Array.from({ length: codeLineCount }).map((_, lineIndex) => (
                        <span key={lineIndex} style={styles.codeLineNumber}>
                          {lineIndex + 1}
                        </span>
                      ))}
                    </div>

                    <textarea
                      ref={(textarea) => {
                        if (textarea) {
                          codeTextareaRefs.current[index] = textarea;
                        } else {
                          delete codeTextareaRefs.current[index];
                        }
                      }}
                      value={rec.generated_fix}
                      onChange={(e) => {
                        const updated = [...recommendations];
                        updated[index].generated_fix = e.target.value;
                        setRecommendations(updated);
                        writeAiPageCache(websiteId, {
                          recommendations: updated,
                          recommendationsUpdatedAt: Date.now(),
                        });
                      }}
                      style={{
                        ...styles.code,
                        cursor: "text",
                      }}
                    />
                  </div>

                  <div style={styles.actionRow}>
                    <button
                      style={styles.btn}
                      onClick={() => handleCopy(rec.generated_fix)}
                    >
                      Copier
                    </button>

                    <button
                      style={{
                        ...styles.btn,
                        ...styles.btnDark,
                      }}
                      onClick={() =>
                        setShowGithubPanel(
                          showGithubPanel === index ? null : index
                        )
                      }
                    >
                      Appliquer sur GitHub
                    </button>

                    <button
                      style={{
                        ...styles.btn,
                        ...styles.btnLight,
                        opacity: isGeneratingAnyFix ? 0.65 : 1,
                        cursor: isGeneratingAnyFix ? "not-allowed" : "pointer",
                      }}
                      onClick={() => handleRegenerate(rec, index)}
                      disabled={isGeneratingAnyFix}
                    >
                      {isGeneratingFix ? "Régénération IA..." : "Régénérer IA"}
                    </button>
                  </div>
                </div>

                {showGithubPanel === index && (
                  <div style={styles.githubBox}>
                    <h4 style={{ marginTop: 0, color: "var(--text-primary)" }}>
                      Appliquer sur GitHub
                    </h4>

                    <div style={styles.githubActions}>
                      <button
                        style={{
                          ...styles.btn,
                          opacity: connectingGithub ? 0.65 : 1,
                          cursor: connectingGithub ? "not-allowed" : "pointer",
                        }}
                        onClick={connectGithub}
                        disabled={connectingGithub}
                      >
                        {connectingGithub
                          ? "Connexion GitHub..."
                          : "Connecter GitHub"}
                      </button>

                      <button style={styles.btn} onClick={loadRepos}>
                        Charger dépôts
                      </button>

                    </div>

                    {connectingGithub && (
                      <p style={styles.githubLoading}>
                        Connexion GitHub en cours... gardez cette page ouverte.
                      </p>
                    )}

                    <select
                      style={styles.input}
                      value={selectedRepo}
                      onChange={(e) => loadBranches(e.target.value)}
                    >
                      <option value="">Choisir un dépôt</option>
                      {repos.map((repo) => (
                        <option key={repo.id} value={repo.full_name}>
                          {repo.full_name}
                        </option>
                      ))}
                    </select>

                    <select
                      style={styles.input}
                      value={selectedBranch}
                      onChange={(e) => {
                        setSelectedBranch(e.target.value);
                        setFilePath("");
                      }}
                    >
                      <option value="">Choisir une branche</option>
                      {branches.map((branch) => (
                        <option key={branch.name} value={branch.name}>
                          {branch.name}
                        </option>
                      ))}
                    </select>

                    <button
                      style={{
                        ...styles.btn,
                        width: "100%",
                        background: canCreateGithubPr
                          ? "linear-gradient(90deg, #059669, #10b981)"
                          : "#94a3b8",
                        cursor: canCreateGithubPr ? "pointer" : "not-allowed",
                      }}
                      onClick={() => applyOnGithub(rec)}
                      disabled={loadingGithub || !canCreateGithubPr}
                    >
                      {loadingGithub
                        ? "Création branche + PR..."
                        : "Créer branche + Pull Request"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

export default SEORecommendations;
