/* TransportPro v3.1 – single page app (plain JavaScript, no build step) */
"use strict";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const state = { token: localStorage.getItem("tp_token"), user: JSON.parse(localStorage.getItem("tp_user") || "null"), pending: 0 };
const isStaff = () => !!state.user && ["OWNER", "ADMIN"].includes(state.user.role);

/* ---------------- icons (inline SVG, works offline) ---------------- */
const P = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62L18.3 9.38A1 1 0 0 0 17.52 9H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 17.5v-11"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>', stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>', undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>', trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>', calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>', alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', rupee: '<path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3a5 5 0 0 0 0-10"/>',
  fuel: '<path d="M3 22h12M4 9h10M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0V9.83a2 2 0 0 0-.59-1.42L18 5"/>',
  printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>', inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  volume: '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/>',
};
const ic = (n, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ""}</svg>`;

/* ---------------- helpers ---------------- */
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const num = (n, d = 0) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: d });
const toDate = (d) => new Date(d.length === 10 ? d + "T00:00:00" : /Z|[+-]\d\d:\d\d$/.test(d) ? d : d + "Z");
const fmtDate = (d) => (d ? toDate(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const fmtDT = (d) => (d ? toDate(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
const ago = (d) => {
  const s = Math.max(0, (Date.now() - toDate(d)) / 1000);
  return s < 60 ? "just now" : s < 3600 ? Math.floor(s / 60) + " min ago" : s < 86400 ? Math.floor(s / 3600) + " h ago" : fmtDT(d);
};
const todayStr = () => new Date().toLocaleDateString("en-CA");
const thisMonth = () => todayStr().slice(0, 7);
const monthName = (m) => toDate(m + "-01").toLocaleDateString("en-IN", { month: "short", year: "numeric" });
const daysLeft = (d) => (d ? Math.round((toDate(d) - toDate(todayStr())) / 86400000) : null);
const initials = (n) => (n || "?").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
const nz = (v) => v !== null && v !== undefined && v !== "";

const STATUS = {
  ASSIGNED: ["violet", "Assigned"], STARTED: ["info", "Running"], COMPLETED: ["warn", "To verify"], VERIFIED: ["ok", "Verified"],
  REJECTED: ["danger", "Sent back"], CANCELLED: ["dark", "Cancelled"], ACTIVE: ["ok", "Active"], IN_SERVICE: ["warn", "In service"],
  INACTIVE: ["dark", "Inactive"], PAID: ["ok", "Paid"], UNPAID: ["danger", "Unpaid"], DRAFT: ["warn", "Draft"],
};
const pill = (s, txt) => `<span class="pill ${(STATUS[s] || [""])[0]}">${esc(txt || (STATUS[s] || [0, s])[1])}</span>`;
const pillc = (cls, txt) => `<span class="pill ${cls}">${esc(txt)}</span>`;
const expiry = (d) => {
  if (!d) return `<span class="muted">—</span>`;
  const n = daysLeft(d);
  return `${fmtDate(d)} ${n < 0 ? pillc("danger", "Expired") : n <= 30 ? pillc("warn", n + "d left") : ""}`;
};

function toast(msg, kind = "") {
  const t = $("#toast");
  t.innerHTML = (kind === "err" ? ic("alert", "sm") : kind === "ok" ? ic("check", "sm") : "") + `<span>${esc(msg)}</span>`;
  t.className = "toast " + kind;
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.add("hidden"), 2800);
}

async function api(path, method = "GET", body) {
  let res;
  try {
    res = await fetch(path, {
      method, cache: "no-store",
      headers: { "Content-Type": "application/json", ...(state.token ? { Authorization: "Bearer " + state.token } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch { throw new Error("Cannot reach server. Check internet / that the server is running."); }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && state.token) { logout(); throw new Error(data.detail || "Session expired. Please login again."); }
  if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Request failed (" + res.status + ")");
  return data;
}

/* ---------------- modal + forms ---------------- */
function openModal(title, html) {
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = html;
  $("#modal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}
function closeModal() { $("#modal").classList.add("hidden"); $("#modalBody").innerHTML = ""; document.body.style.overflow = ""; }
const modalOpen = () => !$("#modal").classList.contains("hidden");

function fieldHtml(f, values) {
  if (f.section) return `<div class="fieldset-title">${esc(f.section)}</div>`;
  const v = values[f.name];
  const val = v ?? f.value ?? "";
  const attrs = ["required", "min", "max", "step", "pattern", "minlength", "maxlength", "placeholder", "inputmode", "title"]
    .filter((a) => f[a] !== undefined && f[a] !== false && f[a] !== null).map((a) => (f[a] === true ? a : `${a}="${esc(f[a])}"`)).join(" ");
  const tag = f.required ? ' <span class="req">*</span>' : f.optional ? ' <span class="opt">(optional)</span>' : "";
  let input;
  if (f.type === "select") {
    input = `<select name="${f.name}" ${attrs} ${f.disabled ? "disabled" : ""}><option value="">Select…</option>${f.options
      .map(([ov, ot]) => `<option value="${esc(ov)}" ${String(ov) === String(val) ? "selected" : ""}>${esc(ot)}</option>`).join("")}</select>`;
  } else if (f.type === "textarea") {
    input = `<textarea name="${f.name}" rows="2" ${attrs}>${esc(val)}</textarea>`;
  } else if (f.type === "checkbox") {
    return `<label class="check ${f.full ? "full" : ""}"><input type="checkbox" name="${f.name}" ${(v ?? f.value) ? "checked" : ""}> ${esc(f.label)}</label>`;
  } else {
    input = `<input name="${f.name}" type="${f.type || "text"}" value="${esc(val)}" ${attrs} ${f.type === "number" ? 'inputmode="decimal"' : ""}>`;
  }
  return `<label class="${f.full ? "full" : ""}">${esc(f.label)}${tag}${input}${f.help ? `<span class="help">${esc(f.help)}</span>` : ""}<div class="field-error"></div></label>`;
}

function formHtml(fields, values = {}, submitText = "Save", extra = "", submitCls = "primary") {
  return `<form novalidate><div class="alert danger hidden"></div>${extra}<div class="form-grid">${fields.map((f) => fieldHtml(f, values)).join("")}</div>
    <div class="form-actions"><button type="button" class="btn" data-cancel>Cancel</button><button class="btn ${submitCls}" type="submit">${submitText}</button></div></form>`;
}

function readForm(form, fields) {
  const out = {};
  for (const f of fields) {
    if (f.section) continue;
    const el = form.elements[f.name];
    if (!el) continue;
    if (f.type === "checkbox") out[f.name] = el.checked;
    else if (f.type === "number" || f.numeric) out[f.name] = el.value === "" ? null : Number(el.value);
    else out[f.name] = el.value.trim() === "" ? null : el.value.trim();
  }
  return out;
}

function validateForm(form, custom) {
  let ok = true, first = null;
  $$("input, select, textarea", form).forEach((el) => {
    if (el.disabled) return;
    const errEl = el.closest("label")?.querySelector(".field-error");
    let msg = "";
    if (!el.checkValidity()) {
      const v = el.validity;
      if (v.valueMissing) msg = "This field is required";
      else if (v.badInput) msg = "Enter a valid number";
      else if (v.patternMismatch) msg = el.title || "Invalid format";
      else if (v.rangeUnderflow) msg = `Must be at least ${el.min}`;
      else if (v.rangeOverflow) msg = `Must be at most ${el.max}`;
      else if (v.tooShort) msg = `Minimum ${el.minLength} characters`;
      else if (v.typeMismatch) msg = el.type === "email" ? "Enter a valid email" : "Invalid value";
      else if (v.stepMismatch) msg = "Invalid value";
      else msg = el.validationMessage;
    }
    if (!msg && custom) msg = custom(el.name, el.value, form) || "";
    if (errEl) errEl.textContent = msg;
    el.classList.toggle("invalid", !!msg);
    if (msg) { ok = false; first = first || el; }
  });
  if (first) first.scrollIntoView({ block: "center", behavior: "smooth" });
  return ok;
}

function formModal({ title, fields, values = {}, submitText = "Save", submitCls, onSubmit, custom, extra = "", onInput }) {
  openModal(title, formHtml(fields, values, submitText, extra, submitCls));
  const form = $("#modalBody form");
  const errBox = form.querySelector(".alert");
  form.querySelector("[data-cancel]").onclick = closeModal;
  form.addEventListener("input", (e) => {
    e.target.classList.remove("invalid");
    const fe = e.target.closest("label")?.querySelector(".field-error"); if (fe) fe.textContent = "";
    if (onInput) onInput(form);
  });
  if (onInput) onInput(form);
  form.onsubmit = async (e) => {
    e.preventDefault();
    errBox.classList.add("hidden");
    if (!validateForm(form, custom)) return;
    const btn = form.querySelector("[type=submit]");
    btn.disabled = true;
    try {
      await onSubmit(readForm(form, fields), form);
      closeModal();
    } catch (err) {
      errBox.textContent = err.message; errBox.classList.remove("hidden");
      $("#modalBody").scrollTop = 0;
    } finally { btn.disabled = false; }
  };
}

function confirmModal(title, message, okText, onOk, { reason = false, cls = "primary" } = {}) {
  const fields = reason ? [{ name: "remarks", label: "Reason", type: "textarea", required: true, minlength: 3, maxlength: 300, full: true }] : [];
  formModal({ title, fields, submitText: okText, submitCls: cls, extra: `<p style="margin-top:0">${message}</p>`, onSubmit: (d) => onOk(d) });
}

function table(cols, rows, empty = "No records found", emptyIcon = "inbox") {
  if (!rows.length) return `<div class="card empty">${ic(emptyIcon)}<div>${empty}</div></div>`;
  return `<div class="table-wrap"><table class="data"><thead><tr>${cols.map((c) => `<th class="${c.num ? "num" : ""}">${c.label}</th>`).join("")}</tr></thead>
  <tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td data-label="${c.label}" class="${c.num ? "num" : ""} ${c.actions ? "actions" : ""}">${c.render(r)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

const stat = (label, value, icon, cls = "", go = "") =>
  `<div class="stat ${cls} ${go ? "clickable" : ""}" ${go ? `data-go="${go}"` : ""}><div class="ic">${ic(icon)}</div><div><div class="label">${label}</div><div class="value">${value}</div></div></div>`;

const PHONE = { pattern: "[6-9][0-9]{9}", inputmode: "numeric", maxlength: 10, title: "10-digit mobile number starting with 6-9" };
const REG = { pattern: "[A-Za-z0-9 \\-]{6,14}", title: "Enter a valid registration no. e.g. MH31AB1234" };

/* ---------------- auth ---------------- */
function logout() {
  if (state.token) dropPush(state.token);       // this phone stops getting the old user's alerts
  localStorage.removeItem("tp_token"); localStorage.removeItem("tp_user");
  state.token = null; state.user = null;
  clearInterval(alerts.timer); alerts.lastId = null; $("#alerts").innerHTML = "";
  history.replaceState(null, "", "/");
  showLogin();
}
function showLogin() { $("#appView").classList.add("hidden"); $("#loginView").classList.remove("hidden"); closeModal(); }

$("#pwEye").onclick = () => {
  const i = $("#loginForm").password; i.type = i.type === "password" ? "text" : "password";
  $("#pwEye").textContent = i.type === "password" ? "Show" : "Hide";
};
$$("[data-demo]").forEach((b) => (b.onclick = () => {
  const [u, p] = b.dataset.demo.split("/"); const f = $("#loginForm"); f.username.value = u; f.password.value = p;
}));
$("#loginForm").onsubmit = async (e) => {
  e.preventDefault();
  const f = e.target, err = $("#loginError");
  err.classList.add("hidden");
  if (!f.checkValidity()) { err.textContent = "Enter username (min 3) and password (min 4 characters)"; err.classList.remove("hidden"); return; }
  const btn = f.querySelector("button[type=submit]"); btn.disabled = true; btn.textContent = "Signing in…";
  try {
    const data = await api("/api/auth/login", "POST", { username: f.username.value.trim().toLowerCase(), password: f.password.value });
    state.token = data.token; state.user = data.user;
    localStorage.setItem("tp_token", data.token); localStorage.setItem("tp_user", JSON.stringify(data.user));
    f.reset();
    location.hash = isStaff() ? "#/dashboard" : "#/home";
    startApp();
  } catch (ex) { err.textContent = ex.message; err.classList.remove("hidden"); }
  finally { btn.disabled = false; btn.textContent = "Sign in"; }
};

/* ---------------- navigation ---------------- */
const NAV = {
  staff: [["dashboard", "dashboard", "Dashboard"], ["trips", "route", "Trips"], ["drivers", "users", "Drivers"], ["vehicles", "truck", "Vehicles"],
    ["customers", "building", "Customers"], ["servicing", "wrench", "Servicing"], ["advances", "wallet", "Advances"], ["payroll", "receipt", "Payroll"]],
  driver: [["home", "home", "Home"], ["my-trips", "route", "My Trips"], ["earnings", "wallet", "Earnings"], ["notifications", "bell", "Alerts"], ["profile", "user", "Profile"]],
};
const BOTTOM_STAFF = ["dashboard", "trips", "drivers", "vehicles", "payroll"];

function renderNav(route) {
  const items = isStaff() ? NAV.staff : NAV.driver;
  const cnt = (r) => (isStaff() && r === "trips" && state.pending ? `<span class="count">${state.pending}</span>` : "");
  $("#sidebar").innerHTML = items.map(([r, i, t]) => `<a href="#/${r}" class="${route === r ? "active" : ""}">${ic(i)}<span>${t}</span>${cnt(r)}</a>`).join("")
    + `<div class="sep"></div>${isStaff() ? `<a href="#/notifications" class="${route === "notifications" ? "active" : ""}">${ic("bell")}<span>Notifications</span></a>
       <a href="#/profile" class="${route === "profile" ? "active" : ""}">${ic("user")}<span>Profile</span></a>` : ""}
       <a href="#" class="logout" id="logoutLink">${ic("logout")}<span>Logout</span></a>`;
  const bottom = isStaff() ? items.filter(([r]) => BOTTOM_STAFF.includes(r)) : items;
  $("#bottomNav").innerHTML = bottom.map(([r, i, t]) => `<a href="#/${r}" class="${route === r ? "active" : ""}"><span class="ico">${ic(i)}</span>${t}${cnt(r)}</a>`).join("");
  $("#logoutLink").onclick = (e) => { e.preventDefault(); logout(); };
  $("#avatar").textContent = initials(state.user.full_name);
}

function parseHash() {
  const [path, qs] = (location.hash.replace(/^#\/?/, "") || "").split("?");
  return { route: path || (isStaff() ? "dashboard" : "home"), params: new URLSearchParams(qs || "") };
}

function setFab(fn) {
  const f = $("#fab");
  if (fn) { f.innerHTML = ic("plus"); f.onclick = fn; f.classList.remove("hidden"); } else { f.classList.add("hidden"); f.onclick = null; }
}

let routing = 0;
async function router() {
  if (!state.token) return showLogin();
  const { route, params } = parseHash();
  const pages = isStaff() ? STAFF_PAGES : DRIVER_PAGES;
  const fn = pages[route] || (route === "profile" ? pageProfile : route === "notifications" ? pageNotifications : null);
  const my = ++routing;
  closeSidebar(); closeModal(); setFab(null); renderNav(route);
  const page = $("#page");
  if (!fn) { page.innerHTML = `<div class="card empty">${ic("inbox")}<div>Page not found</div></div>`; return; }
  if (!page.dataset.route || page.dataset.route !== route) page.innerHTML = `<div class="card empty">Loading…</div>`;
  page.dataset.route = route;
  try { await fn(page, params); } catch (e) { if (my === routing) page.innerHTML = `<div class="alert danger">${esc(e.message)}</div>`; }
  updateEnableBar();
  refreshPending();
}
const reload = () => router();

async function refreshPending() {
  if (!isStaff()) return;
  try {
    const p = (await api("/api/trips?status=COMPLETED")).length;
    if (p !== state.pending) { state.pending = p; renderNav(parseHash().route); }
  } catch { /* ignore */ }
}

function closeSidebar() { $("#sidebar").classList.remove("open"); $("#backdrop").classList.add("hidden"); }
$("#menuBtn").innerHTML = ic("menu");
$("#bellBtn").insertAdjacentHTML("afterbegin", ic("bell"));
$("#modalClose").innerHTML = ic("x");
$("#menuBtn").onclick = () => { $("#sidebar").classList.add("open"); $("#backdrop").classList.remove("hidden"); };
$("#backdrop").onclick = closeSidebar;
$("#modalClose").onclick = closeModal;
$("#modal").onclick = (e) => { if (e.target.id === "modal") closeModal(); };
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
window.addEventListener("hashchange", router);
const updateOnline = () => $("#offlineBadge").classList.toggle("hidden", navigator.onLine);
window.addEventListener("online", () => { updateOnline(); pollAlerts(); }); window.addEventListener("offline", updateOnline);

async function lookups() {
  const [drivers, vehicles, customers] = await Promise.all([api("/api/users?role=DRIVER"), api("/api/vehicles"), api("/api/customers")]);
  return { drivers, vehicles, customers };
}
const bindGo = (page) => $$("[data-go]", page).forEach((el) => (el.onclick = () => (location.hash = el.dataset.go)));

/* ================================================================
   TRIP CARD + ACTIONS (shared by staff and driver)
   ================================================================ */
const STEP_ORDER = ["ASSIGNED", "STARTED", "COMPLETED", "VERIFIED"];
function steps(status) {
  if (status === "CANCELLED") return "";
  const idx = status === "REJECTED" ? 2 : STEP_ORDER.indexOf(status);
  const names = ["Assigned", "Started", status === "REJECTED" ? "Sent back" : "Ended", "Verified"];
  return `<div class="steps">${names.map((n, i) => `${i ? `<div class="bar ${i <= idx ? "done" : ""}"></div>` : ""}
    <div class="st ${i < idx || (i === idx && status === "VERIFIED") ? "done" : i === idx ? "now" : ""}"><i></i>${n}</div>`).join("")}</div>`;
}

function tripCard(t, staff) {
  const exp = (t.fuel_cost || 0) + (t.toll_cost || 0) + (t.other_cost || 0);
  const future = t.trip_date > todayStr();
  const a = [];
  if (staff) {
    if (t.status === "COMPLETED") a.push(`<button class="btn ok sm" data-act="verify" data-id="${t.id}">${ic("check", "sm")}Verify</button>`,
      `<button class="btn danger sm" data-act="reject" data-id="${t.id}">${ic("undo", "sm")}Send back</button>`);
    if (t.status === "ASSIGNED" && !future) a.push(`<button class="btn soft sm" data-act="start" data-id="${t.id}">${ic("play", "sm")}Start for driver</button>`);
    if (t.status === "STARTED") a.push(`<button class="btn soft sm" data-act="end" data-id="${t.id}">${ic("stop", "sm")}End for driver</button>`);
    if (!["VERIFIED", "CANCELLED"].includes(t.status)) a.push(`<button class="btn sm" data-act="edit" data-id="${t.id}">${ic("edit", "sm")}Edit</button>`);
    if (["ASSIGNED", "STARTED", "REJECTED"].includes(t.status)) a.push(`<button class="btn danger sm" data-act="cancel" data-id="${t.id}">${ic("ban", "sm")}Cancel</button>`);
    if (t.status === "VERIFIED") a.push(`<button class="btn sm" data-act="payment" data-id="${t.id}">${ic("rupee", "sm")}${t.payment_status === "PAID" ? "Mark customer unpaid" : "Customer paid"}</button>`);
  } else {
    if (t.status === "ASSIGNED") a.push(`<button class="btn primary block lg" data-act="start" data-id="${t.id}" ${future ? "disabled" : ""}>${ic("play")}${future ? "Starts on " + fmtDate(t.trip_date) : "Start trip"}</button>`);
    if (t.status === "STARTED") a.push(`<button class="btn ok block lg" data-act="end" data-id="${t.id}">${ic("stop")}End trip</button>`);
    if (t.status === "REJECTED") a.push(`<button class="btn primary block lg" data-act="end" data-id="${t.id}">${ic("edit")}Correct &amp; resubmit</button>`);
  }
  const km = t.actual_distance_km != null ? `${num(t.actual_distance_km, 1)} km` : `${num(t.distance_km)} km`;
  return `<div class="trip-card s-${t.status}" id="trip-${t.id}">
    <div class="trip-head"><div><div class="trip-title">${esc(t.trip_name)}</div>
      <div class="meta" style="margin-top:4px"><span>${ic("calendar", "sm")}${fmtDate(t.trip_date)}</span><span>${ic("truck", "sm")}${esc(t.vehicle_no)}</span>
      ${staff ? `<span>${ic("user", "sm")}${esc(t.driver_name)}</span>` : ""}<span>${ic("building", "sm")}${esc(t.customer_name)}</span></div></div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">${pill(t.status)}${staff && t.status === "VERIFIED" ? pill(t.payment_status, t.payment_status === "PAID" ? "Cust. paid" : "Cust. unpaid") : ""}</div></div>
    <div class="route"><span class="dot"></span><span class="place">${esc(t.origin)}</span><span class="line"></span><span class="place">${esc(t.destination)}</span><span class="dot end"></span></div>
    <div class="kv">
      <div><span>${t.actual_distance_km != null ? "Actual" : "Planned"} distance</span><b>${km}</b></div>
      ${staff ? `<div><span>Trip amount</span><b>${money(t.trip_amount)}</b></div>` : ""}
      <div><span>Driver pay</span><b>${money(t.driver_pay)}</b></div>
      ${exp ? `<div><span>Fuel / toll / other</span><b>${money(exp)}</b></div>` : ""}
    </div>
    ${t.started_at ? `<div class="meta" style="margin-top:10px"><span>${ic("clock", "sm")}Started ${fmtDT(t.started_at)}${nz(t.start_odometer) ? ` · ${num(t.start_odometer)} km` : ""}</span>
      ${t.ended_at && t.status !== "STARTED" ? `<span>Ended ${fmtDT(t.ended_at)}${nz(t.end_odometer) ? ` · ${num(t.end_odometer)} km` : ""}</span>` : ""}</div>` : ""}
    ${t.driver_notes ? `<div class="note info">${ic("edit", "sm")}<span>${esc(t.driver_notes)}</span></div>` : ""}
    ${t.remarks ? `<div class="note ${t.status === "CANCELLED" ? "warn" : "danger"}">${ic("alert", "sm")}<span>${t.status === "CANCELLED" ? "Cancelled" : "Office"}: ${esc(t.remarks)}</span></div>` : ""}
    ${steps(t.status)}
    ${a.length ? `<div class="trip-actions">${a.join("")}</div>` : ""}
  </div>`;
}

function bindTripActions(container, trips, L) {
  $$("[data-act]", container).forEach((b) => (b.onclick = () => {
    const t = trips.find((x) => x.id === Number(b.dataset.id));
    if (!t) return;
    const run = ({
      edit: async () => tripForm(t, L || await lookups()),
      verify: () => confirmModal("Verify trip", `Approve <b>${esc(t.trip_name)}</b>?<br><span class="muted small">Driver pay ${money(t.driver_pay)} + expenses ${money(t.fuel_cost + t.toll_cost + t.other_cost)} go to payroll; ${money(t.trip_amount)} counts as income.</span>`,
        `${ic("check", "sm")}Verify`, async () => { await api(`/api/trips/${t.id}/verify`, "POST"); toast("Trip verified", "ok"); reload(); }, { cls: "ok" }),
      reject: () => confirmModal("Send trip back", "The driver gets a pop-up alert and will correct & resubmit.", "Send back",
        async (d) => { await api(`/api/trips/${t.id}/reject`, "POST", d); toast("Sent back – driver alerted"); reload(); }, { reason: true, cls: "primary" }),
      cancel: () => confirmModal("Cancel trip", `Cancel <b>${esc(t.trip_name)}</b>? The driver will be alerted. This cannot be undone.`, "Cancel trip",
        async (d) => { await api(`/api/trips/${t.id}/cancel`, "POST", d); toast("Trip cancelled – driver alerted"); reload(); }, { reason: true, cls: "primary" }),
      payment: async () => { await api(`/api/trips/${t.id}/payment`, "POST"); toast("Payment status updated", "ok"); reload(); },
      start: () => startTripForm(t),
      end: () => endTripForm(t),
    })[b.dataset.act];
    Promise.resolve().then(run).catch((e) => toast(e.message || "Something went wrong", "err"));
  }));
}

/* ---------- Start trip: odometer optional ---------- */
function startTripForm(t) {
  formModal({
    title: "Start trip", submitText: `${ic("play", "sm")}Start now`,
    extra: `<div class="calc"><b>${esc(t.trip_name)}</b><br>${esc(t.origin)} → ${esc(t.destination)} · ${esc(t.vehicle_no)} · ${num(t.distance_km)} km planned</div>`,
    fields: [{ name: "start_odometer", label: "Odometer reading now (km)", type: "number", optional: true, min: 0, max: 5000000, step: "any", full: true,
      placeholder: "Leave blank to skip", help: "Optional – if you enter it here and at the end, distance is calculated automatically." }],
    onSubmit: async (d) => { await api(`/api/trips/${t.id}/start`, "POST", d); toast("Trip started. Drive safe!", "ok"); reload(); },
  });
}

/* ---------- End trip: everything optional ---------- */
function endTripForm(t) {
  const hasStart = nz(t.start_odometer);
  const resubmit = t.status === "REJECTED";
  const fields = [
    { section: "Distance" },
    { name: "end_odometer", label: "Odometer reading now (km)", type: "number", optional: true, min: 0, max: 5000000, step: "any",
      placeholder: hasStart ? `Start was ${num(t.start_odometer)}` : "Leave blank to skip" },
    { name: "actual_distance_km", label: "Actual distance (km)", type: "number", optional: true, min: 0, max: 5000, step: "any",
      placeholder: `Planned ${num(t.distance_km)}` },
    { section: "Expenses you paid (reimbursed in salary)" },
    { name: "fuel_cost", label: "Fuel (₹)", type: "number", optional: true, min: 0, max: 500000, step: "any", placeholder: "0" },
    { name: "toll_cost", label: "Toll (₹)", type: "number", optional: true, min: 0, max: 100000, step: "any", placeholder: "0" },
    { name: "other_cost", label: "Other – parking, loading (₹)", type: "number", optional: true, min: 0, max: 100000, step: "any", placeholder: "0", full: true },
    { name: "driver_notes", label: "Notes for office", type: "textarea", optional: true, maxlength: 300, full: true, placeholder: "e.g. delay due to traffic, bills handed over" },
  ];
  const values = resubmit ? { ...t, fuel_cost: t.fuel_cost || "", toll_cost: t.toll_cost || "", other_cost: t.other_cost || "" } : {};
  formModal({
    title: resubmit ? "Correct & resubmit" : "End trip", fields, values, submitCls: "ok",
    submitText: resubmit ? `${ic("check", "sm")}Resubmit` : `${ic("stop", "sm")}End trip`,
    extra: `${resubmit && t.remarks ? `<div class="note danger" style="margin:0 0 12px">${ic("alert", "sm")}<span>Office: ${esc(t.remarks)}</span></div>` : ""}<div class="calc" id="endCalc"></div>`,
    onInput: (f) => {
      const eo = f.end_odometer.value, ak = f.actual_distance_km.value;
      let km, how;
      if (eo !== "" && hasStart && Number(eo) >= t.start_odometer) { km = Number(eo) - t.start_odometer; how = "from odometer"; }
      else if (ak !== "") { km = Number(ak); how = "entered"; }
      else { km = t.distance_km; how = "planned (nothing entered)"; }
      const exp = ["fuel_cost", "toll_cost", "other_cost"].reduce((s, n) => s + Number(f[n].value || 0), 0);
      $("#endCalc").innerHTML = `Distance: <b>${num(km, 1)} km</b> <span class="small">(${how})</span><br>Expenses to claim: <b>${money(exp)}</b> · Trip pay: <b>${money(t.driver_pay)}</b>`;
    },
    custom: (n, v) => {
      if (n === "end_odometer" && v !== "" && hasStart && Number(v) < t.start_odometer) return `Must be ≥ start reading (${num(t.start_odometer)})`;
      if (n === "end_odometer" && v !== "" && hasStart && Number(v) - t.start_odometer > 5000) return "More than 5000 km – please check the reading";
    },
    onSubmit: async (d) => {
      ["fuel_cost", "toll_cost", "other_cost"].forEach((k) => (d[k] = d[k] || 0));
      await api(`/api/trips/${t.id}/end`, "POST", d);
      toast(resubmit ? "Resubmitted – office alerted" : "Trip ended – office alerted", "ok"); reload();
    },
  });
}

/* ================================================================
   STAFF PAGES
   ================================================================ */
async function pageDashboard(page, params) {
  const month = params.get("month") || thisMonth();
  const d = await api("/api/dashboard/owner?month=" + month);
  const maxBar = Math.max(1, ...d.trend.map((t) => Math.max(t.income, t.expenses)));
  const alertIcon = { service: "wrench", insurance: "alert", fitness: "alert", licence: "user" };
  page.innerHTML = `
    <div class="page-head"><div><h2>Dashboard</h2><div class="sub">Overview for ${monthName(month)}</div></div><div class="spacer"></div>
      <input type="month" id="dashMonth" value="${month}" max="${thisMonth()}" style="width:auto;margin:0"></div>
    <div class="hero">
      <div class="label">Profit · ${monthName(month)}</div><div class="big">${money(d.profit)}</div>
      <div class="hero-row"><div><span>Income</span><b>${money(d.income)}</b></div><div><span>Expenses</span><b>${money(d.expenses)}</b></div><div><span>Verified trips</span><b>${d.trips_verified}</b></div></div>
    </div>
    <div class="grid">
      ${stat("Trips to verify", d.pending_verification, "check", "warn", "#/trips?status=COMPLETED")}
      ${stat("Running now", d.running_trips, "route", "info", "#/trips?status=STARTED")}
      ${stat("Today's trips", d.today_trips, "calendar", "")}
      ${stat("Due from customers", money(d.unpaid_by_customers), "rupee", "danger", "#/trips?status=VERIFIED&payment=UNPAID")}
      ${stat("Driver salary", money(d.salary), "users", "")}
      ${stat("Fuel / toll", money(d.trip_expenses), "fuel", "")}
      ${stat("Servicing", money(d.servicing), "wrench", "")}
      ${stat("Active vehicles / drivers", `${d.active_vehicles} / ${d.active_drivers}`, "truck", "ok")}
    </div>
    ${d.alerts.length ? `<div class="card"><div class="card-head">${ic("alert")}<h3>Needs attention</h3></div><ul class="list">${d.alerts.map((a) => `<li><span class="ic">${ic(alertIcon[a.type] || "alert", "sm")}</span>${esc(a.text)}</li>`).join("")}</ul></div>` : ""}
    <div class="two-col">
      <div class="card"><div class="card-head"><h3>Last 6 months</h3><div class="spacer"></div>
        <div class="legend"><span><i style="background:#4f46e5"></i>Income</span><span><i style="background:#f43f5e"></i>Expenses</span></div></div>
        <div class="bars">${d.trend.map((t) => `<div class="bar-group" title="${monthName(t.month)}: income ${money(t.income)}, expenses ${money(t.expenses)}">
          <div class="bar-pair"><div class="bar inc" style="height:${(t.income / maxBar) * 100}%"></div><div class="bar exp" style="height:${(t.expenses / maxBar) * 100}%"></div></div>
          <div class="bar-label">${monthName(t.month).split(" ")[0]}</div></div>`).join("")}</div></div>
      <div class="card"><div class="card-head"><h3>Drivers this month</h3></div>
        ${d.by_driver.length ? `<ul class="list">${d.by_driver.map((r) => `<li><span class="avatar" style="width:32px;height:32px;font-size:12px;margin:0">${initials(r.driver)}</span><span style="flex:1">${esc(r.driver)}<div class="cell-sub">${r.trips} trip(s)</div></span><b>${money(r.pay)}</b></li>`).join("")}</ul>` : `<p class="muted">No verified trips yet</p>`}</div>
    </div>
    <div class="section-title">Vehicle performance</div>
    ${table([{ label: "Vehicle", render: (r) => `<span class="cell-title">${esc(r.vehicle)}</span>` }, { label: "Trips", num: 1, render: (r) => r.trips },
      { label: "KM", num: 1, render: (r) => num(r.km) }, { label: "Income", num: 1, render: (r) => money(r.income) },
      { label: "Servicing", num: 1, render: (r) => money(r.servicing) }], d.by_vehicle, "No verified trips this month", "truck")}`;
  $("#dashMonth").onchange = (e) => e.target.value && (location.hash = "#/dashboard?month=" + e.target.value);
  bindGo(page);
}

const TRIP_TABS = [["", "All"], ["COMPLETED", "To verify"], ["ASSIGNED", "Assigned"], ["STARTED", "Running"], ["REJECTED", "Sent back"], ["VERIFIED", "Verified"], ["CANCELLED", "Cancelled"]];

async function pageTrips(page, params) {
  const status = params.get("status") || "", payment = params.get("payment") || "", driverF = params.get("driver") || "";
  const month = params.has("month") ? params.get("month") : (status || payment ? "" : thisMonth());
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (month) qs.set("month", month);
  if (payment) qs.set("payment_status", payment);
  if (driverF) qs.set("driver_id", driverF);
  const [L, trips] = await Promise.all([lookups(), api("/api/trips?" + qs)]);
  const go = (patch) => {
    const p = { status, month, payment, driver: driverF, ...patch };
    const u = new URLSearchParams();
    Object.entries(p).forEach(([k, v]) => { if (v || k === "month") u.set(k, v || ""); });
    location.hash = "#/trips?" + u;
  };
  page.innerHTML = `
    <div class="page-head"><div><h2>Trips</h2><div class="sub">${trips.length} trip(s) · ${money(trips.filter((t) => t.status !== "CANCELLED").reduce((a, t) => a + t.trip_amount, 0))}</div></div>
      <div class="spacer"></div><button class="btn primary hide-m" id="newTrip">${ic("plus", "sm")}New trip</button></div>
    <div class="tabs">${TRIP_TABS.map(([s, t]) => `<button data-s="${s}" class="${s === status ? "active" : ""}">${t}${s === "COMPLETED" && state.pending ? `<span class="n">${state.pending}</span>` : ""}</button>`).join("")}</div>
    <div class="toolbar">
      <input type="month" id="fMonth" value="${month}" title="Month (clear for all)">
      <select id="fDriver"><option value="">All drivers</option>${L.drivers.map((d) => `<option value="${d.id}" ${String(d.id) === driverF ? "selected" : ""}>${esc(d.full_name)}</option>`).join("")}</select>
      <select id="fPay"><option value="">Any payment</option><option value="UNPAID" ${payment === "UNPAID" ? "selected" : ""}>Customer unpaid</option><option value="PAID" ${payment === "PAID" ? "selected" : ""}>Customer paid</option></select>
      <div class="search">${ic("search", "sm")}<input id="fSearch" placeholder="Search trip, customer, vehicle…"></div>
    </div>
    <div id="tripList"></div>`;
  const renderList = () => {
    const q = $("#fSearch").value.toLowerCase();
    const rows = trips.filter((t) => !q || [t.trip_name, t.customer_name, t.vehicle_no, t.driver_name, t.origin, t.destination].join(" ").toLowerCase().includes(q));
    $("#tripList").innerHTML = rows.length ? rows.map((t) => tripCard(t, true)).join("") : `<div class="card empty">${ic("route")}<div>No trips found</div></div>`;
    bindTripActions($("#tripList"), trips, L);
  };
  renderList();
  $$(".tabs button", page).forEach((b) => (b.onclick = () => go({ status: b.dataset.s, month: b.dataset.s ? "" : thisMonth() })));
  $("#fMonth").onchange = (e) => go({ month: e.target.value });
  $("#fDriver").onchange = (e) => go({ driver: e.target.value });
  $("#fPay").onchange = (e) => go({ payment: e.target.value });
  $("#fSearch").oninput = renderList;
  $("#newTrip").onclick = () => tripForm(null, L);
  setFab(() => tripForm(null, L));
}

function tripForm(t, L) {
  const started = !!t && t.status !== "ASSIGNED";
  const fields = [
    { name: "trip_name", label: "Trip name", required: true, minlength: 2, maxlength: 150, full: true, placeholder: "e.g. Nagpur–Amravati cotton load" },
    { name: "trip_date", label: "Trip date", type: "date", required: true, value: todayStr() },
    { name: "customer_id", label: "Customer", type: "select", required: true, numeric: true, options: L.customers.filter((c) => c.is_active || (t && c.id === t.customer_id)).map((c) => [c.id, c.name]) },
    { name: "driver_id", label: "Driver", type: "select", required: true, numeric: true, disabled: started, help: started ? "Locked – trip already started" : null,
      options: L.drivers.filter((d) => d.is_active || (t && d.id === t.driver_id)).map((d) => [d.id, d.full_name]) },
    { name: "vehicle_id", label: "Vehicle", type: "select", required: true, numeric: true, disabled: started, help: started ? "Locked – trip already started" : null,
      options: L.vehicles.filter((v) => v.status === "ACTIVE" || (t && v.id === t.vehicle_id)).map((v) => [v.id, `${v.reg_no} · ${v.vehicle_type}`]) },
    { name: "origin", label: "From", required: true, minlength: 2, maxlength: 100 },
    { name: "destination", label: "To", required: true, minlength: 2, maxlength: 100 },
    { name: "distance_km", label: "Planned distance (km)", type: "number", required: true, min: 1, max: 5000, step: "any" },
    { name: "trip_amount", label: "Trip amount from customer (₹)", type: "number", required: true, min: 0, max: 10000000, step: "any" },
    { name: "driver_pay", label: "Driver pay for this trip (₹)", type: "number", required: true, min: 0, max: 1000000, step: "any", full: true },
  ];
  formModal({
    title: t ? "Edit trip" : "New trip", fields, values: t || {}, submitText: t ? "Save changes" : "Assign trip",
    extra: `<div class="calc" id="tripCalc"></div>`,
    onInput: (form) => {
      const amt = Number(form.trip_amount.value || 0), pay = Number(form.driver_pay.value || 0);
      $("#tripCalc").innerHTML = `Margin before fuel/toll: <b>${money(amt - pay)}</b><br><span class="small">The driver gets a pop-up alert when you save.</span>`;
    },
    custom: (name, val, form) => {
      if (name === "driver_pay" && val !== "" && Number(val) > Number(form.trip_amount.value || 0)) return "Driver pay cannot exceed trip amount";
      if (name === "destination" && val && val.trim().toLowerCase() === form.origin.value.trim().toLowerCase()) return "From and To cannot be same";
      if (name === "trip_date" && !t && val && -daysLeft(val) > 31) return "Date is more than a month in the past";
    },
    onSubmit: async (d) => {
      if (started) { d.driver_id = t.driver_id; d.vehicle_id = t.vehicle_id; }
      await api(t ? `/api/trips/${t.id}` : "/api/trips", t ? "PUT" : "POST", d);
      toast(t ? "Trip updated" : "Trip assigned – driver alerted", "ok"); reload();
    },
  });
}

async function pageDrivers(page) {
  const users = await api("/api/users");
  const drivers = users.filter((u) => u.role === "DRIVER"), admins = users.filter((u) => u.role !== "DRIVER");
  page.innerHTML = `
    <div class="page-head"><div><h2>Drivers</h2><div class="sub">${drivers.filter((d) => d.is_active).length} active of ${drivers.length}</div></div><div class="spacer"></div>
      <button class="btn primary hide-m" id="addDriver">${ic("plus", "sm")}Add driver</button>
      ${state.user.role === "OWNER" ? `<button class="btn" id="addAdmin">${ic("plus", "sm")}Admin</button>` : ""}</div>
    <div class="toolbar"><div class="search">${ic("search", "sm")}<input id="dSearch" placeholder="Search name, phone, licence…"></div></div>
    <div id="dTable"></div>
    <div class="section-title">Owner &amp; admins</div>
    ${table([{ label: "Name", render: (u) => `<div class="cell-title">${esc(u.full_name)}</div><div class="cell-sub">@${esc(u.username)}</div>` },
      { label: "Role", render: (u) => pillc(u.role === "OWNER" ? "violet" : "info", u.role) }, { label: "Phone", render: (u) => esc(u.phone) },
      { label: "Last login", render: (u) => fmtDT(u.last_login) }, { label: "Status", render: (u) => pill(u.is_active ? "ACTIVE" : "INACTIVE") },
      { label: "", actions: 1, render: (u) => (state.user.role === "OWNER" && u.role === "ADMIN") || u.id === state.user.id ? `<button class="btn sm" data-edit="${u.id}">${ic("edit", "sm")}Edit</button>` : "" }], admins)}`;
  const render = () => {
    const q = $("#dSearch").value.toLowerCase();
    const rows = drivers.filter((d) => !q || [d.full_name, d.phone, d.license_no, d.username].join(" ").toLowerCase().includes(q));
    $("#dTable").innerHTML = table([
      { label: "Driver", render: (d) => `<div style="display:flex;gap:10px;align-items:center"><span class="avatar" style="width:36px;height:36px;font-size:13px;margin:0">${initials(d.full_name)}</span><div><div class="cell-title">${esc(d.full_name)}</div><div class="cell-sub">@${esc(d.username)}</div></div></div>` },
      { label: "Phone", render: (d) => `<a href="tel:${esc(d.phone)}">${esc(d.phone)}</a>` },
      { label: "Licence", render: (d) => `<div>${esc(d.license_no || "—")}</div><div class="cell-sub">${expiry(d.license_expiry)}</div>` },
      { label: "Last login", render: (d) => fmtDT(d.last_login) },
      { label: "Status", render: (d) => pill(d.is_active ? "ACTIVE" : "INACTIVE") },
      { label: "", actions: 1, render: (d) => `<button class="btn sm" data-edit="${d.id}">${ic("edit", "sm")}Edit</button><a class="btn sm" href="#/trips?driver=${d.id}&month=${thisMonth()}">${ic("route", "sm")}Trips</a>` },
    ], rows, "No drivers yet. Add your first driver.", "users");
    $$("[data-edit]", page).forEach((b) => (b.onclick = () => userForm(users.find((u) => u.id === Number(b.dataset.edit)))));
  };
  render();
  $("#dSearch").oninput = render;
  $("#addDriver").onclick = () => userForm(null, "DRIVER");
  if ($("#addAdmin")) $("#addAdmin").onclick = () => userForm(null, "ADMIN");
  setFab(() => userForm(null, "DRIVER"));
}

function userForm(u, role) {
  role = u ? u.role : role;
  const isDriver = role === "DRIVER";
  const fields = [
    { name: "full_name", label: "Full name", required: true, minlength: 2, maxlength: 100 },
    { name: "phone", label: "Mobile number", type: "tel", required: true, ...PHONE },
    ...(u ? [] : [{ name: "username", label: "Login username", required: true, minlength: 3, maxlength: 50, pattern: "[a-zA-Z0-9_.]+", title: "Letters, numbers, _ or . only" },
      { name: "password", label: "Password", type: "password", required: true, minlength: 6, maxlength: 100 }]),
    ...(isDriver ? [{ name: "license_no", label: "Driving licence no.", required: true, minlength: 6, maxlength: 30 },
      { name: "license_expiry", label: "Licence valid till", type: "date", optional: true },
      { name: "joined_on", label: "Joined on", type: "date", optional: true, value: u ? "" : todayStr() },
      { name: "address", label: "Address", type: "textarea", optional: true, maxlength: 250, full: true }] : []),
    ...(u ? [{ name: "new_password", label: "Reset password", type: "password", optional: true, minlength: 6, maxlength: 100, full: true, placeholder: "Leave blank to keep current" }] : []),
    { name: "is_active", label: "Active (can login & get trips)", type: "checkbox", value: true, full: true },
  ];
  formModal({
    title: (u ? "Edit " : "Add ") + (isDriver ? "driver" : "admin"), fields, values: u || {},
    custom: (name, val) => (name === "license_expiry" && val && !u && val < todayStr() ? "Licence already expired" : ""),
    onSubmit: async (d) => {
      if (!u) d.role = role;
      await api(u ? `/api/users/${u.id}` : "/api/users", u ? "PUT" : "POST", d);
      toast("Saved", "ok"); reload();
    },
  });
}

async function pageVehicles(page) {
  const list = await api("/api/vehicles");
  page.innerHTML = `<div class="page-head"><div><h2>Vehicles</h2><div class="sub">${list.filter((v) => v.status === "ACTIVE").length} active of ${list.length}</div></div><div class="spacer"></div>
    <button class="btn primary hide-m" id="addV">${ic("plus", "sm")}Add vehicle</button></div>
  ${table([
    { label: "Vehicle", render: (v) => `<div class="cell-title">${esc(v.reg_no)}</div><div class="cell-sub">${esc(v.vehicle_type)} ${esc(v.model || "")} ${v.capacity ? "· " + esc(v.capacity) : ""}</div>` },
    { label: "Odometer", num: 1, render: (v) => num(v.odometer_km) + " km" },
    { label: "Insurance", render: (v) => expiry(v.insurance_expiry) },
    { label: "Fitness", render: (v) => expiry(v.fitness_expiry) },
    { label: "Status", render: (v) => pill(v.status) },
    { label: "", actions: 1, render: (v) => `<button class="btn sm" data-edit="${v.id}">${ic("edit", "sm")}Edit</button><a class="btn sm" href="#/servicing?vehicle=${v.id}">${ic("wrench", "sm")}Service</a>` },
  ], list, "No vehicles yet", "truck")}`;
  const form = (v) => formModal({
    title: v ? "Edit vehicle" : "Add vehicle", values: v || {},
    fields: [
      { name: "reg_no", label: "Registration no.", required: true, ...REG },
      { name: "vehicle_type", label: "Type", type: "select", required: true, options: ["Truck", "Tempo", "Pickup", "Container", "Tanker", "Bus", "Car", "Other"].map((x) => [x, x]) },
      { name: "model", label: "Make / model", optional: true, maxlength: 60 },
      { name: "capacity", label: "Capacity", optional: true, maxlength: 30, placeholder: "e.g. 9 Ton / 40 seats" },
      { name: "odometer_km", label: "Current odometer (km)", type: "number", optional: true, min: 0, max: 5000000, step: "any" },
      { name: "status", label: "Status", type: "select", required: true, value: "ACTIVE", options: [["ACTIVE", "Active"], ["IN_SERVICE", "In service / repair"], ["INACTIVE", "Inactive / sold"]] },
      { name: "insurance_expiry", label: "Insurance valid till", type: "date", optional: true },
      { name: "fitness_expiry", label: "Fitness valid till", type: "date", optional: true },
    ],
    onSubmit: async (d) => { d.odometer_km = d.odometer_km || 0; await api(v ? `/api/vehicles/${v.id}` : "/api/vehicles", v ? "PUT" : "POST", d); toast("Saved", "ok"); reload(); },
  });
  $("#addV").onclick = () => form();
  setFab(() => form());
  $$("[data-edit]", page).forEach((b) => (b.onclick = () => form(list.find((x) => x.id === Number(b.dataset.edit)))));
}

async function pageCustomers(page) {
  const [list, unpaid] = await Promise.all([api("/api/customers"), api("/api/trips?status=VERIFIED&payment_status=UNPAID")]);
  const due = {}; unpaid.forEach((t) => (due[t.customer_id] = (due[t.customer_id] || 0) + t.trip_amount));
  page.innerHTML = `<div class="page-head"><div><h2>Customers</h2><div class="sub">${list.length} customer(s)</div></div><div class="spacer"></div>
    <button class="btn primary hide-m" id="addC">${ic("plus", "sm")}Add customer</button></div>
  ${table([
    { label: "Customer", render: (c) => `<div class="cell-title">${esc(c.name)}</div><div class="cell-sub">${esc(c.contact_person || "")}</div>` },
    { label: "Phone", render: (c) => `<a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>` },
    { label: "GSTIN", render: (c) => esc(c.gstin || "—") },
    { label: "Amount due", num: 1, render: (c) => (due[c.id] ? `<b style="color:var(--danger)">${money(due[c.id])}</b>` : "—") },
    { label: "Status", render: (c) => pill(c.is_active ? "ACTIVE" : "INACTIVE") },
    { label: "", actions: 1, render: (c) => `<button class="btn sm" data-edit="${c.id}">${ic("edit", "sm")}Edit</button>` },
  ], list, "No customers yet", "building")}`;
  const form = (c) => formModal({
    title: c ? "Edit customer" : "Add customer", values: c || {},
    fields: [
      { name: "name", label: "Company / customer name", required: true, minlength: 2, maxlength: 120, full: true },
      { name: "contact_person", label: "Contact person", optional: true, maxlength: 100 },
      { name: "phone", label: "Mobile number", type: "tel", required: true, ...PHONE },
      { name: "email", label: "Email", type: "email", optional: true, maxlength: 120 },
      { name: "gstin", label: "GSTIN", optional: true, maxlength: 15, pattern: "[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][A-Za-z0-9][Zz][A-Za-z0-9]", title: "Enter a valid 15-character GSTIN" },
      { name: "address", label: "Address", type: "textarea", optional: true, maxlength: 250, full: true },
      { name: "is_active", label: "Active", type: "checkbox", value: true, full: true },
    ],
    onSubmit: async (d) => { await api(c ? `/api/customers/${c.id}` : "/api/customers", c ? "PUT" : "POST", d); toast("Saved", "ok"); reload(); },
  });
  $("#addC").onclick = () => form();
  setFab(() => form());
  $$("[data-edit]", page).forEach((b) => (b.onclick = () => form(list.find((x) => x.id === Number(b.dataset.edit)))));
}

async function pageServicing(page, params) {
  const vf = params.get("vehicle") || "";
  const [list, vehicles] = await Promise.all([api("/api/servicing" + (vf ? "?vehicle_id=" + vf : "")), api("/api/vehicles")]);
  const total = list.reduce((a, s) => a + s.cost, 0);
  page.innerHTML = `<div class="page-head"><div><h2>Servicing</h2><div class="sub">Total ${money(total)}</div></div><div class="spacer"></div>
    <button class="btn primary hide-m" id="addS">${ic("plus", "sm")}Add record</button></div>
  <div class="toolbar"><select id="sVeh"><option value="">All vehicles</option>${vehicles.map((v) => `<option value="${v.id}" ${String(v.id) === vf ? "selected" : ""}>${esc(v.reg_no)}</option>`).join("")}</select></div>
  ${table([
    { label: "Work", render: (s) => `<div class="cell-title">${esc(s.service_type)}</div><div class="cell-sub">${esc(s.vehicle_no)} · ${fmtDate(s.service_date)}</div>` },
    { label: "Details", render: (s) => `${esc(s.description || "—")}${s.vendor ? `<div class="cell-sub">${esc(s.vendor)}</div>` : ""}` },
    { label: "Cost", num: 1, render: (s) => `<b>${money(s.cost)}</b>` },
    { label: "Next due", render: (s) => (s.next_due_date ? expiry(s.next_due_date) : "—") },
    { label: "", actions: 1, render: (s) => `<button class="btn sm" data-edit="${s.id}">${ic("edit", "sm")}Edit</button><button class="btn danger sm" data-del="${s.id}">${ic("trash", "sm")}</button>` },
  ], list, "No service records", "wrench")}`;
  const form = (s) => formModal({
    title: s ? "Edit service record" : "Add service record", values: s || { vehicle_id: vf },
    fields: [
      { name: "vehicle_id", label: "Vehicle", type: "select", required: true, numeric: true, options: vehicles.map((v) => [v.id, v.reg_no]) },
      { name: "service_date", label: "Service date", type: "date", required: true, value: todayStr(), max: todayStr() },
      { name: "service_type", label: "Type of work", type: "select", required: true, options: ["General service", "Oil change", "Tyres", "Brakes", "Battery", "Engine repair", "Body work", "Insurance renewal", "Fitness / permit", "Other"].map((x) => [x, x]) },
      { name: "cost", label: "Cost (₹)", type: "number", required: true, min: 0, max: 5000000, step: "any" },
      { name: "vendor", label: "Garage / vendor", optional: true, maxlength: 100 },
      { name: "odometer_km", label: "Odometer at service (km)", type: "number", optional: true, min: 0, max: 5000000, step: "any" },
      { name: "next_due_date", label: "Next service due", type: "date", optional: true },
      { name: "description", label: "Details", type: "textarea", optional: true, maxlength: 300, full: true },
    ],
    custom: (n, v, f) => (n === "next_due_date" && v && v <= f.service_date.value ? "Must be after service date" : ""),
    onSubmit: async (d) => { await api(s ? `/api/servicing/${s.id}` : "/api/servicing", s ? "PUT" : "POST", d); toast("Saved", "ok"); reload(); },
  });
  $("#addS").onclick = () => form();
  setFab(() => form());
  $("#sVeh").onchange = (e) => (location.hash = "#/servicing" + (e.target.value ? "?vehicle=" + e.target.value : ""));
  $$("[data-edit]", page).forEach((b) => (b.onclick = () => form(list.find((x) => x.id === Number(b.dataset.edit)))));
  $$("[data-del]", page).forEach((b) => (b.onclick = () => confirmModal("Delete record", "Delete this service record?", "Delete",
    async () => { await api(`/api/servicing/${b.dataset.del}`, "DELETE"); toast("Deleted"); reload(); })));
}

async function pageAdvances(page) {
  const [list, drivers] = await Promise.all([api("/api/advances"), api("/api/users?role=DRIVER")]);
  const open = list.filter((a) => !a.payroll_id).reduce((s, a) => s + a.amount, 0);
  page.innerHTML = `<div class="page-head"><div><h2>Advances</h2><div class="sub">Open ${money(open)} · deducted automatically in next payroll</div></div><div class="spacer"></div>
    <button class="btn primary hide-m" id="addA">${ic("plus", "sm")}Give advance</button></div>
  ${table([
    { label: "Driver", render: (a) => `<div class="cell-title">${esc(a.driver_name)}</div><div class="cell-sub">${fmtDate(a.given_on)}</div>` },
    { label: "Amount", num: 1, render: (a) => `<b>${money(a.amount)}</b>` },
    { label: "Note", render: (a) => esc(a.note || "—") },
    { label: "Status", render: (a) => (a.payroll_id ? pillc("ok", "Adjusted") : pillc("warn", "Open")) },
    { label: "", actions: 1, render: (a) => (a.payroll_id ? "" : `<button class="btn sm" data-edit="${a.id}">${ic("edit", "sm")}Edit</button><button class="btn danger sm" data-del="${a.id}">${ic("trash", "sm")}</button>`) },
  ], list, "No advances given", "wallet")}`;
  const form = (a) => formModal({
    title: a ? "Edit advance" : "Give advance", values: a || {},
    fields: [
      { name: "driver_id", label: "Driver", type: "select", required: true, numeric: true, options: drivers.filter((d) => d.is_active || (a && a.driver_id === d.id)).map((d) => [d.id, d.full_name]) },
      { name: "given_on", label: "Date", type: "date", required: true, value: todayStr(), max: todayStr() },
      { name: "amount", label: "Amount (₹)", type: "number", required: true, min: 1, max: 500000, step: "any" },
      { name: "note", label: "Note", optional: true, maxlength: 200, placeholder: "e.g. Medical / festival" },
    ],
    onSubmit: async (d) => { await api(a ? `/api/advances/${a.id}` : "/api/advances", a ? "PUT" : "POST", d); toast("Saved", "ok"); reload(); },
  });
  $("#addA").onclick = () => form();
  setFab(() => form());
  $$("[data-edit]", page).forEach((b) => (b.onclick = () => form(list.find((x) => x.id === Number(b.dataset.edit)))));
  $$("[data-del]", page).forEach((b) => (b.onclick = () => confirmModal("Delete advance", "Delete this advance entry?", "Delete",
    async () => { await api(`/api/advances/${b.dataset.del}`, "DELETE"); toast("Deleted"); reload(); })));
}

async function pagePayroll(page, params) {
  const month = params.get("month") || thisMonth();
  const list = await api("/api/payroll?month=" + month);
  const total = list.reduce((a, p) => a + p.net_pay, 0);
  page.innerHTML = `<div class="page-head"><div><h2>Payroll</h2><div class="sub">${monthName(month)}</div></div><div class="spacer"></div>
    <input type="month" id="pMonth" value="${month}" max="${thisMonth()}" style="width:auto;margin:0"><button class="btn primary" id="gen">${ic("refresh", "sm")}Generate</button></div>
    <div class="note info" style="margin:0 0 16px">${ic("receipt", "sm")}<span>Salary = pay of <b>verified</b> trips + fuel/toll reimbursement + bonus − advances − deductions. Paid payroll is locked and the driver is alerted.</span></div>
    <div class="grid">${stat("Drivers", list.length, "users")}${stat("Total net pay", money(total), "rupee", "ok")}${stat("Unpaid", list.filter((p) => p.status !== "PAID").length, "clock", "warn")}</div>
    ${table([
      { label: "Driver", render: (p) => `<div class="cell-title">${esc(p.driver_name)}</div><div class="cell-sub">${p.trip_count} trips · ${p.days_worked} days · ${num(p.total_km)} km</div>` },
      { label: "Trip pay", num: 1, render: (p) => money(p.trip_pay) },
      { label: "Reimburse", num: 1, render: (p) => money(p.reimbursement) },
      { label: "Bonus", num: 1, render: (p) => money(p.bonus) },
      { label: "Deductions", num: 1, render: (p) => money(p.advance_deduction + p.other_deduction) },
      { label: "Net pay", num: 1, render: (p) => `<b>${money(p.net_pay)}</b>` },
      { label: "Status", render: (p) => pill(p.status) },
      { label: "", actions: 1, render: (p) => `<button class="btn sm" data-slip="${p.id}">Slip</button>${p.status === "DRAFT" ? `<button class="btn sm" data-adj="${p.id}">Adjust</button><button class="btn ok sm" data-pay="${p.id}">${ic("check", "sm")}Paid</button>` : ""}` },
    ], list, `No payroll for ${monthName(month)} yet. Tap “Generate”.`, "receipt")}`;
  $("#pMonth").onchange = (e) => e.target.value && (location.hash = "#/payroll?month=" + e.target.value);
  $("#gen").onclick = async (e) => {
    const btn = e.currentTarget; btn.disabled = true;
    try { const r = await api("/api/payroll/generate", "POST", { month }); toast(`Payroll ready for ${r.length} driver(s)`, "ok"); reload(); }
    catch (err) { toast(err.message, "err"); btn.disabled = false; }
  };
  const find = (id) => list.find((p) => p.id === Number(id));
  $$("[data-slip]", page).forEach((b) => (b.onclick = () => payslip(find(b.dataset.slip))));
  $$("[data-adj]", page).forEach((b) => (b.onclick = () => {
    const p = find(b.dataset.adj);
    formModal({ title: "Adjust – " + p.driver_name, values: p,
      fields: [{ name: "bonus", label: "Bonus / incentive (₹)", type: "number", min: 0, max: 1000000, step: "any" },
        { name: "other_deduction", label: "Other deduction (₹)", type: "number", min: 0, max: 1000000, step: "any" }],
      onSubmit: async (d) => { await api(`/api/payroll/${p.id}`, "PUT", { bonus: d.bonus || 0, other_deduction: d.other_deduction || 0 }); toast("Updated", "ok"); reload(); } });
  }));
  $$("[data-pay]", page).forEach((b) => (b.onclick = () => {
    const p = find(b.dataset.pay);
    confirmModal("Mark salary paid", `Pay <b>${money(p.net_pay)}</b> to ${esc(p.driver_name)} for ${monthName(p.month)}?<br><span class="small muted">The driver gets a pop-up alert. This driver's trips for the month are then locked.</span>`,
      "Mark paid", async () => { await api(`/api/payroll/${p.id}/pay`, "POST"); toast("Marked as paid – driver alerted", "ok"); reload(); }, { cls: "ok" });
  }));
}

function payslip(p) {
  openModal(`Pay slip – ${monthName(p.month)}`, `<div class="profile-head"><span class="avatar">${initials(p.driver_name)}</span><div><h3>${esc(p.driver_name)}</h3>
    <div class="muted small">${monthName(p.month)} · ${pill(p.status)} ${p.paid_at ? fmtDT(p.paid_at) : ""}</div></div></div>
    <table class="slip" style="width:100%;border-collapse:collapse">
      <tr><td>Verified trips</td><td>${p.trip_count}</td></tr><tr><td>Days worked</td><td>${p.days_worked}</td></tr>
      <tr><td>Distance</td><td>${num(p.total_km)} km</td></tr>
      <tr><td>Trip pay</td><td>${money(p.trip_pay)}</td></tr><tr><td>Fuel / toll reimbursement</td><td>${money(p.reimbursement)}</td></tr>
      <tr><td>Bonus</td><td>${money(p.bonus)}</td></tr><tr><td>Advance recovered</td><td>− ${money(p.advance_deduction)}</td></tr>
      <tr><td>Other deduction</td><td>− ${money(p.other_deduction)}</td></tr>
      <tr class="total"><td>Net pay</td><td>${money(p.net_pay)}</td></tr></table>
    <div class="form-actions"><button class="btn" onclick="window.print()">${ic("printer", "sm")}Print</button><button class="btn primary" id="slipClose">Close</button></div>`);
  $("#slipClose").onclick = closeModal;
}

/* ================================================================
   DRIVER PAGES
   ================================================================ */
async function pageHome(page) {
  const [d, trips] = await Promise.all([api("/api/dashboard/driver"), api("/api/trips?status=ASSIGNED,STARTED,REJECTED")]);
  const order = { STARTED: 0, REJECTED: 1, ASSIGNED: 2 };
  const now = trips.filter((t) => t.status !== "ASSIGNED" || t.trip_date <= todayStr()).sort((a, b) => order[a.status] - order[b.status]);
  const later = trips.filter((t) => t.status === "ASSIGNED" && t.trip_date > todayStr()).reverse();
  page.innerHTML = `
    <div class="page-head"><div><div class="sub">Namaste,</div><h2>${esc(state.user.full_name)}</h2></div></div>
    <div class="hero"><div class="label">Earned in ${monthName(d.month)}</div><div class="big">${money(d.earned + d.reimbursement)}</div>
      <div class="hero-row"><div><span>Trip pay</span><b>${money(d.earned)}</b></div><div><span>Expenses back</span><b>${money(d.reimbursement)}</b></div><div><span>Verified trips</span><b>${d.verified_trips}</b></div></div></div>
    ${d.pending_verification ? `<div class="note warn" style="margin:0 0 12px">${ic("clock", "sm")}<span>${d.pending_verification} trip(s) waiting for office approval</span></div>` : ""}
    ${d.open_advances ? `<div class="note info" style="margin:0 0 12px">${ic("wallet", "sm")}<span>Advance ${money(d.open_advances)} will be adjusted in your salary.</span></div>` : ""}
    <div class="section-title">${ic("route")}Today &amp; action needed</div>
    ${now.length ? now.map((t) => tripCard(t, false)).join("") : `<div class="card empty">${ic("check")}<div>No trip to start right now</div></div>`}
    ${later.length ? `<div class="section-title">${ic("calendar")}Upcoming</div>${later.map((t) => tripCard(t, false)).join("")}` : ""}`;
  bindTripActions(page, trips);
}

async function pageMyTrips(page, params) {
  const month = params.get("month") || thisMonth();
  const trips = await api("/api/trips?month=" + month);
  page.innerHTML = `<div class="page-head"><div><h2>My trips</h2><div class="sub">${trips.length} trip(s) in ${monthName(month)}</div></div><div class="spacer"></div>
    <input type="month" id="mMonth" value="${month}" style="width:auto;margin:0"></div>
    ${trips.length ? trips.map((t) => tripCard(t, false)).join("") : `<div class="card empty">${ic("route")}<div>No trips in ${monthName(month)}</div></div>`}`;
  $("#mMonth").onchange = (e) => e.target.value && (location.hash = "#/my-trips?month=" + e.target.value);
  bindTripActions(page, trips);
}

async function pageEarnings(page) {
  const [slips, d] = await Promise.all([api("/api/payroll"), api("/api/dashboard/driver")]);
  page.innerHTML = `<div class="page-head"><h2>Earnings</h2></div>
    <div class="card"><div class="card-head"><h3>This month so far</h3><div class="spacer"></div>${pillc("violet", monthName(d.month))}</div>
      <table class="slip" style="width:100%;border-collapse:collapse"><tr><td>Verified trips</td><td>${d.verified_trips}</td></tr><tr><td>Distance</td><td>${num(d.km)} km</td></tr>
      <tr><td>Trip pay</td><td>${money(d.earned)}</td></tr><tr><td>Expenses reimbursed</td><td>${money(d.reimbursement)}</td></tr>
      <tr><td>Open advance</td><td>− ${money(d.open_advances)}</td></tr>
      <tr class="total"><td>Estimated</td><td>${money(d.earned + d.reimbursement - d.open_advances)}</td></tr></table>
      <p class="small muted" style="margin-bottom:0">${d.pending_verification} trip(s) waiting for approval are not included yet.</p></div>
    <div class="section-title">${ic("receipt")}Pay slips</div>
    ${table([{ label: "Month", render: (p) => `<span class="cell-title">${monthName(p.month)}</span>` }, { label: "Trips", num: 1, render: (p) => p.trip_count },
      { label: "Net pay", num: 1, render: (p) => `<b>${money(p.net_pay)}</b>` }, { label: "Status", render: (p) => pill(p.status) },
      { label: "", actions: 1, render: (p) => `<button class="btn sm" data-slip="${p.id}">View</button>` }], slips, "No pay slips yet", "receipt")}`;
  $$("[data-slip]", page).forEach((b) => (b.onclick = () => payslip(slips.find((p) => p.id === Number(b.dataset.slip)))));
}

/* ---------------- Notifications page ---------------- */
async function pageNotifications(page, params) {
  const imp = params.get("filter") === "important";
  const n = await api("/api/notifications" + (imp ? "?only_important=true" : ""));
  page.innerHTML = `<div class="page-head"><div><h2>Notifications</h2><div class="sub">${n.unread} unread</div></div><div class="spacer"></div>
      ${n.unread ? `<button class="btn" id="readAll">${ic("check", "sm")}Mark all read</button>` : ""}</div>
    <div class="tabs"><button data-f="" class="${imp ? "" : "active"}">All</button><button data-f="important" class="${imp ? "active" : ""}">Important</button></div>
    ${alertsCard(true)}
    <div class="card">${n.items.length ? `<ul class="list">${n.items.map((i) => `<li class="notif ${i.is_read ? "read" : "unread"} ${i.important ? "imp" : ""}" data-id="${i.id}" data-link="${esc(i.link || "")}">
      <span class="nic">${ic(i.important ? "bell" : "inbox", "sm")}</span>
      <div style="flex:1;min-width:0"><div class="txt">${i.title ? `<b>${esc(i.title)}</b><br>` : ""}${esc(i.message)}</div><div class="small muted">${ago(i.created_at)}</div></div>
      <span class="dot"></span></li>`).join("")}</ul>`
      : `<div class="empty">${ic("bell")}<div>No notifications</div></div>`}</div>`;
  $$(".tabs button", page).forEach((b) => (b.onclick = () => (location.hash = "#/notifications" + (b.dataset.f ? "?filter=" + b.dataset.f : ""))));
  if ($("#readAll")) $("#readAll").onclick = async () => { await api("/api/notifications/read-all", "POST"); setBell(0); pollAlerts(); reload(); };
  $$(".notif", page).forEach((li) => (li.onclick = async () => {
    await api(`/api/notifications/${li.dataset.id}/read`, "POST").catch(() => {});
    if (li.dataset.link) goTo(li.dataset.link); else { pollAlerts(); reload(); }
  }));
  bindAlertsCard();
}

async function pageProfile(page) {
  const u = await api("/api/auth/me");
  page.innerHTML = `<div class="page-head"><h2>Profile</h2></div><div class="card">
    <div class="profile-head"><span class="avatar">${initials(u.full_name)}</span><div><h3>${esc(u.full_name)}</h3><div class="muted small">@${esc(u.username)} · ${esc(u.role)}</div></div></div>
    <table class="slip" style="width:100%;border-collapse:collapse"><tr><td>Mobile</td><td>${esc(u.phone)}</td></tr>
    ${u.license_no ? `<tr><td>Licence</td><td>${esc(u.license_no)}</td></tr><tr><td>Valid till</td><td>${expiry(u.license_expiry)}</td></tr>` : ""}
    <tr><td>Last login</td><td>${fmtDT(u.last_login)}</td></tr></table></div>
    ${alertsCard(false)}
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" id="chgPw">${ic("key", "sm")}Change password</button><button class="btn danger" id="lo">${ic("logout", "sm")}Logout</button></div>`;
  $("#lo").onclick = logout;
  bindAlertsCard();
  $("#chgPw").onclick = () => formModal({
    title: "Change password", submitText: "Update",
    fields: [{ name: "old_password", label: "Current password", type: "password", required: true, full: true },
      { name: "new_password", label: "New password", type: "password", required: true, minlength: 6, full: true },
      { name: "confirm", label: "Confirm new password", type: "password", required: true, full: true }],
    custom: (n, v, f) => (n === "confirm" && v !== f.new_password.value ? "Passwords do not match" : ""),
    onSubmit: async (d) => { await api("/api/auth/change-password", "POST", { old_password: d.old_password, new_password: d.new_password }); toast("Password changed", "ok"); },
  });
}

const STAFF_PAGES = { dashboard: pageDashboard, trips: pageTrips, drivers: pageDrivers, vehicles: pageVehicles, customers: pageCustomers,
  servicing: pageServicing, advances: pageAdvances, payroll: pagePayroll };
const DRIVER_PAGES = { home: pageHome, "my-trips": pageMyTrips, earnings: pageEarnings };

/* ================================================================
   POP-UP ALERTS
   1) in-app pop-up card + beep + vibration (app open)
   2) system notification via service worker (app in background tab)
   3) Web Push from server (app closed; needs HTTPS)
   ================================================================ */
const alerts = { lastId: null, timer: null, busy: false, again: false };
const SETTINGS_KEY = "tp_alert_settings";
const settings = Object.assign({ sound: true, vibrate: true }, JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"));
const saveSettings = () => localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
let audioCtx = null;
document.addEventListener("pointerdown", () => {
  if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { /* no audio */ } }
}, { once: true });

function beep() {
  if (!settings.sound || !audioCtx) return;
  try {
    audioCtx.resume();
    const t = audioCtx.currentTime;
    [[0, 880], [0.18, 1175]].forEach(([d, f]) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = "sine"; o.frequency.value = f; o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.25, t + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.16);
      o.start(t + d); o.stop(t + d + 0.17);
    });
  } catch { /* ignore */ }
}

const ALERT_STYLE = (title = "") => {
  const s = title.toLowerCase();
  if (s.includes("sent back") || s.includes("cancel")) return ["t-danger", "alert"];
  if (s.includes("verify") || s.includes("reassign") || s.includes("updated") || s.includes("office")) return ["t-warn", "clock"];
  if (s.includes("salary") || s.includes("paid") || s.includes("test")) return ["t-ok", "check"];
  return ["", "route"];
};

function goTo(link) {
  if (!link) return;
  if (location.hash === link) router(); else location.hash = link;
}

function showPopup(n) {
  const box = $("#alerts");
  const [cls, icon] = ALERT_STYLE(n.title);
  const el = document.createElement("div");
  el.className = "alert-pop " + cls;
  el.setAttribute("role", "alert");
  el.innerHTML = `<div class="ap-ic">${ic(icon)}</div><div style="flex:1;min-width:0;padding-right:18px"><div class="ap-title">${esc(n.title || "TransportPro")}</div>
    <div class="ap-msg">${esc(n.message)}</div><div class="ap-actions">${n.link ? `<button class="btn primary sm" data-open>Open</button>` : ""}
    <button class="btn sm" data-dismiss>Dismiss</button></div></div><button class="icon-btn ap-x" data-dismiss aria-label="Close">${ic("x", "sm")}</button><div class="ap-timer"></div>`;
  let gone = false;
  const close = (markRead = true) => {
    if (gone) return; gone = true;
    el.classList.add("out"); setTimeout(() => el.remove(), 200);
    if (markRead) api(`/api/notifications/${n.id}/read`, "POST").then(() => pollAlerts()).catch(() => {});
  };
  $$("[data-dismiss]", el).forEach((b) => (b.onclick = () => close()));
  const open = el.querySelector("[data-open]");
  if (open) open.onclick = () => { close(); closeModal(); goTo(n.link); };
  // auto-hide after 20 s (stays unread in the bell list); hovering keeps it
  let timer = setTimeout(() => close(false), 20000);
  el.onmouseenter = () => { clearTimeout(timer); el.querySelector(".ap-timer").style.animationPlayState = "paused"; };
  el.onmouseleave = () => { timer = setTimeout(() => close(false), 8000); };
  box.prepend(el);
  while (box.children.length > 3) box.lastElementChild.remove();
}

async function systemNotify(n) {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) reg.showNotification(n.title || "TransportPro", { body: n.message, icon: "/static/icon.svg", badge: "/static/icon.svg",
      tag: "tp-" + n.id, vibrate: [200, 100, 200], data: { link: n.link || "" } });
  } catch { /* ignore */ }
}

