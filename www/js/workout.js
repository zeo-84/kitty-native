// 💪 بخش ورزش — نسخه‌ی کامل

const draft = { editId: null, name: "", exercises: [] };

function toPersianIfFa(n) {
  return state.locale === "fa" ? toPersianDigits(n) : String(n);
}

function getPrograms() {
  return Storage.get("programs", []);
}
function savePrograms(p) {
  Storage.set("programs", p);
}
function getSchedule() {
  return Storage.get("schedule", {});
}
function saveSchedule(s) {
  Storage.set("schedule", s);
}

// ---------- ساخت / ویرایش پکیج ----------
function addDraftExercise() {
  const name = $("ex-name").value.trim();
  const sets = parseInt($("ex-sets").value) || 3;
  const reps = parseInt($("ex-reps").value) || 10;
  const rest = parseInt($("ex-rest").value) || 60;
  if (!name) return;
  draft.exercises.push({ name, sets, reps, rest });
  renderContent();
}

function removeDraftExercise(i) {
  draft.exercises.splice(i, 1);
  renderContent();
}

function startEdit(id) {
  const p = getPrograms().find((x) => x.id === id);
  draft.editId = p.id;
  draft.name = p.name;
  draft.exercises = JSON.parse(JSON.stringify(p.exercises));
  renderContent();
  setTimeout(() => {
    const el = $("builder-card");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, 50);
}

function cancelEdit() {
  draft.editId = null;
  draft.name = "";
  draft.exercises = [];
  renderContent();
}

function saveProgram() {
  const name = draft.name.trim();
  if (!name || draft.exercises.length === 0) {
    toast(S().programError);
    return;
  }
  const programs = getPrograms();
  if (draft.editId) {
    const i = programs.findIndex((p) => p.id === draft.editId);
    programs[i] = { ...programs[i], name, exercises: draft.exercises };
  } else {
    programs.push({ id: Date.now(), name, exercises: draft.exercises });
  }
  savePrograms(programs);
  cancelEdit();
}

function deleteProgram(id) {
  savePrograms(getPrograms().filter((p) => p.id !== id));
  const sch = getSchedule();
  for (const k in sch) if (sch[k] === id) delete sch[k];
  saveSchedule(sch);
  renderContent();
}

// ---------- تقویم شمسی ----------
const nowJ = gregorianToJalali(
  new Date().getFullYear(),
  new Date().getMonth() + 1,
  new Date().getDate()
);
const calState = { y: nowJ[0], m: nowJ[1], selected: null };

function calPrev() {
  calState.m--;
  if (calState.m < 1) {
    calState.m = 12;
    calState.y--;
  }
  calState.selected = null;
  renderContent();
}
function calNext() {
  calState.m++;
  if (calState.m > 12) {
    calState.m = 1;
    calState.y++;
  }
  calState.selected = null;
  renderContent();
}
function selectDay(d) {
  calState.selected = calState.selected === d ? null : d;
  renderContent();
}

function assignProgram(pid) {
  if (!calState.selected) return;
  const sch = getSchedule();
  sch[jalaliKey(calState.y, calState.m, calState.selected)] = pid;
  saveSchedule(sch);
  renderContent();
}

function unassignDay() {
  if (!calState.selected) return;
  const sch = getSchedule();
  delete sch[jalaliKey(calState.y, calState.m, calState.selected)];
  saveSchedule(sch);
  renderContent();
}

// ---------- جلسه‌ی تمرین ----------
let session = null;
let restInterval = null;

function startSession(id) {
  const p = getPrograms().find((x) => x.id === id);
  if (!p) return;
  session = {
    p,
    ex: 0,
    set: 1,
    resting: false,
    restLeft: 0,
    cal: 0,
    finished: false,
  };
  state.view = "session";
  renderContent();
}

function stopRest() {
  if (restInterval) {
    clearInterval(restInterval);
    restInterval = null;
  }
}

function fmtTime(s) {
  const m = Math.floor(s / 60),
    ss = s % 60;
  return String(m).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
}

function startRest(sec) {
  session.resting = true;
  session.restLeft = sec;
  renderContent();
  restInterval = setInterval(() => {
    session.restLeft--;
    const el = $("rest-timer");
    if (el) el.textContent = fmtTime(session.restLeft);
    if (session.restLeft <= 0) {
      stopRest();
      session.resting = false;
      renderContent();
    }
  }, 1000);
}

function completeSet() {
  const e = session.p.exercises[session.ex];
  session.cal += Math.round(e.reps * 0.5);
  const lastSet = session.set >= e.sets;
  const lastEx = session.ex >= session.p.exercises.length - 1;
  if (lastSet && lastEx) {
    stopRest();
    session.finished = true;
    renderContent();
    return;
  }
  if (lastSet) {
    session.ex++;
    session.set = 1;
  } else {
    session.set++;
  }
  startRest(e.rest);
}

function skipRest() {
  stopRest();
  session.resting = false;
  renderContent();
}

function addRest30() {
  session.restLeft += 30;
  const el = $("rest-timer");
  if (el) el.textContent = fmtTime(session.restLeft);
}

function endSession() {
  stopRest();
  session = null;
  state.view = "workout";
  renderContent();
}

function sessionHTML() {
  const s = S();
  if (session.finished)
    return `
    <div class="card rest-card">
      <img src="images/kitty_workout.webp" alt="kitty">
      <h2 class="ex-title">${s.finished}</h2>
      <p style="margin-top:8px">${s.calories}: <b>${toPersianIfFa(
      session.cal
    )} kcal</b></p>
      <button class="btn-primary" style="margin-top:16px" onclick="endSession()">${
        s.backToWorkout
      }</button>
    </div>`;

  const e = session.p.exercises[session.ex];

  if (session.resting)
    return `
    <div class="card rest-card">
      <img src="images/kitty_rest2.webp" alt="rest">
      <h2 class="ex-title">${s.restingTitle}</h2>
      <div id="rest-timer" class="big-timer">${fmtTime(session.restLeft)}</div>
      <div class="rest-actions">
        <button class="btn-secondary" onclick="addRest30()">${
          s.addRest30
        }</button>
        <button class="btn-secondary" onclick="skipRest()">${
          s.skipRest
        }</button>
      </div>
    </div>`;

  return `
    <div class="card" style="text-align:center">
      <div style="color:#8a8a8a;font-size:13px">${s.exWord} ${toPersianIfFa(
    session.ex + 1
  )} ${s.ofWord} ${toPersianIfFa(session.p.exercises.length)}</div>
      <h2 class="ex-title">${escapeHtml(e.name)}</h2>
      <div class="set-counter">${toPersianIfFa(session.set)} ${s.setWord} ${
    s.ofWord
  } ${toPersianIfFa(e.sets)}</div>
      <div style="color:#8a8a8a;margin-bottom:16px">${toPersianIfFa(e.reps)} ${
    s.repsWord
  }</div>
      <button class="btn-primary" style="width:100%" onclick="completeSet()">${
        s.doneSet
      }</button>
      <button class="btn-outline" onclick="endSession()">${icon(
        "close",
        16,
        "#8a8a8a"
      )} ${s.exitSession}</button>
    </div>`;
}

// ---------- صفحه‌ی ورزش ----------
function workoutHTML() {
  if (state.view === "session" && session) return sessionHTML();

  const s = S();
  const programs = getPrograms();
  const sch = getSchedule();
  const tKey = jalaliKey(nowJ[0], nowJ[1], nowJ[2]);
  const todayProg = programs.find((p) => p.id === sch[tKey]);

  const todayHTML = todayProg
    ? `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <b style="color:var(--accent)">${escapeHtml(todayProg.name)}</b>
        <button class="btn-primary" style="width:auto;margin:0;padding:8px 16px;font-size:14px"
                onclick="startSession(${todayProg.id})">${
        s.startWorkout
      }</button>
      </div>
      <div style="margin-top:10px">${todayProg.exercises
        .map(
          (e) => `
        <div class="task-item"><span class="task-name">${escapeHtml(
          e.name
        )}</span><b>${toPersianIfFa(e.sets)} × ${toPersianIfFa(
            e.reps
          )}</b></div>`
        )
        .join("")}
      </div>
    </div>`
    : `<div class="card rest-card"><img src="images/kitty_rest.webp" alt="rest"><p>${s.restDay}</p></div>`;

  // ----- تقویم -----
  const len = jalaliMonthLength(calState.y, calState.m);
  const first = jalaliFirstWeekday(calState.y, calState.m);
  const wdShort =
    state.locale === "fa"
      ? ["ش", "ی", "د", "س", "چ", "پ", "ج"]
      : ["Sa", "Su", "Mo", "Tu", "We", "Th", "Fr"];
  let cells = wdShort.map((w) => `<span class="cal-wd">${w}</span>`).join("");
  for (let i = 0; i < first; i++)
    cells += `<span class="cal-day blank"></span>`;
  for (let d = 1; d <= len; d++) {
    const has = sch[jalaliKey(calState.y, calState.m, d)] != null;
    const isToday =
      d === nowJ[2] && calState.m === nowJ[1] && calState.y === nowJ[0];
    const sel = calState.selected === d;
    cells += `<button class="cal-day ${has ? "has" : ""} ${
      isToday ? "today" : ""
    } ${sel ? "sel" : ""}"
              onclick="selectDay(${d})">${toPersianIfFa(d)}</button>`;
  }

  const selKey = jalaliKey(calState.y, calState.m, calState.selected);
  const assignHTML = calState.selected
    ? `
    <div style="margin-top:12px">
      <b>${s.assignTitle} ${toPersianIfFa(calState.selected)} ${
        JALALI_MONTHS[calState.m - 1]
      }:</b>
      <div style="margin-top:8px">
        ${programs
          .map(
            (p) => `<button class="chip ${
              sch[selKey] === p.id ? "chip-active" : ""
            }"
            onclick="assignProgram(${p.id})">${escapeHtml(p.name)}</button>`
          )
          .join("")}
      </div>
      ${
        sch[selKey]
          ? `<button class="btn-outline danger" onclick="unassignDay()">${icon(
              "delete",
              16,
              "#e53935"
            )} ${s.removeAssign}</button>`
          : ""
      }
    </div>`
    : `<p style="color:#8a8a8a;font-size:13px;margin-top:8px">${s.pickDay}</p>`;

  // ----- لیست پکیج‌ها -----
  const programsHTML = programs.length
    ? `<h2 class="section-title">${s.myPrograms}</h2>` +
      programs
        .map(
          (p) => `
      <div class="card" style="display:flex;justify-content:space-between;align-items:center">
        <b>${escapeHtml(
          p.name
        )} <span style="color:#8a8a8a;font-size:12px">(${toPersianIfFa(
            p.exercises.length
          )})</span></b>
        <div style="display:flex;gap:4px">
          <button class="icon-btn" onclick="startEdit(${p.id})">${icon(
            "edit",
            20,
            "var(--accent)"
          )}</button>
          <button class="task-del" onclick="deleteProgram(${p.id})">${icon(
            "delete",
            20,
            "#e53935"
          )}</button>
        </div>
      </div>`
        )
        .join("")
    : "";

  // ----- سازنده‌ی برنامه -----
  const draftEx = draft.exercises
    .map(
      (e, i) => `
    <div class="task-item">
      <span class="task-name">${escapeHtml(e.name)}</span>
      <b>${toPersianIfFa(e.sets)} ${s.setWord} × ${toPersianIfFa(e.reps)} ${
        s.repsWord
      } | ${toPersianIfFa(e.rest)} ${s.secWord}</b>
      <button class="task-del" onclick="removeDraftExercise(${i})">${icon(
        "delete",
        18,
        "#e53935"
      )}</button>
    </div>`
    )
    .join("");

  return `
    <h2 class="section-title">${s.workoutTitle}</h2>
    ${todayHTML}

    <h2 class="section-title">${s.calendar}</h2>
    <div class="card">
      <div class="cal-head">
        <button class="btn-secondary" style="margin:0;padding:6px 12px;font-size:13px" onclick="calPrev()">${
          s.prev
        }</button>
        <b>${JALALI_MONTHS[calState.m - 1]} ${toPersianIfFa(calState.y)}</b>
        <button class="btn-secondary" style="margin:0;padding:6px 12px;font-size:13px" onclick="calNext()">${
          s.next
        }</button>
      </div>
      <div class="cal-grid">${cells}</div>
      ${assignHTML}
    </div>

    ${programsHTML}

    <h2 class="section-title">${
      draft.editId ? s.editProgram : s.newProgram
    }</h2>
    <div class="card" id="builder-card">
      <p class="field-label">${s.programNameLabel}</p>
      <input id="prog-name" class="text-input" style="margin:0;text-align:start"
             placeholder="${s.programName}" value="${escapeAttr(
    draft.name
  )}" oninput="draft.name=this.value">

      <p class="field-label">${s.exNameLabel}</p>
      <input id="ex-name" class="text-input" style="margin:0;text-align:start" placeholder="${
        s.exerciseName
      }">

      <div class="ex-fields">
        <div class="ex-field">
          <label>${s.setWord}</label>
          <input id="ex-sets" class="num-input" type="number" value="3" min="1">
        </div>
        <div class="ex-field">
          <label>${s.repsWord}</label>
          <input id="ex-reps" class="num-input" type="number" value="10" min="1">
        </div>
        <div class="ex-field">
          <label>${s.restWord}</label>
          <input id="ex-rest" class="num-input" type="number" value="60" min="0" step="5">
        </div>
      </div>

      <button class="btn-add-exercise" onclick="addDraftExercise()">${icon(
        "add",
        20,
        "#fff"
      )} ${s.addExercise}</button>
      <div style="margin-top:10px">${draftEx}</div>

      <div style="display:flex;justify-content:center;gap:8px;margin-top:14px">
        <button class="btn-primary" style="margin:0;width:100%;max-width:300px" onclick="saveProgram()">${
          s.saveProgram
        }</button>
        ${
          draft.editId
            ? `<button class="btn-secondary" style="margin:0" onclick="cancelEdit()">${s.cancel}</button>`
            : ""
        }
      </div>
    </div>
  `;
}
