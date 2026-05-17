import { Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";
import Profile from "./pages/Profile";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import SiteAnalysisLoading from "./pages/SiteAnalysisLoading";
import AIRecommendations from "./pages/AIRecommendations";
import AdminDashboard from "./pages/AdminDashboard";
import GitHubConnected from "./pages/GitHubConnected";
import Demo from "./pages/Demo";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const location = useLocation();
  const hideNavbar =
    ["/", "/login", "/register", "/forgot-password", "/github-connected"].includes(
      location.pathname
    ) || location.pathname.startsWith("/reset-password/");

  return (
    <>
      {!hideNavbar && <Navbar />}

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: "#111827",
            color: "#fff",
            borderRadius: "12px",
            padding: "14px 16px",
            fontSize: "14px",
          },
          success: {
            iconTheme: {
              primary: "#22c55e",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />

      <Routes>
        <Route path="/profile" element={<Profile />} />
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/site-analysis-loading"
          element={
            <ProtectedRoute>
              <SiteAnalysisLoading />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ai-recommendations"
          element={
            <ProtectedRoute>
              <AIRecommendations />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="/demo" element={<Demo />} />
        <Route path="/github-connected" element={<GitHubConnected />} />
      </Routes>
    </>
  );
}

export default App;
