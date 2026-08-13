// 🔔 بخش یادآورها

let remView = "list";
const remDraft = {
  editId: null,
  title: "",
  desc: "",
  jy: null,
  jm: null,
  jd: null,
  time: "18:00",
};
const remNowJ = gregorianToJalali(
  new Date().getFullYear(),
  new Date().getMonth() + 1,
  new Date().getDate()
);
let remCal = { y: remNowJ[0], m: remNowJ[1] };

let dueQueue = [];
let remModalShown = false;
let dueAutoCloseTimer = null;

function getReminders() { return Storage.get("reminders", []); }
function saveReminders(r) { Storage.set("reminders", r); }

// ---------- ناوبری ----------
function openNewReminder() {
  remDraft.editId = null;
  remDraft.title = "";
  remDraft.desc = "";
  remDraft.jy = null;
  remDraft.jm = null;
  remDraft.jd = null;
  remDraft.time = "18:00";
  remCal = { y: remNowJ[0], m: remNowJ[1] };
  remView = "editor";
  renderContent();
}

function openEditReminder(id) {
  const r = getReminders().find((x) => x.id === id);
  const dt = new Date(r.at);
  const j = gregorianToJalali(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
  remDraft.editId = r.id;
  remDraft.title = r.title;
  remDraft.desc = r.desc;
  remDraft.jy = j[0];
  remDraft.jm = j[1];
  remDraft.jd = j[2];
  remDraft.time = String(dt.getHours()).padStart(2, "0") + ":" + String(dt.getMinutes()).padStart(2, "0");
  remCal = { y: j[0], m: j[1] };
  remView = "editor";
  renderContent();
}

function remClose() { remView = "list"; renderContent(); }

function remCalPrev() {
  remCal.m--;
  if (remCal.m < 1) { remCal.m = 12; remCal.y--; }
  renderContent();
}
function remCalNext() {
  remCal.m++;
  if (remCal.m > 12) { remCal.m = 1; remCal.y++; }
  renderContent();
}

function remSelectDay(d) {
  if (remDraft.jd === d && remDraft.jm === remCal.m && remDraft.jy === remCal.y)
    remDraft.jd = null;
  else {
    remDraft.jy = remCal.y;
    remDraft.jm = remCal.m;
    remDraft.jd = d;
  }
  renderContent();
}

// ---------- ذخیره / حذف ----------
function saveReminder() {
  const title = $("rem-title").value.trim();
  const desc = $("rem-desc").value.trim();
  const time = $("rem-time").value || "18:00";
  if (!title || !remDraft.jd) { toast(S().remError); return; }
  const g = jalaliToGregorian(remDraft.jy, remDraft.jm, remDraft.jd);
  const [hh, mm] = time.split(":").map(Number);
  const at = new Date(g[0], g[1] - 1, g[2], hh, mm, 0, 0).getTime();
  const rems = getReminders();
  if (remDraft.editId) {
    const i = rems.findIndex((r) => r.id === remDraft.editId);
    rems[i] = { ...rems[i], title, desc, at };
  } else {
    rems.push({ id: Date.now(), title, desc, at });
  }
  saveReminders(rems);
  remView = "list";
  renderContent();
  askNotifPermission();
}

function deleteReminder(id) {
  saveReminders(getReminders().filter((r) => r.id !== id));
  renderContent();
}

// ---------- اعلان ----------
function askNotifPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function fireNotification(r) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const name = state.userName || "";
    const title = state.locale === "fa"
      ? `⏰ ${name} جان! وقتِ «${r.title}»`
      : `⏰ ${name}! Time for "${r.title}"`;
    const n = new Notification(title, { body: r.desc || S().dueFun });
    n.onclick = () => { window.focus(); showDueModal(); };
  } catch (e) {}
}

