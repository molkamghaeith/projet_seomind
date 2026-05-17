export const theme = {
  // Utiliser les variables CSS pour le mode clair/sombre
  page: {
    minHeight: "100vh",
    background: "var(--bg-primary)",
    padding: "var(--page-padding, 100px 30px 30px)",
    fontFamily: "Arial, sans-serif",
    color: "var(--text-primary)",
    transition: "background 0.3s ease, color 0.3s ease",
  },

  centerPage: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "var(--bg-primary)",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
    transition: "background 0.3s ease",
  },

  card: {
    width: "100%",
    maxWidth: "420px",
    background: "var(--bg-secondary)",
    borderRadius: "18px",
    padding: "30px",
    boxShadow: "var(--card-shadow)",
    transition: "background 0.3s ease, box-shadow 0.3s ease",
  },

  dashboardCard: {
    background: "var(--bg-secondary)",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "var(--card-shadow)",
    marginBottom: "24px",
    transition: "background 0.3s ease, box-shadow 0.3s ease",
  },

  container: {
    maxWidth: "1200px",
    margin: "0 auto",
  },

  title: {
    fontSize: "28px",
    fontWeight: "bold",
    marginBottom: "10px",
    textAlign: "center",
    color: "var(--text-primary)",
  },

  subtitle: {
    color: "var(--text-secondary)",
    marginBottom: "20px",
    textAlign: "center",
  },

  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    marginBottom: "14px",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
    background: "var(--bg-primary)",
    color: "var(--text-primary)",
    transition: "background 0.3s ease, color 0.3s ease, border 0.3s ease",
  },

  select: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    marginBottom: "14px",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
    background: "var(--bg-primary)",
    color: "var(--text-primary)",
    transition: "background 0.3s ease, color 0.3s ease",
  },

  button: {
    width: "100%",
    background: "var(--button-bg)",
    color: "var(--button-text)",
    border: "none",
    padding: "12px 14px",
    borderRadius: "10px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background 0.3s ease, transform 0.2s ease",
  },

  secondaryButton: {
    background: "var(--secondary-bg)",
    color: "var(--text-primary)",
    border: "none",
    padding: "12px 18px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
    minWidth: "220px",
    textAlign: "center",
    transition: "background 0.3s ease, transform 0.2s ease",
  },

  rowButtons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "20px",
    justifyContent: "center",
  },

  linkText: {
    marginTop: "15px",
    textAlign: "center",
    color: "var(--text-secondary)",
  },

  siteItem: {
    padding: "14px",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    marginBottom: "12px",
    background: "var(--bg-primary)",
    transition: "background 0.3s ease, border 0.3s ease",
  },

  sectionTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    marginBottom: "16px",
    color: "var(--text-primary)",
  },
};
