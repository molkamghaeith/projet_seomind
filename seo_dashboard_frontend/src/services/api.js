import axios from "axios";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(
    /\/$/,
    ""
  );

const api = axios.create({
  baseURL: API_BASE_URL,
});

const redirectToLogin = () => {
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || "";
    const isLoginRequest =
      requestUrl.includes("/auth/login/") ||
      requestUrl.includes("/auth/google/");

    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !isLoginRequest
    ) {
      originalRequest._retry = true;

      const refresh = localStorage.getItem("refresh");

      if (!refresh) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        redirectToLogin();
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${API_BASE_URL}/token/refresh/`, {
          refresh: refresh,
        });

        const newAccess = res.data.access;
        localStorage.setItem("access", newAccess);

        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
