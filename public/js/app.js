import { api, authStore } from "./api.js";
import { validateReport, normalizeStatus, normalizeCategory } from "./validators.js";

const $ = (sel) => document.querySelector(sel);

const els = {
  // Main UI
  year: $("#year"),
  list: $("#list"),
  empty: $("#emptyState"),
  listMeta: $("#listMeta"),

  statTotal: $("#statTotal"),
  statActive: $("#statActive"),
  statClaimed: $("#statClaimed"),
  statResolved: $("#statResolved"),

  q: $("#q"),
  statusFilter: $("#statusFilter"),
  sortBy: $("#sortBy"),

  tabAll: $("#tabAll"),
  tabLost: $("#tabLost"),
  tabFound: $("#tabFound"),

  btnOpenCreate: $("#btnOpenCreate"),
  btnOpenCreate2: $("#btnOpenCreate2"),
  btnSeed: $("#btnSeed"),
  btnClear: $("#btnClear"),

  btnLogout: $("#btnLogout"),

  // Create/Edit modal
  modalForm: $("#modalForm"),
  reportForm: $("#reportForm"),
  formTitle: $("#formTitle"),
  btnCloseForm: $("#btnCloseForm"),
  btnCancel: $("#btnCancel"),
  formError: $("#formError"),

  reportId: $("#reportId"),
  category: $("#category"),
  date: $("#date"),
  title: $("#title"),
  location: $("#location"),
  description: $("#description"),
  contact: $("#contact"),
  status: $("#status"),

  errCategory: $("#errCategory"),
  errDate: $("#errDate"),
  errTitle: $("#errTitle"),
  errLocation: $("#errLocation"),
  errDescription: $("#errDescription"),
  errContact: $("#errContact"),

  // Details modal
  modalDetails: $("#modalDetails"),
  detailsBody: $("#detailsBody"),
  btnCloseDetails: $("#btnCloseDetails"),
  btnDetailsClose: $("#btnDetailsClose"),
  btnEdit: $("#btnEdit"),
  btnDelete: $("#btnDelete"),

  // Auth modal
  modalAuth: $("#modalAuth"),
  authForm: $("#authForm"),
  authTitle: $("#authTitle"),
  tabLogin: $("#tabLogin"),
  tabRegister: $("#tabRegister"),
  authEmail: $("#authEmail"),
  authPassword: $("#authPassword"),
  authError: $("#authError"),
  btnCloseAuth: $("#btnCloseAuth"),
  btnAuthCancel: $("#btnAuthCancel"),
};

let state = {
  items: [],
  tab: "all",
  selectedId: null,
  authMode: "login", // "login" | "register"
};

function safeText(el, text) {
  el.textContent = String(text ?? "");
}

// Format ISO date or ISO timestamp to a readable date
function fmtDate(value) {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value ?? "");
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return String(value ?? "");
  }
}

function computeStats(items) {
  const total = items.length;
  const active = items.filter((x) => x.status === "active").length;
  const claimed = items.filter((x) => x.status === "claimed").length;
  const resolved = items.filter((x) => x.status === "resolved").length;
  return { total, active, claimed, resolved };
}

function applyFilters(items) {
  const q = els.q.value.trim().toLowerCase();
  const status = els.statusFilter.value;
  const tab = state.tab;

  let out = [...items];

  if (tab !== "all") out = out.filter((x) => x.category === tab);
  if (status !== "all") out = out.filter((x) => x.status === status);

  if (q) {
    out = out.filter((x) => {
      const hay = `${x.title} ${x.description} ${x.location} ${x.contact}`.toLowerCase();
      return hay.includes(q);
    });
  }

  const sortBy = els.sortBy.value;
  out.sort((a, b) => {
    if (sortBy === "date_desc") return String(b.date || "").localeCompare(String(a.date || ""));
    if (sortBy === "date_asc") return String(a.date || "").localeCompare(String(b.date || ""));
    if (sortBy === "title_asc") return String(a.title || "").localeCompare(String(b.title || ""));
    if (sortBy === "title_desc") return String(b.title || "").localeCompare(String(a.title || ""));
    return 0;
  });

  return out;
}

