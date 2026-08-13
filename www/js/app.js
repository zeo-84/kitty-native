// 🧠 مغز اپ کیتی

const state = {
  locale: Storage.get("locale", "fa"),
  userName: Storage.get("userName", null),
  quoteLang: Storage.get("locale", "fa"),
  tab: "home",
};

// ----- ابزارها -----
const $ = (id) => document.getElementById(id);

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

function S() {
  return STRINGS[state.locale];
}

function applyDirection() {
  document.documentElement.lang = state.locale;
  document.documentElement.dir = state.locale === "fa" ? "rtl" : "ltr";
}

// جمله‌ی روز از فایل quotes.js میاد
function quoteOfTheDay() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now - start) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}

// ----- کارها (چک‌لیست) -----
function getTasks() {
  return Storage.get("tasks", []);
}
function saveTasks(t) {
  Storage.set("tasks", t);
}

function todayTasks() {
  const key = dayKey(new Date());
  return getTasks().filter((t) => t.day === key);
}

function yesterdaySuggestions() {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const key = dayKey(y);
  return getTasks()
    .filter((t) => t.day === key && t.done)
    .map((t) => t.text);
}

function purgeOldTasks() {
  const today = dayKey(new Date());
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yKey = dayKey(y);
  saveTasks(getTasks().filter((t) => t.day === today || t.day === yKey));
}

// ----- جریان شروع اپ -----
function boot() {
  setTimeout(() => {
    $("splash").classList.add("hidden");
    if (state.userName) showMain();
    else showOnboarding();
  }, 1500);
}

function showOnboarding() {
  const s = S();
  applyDirection();
  $("ob-title").textContent = s.welcomeTitle;
  $("ob-sub").textContent = s.welcomeSub;
  $("ob-name").placeholder = s.nameHint;
  $("ob-start").textContent = s.start;
  $("onboarding").classList.remove("hidden");
}

function startApp() {
  const name = $("ob-name").value.trim();
  if (!name) {
    $("ob-error").textContent = S().nameError;
    $("ob-error").classList.remove("hidden");
    return;
  }
  state.userName = name;
  Storage.set("userName", name);
  $("onboarding").classList.add("hidden");
  showMain();
}

function showMain() {
  applyDirection();
  $("main").classList.remove("hidden");
  renderAppBar();
  renderNav();
  renderContent();
}

// ----- رندر -----
function renderAppBar() {
  $("app-title").textContent = S().appTitle;
  $("lang-btn").innerHTML = icon("language", 22, "#fff");
  const cb = $("coin-badge");
  if (cb && typeof getCoins === "function")
    cb.innerHTML = "🪙 " + toPersianIfFa(getCoins());
}

const TABS = ["home", "workout", "notes", "reminders", "games"];

function renderNav() {
  const s = S();
  $("bottom-nav").innerHTML = TABS.map(
    (t) => `
    <button class="nav-item ${
      state.tab === t ? "active" : ""
    }" onclick="setTab('${t}')">
      ${icon(t, 22)}
      <span>${s[t]}</span>
    </button>`
  ).join("");
}

function renderContent() {
  if (state.tab === "home") $("content").innerHTML = homeHTML();
  else if (state.tab === "workout") $("content").innerHTML = workoutHTML();
  else if (state.tab === "notes") $("content").innerHTML = notesHTML();
  else if (state.tab === "reminders") $("content").innerHTML = remindersHTML();
  else if (state.tab === "games") $("content").innerHTML = gameHTML();
  else $("content").innerHTML = placeholderHTML(state.tab);
}

const MASCOTS = {
  workout: "images/kitty_workout.webp",
  notes: "images/kitty_notes.webp",
  reminders: "images/kitty_reminder.webp",
  games: "images/kitty_game.webp",
};

function placeholderHTML(tab) {
  const s = S();
  return `
    <div class="placeholder">
      <img src="${MASCOTS[tab]}" alt="${tab}">
      <h2 style="margin-top:16px">${s[tab]}</h2>
      <p style="color:#8a8a8a;margin-top:8px">${s.comingSoon}</p>
    </div>`;
}