function setBell(unread) {
  const bell = $("#bellCount");
  const before = Number(bell.dataset.n || 0);
  bell.dataset.n = unread;
  bell.textContent = unread > 9 ? "9+" : unread;
  bell.classList.toggle("hidden", !unread);
  if (unread > before) { const b = $("#bellBtn"); b.classList.remove("ring"); void b.offsetWidth; b.classList.add("ring"); }
}

async function pollAlerts() {
  if (!state.token || !navigator.onLine) return;
  if (alerts.busy) { alerts.again = true; return; }   // run once more after the current check
  alerts.busy = true;
  try {
    const r = await api("/api/notifications/poll" + (alerts.lastId === null ? "" : "?after=" + alerts.lastId));
    setBell(r.unread);
    const first = alerts.lastId === null;
    alerts.lastId = r.last_id;
    if (first || !r.items.length) return;
    const visible = document.visibilityState === "visible";
    let important = false;
    for (const n of r.items) {
      if (n.important) { important = true; visible ? showPopup(n) : systemNotify(n); }
      else if (visible) toast(n.message);
    }
    if (important && visible) { beep(); if (settings.vibrate && navigator.vibrate) navigator.vibrate([200, 100, 200]); }
    if (visible && !modalOpen()) router();   // refresh screen with the new data
    else refreshPending();
  } catch { /* ignore network errors */ } finally {
    alerts.busy = false;
    if (alerts.again) { alerts.again = false; setTimeout(pollAlerts, 50); }
  }
}