function setTab(tab) {
  state.tab = tab;

  for (const btn of [els.tabAll, els.tabLost, els.tabFound]) {
    const isActive = btn.dataset.tab === tab;
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  }
  render();
}

function render() {
  const filtered = applyFilters(state.items);

  const stats = computeStats(state.items);
  safeText(els.statTotal, stats.total);
  safeText(els.statActive, stats.active);
  safeText(els.statClaimed, stats.claimed);
  safeText(els.statResolved, stats.resolved);

  safeText(els.listMeta, `${filtered.length} item${filtered.length === 1 ? "" : "s"}`);

  els.list.innerHTML = "";
  if (filtered.length === 0) {
    els.empty.hidden = false;
    return;
  }
  els.empty.hidden = true;

  for (const item of filtered) {
    els.list.appendChild(renderCard(item));
  }
}

function renderCard(item) {
  const card = document.createElement("article");
  card.className = "card";
  card.tabIndex = 0;

  const top = document.createElement("div");
  top.className = "card-top";

  const left = document.createElement("div");

  const h = document.createElement("h4");
  h.className = "card-title";
  safeText(h, item.title);

  const meta = document.createElement("div");
  meta.className = "card-meta";

  const m1 = document.createElement("span");
  safeText(m1, `📍 ${item.location}`);

  const m2 = document.createElement("span");
  safeText(m2, `📅 ${fmtDate(item.date)}`);

  meta.append(m1, m2);
  left.append(h, meta);

  const badges = document.createElement("div");
  badges.style.display = "grid";
  badges.style.gap = "6px";
  badges.style.justifyItems = "end";

  const b1 = document.createElement("span");
  b1.className = `badge ${item.category}`;
  safeText(b1, item.category === "lost" ? "Lost" : "Found");

  const b2 = document.createElement("span");
  b2.className = `badge ${item.status}`;
  safeText(b2, item.status[0].toUpperCase() + item.status.slice(1));

  badges.append(b1, b2);

  top.append(left, badges);

  const desc = document.createElement("p");
  desc.className = "muted";
  desc.style.margin = "0";
  const preview = item.description?.length > 120 ? item.description.slice(0, 120) + "…" : item.description;
  safeText(desc, preview);

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const btnView = document.createElement("button");
  btnView.className = "link-btn";
  btnView.type = "button";
  btnView.textContent = "View";
  btnView.addEventListener("click", () => openDetails(item.id));

  const btnStatus = document.createElement("button");
  btnStatus.className = "link-btn";
  btnStatus.type = "button";
  btnStatus.textContent = "Next status";
  btnStatus.addEventListener("click", () => quickAdvanceStatus(item));

  const btnDelete = document.createElement("button");
  btnDelete.className = "link-btn";
  btnDelete.type = "button";
  btnDelete.textContent = "Delete";
  btnDelete.addEventListener("click", () => removeItem(item.id));

  actions.append(btnView, btnStatus, btnDelete);

  card.append(top, desc, actions);

  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter") openDetails(item.id);
  });

  return card;
}

function nextStatus(s) {
  if (s === "active") return "claimed";
  if (s === "claimed") return "resolved";
  return "resolved";
}

async function quickAdvanceStatus(item) {
  try {
    const updated = await api.update(item.id, { status: nextStatus(item.status) });
    state.items = state.items.map((x) => (x.id === item.id ? updated : x));
    render();
  } catch (err) {
    alert(`Status update failed: ${err.message}`);
  }
}

function clearErrors() {
  els.errCategory.textContent = "";
  els.errDate.textContent = "";
  els.errTitle.textContent = "";
  els.errLocation.textContent = "";
  els.errDescription.textContent = "";
  els.errContact.textContent = "";
}

