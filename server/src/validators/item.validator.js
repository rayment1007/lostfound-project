const ALLOWED_CATEGORY = new Set(["lost", "found"]);
const ALLOWED_STATUS = new Set(["active", "claimed", "resolved"]);

function isISODate(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function cleanText(s) {
  // 基础清洗：去掉控制字符 + trim
  return String(s ?? "").replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

function validateCreate(body) {
  const category = cleanText(body.category);
  const title = cleanText(body.title);
  const description = cleanText(body.description);
  const location = cleanText(body.location);
  const date = cleanText(body.date);
  const contact = cleanText(body.contact);
  const status = cleanText(body.status || "active");

  const errors = {};
  if (!ALLOWED_CATEGORY.has(category)) errors.category = "Category must be lost/found";
  if (!title || title.length > 80) errors.title = "Title required (max 80)";
  if (!location || location.length > 80) errors.location = "Location required (max 80)";
  if (!description || description.length > 500) errors.description = "Description required (max 500)";
  if (!contact || contact.length > 120) errors.contact = "Contact required (max 120)";
  if (!isISODate(date)) errors.date = "Date must be YYYY-MM-DD";
  if (!ALLOWED_STATUS.has(status)) errors.status = "Invalid status";

  return {
    ok: Object.keys(errors).length === 0,
    value: { category, title, description, location, date, contact, status },
    errors,
  };
}

function validatePatch(body) {
  const patch = {};
  const errors = {};

  if (body.title !== undefined) {
    const v = cleanText(body.title);
    if (!v || v.length > 80) errors.title = "Title required (max 80)";
    else patch.title = v;
  }
  if (body.location !== undefined) {
    const v = cleanText(body.location);
    if (!v || v.length > 80) errors.location = "Location required (max 80)";
    else patch.location = v;
  }
  if (body.description !== undefined) {
    const v = cleanText(body.description);
    if (!v || v.length > 500) errors.description = "Description required (max 500)";
    else patch.description = v;
  }
  if (body.contact !== undefined) {
    const v = cleanText(body.contact);
    if (!v || v.length > 120) errors.contact = "Contact required (max 120)";
    else patch.contact = v;
  }
  if (body.date !== undefined) {
    const v = cleanText(body.date);
    if (!isISODate(v)) errors.date = "Date must be YYYY-MM-DD";
    else patch.date = v;
  }
  if (body.category !== undefined) {
    const v = cleanText(body.category);
    if (!ALLOWED_CATEGORY.has(v)) errors.category = "Category must be lost/found";
    else patch.category = v;
  }
  if (body.status !== undefined) {
    const v = cleanText(body.status);
    if (!ALLOWED_STATUS.has(v)) errors.status = "Invalid status";
    else patch.status = v;
  }

  return { ok: Object.keys(errors).length === 0, patch, errors };
}

// 状态机：只允许 active -> claimed -> resolved
function isStatusTransitionAllowed(current, next) {
  if (current === next) return true;
  if (current === "active" && next === "claimed") return true;
  if (current === "claimed" && next === "resolved") return true;
  // 允许 active 直接 resolved？你可以选择允许/不允许；这里默认允许更灵活
  if (current === "active" && next === "resolved") return true;
  return false;
}

module.exports = { validateCreate, validatePatch, isStatusTransitionAllowed };