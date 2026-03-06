// public/js/api.js
const BASE_URL = "http://localhost:3000";
const TOKEN_KEY = "lf_token_v1";

export const authStore = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  },
  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
  },
};

async function http(path, options = {}) {
  const token = authStore.getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE_URL + path, { ...options, headers });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

export const api = {
  // auth
  register: (email, password) =>
    http("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  login: async (email, password) => {
    const data = await http("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    authStore.setToken(data.token);
    return data;
  },

  logout: () => authStore.clear(),

  // items
  getAll: () => http("/api/items"),
  getById: (id) => http(`/api/items/${encodeURIComponent(id)}`),
  create: (payload) =>
    http("/api/items", { method: "POST", body: JSON.stringify(payload) }),
  update: (id, patch) =>
    http(`/api/items/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  remove: (id) =>
    http(`/api/items/${encodeURIComponent(id)}`, { method: "DELETE" }),
};