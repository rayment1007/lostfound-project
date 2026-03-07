// public/js/api.js
const TOKEN_KEY = "lf_token_v1";

// 线上优先读 window.API_BASE_URL
// 没设置时默认同源，这样前后端同域最省事
const BASE_URL = window.API_BASE_URL || "";

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

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  let data;
  try {
    data = isJson ? await res.json() : await res.text();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message =
      (isJson && data && (data.error || data.message)) ||
      (typeof data === "string" && data) ||
      res.statusText ||
      "Request failed";

    throw new Error(`HTTP ${res.status}: ${message}`);
  }

  return data;
}

export const api = {
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

  getAll: () => http("/api/items"),
  getById: (id) => http(`/api/items/${encodeURIComponent(id)}`),
  create: (payload) =>
    http("/api/items", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (id, patch) =>
    http(`/api/items/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  remove: (id) =>
    http(`/api/items/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
};