function showErrors(errors) {
  els.errCategory.textContent = errors.category || "";
  els.errDate.textContent = errors.date || "";
  els.errTitle.textContent = errors.title || "";
  els.errLocation.textContent = errors.location || "";
  els.errDescription.textContent = errors.description || "";
  els.errContact.textContent = errors.contact || "";
}

function openCreate() {
  if (!authStore.getToken()) {
    openAuth("login");
    return;
  }

  els.formTitle.textContent = "New Report";
  els.reportId.value = "";
  els.category.value = "";
  els.date.valueAsDate = new Date();
  els.title.value = "";
  els.location.value = "";
  els.description.value = "";
  els.contact.value = "";
  els.status.value = "active";
  clearErrors();
  els.formError.hidden = true;
  els.modalForm.showModal();
}

function openEdit(item) {
  els.formTitle.textContent = "Edit Report";
  els.reportId.value = item.id;
  els.category.value = item.category;
  // Ensure date input gets YYYY-MM-DD
  els.date.value = String(item.date).slice(0, 10);
  els.title.value = item.title;
  els.location.value = item.location;
  els.description.value = item.description;
  els.contact.value = item.contact;
  els.status.value = item.status;
  clearErrors();
  els.formError.hidden = true;
  els.modalForm.showModal();
}

function closeForm() {
  if (els.modalForm.open) els.modalForm.close();
}

async function submitForm(e) {
  e.preventDefault();

  const payload = {
    category: normalizeCategory(els.category.value),
    date: els.date.value,
    title: els.title.value.trim(),
    location: els.location.value.trim(),
    description: els.description.value.trim(),
    contact: els.contact.value.trim(),
    status: normalizeStatus(els.status.value),
  };

  const v = validateReport(payload);
  clearErrors();
  if (!v.ok) {
    showErrors(v.errors);
    return;
  }

  try {
    const id = els.reportId.value;
    if (id) {
      const updated = await api.update(id, payload);
      state.items = state.items.map((x) => (x.id === id ? updated : x));
    } else {
      const created = await api.create(payload);
      state.items = [created, ...state.items];
    }
    closeForm();
    render();
  } catch (err) {
    els.formError.hidden = false;
    els.formError.textContent = `Save failed: ${err.message}`;
  }
}

function detailsTemplate(item) {
  const wrap = document.createElement("div");
  wrap.style.display = "grid";
  wrap.style.gap = "10px";

  const title = document.createElement("h4");
  title.style.margin = "0";
  safeText(title, item.title);

  const line = document.createElement("div");
  line.style.display = "flex";
  line.style.gap = "8px";
  line.style.flexWrap = "wrap";

  const b1 = document.createElement("span");
  b1.className = `badge ${item.category}`;
  safeText(b1, item.category === "lost" ? "Lost" : "Found");

  const b2 = document.createElement("span");
  b2.className = `badge ${item.status}`;
  safeText(b2, item.status[0].toUpperCase() + item.status.slice(1));

  const b3 = document.createElement("span");
  b3.className = "badge";
  safeText(b3, `📅 ${fmtDate(item.date)}`);

  const b4 = document.createElement("span");
  b4.className = "badge";
  safeText(b4, `📍 ${item.location}`);

  line.append(b1, b2, b3, b4);

  const desc = document.createElement("p");
  desc.className = "muted";
  desc.style.margin = "0";
  safeText(desc, item.description);

  const contact = document.createElement("p");
  contact.style.margin = "0";
  contact.className = "muted";
  safeText(contact, `Contact: ${item.contact}`);

  wrap.append(title, line, desc, contact);
  return wrap;
}

function openDetails(id) {
  state.selectedId = id;
  const item = state.items.find((x) => x.id === id);
  if (!item) return;

  els.detailsBody.innerHTML = "";
  els.detailsBody.appendChild(detailsTemplate(item));
  els.modalDetails.showModal();
}

function closeDetails() {
  if (els.modalDetails.open) els.modalDetails.close();
  state.selectedId = null;
}

