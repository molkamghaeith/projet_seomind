import { useState } from "react";

const periods = {
  today: { label: "Aujourd'hui", days: 0, isToday: true },
  yesterday: { label: "Hier", days: 1, isYesterday: true },
  last7Days: { label: "Les 7 derniers jours", days: 7 },
  last28Days: { label: "Les 28 derniers jours", days: 28 },
  last30Days: { label: "Les 30 derniers jours", days: 30 },
  thisMonth: { label: "Ce mois-ci", type: "this_month" },
  lastMonth: { label: "Le mois dernier", type: "last_month" },
};

function PeriodSelector({ onPeriodChange, currentPeriod }) {
  const [isOpen, setIsOpen] = useState(false);

  const getDateRange = (periodKey) => {
    const period = periods[periodKey];
    const today = new Date();
    let start = new Date(today);
    let end = new Date(today);

    // Aujourd'hui
    if (period.isToday) {
      start = new Date(today);
      end = new Date(today);
    }
    // Hier
    else if (period.isYesterday) {
      start = new Date(today);
      start.setDate(start.getDate() - 1);
      end = new Date(today);
      end.setDate(end.getDate() - 1);
    }
    // Nombre de jours défini (7, 28, 30 jours)
    else if (period.days) {
      start.setDate(start.getDate() - period.days);
      // end reste = aujourd'hui
    }
    // Ce mois-ci
    else if (period.type === "this_month") {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }
    // Le mois dernier (CORRIGÉ)
    else if (period.type === "last_month") {
      // Premier jour du mois dernier
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      // Dernier jour du mois dernier
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    }

    const formatDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    console.log(`Période ${period.label}: ${formatDate(start)} → ${formatDate(end)}`);

    return { start_date: formatDate(start), end_date: formatDate(end) };
  };

  const handleSelect = (periodKey) => {
    const range = getDateRange(periodKey);
    onPeriodChange(range.start_date, range.end_date, periodKey);
    setIsOpen(false);
  };

  const styles = {
    container: {
      position: "relative",
      display: "inline-block",
      marginBottom: "20px",
    },
    button: {
      background: "#fff",
      border: "1px solid #d1d5db",
      borderRadius: "10px",
      padding: "10px 16px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "14px",
      fontWeight: "500",
    },
    dropdown: {
      position: "absolute",
      top: "100%",
      left: 0,
      marginTop: "8px",
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: "12px",
      boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
      zIndex: 1000,
      minWidth: "220px",
      overflow: "hidden",
    },
    option: {
      padding: "10px 16px",
      cursor: "pointer",
      transition: "background 0.2s",
    },
  };

  const currentLabel = periods[currentPeriod]?.label || "Les 30 derniers jours";

  return (
    <div style={styles.container}>
      <button style={styles.button} onClick={() => setIsOpen(!isOpen)}>
        📅 {currentLabel}
        <span>{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div style={styles.dropdown}>
          {Object.keys(periods).map((key) => (
            <div
              key={key}
              style={styles.option}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              onClick={() => handleSelect(key)}
            >
              {periods[key].label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PeriodSelector;