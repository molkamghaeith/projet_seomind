import { useEffect, useState } from "react";
import api from "../services/api";
import { githubDisconnect } from "../services/githubApi";
import toast from "react-hot-toast";
import AdminDashboard from "./AdminDashboard";

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

function Profile() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const getAuthHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem("access")}`,
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/auth/me/", {
          headers: getAuthHeader(),
        });

        setUser(res.data);
        setUsername(res.data.username || "");
        setEmail(res.data.email || "");
      } catch (error) {
        console.error(error);
        toast.error("Impossible de charger le profil.");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await api.put(
        "/auth/profile/update/",
        {
          username,
          email,
        },
        {
          headers: getAuthHeader(),
        }
      );

      setUser((previousUser) => ({ ...previousUser, ...res.data }));
      toast.success("Profil modifié avec succès.");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || "Erreur lors de la modification.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (localStorage.getItem("access")) {
      try {
        await githubDisconnect();
      } catch (error) {
        console.error("Erreur déconnexion GitHub:", error);
      }
    }

    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
    clearGitHubStorage();
    clearSelectedSiteStorage();
    sessionStorage.clear();

    toast.success("Déconnexion réussie.");
    window.location.replace("/login");
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <p>Preparation du profil...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <img
            src={`https://ui-avatars.com/api/?name=${
              user?.username || "User"
            }&background=6366f1&color=fff`}
            alt="avatar"
            style={styles.avatar}
          />

          <div>
            <h2 style={styles.title}>Mon profil</h2>
            <p style={styles.subtitle}>Gérez vos informations personnelles</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Nom d'utilisateur</label>
          <input
            style={styles.input}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div style={styles.infoBox}>
            <p>
              <strong>Rôle :</strong>{" "}
              {user?.is_superuser
                ? "Super Admin"
                : user?.is_staff
                ? "Admin"
                : "Utilisateur"}
            </p>
          </div>

          <div style={styles.actionRow}>
            <button style={styles.button} disabled={saving}>
              {saving ? "Modification..." : "Enregistrer modification"}
            </button>

            <button
              type="button"
              style={styles.logoutButton}
              onClick={handleLogout}
            >
              Déconnexion
            </button>
          </div>
        </form>
      </div>

      {user?.is_superuser && (
        <section style={styles.adminSection}>
          <AdminDashboard embedded />
        </section>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "var(--page-padding, 120px 30px 40px)",
    background: "var(--bg-primary)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "34px",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "600px",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: "20px",
    padding: "32px",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    marginBottom: "30px",
  },
  avatar: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
  },
  title: {
    margin: 0,
    fontSize: "28px",
    color: "var(--text-primary)",
  },
  subtitle: {
    margin: "6px 0 0",
    color: "var(--text-secondary)",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "700",
    color: "var(--text-primary)",
  },
  input: {
    width: "100%",
    padding: "13px 15px",
    marginBottom: "18px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    background: "var(--bg-primary)",
    color: "var(--text-primary)",
    fontSize: "15px",
    boxSizing: "border-box",
  },
  infoBox: {
    background: "var(--bg-primary)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "14px",
    marginBottom: "30px",
    color: "var(--text-primary)",
  },
  actionRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  button: {
    width: "100%",
    background: "var(--accent)",
    color: "#fff",
    border: "none",
    padding: "14px",
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
  },
  logoutButton: {
    width: "100%",
    background: "#fee2e2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    padding: "14px",
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
  },
  adminSection: {
    width: "100%",
    maxWidth: "1180px",
    marginTop: "12S0px",
  },
};

export default Profile;
