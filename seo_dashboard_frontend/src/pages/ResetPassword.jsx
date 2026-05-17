import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { theme } from "../styles/theme";
import toast from "react-hot-toast";

function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password.trim()) {
      toast.error("Saisissez un nouveau mot de passe.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password-confirm/", {
        uid,
        token,
        password,
      });
      toast.success("Mot de passe réinitialisé.");
      navigate("/login");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || "Erreur lors de la réinitialisation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={theme.centerPage}>
      <div style={theme.card}>
        <h2 style={theme.title}>Nouveau mot de passe</h2>
        <p style={theme.subtitle}>Choisis un nouveau mot de passe sécurisé.</p>

        <form onSubmit={handleSubmit}>
          <input
            style={theme.input}
            type="password"
            placeholder="Nouveau mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button style={theme.button} type="submit" disabled={loading}>
            {loading ? "Validation..." : "Valider"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;
