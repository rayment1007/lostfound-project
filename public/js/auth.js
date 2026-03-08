import { api, authStore } from "./api.js";

const $ = (sel) => document.querySelector(sel);

const els = {
  form: $("#authPageForm"),
  title: $("#authPageTitle"),
  subtitle: $("#authPageSubtitle"),
  tabLogin: $("#pageTabLogin"),
  tabRegister: $("#pageTabRegister"),
  email: $("#pageAuthEmail"),
  password: $("#pageAuthPassword"),
  error: $("#pageAuthError"),
  submit: $("#pageAuthSubmit"),
};

let mode = "login";

function isQiuEmail(email) {
  return /^[a-zA-Z0-9._%+-]+@qiu\.edu\.my$/i.test(email.trim());
}

function setMode(nextMode) {
  mode = nextMode;

  els.title.textContent = mode === "login" ? "Login" : "Register";
  els.subtitle.textContent =
    mode === "login"
      ? "Use your QIU email to access the portal."
      : "Create an account using your QIU email address.";

  els.tabLogin.setAttribute("aria-selected", mode === "login" ? "true" : "false");
  els.tabRegister.setAttribute("aria-selected", mode === "register" ? "true" : "false");

  els.submit.textContent = mode === "login" ? "Login" : "Register";
  els.error.hidden = true;
  els.error.textContent = "";
}

async function handleSubmit(e) {
  e.preventDefault();

  const email = els.email.value.trim().toLowerCase();
  const password = els.password.value;

  els.error.hidden = true;
  els.error.textContent = "";

  if (!isQiuEmail(email)) {
    els.error.hidden = false;
    els.error.textContent = "Please use a valid QIU email address ending with @qiu.edu.my.";
    return;
  }

  if (password.length < 8) {
    els.error.hidden = false;
    els.error.textContent = "Password must be at least 8 characters.";
    return;
  }

  try {
    if (mode === "register") {
      await api.register(email, password);
    }

    await api.login(email, password);
    window.location.href = "./index.html";
  } catch (err) {
    els.error.hidden = false;
    els.error.textContent = err.message;
  }
}

function start() {
  const token = authStore.getToken();
  if (token) {
    window.location.href = "./index.html";
    return;
  }

  els.tabLogin.addEventListener("click", () => setMode("login"));
  els.tabRegister.addEventListener("click", () => setMode("register"));
  els.form.addEventListener("submit", handleSubmit);

  setMode("login");
}

start();