const TOKEN_KEY = "lf_token_v1";
const USER_KEY = "lf_user_v1";

const BASE_URL = window.API_BASE_URL || "";

export const authStore = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  },

  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },

  getUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearUser() {
    localStorage.removeItem(USER_KEY);
  },

  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
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
    if (data.user) {
      authStore.setUser(data.user);
    }

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