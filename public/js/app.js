import { api, authStore } from "./api.js";
import { validateReport, normalizeStatus, normalizeCategory } from "./validators.js";

const $ = (sel) => document.querySelector(sel);

const els = {
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
  btnMyReports: $("#btnMyReports"),
  currentUserEmail: $("#currentUserEmail"),

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

  modalDetails: $("#modalDetails"),
  detailsBody: $("#detailsBody"),
  btnCloseDetails: $("#btnCloseDetails"),
  btnDetailsClose: $("#btnDetailsClose"),
  btnEdit: $("#btnEdit"),
  btnDelete: $("#btnDelete"),
};

let state = {
  items: [],
  tab: "all",
  selectedId: null,
  onlyMine: false,
};

function safeText(el, text) {
  if (!el) return;
  el.textContent = String(text ?? "");
}

function getCurrentUser() {
  return authStore.getUser();
}

function isOwner(item) {
  const user = getCurrentUser();
  if (!user || !item) return false;

  return String(user.id).trim() === String(item.owner_user_id).trim();
}

function myItemsCount() {
  return state.items.filter(isOwner).length;
}

function updateMyReportsButton() {
  if (!els.btnMyReports) return;

  const count = myItemsCount();
  els.btnMyReports.textContent = state.onlyMine
    ? `Showing My Reports (${count})`
    : `My Reports (${count})`;
}

function syncDetailActionButtons(item) {
  const owner = isOwner(item);

  if (els.btnEdit) {
    els.btnEdit.hidden = !owner;
  }

  if (els.btnDelete) {
    els.btnDelete.hidden = !owner;
  }
}

function fmtDate(value) {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value ?? "");
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
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

  if (state.onlyMine) {
    out = out.filter(isOwner);
  }

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
  updateMyReportsButton();

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
  const preview =
    item.description?.length > 120
      ? item.description.slice(0, 120) + "…"
      : item.description;
  safeText(desc, preview);

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const btnView = document.createElement("button");
  btnView.className = "link-btn";
  btnView.type = "button";
  btnView.textContent = "View";
  btnView.addEventListener("click", () => openDetails(item.id));
  actions.appendChild(btnView);

  if (isOwner(item)) {
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

    actions.append(btnStatus, btnDelete);
  }

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
  if (!isOwner(item)) return;

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
  if (!isOwner(item)) return;

  els.formTitle.textContent = "Edit Report";
  els.reportId.value = item.id;
  els.category.value = item.category;
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
      const original = state.items.find((x) => String(x.id) === String(id));
      if (!isOwner(original)) {
        alert("You can only edit your own report.");
        return;
      }

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
  syncDetailActionButtons(item);
  els.modalDetails.showModal();
}

function closeDetails() {
  if (els.modalDetails.open) els.modalDetails.close();
  state.selectedId = null;
}

async function removeItem(id) {
  const item = state.items.find((x) => x.id === id);
  if (!isOwner(item)) return;

  const ok = confirm(`Delete "${item?.title || "this report"}"?`);
  if (!ok) return;

  try {
    await api.remove(id);
    state.items = state.items.filter((x) => x.id !== id);

    if (state.selectedId === id) {
      closeDetails();
    }

    render();
  } catch (err) {
    alert(`Delete failed: ${err.message}`);
  }
}

function setupUiForServerMode() {
  if (els.btnSeed) els.btnSeed.style.display = "none";
  if (els.btnClear) els.btnClear.style.display = "none";
}

function showCurrentUser() {
  const user = authStore.getUser();
  safeText(els.currentUserEmail, user?.email || "Unknown user");
}

function toggleMine() {
  state.onlyMine = !state.onlyMine;
  render();
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
    if (!item || !isOwner(item)) return;
    closeDetails();
    openEdit(item);
  });

  els.btnDelete.addEventListener("click", () => {
    if (!state.selectedId) return;
    const item = state.items.find((x) => x.id === state.selectedId);
    if (!item || !isOwner(item)) return;
    removeItem(state.selectedId);
  });

  if (els.btnMyReports) {
    els.btnMyReports.addEventListener("click", toggleMine);
  }

  els.q.addEventListener("input", render);
  els.statusFilter.addEventListener("change", render);
  els.sortBy.addEventListener("change", render);

  els.tabAll.addEventListener("click", () => setTab("all"));
  els.tabLost.addEventListener("click", () => setTab("lost"));
  els.tabFound.addEventListener("click", () => setTab("found"));

  if (els.btnLogout) {
    els.btnLogout.addEventListener("click", () => {
      api.logout();
      window.location.href = "./auth.html";
    });
  }
}

async function loadItemsAndRender() {
  state.items = await api.getAll();
  render();
}

async function start() {
  els.year.textContent = String(new Date().getFullYear());

  const token = authStore.getToken();
  if (!token) {
    window.location.href = "./auth.html";
    return;
  }

  setupUiForServerMode();
  wireEvents();
  showCurrentUser();

  if (els.btnLogout) {
    els.btnLogout.hidden = false;
  }

  await loadItemsAndRender();
}

start();