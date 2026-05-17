import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  githubLogin,
  githubRepos,
  githubBranches,
  githubGetFile,
  githubCreateBranchPr,
} from "../services/githubApi";

function GitHubPRPanel({ recommendation, generatedFix, needsFix }) {
  const [repos, setRepos] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [filePath, setFilePath] = useState("");
  const [filePreview, setFilePreview] = useState("");
  const [loading, setLoading] = useState(false);

  const repoObject = repos.find((r) => r.full_name === selectedRepo);

  const handleConnectGitHub = async () => {
    let popup = null;

    try {
      popup = window.open(
        "",
        "seomind_github_oauth",
        "width=640,height=760,left=120,top=80"
      );

      if (!popup) {
        toast.error("Autorisez la fenêtre GitHub pour continuer la connexion.");
        return;
      }

      const data = await githubLogin("/github-connected");
      popup.location.href = data.auth_url;
      popup.focus();
    } catch (error) {
      if (popup && !popup.closed) {
        popup.close();
      }
      console.error(error);
      toast.error("Erreur connexion GitHub");
    }
  };

  const loadRepos = async () => {
    try {
      const data = await githubRepos();
      setRepos(data);
      toast.success("Dépôts chargés");
    } catch (error) {
      console.error(error);
      toast.error("Impossible de charger les dépôts");
    }
  };

  useEffect(() => {
    loadRepos();
  }, []);

  const handleRepoChange = async (value) => {
    setSelectedRepo(value);
    setSelectedBranch("");
    setBranches([]);

    const repo = repos.find((r) => r.full_name === value);
    if (!repo) return;

    try {
      const data = await githubBranches(repo.owner, repo.name);
      setBranches(data);
      toast.success("Branches chargées");
      const defaultBranch = data.find((b) => b.name === repo.default_branch);
      if (defaultBranch) {
        setSelectedBranch(defaultBranch.name);
      }
    } catch (error) {
      console.error(error);
      toast.error("Impossible de charger les branches");
    }
  };

  const handlePreviewFile = async () => {
    if (!repoObject || !selectedBranch || !filePath) {
      toast.error("Choisis dépôt, branche et fichier");
      return;
    }

    try {
      const data = await githubGetFile({
        owner: repoObject.owner,
        repo: repoObject.name,
        path: filePath,
        branch: selectedBranch,
      });

      setFilePreview(data.content);
      toast.success("Fichier chargé");
    } catch (error) {
      console.error(error);
      toast.error("Impossible de lire le fichier");
    }
  };

  const handleCreateBranchPr = async () => {
    if (!needsFix) {
      toast.error("Aucune correction à appliquer");
      return;
    }

    if (!repoObject || !selectedBranch || !filePath || !generatedFix) {
      toast.error("Informations manquantes");
      return;
    }

    setLoading(true);
    try {
      const data = await githubCreateBranchPr({
        owner: repoObject.owner,
        repo: repoObject.name,
        base_branch: selectedBranch,
        file_path: filePath,
        recommendation,
        generated_fix: generatedFix,
      });

      toast.success("Branche créée et Pull Request ouverte");
      if (data.pull_request_url) {
        window.open(data.pull_request_url, "_blank");
      }
    } catch (error) {
      console.error(error);
      toast.error("Impossible de créer la PR");
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    card: {
      marginTop: "18px",
      padding: "18px",
      borderRadius: "14px",
      background: "var(--bg-secondary)",
      border: "1px solid var(--border)",
    },
    input: {
      width: "100%",
      padding: "12px",
      borderRadius: "10px",
      border: "1px solid var(--border)",
      marginBottom: "12px",
      boxSizing: "border-box",
    },
    button: {
      padding: "12px 16px",
      borderRadius: "10px",
      border: "none",
      cursor: "pointer",
      fontWeight: "700",
      marginRight: "10px",
      marginBottom: "10px",
      background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
      color: "#fff",
    },
    textarea: {
      width: "100%",
      minHeight: "160px",
      padding: "12px",
      borderRadius: "12px",
      border: "1px solid var(--border)",
      boxSizing: "border-box",
      fontFamily: "monospace",
      marginTop: "10px",
      background: "#fff",
      color: "#111827",
    },
  };

  return (
    <div style={styles.card}>
      <h4>GitHub — créer une branche et une Pull Request</h4>

      <button style={styles.button} onClick={handleConnectGitHub}>
        Connecter GitHub
      </button>

      <button style={styles.button} onClick={loadRepos}>
        Charger dépôts
      </button>

      <select
        style={styles.input}
        value={selectedRepo}
        onChange={(e) => handleRepoChange(e.target.value)}
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
        onChange={(e) => setSelectedBranch(e.target.value)}
      >
        <option value="">Choisir une branche</option>
        {branches.map((branch) => (
          <option key={branch.name} value={branch.name}>
            {branch.name}
          </option>
        ))}
      </select>

      <input
        style={styles.input}
        type="text"
        placeholder="Chemin du fichier, ex: src/pages/Home.jsx ou index.html"
        value={filePath}
        onChange={(e) => setFilePath(e.target.value)}
      />

      <button style={styles.button} onClick={handlePreviewFile}>
        Prévisualiser fichier
      </button>

      <textarea
        style={styles.textarea}
        value={filePreview}
        readOnly
        placeholder="Contenu actuel du fichier"
      />

      <textarea
        style={styles.textarea}
        value={generatedFix || ""}
        readOnly
        placeholder="Correction générée"
      />

      <button
        style={styles.button}
        onClick={handleCreateBranchPr}
        disabled={loading}
      >
        {loading ? "Création en cours..." : "Créer branche + Pull Request"}
      </button>
    </div>
  );
}

export default GitHubPRPanel;
