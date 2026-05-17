import api from "./api";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("access")}`,
});

export const githubLogin = async (
  nextPath = `${window.location.pathname}${window.location.search}`
) => {
  const params = new URLSearchParams({ next: nextPath || "/dashboard" });
  const res = await api.get(`/github/login/?${params.toString()}`, {
    headers: authHeaders(),
  });
  return res.data;
};

export const githubRepos = async () => {
  const res = await api.get("/github/repos/", { headers: authHeaders() });
  return res.data;
};

export const githubBranches = async (owner, repo) => {
  const res = await api.get(`/github/branches/${owner}/${repo}/`, {
    headers: authHeaders(),
  });
  return res.data;
};

export const githubGetFile = async (payload) => {
  const res = await api.post("/github/file/", payload, {
    headers: authHeaders(),
  });
  return res.data;
};

export const githubCreateBranchPr = async (payload) => {
  const res = await api.post("/github/create-branch-pr/", payload, {
    headers: authHeaders(),
  });
  return res.data;
};

export const githubDisconnect = async () => {
  const res = await api.post("/github/disconnect/", null, {
    headers: authHeaders(),
  });
  return res.data;
};
