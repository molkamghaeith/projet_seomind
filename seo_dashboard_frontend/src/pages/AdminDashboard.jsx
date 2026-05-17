import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";

function AdminDashboard({ embedded = false }) {
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // ID de l'user en cours d'action
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editUser, setEditUser] = useState({
    username: "",
    email: "",
    role: "user",
    is_active: true,
  });
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    is_active: true,
  });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const navigate = useNavigate();

  // Lire le token à chaque requête (pas en dehors du composant)
  const getAuthHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem("access")}`,
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/auth/admin/users/", {
        headers: getAuthHeader(),
      });
      setUsers(res.data);
      window.dispatchEvent(new Event("admin-pending-users-updated"));
    } catch (error) {
      console.error(error);
      toast.error("Impossible de charger les utilisateurs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Vérifier le rôle AVANT de charger les users
    const init = async () => {
      try {
        const res = await api.get("/auth/me/", {
          headers: getAuthHeader(),
        });
        if (!res.data.is_superuser) {
          toast.error("Accès réservé au super administrateur.");
          navigate("/dashboard");
          return;
        }
        setCurrentUserId(res.data.id);
        await fetchUsers();
      } catch (error) {
        console.error(error);
        toast.error("Session invalide ou accès refusé.");
        navigate("/");
      }
    };
    init();
  }, [navigate, fetchUsers]);

  const openStatusConfirmation = (user) => {
    setConfirmDialog({
      type: "status",
      userId: user.id,
      username: user.username,
      currentStatus: user.is_active,
    });
  };

  const openDeleteConfirmation = (user) => {
    setConfirmDialog({
      type: "delete",
      userId: user.id,
      username: user.username,
    });
  };

  const getRoleValue = (user) => {
    if (user.is_superuser) return "superadmin";
    if (user.is_staff) return "admin";
    return "user";
  };

  const getRolePayload = (role) => ({
    is_staff: role === "admin" || role === "superadmin",
    is_superuser: role === "superadmin",
  });

  const openEditModal = (user) => {
    if (user.id === currentUserId) {
      toast.error("Modifiez votre propre profil depuis la carte Mon profil.");
      return;
    }

    setFormError("");
    setEditingUser(user);
    setEditUser({
      username: user.username || "",
      email: user.email || "",
      role: getRoleValue(user),
      is_active: Boolean(user.is_active),
    });
  };

  const closeEditModal = () => {
    if (!formLoading) {
      setEditingUser(null);
      setFormError("");
    }
  };

  const closeConfirmDialog = () => {
    if (actionLoading === null) {
      setConfirmDialog(null);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    setActionLoading(userId);
    try {
      await api.put(
        `/auth/admin/users/${userId}/update/`,
        { is_active: !currentStatus },
        { headers: getAuthHeader() }
      );
      await fetchUsers();
      toast.success(
        !currentStatus
          ? "Utilisateur activé avec succès."
          : "Utilisateur désactivé avec succès."
      );
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors du changement de statut.");
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (userId, username) => {
    setActionLoading(userId);
    try {
      // Empêcher la suppression de son propre compte
      const me = await api.get("/auth/me/", { headers: getAuthHeader() });
      if (me.data.id === userId) {
        toast.error("Vous ne pouvez pas supprimer votre propre compte.");
        return;
      }

      await api.delete(`/auth/admin/users/${userId}/delete/`, {
        headers: getAuthHeader(),
      });
      await fetchUsers();
      toast.success(`Utilisateur "${username}" supprimé.`);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la suppression.");
    } finally {
      setActionLoading(null);
    }
  };

  const confirmAction = async () => {
    if (!confirmDialog) return;

    if (confirmDialog.type === "delete") {
      await deleteUser(confirmDialog.userId, confirmDialog.username);
    } else {
      await toggleUserStatus(confirmDialog.userId, confirmDialog.currentStatus);
    }

    setConfirmDialog(null);
  };

  const createUser = async () => {
    setFormError("");

    if (!newUser.username || !newUser.email || !newUser.password) {
      const message = "Tous les champs sont requis.";
      setFormError(message);
      toast.error(message);
      return;
    }

    setFormLoading(true);
    try {
      await api.post("/auth/admin/users/create/", newUser, {
        headers: getAuthHeader(),
      });
      setShowAddModal(false);
      setNewUser({ username: "", email: "", password: "", is_active: true });
      await fetchUsers();
      toast.success("Utilisateur créé avec succès.");
    } catch (error) {
      console.error(error);
      setFormError(error.response?.data?.error || "Erreur lors de la création");
      toast.error(error.response?.data?.error || "Erreur lors de la création.");
    } finally {
      setFormLoading(false);
    }
  };

  const updateUser = async () => {
    if (!editingUser) return;

    setFormError("");

    if (!editUser.username || !editUser.email) {
      const message = "Nom d'utilisateur et email sont requis.";
      setFormError(message);
      toast.error(message);
      return;
    }

    setFormLoading(true);
    setActionLoading(editingUser.id);

    try {
      await api.put(
        `/auth/admin/users/${editingUser.id}/update/`,
        {
          username: editUser.username,
          email: editUser.email,
          is_active: editUser.is_active,
          ...getRolePayload(editUser.role),
        },
        { headers: getAuthHeader() }
      );

      setEditingUser(null);
      await fetchUsers();
      toast.success("Utilisateur modifié avec succès.");
    } catch (error) {
      console.error(error);
      const message =
        error.response?.data?.error || "Erreur lors de la modification.";
      setFormError(message);
      toast.error(message);
    } finally {
      setFormLoading(false);
      setActionLoading(null);
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setFormError("");
    setNewUser({ username: "", email: "", password: "", is_active: true });
  };

  const styles = {
    container: {
      minHeight: "100vh",
      background: "var(--bg-primary)",
      padding: "var(--page-padding, 100px 30px 30px)",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "30px",
      flexWrap: "wrap",
      gap: "15px",
    },
    title: {
      fontSize: "28px",
      fontWeight: "bold",
      color: "var(--text-primary)",
    },
    addButton: {
      background: "var(--accent)",
      color: "#fff",
      border: "none",
      padding: "12px 24px",
      borderRadius: "10px",
      cursor: "pointer",
      fontWeight: "600",
      fontSize: "14px",
      transition: "all 0.2s",
    },
    tableContainer: {
      background: "var(--bg-secondary)",
      borderRadius: "16px",
      overflow: "auto",
      border: "1px solid var(--border)",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      minWidth: "700px",
    },
    th: {
      background: "var(--bg-secondary)",
      padding: "16px",
      textAlign: "left",
      fontWeight: "600",
      color: "var(--text-primary)",
      borderBottom: "2px solid var(--border)",
      fontSize: "13px",
    },
    td: {
      padding: "14px 16px",
      borderBottom: "1px solid var(--border)",
      color: "var(--text-primary)",
      fontSize: "14px",
    },
    activeBadge: {
      background: "#d1fae5",
      color: "#065f46",
      padding: "4px 10px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: "500",
    },
    inactiveBadge: {
      background: "#fee2e2",
      color: "#991b1b",
      padding: "4px 10px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: "500",
    },
    roleBadge: {
      background: "#e0e7ff",
      color: "#4338ca",
      padding: "4px 10px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: "500",
    },
    actionButton: {
      background: "var(--bg-secondary)",
      color: "var(--text-primary)",
      border: "1px solid var(--border)",
      padding: "8px 14px",
      borderRadius: "8px",
      cursor: "pointer",
      marginRight: "8px",
      fontSize: "12px",
      fontWeight: "500",
      transition: "all 0.2s",
    },
    actionCell: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      flexWrap: "wrap",
    },
    editButton: {
      background: "#e0e7ff",
      color: "#4338ca",
      border: "none",
      padding: "8px 14px",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "600",
      transition: "all 0.2s",
    },
    deleteButton: {
      background: "#fee2e2",
      color: "#dc2626",
      border: "none",
      padding: "8px 14px",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "500",
      transition: "all 0.2s",
    },
    disabledButton: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
    emptyRow: {
      textAlign: "center",
      padding: "40px",
      color: "var(--text-secondary)",
      fontSize: "14px",
    },
    pendingPanel: {
      background: "var(--bg-secondary)",
      border: "1px solid #fbbf24",
      borderLeft: "5px solid #f59e0b",
      borderRadius: "14px",
      padding: "18px",
      marginBottom: "22px",
      boxShadow: "0 12px 30px rgba(245, 158, 11, 0.12)",
    },
    pendingHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "12px",
      marginBottom: "14px",
      flexWrap: "wrap",
    },
    pendingTitle: {
      margin: 0,
      color: "var(--text-primary)",
      fontSize: "18px",
      fontWeight: "800",
    },
    pendingSubtitle: {
      margin: "4px 0 0",
      color: "var(--text-secondary)",
      fontSize: "13px",
    },
    pendingCountBadge: {
      background: "#fef3c7",
      color: "#92400e",
      border: "1px solid #fbbf24",
      padding: "6px 10px",
      borderRadius: "999px",
      fontSize: "12px",
      fontWeight: "800",
    },
    pendingList: {
      display: "grid",
      gap: "10px",
    },
    pendingItem: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "12px",
      padding: "12px",
      borderRadius: "10px",
      background: "var(--bg-primary)",
      border: "1px solid var(--border)",
      flexWrap: "wrap",
    },
    pendingUserName: {
      color: "var(--text-primary)",
      fontWeight: "800",
      marginBottom: "4px",
    },
    pendingUserMeta: {
      color: "var(--text-secondary)",
      fontSize: "13px",
    },
    approveButton: {
      background: "#16a34a",
      color: "#fff",
      border: "none",
      padding: "9px 14px",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "800",
    },
    // Modal — faux viewport pour éviter position:fixed
    modalOverlay: {
      minHeight: "400px",
      background: "rgba(0,0,0,0.45)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "16px",
      margin: "20px 0",
    },
    modal: {
      background: "var(--bg-secondary)",
      borderRadius: "20px",
      padding: "32px",
      width: "460px",
      maxWidth: "90%",
    },
    modalTitle: {
      fontSize: "24px",
      fontWeight: "bold",
      marginBottom: "24px",
      color: "var(--text-primary)",
    },
    input: {
      width: "100%",
      padding: "12px 14px",
      marginBottom: "16px",
      borderRadius: "10px",
      border: "1px solid var(--border)",
      background: "var(--bg-primary)",
      color: "var(--text-primary)",
      fontSize: "14px",
      boxSizing: "border-box",
      outline: "none",
    },
    fieldLabel: {
      display: "block",
      marginBottom: "8px",
      color: "var(--text-primary)",
      fontWeight: "700",
      fontSize: "13px",
    },
    checkbox: {
      marginRight: "10px",
      width: "16px",
      height: "16px",
      cursor: "pointer",
    },
    modalButtons: {
      display: "flex",
      gap: "12px",
      justifyContent: "flex-end",
      marginTop: "20px",
    },
    saveButton: {
      background: "var(--accent)",
      color: "#fff",
      border: "none",
      padding: "10px 20px",
      borderRadius: "8px",
      cursor: "pointer",
      fontWeight: "600",
    },
    cancelButton: {
      background: "var(--bg-secondary)",
      color: "var(--text-primary)",
      border: "1px solid var(--border)",
      padding: "10px 20px",
      borderRadius: "8px",
      cursor: "pointer",
      fontWeight: "500",
    },
    errorText: {
      color: "#dc2626",
      fontSize: "14px",
      marginBottom: "16px",
      textAlign: "center",
      background: "#fee2e2",
      padding: "10px",
      borderRadius: "8px",
    },
    confirmOverlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(15, 23, 42, 0.45)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      zIndex: 1000,
    },
    confirmModal: {
      width: "420px",
      maxWidth: "100%",
      background: "var(--bg-secondary)",
      color: "var(--text-primary)",
      border: "1px solid var(--border)",
      borderRadius: "14px",
      boxShadow: "0 24px 60px rgba(15, 23, 42, 0.22)",
      padding: "24px",
    },
    confirmHeader: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      marginBottom: "12px",
    },
    confirmIcon: {
      width: "36px",
      height: "36px",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: "700",
      flexShrink: 0,
    },
    dangerIcon: {
      background: "#fee2e2",
      color: "#dc2626",
    },
    statusIcon: {
      background: "#e0e7ff",
      color: "#4338ca",
    },
    confirmTitle: {
      margin: 0,
      fontSize: "20px",
      fontWeight: "700",
      color: "var(--text-primary)",
    },
    confirmMessage: {
      margin: "0 0 24px",
      color: "var(--text-secondary)",
      lineHeight: "1.6",
      fontSize: "14px",
    },
    confirmButtons: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "10px",
      flexWrap: "wrap",
    },
    confirmCancelButton: {
      background: "var(--bg-secondary)",
      color: "var(--text-primary)",
      border: "1px solid var(--border)",
      padding: "10px 18px",
      borderRadius: "8px",
      cursor: "pointer",
      fontWeight: "600",
    },
    confirmPrimaryButton: {
      background: "var(--accent)",
      color: "#fff",
      border: "none",
      padding: "10px 18px",
      borderRadius: "8px",
      cursor: "pointer",
      fontWeight: "700",
    },
    confirmDangerButton: {
      background: "#dc2626",
      color: "#fff",
      border: "none",
      padding: "10px 18px",
      borderRadius: "8px",
      cursor: "pointer",
      fontWeight: "700",
    },
    confirmWarningButton: {
      background: "#f59e0b",
      color: "#111827",
      border: "none",
      padding: "10px 18px",
      borderRadius: "8px",
      cursor: "pointer",
      fontWeight: "700",
    },
  };

  const containerStyle = embedded
    ? {
        ...styles.container,
        minHeight: "auto",
        background: "transparent",
        padding: 0,
      }
    : styles.container;

  if (loading) {
    return (
      <div style={containerStyle}>
        <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>
          Preparation des utilisateurs...
        </p>
      </div>
    );
  }

  const isDeleteConfirmation = confirmDialog?.type === "delete";
  const isDeactivateConfirmation =
    confirmDialog?.type === "status" && confirmDialog.currentStatus;
  const confirmTitle = isDeleteConfirmation
    ? "Supprimer cet utilisateur ?"
    : isDeactivateConfirmation
    ? "Désactiver cet utilisateur ?"
    : "activer ce compte ?";
  const confirmMessage = isDeleteConfirmation
    ? `L'utilisateur "${confirmDialog?.username}" sera supprimé définitivement. Cette action est irréversible.`
    : isDeactivateConfirmation
    ? `Le compte de "${confirmDialog?.username}" sera désactivé et l'utilisateur ne pourra plus se connecter.`
    : `Le compte de "${confirmDialog?.username}" sera activé et l'utilisateur pourra se reconnecter.`;
  const confirmButtonLabel = isDeleteConfirmation
    ? "Supprimer"
    : isDeactivateConfirmation
    ? "Désactiver"
    : "activer";
  const confirmButtonStyle = isDeleteConfirmation
    ? styles.confirmDangerButton
    : isDeactivateConfirmation
    ? styles.confirmWarningButton
    : styles.confirmPrimaryButton;
  const isConfirmLoading =
    confirmDialog !== null && actionLoading === confirmDialog.userId;
  const pendingUsers = users.filter((user) => !user.is_active);

  return (
    <div style={containerStyle}>
      <div style={styles.header}>
        <h1 style={styles.title}>Administration SEOmind</h1>
        <button style={styles.addButton} onClick={() => setShowAddModal(true)}>
          + Ajouter un utilisateur
        </button>
      </div>

      {pendingUsers.length > 0 && (
        <section style={styles.pendingPanel}>
          <div style={styles.pendingHeader}>
            <div>
              <h2 style={styles.pendingTitle}>Demandes d'activation</h2>
              <p style={styles.pendingSubtitle}>
                Nouveaux comptes inscrits en attente de validation admin.
              </p>
            </div>
            <span style={styles.pendingCountBadge}>
              {pendingUsers.length} en attente
            </span>
          </div>

          <div style={styles.pendingList}>
            {pendingUsers.map((user) => {
              const isActing = actionLoading === user.id;

              return (
                <div key={user.id} style={styles.pendingItem}>
                  <div>
                    <div style={styles.pendingUserName}>{user.username}</div>
                    <div style={styles.pendingUserMeta}>
                      {user.email} - inscrit le{" "}
                      {new Date(user.date_joined).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  <button
                    style={{
                      ...styles.approveButton,
                      ...(isActing ? styles.disabledButton : {}),
                    }}
                    disabled={isActing}
                    onClick={() => openStatusConfirmation(user)}
                  >
                    {isActing ? "Traitement..." : "Activer le compte"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Utilisateur</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Rôle</th>
              <th style={styles.th}>Statut</th>
              <th style={styles.th}>Inscrit le</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} style={styles.emptyRow}>
                  Aucun utilisateur trouvé.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isActing = actionLoading === user.id;
                const isCurrentUser = user.id === currentUserId;
                return (
                  <tr key={user.id}>
                    <td style={styles.td}>
                      <strong>{user.username}</strong>
                      {user.first_name && (
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--text-secondary)",
                            marginLeft: "6px",
                          }}
                        >
                          ({user.first_name})
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>{user.email}</td>
                    <td style={styles.td}>
                      {user.is_superuser ? (
                        <span style={styles.roleBadge}>Super Admin</span>
                      ) : user.is_staff ? (
                        <span style={styles.roleBadge}>Admin</span>
                      ) : (
                        <span style={{ color: "var(--text-secondary)" }}>
                          Utilisateur
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {user.is_active ? (
                        <span style={styles.activeBadge}>Actif</span>
                      ) : (
                        <span style={styles.inactiveBadge}>En attente</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {new Date(user.date_joined).toLocaleDateString("fr-FR")}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionCell}>
                      <button
                          style={{
                            ...styles.editButton,
                          ...(isActing || isCurrentUser
                            ? styles.disabledButton
                            : {}),
                        }}
                        disabled={isActing || isCurrentUser}
                        onClick={() => openEditModal(user)}
                      >
                        Modifier
                      </button>
                      <button
                        style={{
                          ...styles.actionButton,
                          ...(isActing || isCurrentUser
                            ? styles.disabledButton
                            : {}),
                        }}
                        disabled={isActing || isCurrentUser}
                        onClick={() => openStatusConfirmation(user)}
                      >
                        {isActing
                          ? "..."
                          : user.is_active
                          ? "Désactiver"
                          : "Activer"}
                      </button>
                      {!user.is_superuser && (
                        <button
                          style={{
                            ...styles.deleteButton,
                            ...(isActing ? styles.disabledButton : {}),
                          }}
                          disabled={isActing}
                          onClick={() => openDeleteConfirmation(user)}
                        >
                          Supprimer
                        </button>
                        
                      )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {confirmDialog && (
        <div style={styles.confirmOverlay} onClick={closeConfirmDialog}>
          <div
            style={styles.confirmModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-action-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.confirmHeader}>
              <span
                style={{
                  ...styles.confirmIcon,
                  ...(isDeleteConfirmation
                    ? styles.dangerIcon
                    : styles.statusIcon),
                }}
                aria-hidden="true"
              >
                !
              </span>
              <h2 id="confirm-action-title" style={styles.confirmTitle}>
                {confirmTitle}
              </h2>
            </div>
            <p style={styles.confirmMessage}>{confirmMessage}</p>
            <div style={styles.confirmButtons}>
              <button
                type="button"
                style={{
                  ...styles.confirmCancelButton,
                  ...(isConfirmLoading ? styles.disabledButton : {}),
                }}
                onClick={closeConfirmDialog}
                disabled={isConfirmLoading}
              >
                Annuler
              </button>
              <button
                type="button"
                style={{
                  ...confirmButtonStyle,
                  ...(isConfirmLoading ? styles.disabledButton : {}),
                }}
                onClick={confirmAction}
                disabled={isConfirmLoading}
              >
                {isConfirmLoading ? "Traitement..." : confirmButtonLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div style={styles.modalOverlay} onClick={closeEditModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Modifier l'utilisateur</h2>

            {formError && <div style={styles.errorText}>{formError}</div>}

            <label style={styles.fieldLabel}>Nom d'utilisateur</label>
            <input
              style={styles.input}
              type="text"
              value={editUser.username}
              onChange={(e) =>
                setEditUser({ ...editUser, username: e.target.value })
              }
            />

            <label style={styles.fieldLabel}>Email</label>
            <input
              style={styles.input}
              type="email"
              value={editUser.email}
              onChange={(e) =>
                setEditUser({ ...editUser, email: e.target.value })
              }
            />

            <label style={styles.fieldLabel}>Rôle</label>
            <select
              style={styles.input}
              value={editUser.role}
              onChange={(e) =>
                setEditUser({ ...editUser, role: e.target.value })
              }
            >
              <option value="user">Utilisateur</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "20px",
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={editUser.is_active}
                onChange={(e) =>
                  setEditUser({ ...editUser, is_active: e.target.checked })
                }
                style={styles.checkbox}
              />
              Compte actif
            </label>

            <div style={styles.modalButtons}>
              <button
                style={styles.cancelButton}
                onClick={closeEditModal}
                disabled={formLoading}
              >
                Annuler
              </button>
              <button
                style={{
                  ...styles.saveButton,
                  ...(formLoading ? styles.disabledButton : {}),
                }}
                onClick={updateUser}
                disabled={formLoading}
              >
                {formLoading ? "Modification..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Ajouter un utilisateur</h2>

            {formError && <div style={styles.errorText}>{formError}</div>}

            <input
              style={styles.input}
              type="text"
              placeholder="Nom d'utilisateur *"
              value={newUser.username}
              onChange={(e) =>
                setNewUser({ ...newUser, username: e.target.value })
              }
            />

            <input
              style={styles.input}
              type="email"
              placeholder="Email *"
              value={newUser.email}
              onChange={(e) =>
                setNewUser({ ...newUser, email: e.target.value })
              }
            />

            <input
              style={styles.input}
              type="password"
              placeholder="Mot de passe *"
              value={newUser.password}
              onChange={(e) =>
                setNewUser({ ...newUser, password: e.target.value })
              }
            />

            <label
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "20px",
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={newUser.is_active}
                onChange={(e) =>
                  setNewUser({ ...newUser, is_active: e.target.checked })
                }
                style={styles.checkbox}
              />
              Activer le compte immédiatement
            </label>

            <div style={styles.modalButtons}>
              <button
                style={styles.cancelButton}
                onClick={closeModal}
                disabled={formLoading}
              >
                Annuler
              </button>
              <button
                style={{
                  ...styles.saveButton,
                  ...(formLoading ? styles.disabledButton : {}),
                }}
                onClick={createUser}
                disabled={formLoading}
              >
                {formLoading ? "Création..." : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
