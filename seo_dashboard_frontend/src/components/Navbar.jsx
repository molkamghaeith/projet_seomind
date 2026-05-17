import { Link, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback, useLayoutEffect } from "react";
import api from "../services/api";
import { githubDisconnect } from "../services/githubApi";
import { useTheme } from "../context/useTheme";
import toast from "react-hot-toast";
import {
  BarChart3,
  Bell,
  BrainCircuit,
  LayoutDashboard,
  LogOut,
  Moon,
  Search,
  Settings,
  Sun,
} from "lucide-react";

const clearGitHubStorage = () => {
  localStorage.removeItem("seomind_github_connected_at");
  localStorage.removeItem("github_panel_open");
  localStorage.removeItem("github_selected_repo");
  localStorage.removeItem("github_selected_branch");
};

const clearSelectedSiteStorage = () => {
  localStorage.removeItem("selected_dashboard_site_id");
  localStorage.removeItem("selected_dashboard_site_url");
  localStorage.removeItem("selected_dashboard_site_name");
  localStorage.removeItem("selected_ai_site_id");
  sessionStorage.removeItem("ai_recommendations_page_cache");
};

function Navbar() {
  const location = useLocation();
  const { darkMode, toggleDarkMode } = useTheme();

  const [token, setToken] = useState(() => localStorage.getItem("access"));
  const [loading, setLoading] = useState(() =>
    Boolean(localStorage.getItem("access"))
  );
  const [user, setUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);

  const handleLogout = useCallback(async () => {
    if (localStorage.getItem("access")) {
      try {
        await githubDisconnect();
      } catch (error) {
        console.error("Erreur deconnexion GitHub:", error);
      }
    }

    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
    clearGitHubStorage();
    clearSelectedSiteStorage();
    sessionStorage.clear();

    setToken(null);
    setUser(null);
    setIsSuperAdmin(false);
    setPendingUsersCount(0);
    toast.success("Deconnexion reussie.");
    if (location.pathname !== "/") {
      window.location.replace("/");
    }
  }, [location.pathname]);

  const fetchPendingUsersCount = useCallback(async (notify = false) => {
    try {
      const res = await api.get("/auth/admin/stats/");
      const nextCount = Number(res.data?.pending_users || 0);

      setPendingUsersCount((previousCount) => {
        if (notify && nextCount > previousCount) {
          const difference = nextCount - previousCount;
          toast.success(
            difference === 1
              ? "Nouvelle demande d'activation recue."
              : `${difference} nouvelles demandes d'activation recues.`
          );
        }

        return nextCount;
      });
    } catch (error) {
      console.error("Erreur recuperation demandes en attente:", error);
      setPendingUsersCount(0);
    }
  }, []);

  useEffect(() => {
    const currentToken = localStorage.getItem("access");

    if (!currentToken) {
      setToken(null);
      setUser(null);
      setIsSuperAdmin(false);
      setPendingUsersCount(0);
      setLoading(false);
      return;
    }

    setToken(currentToken);

    const loadUser = async () => {
      setLoading(true);

      try {
        const res = await api.get("/auth/me/", {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        });

        setUser(res.data);

        const isAdmin = res.data.is_superuser === true;
        setIsSuperAdmin(isAdmin);

        if (isAdmin) {
          await fetchPendingUsersCount(false);
        } else {
          setPendingUsersCount(0);
        }
      } catch (error) {
        console.error("Erreur utilisateur:", error);

        if (error.response?.status === 401) {
          handleLogout();
          return;
        }

        setUser(null);
        setIsSuperAdmin(false);
        setPendingUsersCount(0);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [location.pathname, fetchPendingUsersCount, handleLogout]);

  useEffect(() => {
    if (!token || !isSuperAdmin) return undefined;

    const refreshPendingUsers = () => fetchPendingUsersCount(false);

    const intervalId = window.setInterval(() => {
      fetchPendingUsersCount(true);
    }, 15000);

    window.addEventListener("admin-pending-users-updated", refreshPendingUsers);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(
        "admin-pending-users-updated",
        refreshPendingUsers
      );
    };
  }, [token, isSuperAdmin, fetchPendingUsersCount]);

  useLayoutEffect(() => {
    const sidebarEnabled = Boolean(token);
    document.body.classList.toggle("sidebar-nav-active", sidebarEnabled);

    return () => {
      document.body.classList.remove("sidebar-nav-active");
    };
  }, [token]);

  const styles = {
    topNav: {
      width: "100%",
      background: "var(--bg-secondary)",
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      padding: "16px 32px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      boxSizing: "border-box",
      backdropFilter: "blur(10px)",
      position: "fixed",
      top: 0,
      left: 0,
      zIndex: 1000,
    },
    sidebar: {
      position: "fixed",
      top: 0,
      left: 0,
      bottom: 0,
      width: "250px",
      height: "100vh",
      padding: "34px 22px",
      borderRadius: 0,
      background:
        "linear-gradient(180deg, #2c2470 0%, #1f195c 54%, #151146 100%)",
      border: "1px solid rgba(255,255,255,0.14)",
      boxShadow: "0 18px 40px rgba(22, 18, 72, 0.32)",
      display: "flex",
      flexDirection: "column",
      boxSizing: "border-box",
      zIndex: 1000,
    },
    logo: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
      textDecoration: "none",
      marginBottom: "32px",
      fontSize: "24px",
      fontWeight: "900",
      letterSpacing: "0",
      textTransform: "uppercase",
    },
    logoMark: {
      width: "52px",
      height: "52px",
      borderRadius: "18px",
      background: "linear-gradient(145deg, #8b5cf6, #4f46e5)",
      color: "#ffffff",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "0 0 auto",
      boxShadow: "0 14px 30px rgba(15, 12, 58, 0.32)",
    },
    logoTextDark: {
      color: "#f8fafc",
    },
    logoTextAccent: {
      color: "#8b8cf6",
    },
    menu: {
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    },
    link: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      minHeight: "48px",
      padding: "0 14px",
      borderRadius: "12px",
      color: "rgba(255,255,255,0.82)",
      textDecoration: "none",
      fontSize: "14px",
      lineHeight: "1.2",
      fontWeight: "800",
      transition: "background 0.2s ease, color 0.2s ease",
    },
    activeLink: {
      background: "rgba(255,255,255,0.12)",
      color: "#ffffff",
    },
    icon: {
      width: "20px",
      height: "20px",
      flex: "0 0 auto",
    },
    bottomActions: {
      marginTop: "auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
      flexWrap: "wrap",
    },
    iconButton: {
      width: "42px",
      height: "42px",
      borderRadius: "12px",
      border: "1px solid rgba(255,255,255,0.16)",
      background: "rgba(255,255,255,0.08)",
      color: "#fff",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      position: "relative",
    },
    badge: {
      position: "absolute",
      top: "-7px",
      right: "-7px",
      minWidth: "18px",
      height: "18px",
      padding: "0 5px",
      borderRadius: "999px",
      background: "#ef4444",
      color: "#fff",
      border: "2px solid #241d65",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "10px",
      fontWeight: "900",
      lineHeight: 1,
      boxSizing: "border-box",
    },
    topLogo: {
      fontSize: "28px",
      fontWeight: "bold",
      textDecoration: "none",
      color: "var(--text-primary)",
    },
    logoAccent: {
      color: "var(--accent)",
    },
    topLinks: {
      display: "flex",
      gap: "20px",
      alignItems: "center",
    },
    topLink: {
      textDecoration: "none",
      color: "var(--text-primary)",
      fontWeight: "600",
    },
    topActiveLink: {
      textDecoration: "none",
      color: "var(--accent)",
      fontWeight: "700",
    },
    themeToggle: {
      background: "none",
      border: "none",
      color: "var(--text-primary)",
      cursor: "pointer",
      padding: "8px",
      borderRadius: "50%",
      transition: "background 0.2s",
    },
  };

  const currentPath = `${location.pathname}${location.search}`;
  const getTopLinkStyle = (path) =>
    location.pathname === path ? styles.topActiveLink : styles.topLink;
  const pendingBadgeLabel =
    pendingUsersCount > 99 ? "99+" : pendingUsersCount;
  const notificationTitle =
    pendingUsersCount > 0
      ? `${pendingUsersCount} utilisateur(s) en attente d'activation`
      : "Aucune demande d'activation en attente";

  const menuItems = [
    {
      label: "Tableau de bord",
      to: "/dashboard",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: "Analyses",
      to: "/dashboard?section=analyses",
      icon: BarChart3,
    },
    {
      label: "Recommandations",
      to: "/ai-recommendations",
      icon: BrainCircuit,
      exactPath: "/ai-recommendations",
    },
    {
      label: "Parametres",
      to: "/profile",
      icon: Settings,
      exactPath: "/profile",
    },
  ];

  if (loading && !token) {
    return (
      <nav style={styles.topNav}>
        <Link to="/" style={styles.topLogo}>
          SEO<span style={styles.logoAccent}>mind</span>
        </Link>

        <div style={styles.topLinks}>
          <button onClick={toggleDarkMode} style={styles.themeToggle}>
            {darkMode ? <Sun size={22} /> : <Moon size={22} />}
          </button>

          <Link to="/" style={styles.topLink}>
            Accueil
          </Link>
        </div>
      </nav>
    );
  }

  if (!token) {
    return (
      <nav style={styles.topNav}>
        <Link to="/" style={styles.topLogo}>
          SEO<span style={styles.logoAccent}>mind</span>
        </Link>

        <div style={styles.topLinks}>
          <button onClick={toggleDarkMode} style={styles.themeToggle}>
            {darkMode ? <Sun size={22} /> : <Moon size={22} />}
          </button>

          <Link to="/" style={getTopLinkStyle("/")}>
            Accueil
          </Link>

          <Link to="/login" style={getTopLinkStyle("/login")}>
            Connexion
          </Link>

          <Link to="/register" style={getTopLinkStyle("/register")}>
            Inscription
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <>
      <style>
        {`
          body.sidebar-nav-active {
            --page-padding: 22px 18px 92px;
          }

          @media (min-width: 760px) {
            body.sidebar-nav-active {
              --page-padding: 38px 42px 34px 292px;
            }
          }

          @media (max-width: 759px) {
            .seomind-sidebar {
              top: auto !important;
              left: 10px !important;
              right: 10px !important;
              bottom: 10px !important;
              width: auto !important;
              height: 72px !important;
              padding: 9px 10px !important;
              flex-direction: row !important;
              align-items: center !important;
              border-radius: 12px !important;
            }

            .seomind-sidebar-logo {
              margin: 0 6px 0 0 !important;
            }

            .seomind-sidebar-logo span:last-child {
              display: none !important;
            }

            .seomind-sidebar-menu {
              flex: 1 !important;
              flex-direction: row !important;
              justify-content: space-around !important;
              gap: 4px !important;
            }

            .seomind-sidebar-label {
              display: none !important;
            }

            .seomind-sidebar-actions {
              margin-top: 0 !important;
              flex-wrap: nowrap !important;
            }
          }
        `}
      </style>

      <aside className="seomind-sidebar" style={styles.sidebar}>
        <Link to="/dashboard" className="seomind-sidebar-logo" style={styles.logo}>
          <span style={styles.logoMark}>
            <Search size={31} color="#ffffff" strokeWidth={2.8} />
          </span>
          <span>
            <span style={styles.logoTextDark}>SEO</span>
            <span style={styles.logoTextAccent}>MIND</span>
          </span>
        </Link>

        <div className="seomind-sidebar-menu" style={styles.menu}>
          {menuItems.map(({ label, to, icon: Icon, exact, exactPath }) => {
            const active = exactPath
              ? location.pathname === exactPath
              : exact
              ? currentPath === to
              : currentPath === to;

            return (
              <Link
                key={label}
                to={to}
                style={{
                  ...styles.link,
                  ...(active ? styles.activeLink : {}),
                }}
                title={label}
              >
                <Icon style={styles.icon} strokeWidth={2.4} />
                <span className="seomind-sidebar-label">{label}</span>
              </Link>
            );
          })}
        </div>

        <div className="seomind-sidebar-actions" style={styles.bottomActions}>
          {isSuperAdmin && pendingUsersCount > 0 && (
            <Link
              to="/profile"
              style={styles.iconButton}
              title={notificationTitle}
              aria-label={notificationTitle}
            >
              <Bell size={20} strokeWidth={2.4} />
              <span style={styles.badge}>{pendingBadgeLabel}</span>
            </Link>
          )}

          <button
            type="button"
            onClick={toggleDarkMode}
            style={styles.iconButton}
            title={darkMode ? "Mode clair" : "Mode sombre"}
            aria-label={darkMode ? "Mode clair" : "Mode sombre"}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            style={styles.iconButton}
            title="Deconnexion"
            aria-label="Deconnexion"
          >
            <LogOut size={20} />
          </button>
        </div>
      </aside>
    </>
  );
}

export default Navbar;
