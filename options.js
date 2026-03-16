const App = window.StudyNoteApp;

const state = {
  data: null,
  activeTab: "Notes",
  activeChip: "Tất cả",
  search: "",
  tag: "all",
  status: "all",
  sort: "newest"
};

const chips = ["Tất cả", "Mới nhất", "Quan trọng", "Cần ôn", "Đã ghim", "Đến hạn"];
const tabs = ["Notes", "Review", "Tags", "Cài đặt"];

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showToast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.remove("hidden");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.add("hidden"), 2200);
}

function allTags() {
  return App.uniqueStrings([...(state.data?.customTags || []), ...((state.data?.notes || []).map((n) => n.tag))]);
}

function renderTagOptions() {
  const options = ["<option value=\"all\">Tất cả tag</option>"]
    .concat(allTags().map((tag) => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`))
    .join("");
  $("tagFilter").innerHTML = options;
  $("quickTag").innerHTML = allTags().map((tag) => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`).join("");
  $("editTag").innerHTML = allTags().map((tag) => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`).join("");
  $("tagFilter").value = state.tag;
}

function renderChips() {
  $("chipsRow").innerHTML = chips.map((chip) => `<button class="chip ${state.activeChip === chip ? "active" : ""}" data-chip="${chip}">${chip}</button>`).join("");
  $("chipsRow").querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.activeChip = btn.dataset.chip;
      renderAll();
    });
  });
}

function renderTabs() {
  $("tabsNav").innerHTML = tabs.map((tab) => `<button class="tab-btn ${state.activeTab === tab ? "active" : ""}" data-tab="${tab}">${tab}</button>`).join("");
  $("tabsNav").querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.activeTab = btn.dataset.tab;
      renderAll();
      $("scrollArea").scrollTop = 0;
    });
  });
}

function getFilteredNotes() {
  let notes = [...(state.data?.notes || [])];
  const query = state.search.trim().toLowerCase();
  if (query) {
    notes = notes.filter((note) =>
      note.title.toLowerCase().includes(query) ||
      note.tag.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query)
    );
  }
  if (state.tag !== "all") notes = notes.filter((n) => n.tag === state.tag);
  if (state.status !== "all") notes = notes.filter((n) => n.status === state.status);
  if (state.activeChip === "Quan trọng") notes = notes.filter((n) => n.important);
  if (state.activeChip === "Cần ôn") notes = notes.filter((n) => n.review);
  if (state.activeChip === "Đã ghim") notes = notes.filter((n) => n.pinned);
  if (state.activeChip === "Đến hạn") notes = notes.filter((n) => ["today", "overdue"].includes(App.dueState(n)));
  switch (state.sort) {
    case "oldest": notes.sort((a, b) => a.createdAt - b.createdAt); break;
    case "dueSoon": notes.sort((a, b) => String(a.reviewDate).localeCompare(String(b.reviewDate))); break;
    case "masteryLow": notes.sort((a, b) => a.mastery - b.mastery); break;
    case "masteryHigh": notes.sort((a, b) => b.mastery - a.mastery); break;
    case "titleAZ": notes.sort((a, b) => a.title.localeCompare(b.title, "vi")); break;
    default: notes.sort((a, b) => b.createdAt - a.createdAt);
  }
  if (state.activeChip === "Mới nhất") notes.sort((a, b) => b.createdAt - a.createdAt);
  if (state.activeTab === "Review") notes = notes.filter((n) => n.review).sort((a, b) => a.mastery - b.mastery);
  return notes;
}

function renderStats() {
  const stats = App.computeStats(state.data.notes);
  $("statTotal").textContent = stats.total;
  $("statReview").textContent = stats.review;
  $("statPinned").textContent = stats.pinned;
  $("statOverdue").textContent = stats.overdue;
}

function noteCard(note) {
  const due = App.dueState(note);
  const dueText = due === "overdue" ? "Quá hạn" : due === "today" ? "Hôm nay" : note.reviewDate;
  const dueClass = due === "overdue" ? "danger" : due === "today" ? "warn" : "neutral";
  return `
    <article class="note-card" data-id="${note.id}">
      <div class="note-top">
        <div>
          <div class="title-row">
            <h4>${escapeHtml(note.title)}</h4>
            <span class="tag-pill">${escapeHtml(note.tag)}</span>
            ${note.pinned ? '<span class="mini-icon">📌</span>' : ''}
            ${note.important ? '<span class="mini-icon">⭐</span>' : ''}
          </div>
          <p class="muted small">${App.noteTimeText(note)}</p>
        </div>
        <span class="status-pill ${note.status === "Đã lưu" ? "success" : note.status === "Ôn lại" ? "warn" : "info"}">${escapeHtml(note.status)}</span>
      </div>
      <p class="note-content">${escapeHtml(note.content)}</p>
      <div class="mastery-head"><span>Mức độ hiểu</span><strong>${note.mastery}%</strong></div>
      <div class="mastery-bar"><span style="width:${note.mastery}%"></span></div>
      <div class="due-row">
        <span class="pill ${dueClass}">${dueText}</span>
        <span class="muted small">Ôn lại: ${escapeHtml(note.reviewDate)}</span>
      </div>
      <div class="actions-row wrap">
        <button class="ghost-btn small action-edit" data-id="${note.id}">Sửa</button>
        <button class="ghost-btn small action-study" data-id="${note.id}">Ôn +10</button>
        <button class="ghost-btn small action-status" data-id="${note.id}">Đổi trạng thái</button>
        <button class="ghost-btn small action-pin" data-id="${note.id}">${note.pinned ? "Bỏ ghim" : "Ghim"}</button>
        <button class="ghost-btn small action-important" data-id="${note.id}">${note.important ? "Bỏ quan trọng" : "Quan trọng"}</button>
        <button class="danger-btn small action-delete" data-id="${note.id}">Xoá</button>
      </div>
    </article>
  `;
}

function renderNotes() {
  const notes = getFilteredNotes();
  const container = $("notesSection");
  if (state.activeTab !== "Notes" && state.activeTab !== "Review") {
    container.classList.add("hidden");
    return;
  }
  container.classList.remove("hidden");
  container.innerHTML = notes.length ? notes.map(noteCard).join("") : '<div class="panel empty-state">Không có note phù hợp với bộ lọc hiện tại.</div>';

  container.querySelectorAll(".action-edit").forEach((btn) => btn.addEventListener("click", () => openEditor(btn.dataset.id)));
  container.querySelectorAll(".action-study").forEach((btn) => btn.addEventListener("click", () => improveMastery(btn.dataset.id)));
  container.querySelectorAll(".action-status").forEach((btn) => btn.addEventListener("click", () => cycleStatus(btn.dataset.id)));
  container.querySelectorAll(".action-pin").forEach((btn) => btn.addEventListener("click", () => toggleFlag(btn.dataset.id, "pinned")));
  container.querySelectorAll(".action-important").forEach((btn) => btn.addEventListener("click", () => toggleFlag(btn.dataset.id, "important")));
  container.querySelectorAll(".action-delete").forEach((btn) => btn.addEventListener("click", () => removeNote(btn.dataset.id)));
}

function renderReviewQueue() {
  const queue = getFilteredNotes().filter((n) => n.review).sort((a, b) => a.mastery - b.mastery).slice(0, 3);
  $("reviewSection").classList.toggle("hidden", !(state.activeTab === "Notes" || state.activeTab === "Review"));
  $("reviewQueue").innerHTML = queue.length ? queue.map((note) => `
    <div class="review-item">
      <div>
        <strong>${escapeHtml(note.title)}</strong>
        <p class="muted">${escapeHtml(note.tag)} · ${note.mastery}% · ${escapeHtml(note.reviewDate)}</p>
      </div>
      <span class="pill ${App.dueState(note) === "overdue" ? "danger" : "warn"}">${App.dueState(note) === "overdue" ? "Quá hạn" : "Ưu tiên"}</span>
    </div>
  `).join("") : '<div class="empty-mini">Không có note trong hàng đợi ôn tập.</div>';
}

function renderTagsOverview() {
  const tags = allTags();
  $("tagsSection").classList.toggle("hidden", state.activeTab !== "Tags");
  $("tagsGrid").innerHTML = tags.map((tag) => {
    const count = state.data.notes.filter((n) => n.tag === tag).length;
    return `<div class="tag-card"><strong>${escapeHtml(tag)}</strong><p class="muted">${count} ghi chú</p></div>`;
  }).join("");
}

function renderBackups() {
  $("settingsSection").classList.toggle("hidden", state.activeTab !== "Cài đặt");
  const backups = state.data.backups || [];
  $("backupsList").innerHTML = backups.length ? backups.map((backup) => `
    <div class="backup-item">
      <div>
        <strong>${escapeHtml(backup.reason)}</strong>
        <p class="muted">${App.formatDateTime(backup.createdAt)}</p>
      </div>
      <div class="actions-row">
        <button class="ghost-btn small restore-backup-btn" data-id="${backup.id}">Khôi phục</button>
        <button class="ghost-btn small export-backup-btn" data-id="${backup.id}">Xuất</button>
      </div>
    </div>
  `).join("") : '<div class="empty-mini">Chưa có backup nào.</div>';

  $("backupsList").querySelectorAll(".restore-backup-btn").forEach((btn) => btn.addEventListener("click", async () => {
    try {
      await App.restoreBackup(btn.dataset.id);
      await reload();
      showToast("Đã khôi phục backup.");
    } catch (error) {
      showToast(error.message);
    }
  }));

  $("backupsList").querySelectorAll(".export-backup-btn").forEach((btn) => btn.addEventListener("click", () => {
    const backup = state.data.backups.find((b) => b.id === btn.dataset.id);
    if (!backup) return;
    App.exportFile(`study-note-backup-${backup.id}.json`, backup);
  }));
}

function renderSectionsVisibility() {
  $("notesSection").classList.toggle("hidden", !(state.activeTab === "Notes" || state.activeTab === "Review"));
}

function renderAll() {
  renderTabs();
  renderChips();
  renderTagOptions();
  renderStats();
  renderReviewQueue();
  renderNotes();
  renderTagsOverview();
  renderBackups();
  renderSectionsVisibility();
}

async function reload() {
  state.data = await App.loadData();
  renderAll();
}

function quickFormPayload() {
  let tag = $("quickTag").value;
  const newTag = $("newTagInput").value.trim();
  if (newTag) tag = newTag;
  return {
    title: $("quickTitle").value.trim(),
    tag,
    status: $("quickStatus").value,
    mastery: Number($("quickMastery").value || 60),
    content: $("quickContent").value.trim(),
    reviewDate: $("quickReviewDate").value || App.todayISO(),
    review: $("quickReview").checked,
    important: $("quickImportant").checked,
    pinned: $("quickPinned").checked
  };
}

function resetQuickForm() {
  $("quickTitle").value = "";
  $("quickStatus").value = "Đang học";
  $("quickMastery").value = 60;
  $("quickContent").value = "";
  $("quickReviewDate").value = "";
  $("newTagInput").value = "";
  $("quickReview").checked = true;
  $("quickImportant").checked = false;
  $("quickPinned").checked = false;
}

async function saveQuickNote() {
  const payload = quickFormPayload();
  if (!payload.title || !payload.content) {
    showToast("Nhập tiêu đề và nội dung trước đã.");
    return;
  }
  await App.addNote(payload);
  resetQuickForm();
  state.activeChip = "Mới nhất";
  await reload();
  showToast("Đã lưu note mới.");
}

function openEditor(id) {
  const note = state.data.notes.find((n) => n.id === id);
  if (!note) return;
  $("dialogTitleText").textContent = "Sửa note";
  $("editId").value = note.id;
  $("editTitle").value = note.title;
  $("editTag").value = note.tag;
  $("editStatus").value = note.status;
  $("editMastery").value = note.mastery;
  $("editContent").value = note.content;
  $("editReviewDate").value = note.reviewDate;
  $("editNewTag").value = "";
  $("editReview").checked = note.review;
  $("editImportant").checked = note.important;
  $("editPinned").checked = note.pinned;
  $("editorDialog").showModal();
}

function closeEditor() {
  $("editorDialog").close();
}

async function saveEditor(event) {
  event.preventDefault();
  const id = $("editId").value;
  let tag = $("editTag").value;
  if ($("editNewTag").value.trim()) tag = $("editNewTag").value.trim();
  await App.updateNote(id, {
    title: $("editTitle").value.trim(),
    tag,
    status: $("editStatus").value,
    mastery: Number($("editMastery").value || 60),
    content: $("editContent").value.trim(),
    reviewDate: $("editReviewDate").value || App.todayISO(),
    review: $("editReview").checked,
    important: $("editImportant").checked,
    pinned: $("editPinned").checked
  });
  closeEditor();
  await reload();
  showToast("Đã cập nhật note.");
}

async function improveMastery(id) {
  const note = state.data.notes.find((n) => n.id === id);
  if (!note) return;
  await App.updateNote(id, { mastery: Math.min(100, note.mastery + 10), review: Math.min(100, note.mastery + 10) < 85 });
  await reload();
  showToast("Đã tăng mastery.");
}

async function cycleStatus(id) {
  const note = state.data.notes.find((n) => n.id === id);
  if (!note) return;
  const list = ["Đang học", "Đã lưu", "Ôn lại"];
  const next = list[(list.indexOf(note.status) + 1) % list.length];
  await App.updateNote(id, { status: next });
  await reload();
  showToast("Đã đổi trạng thái.");
}

async function toggleFlag(id, field) {
  const note = state.data.notes.find((n) => n.id === id);
  if (!note) return;
  await App.updateNote(id, { [field]: !note[field] });
  await reload();
}

async function removeNote(id) {
  if (!confirm("Xoá note này?")) return;
  await App.deleteNote(id);
  await reload();
  showToast("Đã xoá note.");
}

async function bulkReview() {
  const notes = getFilteredNotes().filter((n) => n.review);
  for (const note of notes) {
    await App.updateNote(note.id, { mastery: Math.min(100, note.mastery + 10), review: Math.min(100, note.mastery + 10) < 85 });
  }
  await reload();
  showToast("Đã ôn +10 cho các note đang lọc.");
}

function bindEvents() {
  $("searchInput").addEventListener("input", (e) => { state.search = e.target.value; renderAll(); });
  $("tagFilter").addEventListener("change", (e) => { state.tag = e.target.value; renderAll(); });
  $("statusFilter").addEventListener("change", (e) => { state.status = e.target.value; renderAll(); });
  $("sortSelect").addEventListener("change", (e) => { state.sort = e.target.value; renderAll(); });
  $("quickSaveBtn").addEventListener("click", saveQuickNote);
  $("quickResetBtn").addEventListener("click", resetQuickForm);
  $("bulkReviewBtn").addEventListener("click", bulkReview);
  $("openComposerBtn").addEventListener("click", () => {
    state.activeTab = "Notes";
    renderAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
    $("quickTitle").focus();
  });
  $("closeDialogBtn").addEventListener("click", closeEditor);
  $("cancelEditBtn").addEventListener("click", closeEditor);
  $("editorForm").addEventListener("submit", saveEditor);

  $("createBackupBtn").addEventListener("click", async () => {
    await App.createManualBackup();
    await reload();
    showToast("Đã tạo backup.");
  });
  $("restoreLatestBackupBtn").addEventListener("click", async () => {
    try {
      await App.restoreLatestBackup();
      await reload();
      showToast("Đã khôi phục backup mới nhất.");
    } catch (error) {
      showToast(error.message);
    }
  });
  $("exportNotesBtn").addEventListener("click", () => App.exportFile("study-notes.json", { notes: state.data.notes, customTags: state.data.customTags }));
  $("exportLatestBackupBtn").addEventListener("click", () => {
    const latest = state.data.backups[0];
    if (!latest) return showToast("Chưa có backup để xuất.");
    App.exportFile(`study-note-backup-${latest.id}.json`, latest);
  });
  $("importInput").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      await App.importJsonPayload(payload);
      await reload();
      showToast("Đã import dữ liệu.");
    } catch (error) {
      showToast(error.message || "Import thất bại.");
    } finally {
      e.target.value = "";
    }
  });
  $("resetSampleBtn").addEventListener("click", async () => {
    if (!confirm("Khôi phục dữ liệu mẫu? Dữ liệu hiện tại sẽ được backup trước.")) return;
    await App.restoreSampleData();
    await reload();
    showToast("Đã khôi phục dữ liệu mẫu.");
  });
}

async function init() {
  const backup = await App.ensureVersionBackup();
  state.data = await App.loadData();
  bindEvents();
  renderAll();
  if (backup) showToast("Đã tạo backup tự động sau khi cập nhật phiên bản.");
}

document.addEventListener("DOMContentLoaded", init);
