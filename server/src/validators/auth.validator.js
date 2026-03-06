function isEmail(s) {
  return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function validateRegister(body) {
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const errors = {};

  if (!isEmail(email)) errors.email = "Invalid email";
  if (password.length < 8) errors.password = "Password must be at least 8 characters";

  return { ok: Object.keys(errors).length === 0, email, password, errors };
}

function validateLogin(body) {
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const errors = {};

  if (!isEmail(email)) errors.email = "Invalid email";
  if (!password) errors.password = "Password is required";

  return { ok: Object.keys(errors).length === 0, email, password, errors };
}

module.exports = { validateRegister, validateLogin };