function homeHTML() {
  const s = S();
  const tasks = todayTasks();
  const sugg = yesterdaySuggestions();
  const q = quoteOfTheDay();

  const tasksHTML =
    tasks.length === 0
      ? `<div class="card" style="text-align:center">${s.empty}</div>`
      : tasks
          .map(
            (t) => `
        <div class="task-item ${t.done ? "done" : ""}">
          <button class="task-check" onclick="toggleTask(${t.id})">
            ${
              t.done
                ? icon("check_circle", 22, "var(--accent)")
                : icon("circle", 22, "#bbb")
            }
          </button>
          <span class="task-name">${escapeHtml(t.text)}</span>
          <button class="task-del" onclick="deleteTask(${t.id})">${icon(
              "delete",
              20,
              "#e53935"
            )}</button>
        </div>`
          )
          .join("");

  const suggHTML =
    sugg.length === 0
      ? ""
      : `
    <p style="margin:8px 0;font-weight:bold">${s.suggestions}</p>
    <div>${sugg
      .map(
        (x) =>
          `<button class="chip" onclick="addSuggestion('${escapeAttr(
            x
          )}')">+ ${escapeHtml(x)}</button>`
      )
      .join("")}</div>`;

  return `
    <div class="card" style="text-align:center;font-weight:bold;color:var(--accent)">
      ${s.hello(escapeHtml(state.userName))}
    </div>

    <div class="card date-card">
      ${icon("calendar", 20, "var(--accent)")}
      <span>${s.today(todayString(state.locale))}</span>
    </div>

    <div class="card quote-row">
      <span class="quote-icon">${icon("quote", 22, "var(--accent)")}</span>
      <span class="quote-text">${escapeHtml(q[state.quoteLang])}</span>
      <button class="icon-btn" onclick="toggleQuoteLang()">${icon(
        "translate",
        20,
        "var(--accent)"
      )}</button>
      <button class="icon-btn" onclick="copyQuote()">${icon(
        "copy",
        20,
        "var(--accent)"
      )}</button>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between">
      <h2 class="section-title">${s.dailyChecklist}</h2>
      ${
        tasks.length
          ? `<button class="danger-link" onclick="deleteAllTasks()">${icon(
              "delete",
              16,
              "#e53935"
            )} ${s.deleteAll}</button>`
          : ""
      }
    </div>

    <div class="add-row">
      <input id="new-task" class="text-input" placeholder="${s.newTaskHint}"
             onkeydown="if(event.key==='Enter')addTask()">
      <button class="add-btn" onclick="addTask()">${icon(
        "add",
        24,
        "#fff"
      )}</button>
    </div>
    <div style="height:16px"></div>

    ${suggHTML}
    ${tasksHTML}
  `;
}

// ----- اکشن‌ها -----
function addTask() {
  const input = $("new-task");
  const text = input.value.trim();
  if (!text) return;
  const tasks = getTasks();
  tasks.push({ id: Date.now(), day: dayKey(new Date()), text, done: false });
  saveTasks(tasks);
  renderContent();
}

function addSuggestion(text) {
  const tasks = getTasks();
  tasks.push({ id: Date.now(), day: dayKey(new Date()), text, done: false });
  saveTasks(tasks);
  renderContent();
}

function toggleTask(id) {
  saveTasks(getTasks().map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  renderContent();
}

function deleteTask(id) {
  saveTasks(getTasks().filter((t) => t.id !== id));
  renderContent();
}

function deleteAllTasks() {
  const key = dayKey(new Date());
  saveTasks(getTasks().filter((t) => t.day !== key));
  renderContent();
}

function toggleQuoteLang() {
  state.quoteLang = state.quoteLang === "fa" ? "en" : "fa";
  renderContent();
}

function copyQuote() {
  const q = quoteOfTheDay();
  if (navigator.clipboard) navigator.clipboard.writeText(q[state.quoteLang]);
  toast(S().copied);
}

function toast(msg) {
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText =
    "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);" +
    "background:var(--accent);color:#fff;padding:10px 20px;border-radius:20px;" +
    "z-index:99;box-shadow:0 4px 12px rgba(0,0,0,.2)";
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1500);
}

function setTab(id) {
  if (typeof stopGameLoop === "function") stopGameLoop();
  state.tab = id;
  renderNav();
  renderContent();
}

function toggleLang() {
  state.locale = state.locale === "fa" ? "en" : "fa";
  Storage.set("locale", state.locale);
  if (!$("main").classList.contains("hidden")) {
    applyDirection();
    renderAppBar();
    renderNav();
    renderContent();
  } else if (!$("onboarding").classList.contains("hidden")) {
    showOnboarding();
  }
}

// ----- سیم‌کشی رویدادها + شروع -----
$("lang-btn").addEventListener("click", toggleLang);
$("ob-start").addEventListener("click", startApp);
$("ob-name").addEventListener("keydown", (e) => {
  if (e.key === "Enter") startApp();
});

purgeOldTasks();
boot();
