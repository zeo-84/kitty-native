// 📝 بخش یادداشت‌ها

let notesQuery = "";
let notesView = "list"; // 'list' | 'editor'
let editingNoteId = null;

function getNotes() {
  return Storage.get("notes", []);
}
function saveNotes(n) {
  Storage.set("notes", n);
}

// ---------- ناوبری ----------
function openNewNote() {
  editingNoteId = null;
  notesView = "editor";
  renderContent();
}
function openEditNote(id) {
  editingNoteId = id;
  notesView = "editor";
  renderContent();
}
function closeEditor() {
  notesView = "list";
  editingNoteId = null;
  renderContent();
}

// ---------- ذخیره / حذف ----------
function saveNote() {
  const title = $("note-title").value.trim();
  const body = $("note-body").value.trim();
  if (!title && !body) {
    toast(S().noteError);
    return;
  }
  const notes = getNotes();
  if (editingNoteId) {
    const i = notes.findIndex((n) => n.id === editingNoteId);
    notes[i] = { ...notes[i], title, body, updatedAt: Date.now() };
  } else {
    notes.unshift({ id: Date.now(), title, body, updatedAt: Date.now() });
  }
  saveNotes(notes);
  closeEditor();
}

function deleteNote(id) {
  saveNotes(getNotes().filter((n) => n.id !== id));
  const list = $("notes-list");
  if (list) list.innerHTML = notesListHTML();
}

// ---------- جستجو ----------
function filterNotes(q) {
  notesQuery = q;
  const list = $("notes-list");
  if (list) list.innerHTML = notesListHTML();
}

// ---------- لیست یادداشت‌ها ----------
function notesListHTML() {
  const s = S();
  const q = notesQuery.trim().toLowerCase();
  let notes = getNotes();
  if (q)
    notes = notes.filter((n) =>
      (n.title + " " + n.body).toLowerCase().includes(q)
    );

  if (notes.length === 0) {
    return q
      ? `<div class="card rest-card"><p>${s.noResults}</p></div>`
      : `<div class="card rest-card"><img src="images/kitty_notes.webp" alt="kitty"><p>${s.noNotes}</p></div>`;
  }

  return notes
    .map(
      (n) => `
    <div class="card note-card">
      <div class="note-head">
        <b class="note-title">${escapeHtml(n.title) || "📝"}</b>
        <div class="note-actions">
          <button class="icon-btn" onclick="openEditNote(${n.id})">${icon(
        "edit",
        18,
        "var(--accent)"
      )}</button>
          <button class="icon-btn" onclick="deleteNote(${n.id})">${icon(
        "delete",
        18,
        "#e53935"
      )}</button>
        </div>
      </div>
      ${n.body ? `<p class="note-preview">${escapeHtml(n.body)}</p>` : ""}
      <div class="note-date">${new Date(n.updatedAt).toLocaleDateString(
        state.locale === "fa" ? "fa-IR" : "en-US"
      )}</div>
    </div>`
    )
    .join("");
}

// ---------- صفحه‌ی اصلی یادداشت‌ها ----------
function notesHTML() {
  const s = S();

  if (notesView === "editor") {
    const editing = getNotes().find((n) => n.id === editingNoteId);
    return `
      <h2 class="section-title">${editing ? s.editNote : s.newNote}</h2>
      <div class="card">
        <img src="images/kitty_notes.webp" class="editor-mascot" alt="kitty">
        <input id="note-title" class="text-input" style="margin:0;text-align:start"
               placeholder="${s.noteTitlePh}" value="${
      editing ? escapeAttr(editing.title) : ""
    }">
        <textarea id="note-body" class="note-textarea"
                  placeholder="${s.noteBodyPh}">${
      editing ? escapeHtml(editing.body) : ""
    }</textarea>
        <div class="editor-actions">
          <button class="btn-primary" style="margin:0;flex:1" onclick="saveNote()">${
            s.saveNote
          }</button>
          <button class="btn-secondary" style="margin:0" onclick="closeEditor()">${
            s.cancel
          }</button>
        </div>
      </div>`;
  }

  return `
    <h2 class="section-title">${s.notesTitle}</h2>
    <div class="search-row">
      <div class="search-box">
        ${icon("search", 20, "#8a8a8a")}
        <input placeholder="${s.searchNotes}" value="${escapeAttr(notesQuery)}"
               oninput="filterNotes(this.value)">
      </div>
      <button class="add-btn" onclick="openNewNote()">${icon(
        "add",
        24,
        "#fff"
      )}</button>
    </div>
    <div id="notes-list" style="margin-top:14px">${notesListHTML()}</div>`;
}