// ---------- تایمر و بررسی سررسید ----------
function cdHTML(msLeft) {
  const s = S();
  const d = Math.floor(msLeft / 86400000);
  const h = Math.floor(msLeft / 3600000) % 24;
  const m = Math.floor(msLeft / 60000) % 60;
  const sec = Math.floor(msLeft / 1000) % 60;
  return `
    <div class="cd-box"><b>${toPersianIfFa(d)}</b><span>${s.cdDays}</span></div>
    <div class="cd-box"><b>${toPersianIfFa(h)}</b><span>${s.cdHours}</span></div>
    <div class="cd-box"><b>${toPersianIfFa(m)}</b><span>${s.cdMin}</span></div>
    <div class="cd-box"><b>${toPersianIfFa(sec)}</b><span>${s.cdSec}</span></div>`;
}

function tickReminders() {
  const now = Date.now();
  document.querySelectorAll("[data-at]").forEach((el) => {
    const left = Number(el.dataset.at) - now;
    el.innerHTML = left <= 0
      ? `<b style="color:var(--accent)">${S().nowTime}</b>`
      : `<div class="cd-row">${cdHTML(left)}</div>`;
  });
  const due = getReminders().filter((r) => r.at <= now);
  if (due.length && !remModalShown) {
    dueQueue = due;
    showDueModal();
  }
}