function startAlerts() {
  alerts.lastId = null; clearInterval(alerts.timer);
  pollAlerts();
  alerts.timer = setInterval(pollAlerts, 15000);
  if ("Notification" in window && Notification.permission === "granted") enableAlerts(true).catch(() => {});
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") pollAlerts(); });

function b64ToBytes(s) {
  const raw = atob((s + "=".repeat((4 - (s.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/* Ask permission + subscribe this phone for push. Returns "push" | "local". */
async function enableAlerts(silent = false) {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) throw new Error("This browser does not support notifications. In-app pop-ups still work.");
  if (!window.isSecureContext) throw new Error("Phone alerts need HTTPS (or http://localhost). In-app pop-ups still work while the app is open.");
  const perm = silent ? Notification.permission : await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Notifications are blocked. Allow them in the browser's site settings.");
  const reg = await navigator.serviceWorker.ready;
  const k = await api("/api/push/key");
  if (!k.enabled || !("PushManager" in window)) return "local";
  let sub = await reg.pushManager.getSubscription();
  if (sub && sub.options && sub.options.applicationServerKey) {
    const cur = btoa(String.fromCharCode(...new Uint8Array(sub.options.applicationServerKey))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    if (cur !== k.key) { await sub.unsubscribe(); sub = null; }   // server keys changed
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(k.key) });
  await api("/api/push/subscribe", "POST", sub.toJSON());
  return "push";
}

function dropPush(token) {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.getRegistration()
    .then((r) => r && r.pushManager && r.pushManager.getSubscription())
    .then((s) => s && fetch("/api/push/unsubscribe", { method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ endpoint: s.endpoint }) }))
    .catch(() => {});
}

function permState() { return "Notification" in window ? Notification.permission : "unsupported"; }

function updateEnableBar() {
  const bar = $("#enableBar");
  const show = permState() === "default" && window.isSecureContext && !localStorage.getItem("tp_bar_closed");
  bar.classList.toggle("hidden", !show);
  if (!show) return;
  bar.innerHTML = `${ic("bell", "sm")}<span>Turn on alerts to get ${isStaff() ? "“Trip to verify”" : "new trip"} notifications even when the app is closed.</span><span class="spacer"></span>
    <button class="btn primary sm" id="barOn">Turn on</button><button class="btn ghost sm" id="barX">Later</button>`;
  $("#barOn").onclick = async () => {
    try { const m = await enableAlerts(); toast(m === "push" ? "Phone alerts enabled" : "Alerts enabled", "ok"); } catch (e) { toast(e.message, "err"); }
    updateEnableBar();
  };
  $("#barX").onclick = () => { localStorage.setItem("tp_bar_closed", "1"); updateEnableBar(); };
}

function alertsCard(compact) {
  const perm = permState();
  const status = perm === "granted" ? pillc("ok", "Phone alerts on") : perm === "denied" ? pillc("danger", "Blocked") : pillc("warn", "Phone alerts off");
  return `<div class="card" id="alertsCard"><div class="card-head">${ic("bell")}<h3>Pop-up alerts</h3><div class="spacer"></div>${status}</div>
    ${compact ? "" : `<p class="muted small" style="margin-top:0">Important events (${isStaff() ? "trip to verify" : "new trip, trip changed, sent back, cancelled, salary paid"}) pop up with a sound. Turn on phone alerts to get them even when the app is closed.</p>`}
    ${perm === "denied" ? `<div class="note danger" style="margin:0 0 10px">${ic("alert", "sm")}<span>Notifications are blocked. Open the browser's site settings (lock icon next to the address) → Notifications → Allow.</span></div>` : ""}
    ${!window.isSecureContext ? `<div class="note warn" style="margin:0 0 10px">${ic("alert", "sm")}<span>Phone alerts need HTTPS. On this address only in-app pop-ups work (while the app is open).</span></div>` : ""}
    <div class="switch-row"><span style="flex:1">${ic("volume", "sm")} Sound</span><label class="switch" style="margin:0"><input type="checkbox" id="setSound" ${settings.sound ? "checked" : ""}><span></span></label></div>
    <div class="switch-row"><span style="flex:1">Vibrate (phone)</span><label class="switch" style="margin:0"><input type="checkbox" id="setVib" ${settings.vibrate ? "checked" : ""}><span></span></label></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">${perm !== "granted" ? `<button class="btn primary sm" id="alertsOn">${ic("bell", "sm")}Turn on phone alerts</button>` : ""}
    <button class="btn sm" id="alertsTest">Send test alert</button></div></div>`;
}

function bindAlertsCard() {
  const on = $("#alertsOn");
  if (on) on.onclick = async () => {
    try { const mode = await enableAlerts(); toast(mode === "push" ? "Phone alerts enabled" : "Alerts enabled while the app is open", "ok"); reload(); }
    catch (e) { toast(e.message, "err"); }
  };
  $("#alertsTest").onclick = async () => {
    try { await api("/api/push/test", "POST"); toast("Test sent"); setTimeout(pollAlerts, 600); }
    catch (e) { toast(e.message, "err"); }
  };
  $("#setSound").onchange = (e) => { settings.sound = e.target.checked; saveSettings(); if (settings.sound) beep(); };
  $("#setVib").onchange = (e) => { settings.vibrate = e.target.checked; saveSettings(); };
}

if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", (e) => {
  if (!e.data) return;
  if (e.data.go !== undefined) goTo(e.data.go || "#/notifications");
  if (e.data.refresh) pollAlerts();
});

/* ---------------- boot ---------------- */
function startApp() {
  $("#loginView").classList.add("hidden");
  $("#appView").classList.remove("hidden");
  updateOnline();
  router();
  startAlerts();
}

/* tapping a link to the page you're already on refreshes it */
document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href^="#/"]');
  if (a && a.getAttribute("href") === location.hash) { e.preventDefault(); router(); }
});
window.addEventListener("error", (e) => toast(e.message || "Unexpected error", "err"));
window.addEventListener("unhandledrejection", (e) => toast((e.reason && e.reason.message) || "Unexpected error", "err"));

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
if (state.token && state.user) {
  api("/api/auth/me").then((u) => { state.user = u; localStorage.setItem("tp_user", JSON.stringify(u)); startApp(); }).catch(() => showLogin());
} else showLogin();