async function removeItem(id) {
  const item = state.items.find((x) => x.id === id);
  const ok = confirm(`Delete "${item?.title || "this report"}"?`);
  if (!ok) return;

  try {
    await api.remove(id);
    state.items = state.items.filter((x) => x.id !== id);
    if (state.selectedId === id) closeDetails();
    render();
  } catch (err) {
    alert(`Delete failed: ${err.message}`);
  }
}

/* -------------------- Auth modal -------------------- */

function openAuth(mode = "login") {
  state.authMode = mode;

  els.authTitle.textContent = mode === "login" ? "Login" : "Register";
  els.tabLogin.setAttribute("aria-selected", mode === "login" ? "true" : "false");
  els.tabRegister.setAttribute("aria-selected", mode === "register" ? "true" : "false");

  els.authError.hidden = true;
  els.authPassword.value = "";

  if (!els.modalAuth.open) els.modalAuth.showModal();
}

function closeAuth() {
  if (els.modalAuth.open) els.modalAuth.close();
}

async function handleAuthSubmit(e) {
  e.preventDefault();

  const email = els.authEmail.value.trim();
  const password = els.authPassword.value;

  els.authError.hidden = true;

  try {
    if (state.authMode === "register") {
      await api.register(email, password);
    }
    await api.login(email, password);

    closeAuth();
    if (els.btnLogout) els.btnLogout.hidden = false;

    await loadItemsAndRender();
  } catch (err) {
    els.authError.hidden = false;
    els.authError.textContent = err.message;
  }
}

async function loadItemsAndRender() {
  state.items = await api.getAll();
  render();
}

/* -------------------- Bootstrap -------------------- */

function setupUiForServerMode() {
  // These two buttons were for localStorage demo mode; hide them in server mode.
  if (els.btnSeed) els.btnSeed.style.display = "none";
  if (els.btnClear) els.btnClear.style.display = "none";
}

function wireEvents() {
  els.btnOpenCreate.addEventListener("click", openCreate);
  els.btnOpenCreate2.addEventListener("click", openCreate);

  els.btnCloseForm.addEventListener("click", closeForm);
  els.btnCancel.addEventListener("click", closeForm);
  els.reportForm.addEventListener("submit", submitForm);

  els.btnCloseDetails.addEventListener("click", closeDetails);
  els.btnDetailsClose.addEventListener("click", closeDetails);

  els.btnEdit.addEventListener("click", () => {
    const item = state.items.find((x) => x.id === state.selectedId);
    if (!item) return;
    closeDetails();
    openEdit(item);
  });

  els.btnDelete.addEventListener("click", () => {
    if (!state.selectedId) return;
    removeItem(state.selectedId);
  });

  els.q.addEventListener("input", render);
  els.statusFilter.addEventListener("change", render);
  els.sortBy.addEventListener("change", render);

  els.tabAll.addEventListener("click", () => setTab("all"));
  els.tabLost.addEventListener("click", () => setTab("lost"));
  els.tabFound.addEventListener("click", () => setTab("found"));

  // Auth events
  els.tabLogin.addEventListener("click", () => openAuth("login"));
  els.tabRegister.addEventListener("click", () => openAuth("register"));
  els.btnCloseAuth.addEventListener("click", closeAuth);
  els.btnAuthCancel.addEventListener("click", closeAuth);
  els.authForm.addEventListener("submit", handleAuthSubmit);

  if (els.btnLogout) {
    els.btnLogout.addEventListener("click", () => {
      api.logout();
      state.items = [];
      render();
      els.btnLogout.hidden = true;
      openAuth("login");
    });
  }
}

async function start() {
  els.year.textContent = String(new Date().getFullYear());

  setupUiForServerMode();
  wireEvents();

  const token = authStore.getToken();
  if (!token) {
    if (els.btnLogout) els.btnLogout.hidden = true;
    openAuth("login");
    return;
  }

  if (els.btnLogout) els.btnLogout.hidden = false;
  await loadItemsAndRender();
}

start();