// ---------- صفحه‌ی بامزه‌ی یادآوری ----------
function showDueModal() {
  if (!dueQueue.length) {
    remModalShown = false;
    const ov = $("rem-overlay");
    if (ov) ov.remove();
    return;
  }
  remModalShown = true;
  const r = dueQueue[0];
  fireNotification(r);
  const s = S();
  let overlay = $("rem-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "rem-overlay";
    overlay.className = "rem-overlay";
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div class="rem-modal">
      <img src="images/kitty_reminder.webp" alt="kitty" style="width:120px;height:120px;object-fit:contain">
      <h2 style="margin-top:12px">${s.dueHello(state.userName || "")}</h2>
      <p class="rem-modal-title" style="font-size:18px;margin-top:8px">«${escapeHtml(r.title)}»</p>
      ${r.desc ? `<p class="rem-modal-desc" style="color:#666;margin-top:8px">${escapeHtml(r.desc)}</p>` : ""}
      <p class="rem-modal-fun" style="font-size:13px;color:#999;margin-top:12px">${s.dueFun}</p>
      <button class="btn-primary" style="width:100%;margin-top:16px" onclick="dismissDue()">${s.okBtn}</button>
    </div>`;
  overlay.classList.remove("hidden");
  
  // 🔄 auto-dismiss بعد از ۳۰ ثانیه (مثل نوتیف بومی!)
  if (dueAutoCloseTimer) clearTimeout(dueAutoCloseTimer);
  dueAutoCloseTimer = setTimeout(() => {
    if (remModalShown && $("rem-overlay")) dismissDue();
  }, 30000);
}

function dismissDue() {
  if (dueAutoCloseTimer) {
    clearTimeout(dueAutoCloseTimer);
    dueAutoCloseTimer = null;
  }
  const r = dueQueue.shift();
  if (r) saveReminders(getReminders().filter((x) => x.id !== r.id));
  const overlay = $("rem-overlay");
  if (overlay) overlay.remove(); // حذف کامل بجای hidden
  if (!dueQueue.length) {
    remModalShown = false;
  } else {
    showDueModal();
  }
  renderContent();
}

// ---------- رندر ----------
function remEditorHTML() {
  const s = S();
  const len = jalaliMonthLength(remCal.y, remCal.m);
  const first = jalaliFirstWeekday(remCal.y, remCal.m);
  const wdShort = state.locale === "fa"
    ? ["ش","ی","د","س","چ","پ","ج"]
    : ["Sa","Su","Mo","Tu","We","Th","Fr"];
  let cells = wdShort.map((w) => `<span class="cal-wd">${w}</span>`).join("");
  for (let i = 0; i < first; i++) cells += `<span class="cal-day blank"></span>`;
  for (let d = 1; d <= len; d++) {
    const sel = remDraft.jd === d && remDraft.jm === remCal.m && remDraft.jy === remCal.y;
    cells += `<button class="cal-day ${sel ? "sel" : ""}" onclick="remSelectDay(${d})">${toPersianIfFa(d)}</button>`;
  }

  return `
    <h2 class="section-title">${remDraft.editId ? s.editReminder : s.newReminder}</h2>
    <div class="card">
      <img src="images/kitty_reminder.webp" class="editor-mascot" alt="kitty">
      <input id="rem-title" class="text-input" style="margin:0;text-align:start"
             placeholder="${s.remTitlePh}" value="${escapeAttr(remDraft.title)}" oninput="remDraft.title=this.value">
      <textarea id="rem-desc" class="note-textarea" style="min-height:90px"
                placeholder="${s.remDescPh}" oninput="remDraft.desc=this.value">${escapeHtml(remDraft.desc)}</textarea>

      <p style="margin:10px 0 8px;font-weight:bold">${s.remDate}</p>
      <div class="cal-head">
        <button class="btn-secondary" style="margin:0;padding:6px 12px;font-size:13px" onclick="remCalPrev()">${s.prev}</button>
        <b>${JALALI_MONTHS[remCal.m - 1]} ${toPersianIfFa(remCal.y)}</b>
        <button class="btn-secondary" style="margin:0;padding:6px 12px;font-size:13px" onclick="remCalNext()">${s.next}</button>
      </div>
      <div class="cal-grid">${cells}</div>

      <p style="margin:12px 0 8px;font-weight:bold">${s.remTime}</p>
      <input id="rem-time" type="time" class="time-input" value="${remDraft.time}">

      <div class="editor-actions">
        <button class="btn-primary" style="margin:0;flex:1" onclick="saveReminder()">${s.saveReminder}</button>
        <button class="btn-secondary" style="margin:0" onclick="remClose()">${s.cancel}</button>
      </div>
    </div>`;
}

function remindersHTML() {
  if (remView === "editor") return remEditorHTML();
  const s = S();
  const rems = getReminders().sort((a, b) => a.at - b.at);

  const list = rems.length
    ? rems.map((r) => {
        const dt = new Date(r.at);
        const dateStr = dt.toLocaleDateString(state.locale === "fa" ? "fa-IR" : "en-US") + " — " +
          toPersianIfFa(String(dt.getHours()).padStart(2, "0") + ":" + String(dt.getMinutes()).padStart(2, "0"));
        return `
    <div class="card note-card">
      <div class="note-head">
        <b class="note-title">${icon("reminders", 18, "var(--accent)")} ${escapeHtml(r.title)}</b>
        <div class="note-actions">
          <button class="icon-btn" onclick="openEditReminder(${r.id})">${icon("edit", 18, "var(--accent)")}</button>
          <button class="icon-btn" onclick="deleteReminder(${r.id})">${icon("delete", 18, "#e53935")}</button>
        </div>
      </div>
      ${r.desc ? `<p class="note-preview">${escapeHtml(r.desc)}</p>` : ""}
      <div data-at="${r.at}"></div>
      <div class="note-date">${dateStr}</div>
    </div>`;
      }).join("")
    : `<div class="card rest-card"><img src="images/kitty_reminder.webp" alt="kitty"><p>${s.noReminders}</p></div>`;

  const countText = state.locale === "fa"
    ? toPersianIfFa(rems.length) + " یادآور"
    : rems.length + " reminders";

  return `
    <h2 class="section-title">${s.remindersTitle}</h2>
    <div class="search-row">
      <div class="search-box">${icon("reminders", 20, "var(--accent)")}<span>${countText}</span></div>
      <button class="add-btn" onclick="openNewReminder()">${icon("add", 24, "#fff")}</button>
    </div>
    <div style="margin-top:14px">${list}</div>`;
}

// تایمر سراسری
setInterval(tickReminders, 1000);

// پاک‌سازی overlay گیرکرده هنگام شروع اپ
window.addEventListener("load", () => {
  setTimeout(() => {
    const ov = $("rem-overlay");
    if (ov) ov.remove();
  }, 500);
});
