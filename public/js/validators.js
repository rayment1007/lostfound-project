export function isNonEmpty(s) {
  return typeof s === "string" && s.trim().length > 0;
}

export function maxLen(s, n) {
  return typeof s === "string" && s.trim().length <= n;
}

export function isValidDateISO(dateStr) {
  // yyyy-mm-dd basic check
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr + "T00:00:00");
  return !Number.isNaN(d.getTime());
}

export function normalizeStatus(status) {
  const allowed = new Set(["active", "claimed", "resolved"]);
  return allowed.has(status) ? status : "active";
}

export function normalizeCategory(cat) {
  const allowed = new Set(["lost", "found"]);
  return allowed.has(cat) ? cat : "";
}

export function validateReport(payload) {
  const errors = {};

  if (!normalizeCategory(payload.category)) errors.category = "Please choose Lost or Found.";
  if (!isValidDateISO(payload.date)) errors.date = "Please provide a valid date.";
  if (!isNonEmpty(payload.title) || !maxLen(payload.title, 80)) errors.title = "Title is required (max 80 chars).";
  if (!isNonEmpty(payload.location) || !maxLen(payload.location, 80)) errors.location = "Location is required (max 80 chars).";
  if (!isNonEmpty(payload.description) || !maxLen(payload.description, 500)) errors.description = "Description is required (max 500 chars).";
  if (!isNonEmpty(payload.contact) || !maxLen(payload.contact, 120)) errors.contact = "Contact is required (max 120 chars).";

  const status = normalizeStatus(payload.status);
  if (!status) errors.status = "Invalid status.";

  return { ok: Object.keys(errors).length === 0, errors };
}