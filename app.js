const STORAGE_KEY = "studyVaultNotes";
const EDIT_KEY = "studyVaultEditingId";

const statusMap = {
  "not-started": "Chưa học kỹ",
  learning: "Đang học",
  mastered: "Đã nắm chắc"
};

const els = {
  noteForm: document.getElementById("noteForm"),
  formTitle: document.getElementById("formTitle"),
  submitBtn: document.getElementById("submitBtn"),
  course: document.getElementById("course"),
  topic: document.getElementById("topic"),
  status: document.getElementById("status"),
  score: document.getElementById("score"),
  tags: document.getElementById("tags"),
  reviewDate: document.getElementById("reviewDate"),
  content: document.getElementById("content"),
  searchInput: document.getElementById("searchInput"),
  filterStatus: document.getElementById("filterStatus"),
  filterCourse: document.getElementById("filterCourse"),
  notesContainer: document.getElementById("notesContainer"),
  reviewList: document.getElementById("reviewList"),
  statsGrid: document.getElementById("statsGrid"),
  noteCountLabel: document.getElementById("noteCountLabel"),
  exportBtn: document.getElementById("exportBtn"),
  importInput: document.getElementById("importInput"),
  resetFormBtn: document.getElementById("resetFormBtn"),
  clearAllBtn: document.getElementById("clearAllBtn"),
  openOptionsBtn: document.getElementById("openOptionsBtn"),
  toast: document.getElementById("toast")
};

let state = {
  notes: [],
  editingId: null
};

init();

async function init() {
  await hydrateState();
  bindEvents();
  renderAll();
}

function bindEvents() {
  els.noteForm?.addEventListener("submit", handleSubmit);
  els.searchInput?.addEventListener("input", renderAll);
  els.filterStatus?.addEventListener("change", renderAll);
  els.filterCourse?.addEventListener("change", renderAll);
  els.exportBtn?.addEventListener("click", exportNotes);
  els.importInput?.addEventListener("change", importNotes);
  els.resetFormBtn?.addEventListener("click", resetForm);
  els.clearAllBtn?.addEventListener("click", clearAllNotes);
  els.openOptionsBtn?.addEventListener("click", () => chrome.runtime.openOptionsPage());
}

function getStorageArea() {
  return chrome?.storage?.local;
}

function storageGet(keys) {
  return new Promise((resolve) => getStorageArea().get(keys, resolve));
}

function storageSet(payload) {
  return new Promise((resolve) => getStorageArea().set(payload, resolve));
}

async function hydrateState() {
  const data = await storageGet([STORAGE_KEY, EDIT_KEY]);
  state.notes = Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : seedNotes();
  state.editingId = data[EDIT_KEY] || null;

  if (!Array.isArray(data[STORAGE_KEY])) {
    await persistNotes();
  }

  if (state.editingId) {
    const note = state.notes.find((item) => item.id === state.editingId);
    if (note) fillForm(note);
  }
}

function seedNotes() {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  return [
    {
      id: crypto.randomUUID(),
      course: "Machine Learning",
      topic: "Decision Tree",
      status: "learning",
      score: 65,
      tags: ["ml", "cây quyết định", "entropy"],
      reviewDate: nextWeek.toISOString().slice(0, 10),
      content: "Tóm tắt: cần phân biệt entropy, information gain và gini. Viết thêm ví dụ phân nhánh ở bước tiếp theo.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
}

async function persistNotes() {
  await storageSet({ [STORAGE_KEY]: state.notes });
}

async function persistEditingId() {
  await storageSet({ [EDIT_KEY]: state.editingId });
}

function parseTags(raw) {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(value) {
  if (!value) return "Chưa đặt";
  const date = new Date(value + "T00:00:00");
  if (Number.isNaN(date.getTime())) return "Chưa đặt";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function formatRelativeFromToday(dateText) {
  if (!dateText) return "Chưa có lịch";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateText + "T00:00:00");
  const diffDays = Math.round((target - today) / 86400000);

  if (diffDays < 0) return `Quá hạn ${Math.abs(diffDays)} ngày`;
  if (diffDays === 0) return "Cần ôn hôm nay";
  if (diffDays === 1) return "Cần ôn ngày mai";
  return `${diffDays} ngày nữa`;
}

function showToast(message) {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => els.toast.classList.remove("show"), 2200);
}

async function handleSubmit(event) {
  event.preventDefault();

  const payload = {
    course: els.course.value.trim(),
    topic: els.topic.value.trim(),
    status: els.status.value,
    score: clamp(Number(els.score.value || 0), 0, 100),
    tags: parseTags(els.tags.value),
    reviewDate: els.reviewDate.value,
    content: els.content.value.trim()
  };

  if (!payload.course || !payload.topic || !payload.content) {
    showToast("Vui lòng nhập đủ môn học, chủ đề và nội dung note.");
    return;
  }

  const now = new Date().toISOString();

  if (state.editingId) {
    state.notes = state.notes.map((item) =>
      item.id === state.editingId
        ? { ...item, ...payload, updatedAt: now }
        : item
    );
    showToast("Đã cập nhật note.");
  } else {
    state.notes.unshift({
      id: crypto.randomUUID(),
      ...payload,
      createdAt: now,
      updatedAt: now
    });
    showToast("Đã lưu note mới.");
  }

  state.editingId = null;
  await persistEditingId();
  await persistNotes();
  resetForm(false);
  renderAll();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getFilteredNotes() {
  const query = (els.searchInput?.value || "").trim().toLowerCase();
  const status = els.filterStatus?.value || "all";
  const course = els.filterCourse?.value || "all";

  return state.notes.filter((note) => {
    const matchesQuery = !query || [
      note.course,
      note.topic,
      note.content,
      ...(note.tags || [])
    ].join(" ").toLowerCase().includes(query);

    const matchesStatus = status === "all" || note.status === status;
    const matchesCourse = !els.filterCourse || course === "all" || note.course === course;

    return matchesQuery && matchesStatus && matchesCourse;
  });
}

function computeStats() {
  const total = state.notes.length;
  const mastered = state.notes.filter((n) => n.status === "mastered").length;
  const learning = state.notes.filter((n) => n.status === "learning").length;
  const notStarted = state.notes.filter((n) => n.status === "not-started").length;
  const avgScore = total
    ? Math.round(state.notes.reduce((sum, n) => sum + Number(n.score || 0), 0) / total)
    : 0;

  return [
    { label: "Tổng note", value: total },
    { label: "Đang học", value: learning },
    { label: "Đã nắm chắc", value: mastered },
    { label: "Điểm hiểu TB", value: `${avgScore}%` },
    { label: "Chưa học kỹ", value: notStarted }
  ];
}

function renderStats() {
  if (!els.statsGrid) return;
  const stats = computeStats();
  els.statsGrid.innerHTML = stats.map((stat) => `
    <article class="stat-card">
      <div class="value">${escapeHtml(String(stat.value))}</div>
      <div class="label">${escapeHtml(stat.label)}</div>
    </article>
  `).join("");
}

function renderCourseFilter() {
  if (!els.filterCourse) return;
  const courses = [...new Set(state.notes.map((n) => n.course))].sort((a, b) => a.localeCompare(b, "vi"));
  const current = els.filterCourse.value || "all";

  els.filterCourse.innerHTML = [
    `<option value="all">Tất cả môn học</option>`,
    ...courses.map((course) => `<option value="${escapeAttribute(course)}">${escapeHtml(course)}</option>`)
  ].join("");

  els.filterCourse.value = courses.includes(current) ? current : "all";
}

function renderReviews() {
  if (!els.reviewList) return;

  const items = [...state.notes]
    .filter((note) => note.reviewDate)
    .sort((a, b) => a.reviewDate.localeCompare(b.reviewDate))
    .slice(0, 5);

  if (!items.length) {
    els.reviewList.innerHTML = `<div class="empty-state">Chưa có note nào đặt lịch xem lại.</div>`;
    return;
  }

  els.reviewList.innerHTML = items.map((note) => `
    <article class="review-card">
      <strong>${escapeHtml(note.topic)}</strong>
      <div class="hint">${escapeHtml(note.course)} · ${escapeHtml(formatDate(note.reviewDate))}</div>
      <div class="hint">${escapeHtml(formatRelativeFromToday(note.reviewDate))}</div>
    </article>
  `).join("");
}

function renderNotes() {
  const filtered = getFilteredNotes();

  if (els.noteCountLabel) {
    els.noteCountLabel.textContent = `${filtered.length} note`;
  }

  if (!els.notesContainer) return;

  if (!filtered.length) {
    els.notesContainer.innerHTML = `
      <div class="empty-state">
        Không tìm thấy note phù hợp. Hãy thử đổi từ khóa hoặc bộ lọc.
      </div>
    `;
    return;
  }

  els.notesContainer.innerHTML = filtered.map((note) => `
    <article class="note-card" data-id="${escapeAttribute(note.id)}">
      <div class="note-title-line">
        <div>
          <h3>${escapeHtml(note.topic)}</h3>
          <p class="hint">${escapeHtml(note.course)}</p>
        </div>
        <span class="badge ${escapeAttribute(note.status)}">${escapeHtml(statusMap[note.status] || note.status)}</span>
      </div>

      <div class="note-meta">
        <span class="meta-pill">Hiểu: ${escapeHtml(String(note.score))}%</span>
        <span class="meta-pill">Review: ${escapeHtml(formatDate(note.reviewDate))}</span>
        <span class="meta-pill">Cập nhật: ${escapeHtml(new Intl.DateTimeFormat("vi-VN").format(new Date(note.updatedAt)))}</span>
      </div>

      ${(note.tags || []).length ? `
        <div class="note-meta">
          ${note.tags.map((tag) => `<span class="tag-chip">#${escapeHtml(tag)}</span>`).join("")}
        </div>
      ` : ""}

      <div class="note-content">${escapeHtml(note.content)}</div>

      <div class="note-actions">
        <button class="ghost-button edit-btn" data-id="${escapeAttribute(note.id)}">Sửa</button>
        <button class="ghost-button progress-btn" data-id="${escapeAttribute(note.id)}">+10% hiểu</button>
        <button class="danger-button delete-btn" data-id="${escapeAttribute(note.id)}">Xóa</button>
      </div>
    </article>
  `).join("");

  els.notesContainer.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => startEdit(btn.dataset.id));
  });

  els.notesContainer.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => removeNote(btn.dataset.id));
  });

  els.notesContainer.querySelectorAll(".progress-btn").forEach((btn) => {
    btn.addEventListener("click", () => increaseProgress(btn.dataset.id));
  });
}

async function startEdit(id) {
  const note = state.notes.find((item) => item.id === id);
  if (!note) return;
  state.editingId = id;
  await persistEditingId();
  fillForm(note);
  showToast("Đã đưa note vào form chỉnh sửa.");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function fillForm(note) {
  els.course.value = note.course || "";
  els.topic.value = note.topic || "";
  els.status.value = note.status || "not-started";
  els.score.value = note.score ?? 60;
  els.tags.value = (note.tags || []).join(", ");
  els.reviewDate.value = note.reviewDate || "";
  els.content.value = note.content || "";

  if (els.formTitle) els.formTitle.textContent = "Chỉnh sửa note";
  if (els.submitBtn) els.submitBtn.textContent = "Cập nhật note";
}

async function resetForm(showMessage = true) {
  els.noteForm?.reset();
  if (els.score) els.score.value = 60;
  state.editingId = null;
  await persistEditingId();
  if (els.formTitle) els.formTitle.textContent = "Thêm note mới";
  if (els.submitBtn) els.submitBtn.textContent = "Lưu note";
  if (showMessage) showToast("Đã đặt lại form.");
}

async function removeNote(id) {
  const note = state.notes.find((item) => item.id === id);
  if (!note) return;

  state.notes = state.notes.filter((item) => item.id !== id);
  if (state.editingId === id) {
    state.editingId = null;
    await persistEditingId();
    await resetForm(false);
  }
  await persistNotes();
  renderAll();
  showToast(`Đã xóa note: ${note.topic}`);
}

async function increaseProgress(id) {
  state.notes = state.notes.map((note) => {
    if (note.id !== id) return note;

    const newScore = clamp(Number(note.score || 0) + 10, 0, 100);
    let newStatus = note.status;
    if (newScore >= 85) newStatus = "mastered";
    else if (newScore > 0) newStatus = "learning";

    return {
      ...note,
      score: newScore,
      status: newStatus,
      updatedAt: new Date().toISOString()
    };
  });

  await persistNotes();
  renderAll();
  showToast("Đã cập nhật tiến độ học.");
}

async function clearAllNotes() {
  const confirmed = confirm("Bạn có chắc muốn xóa toàn bộ note không?");
  if (!confirmed) return;
  state.notes = [];
  state.editingId = null;
  await persistEditingId();
  await persistNotes();
  await resetForm(false);
  renderAll();
  showToast("Đã xóa toàn bộ note.");
}

function exportNotes() {
  const blob = new Blob([JSON.stringify(state.notes, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `study-vault-notes-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("Đã xuất dữ liệu JSON.");
}

async function importNotes(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("Sai định dạng");

    state.notes = parsed
      .filter(Boolean)
      .map((item) => ({
        id: item.id || crypto.randomUUID(),
        course: String(item.course || "").trim(),
        topic: String(item.topic || "").trim(),
        status: ["not-started", "learning", "mastered"].includes(item.status) ? item.status : "not-started",
        score: clamp(Number(item.score || 0), 0, 100),
        tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
        reviewDate: item.reviewDate || "",
        content: String(item.content || "").trim(),
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString()
      }))
      .filter((item) => item.course && item.topic && item.content);

    await persistNotes();
    renderAll();
    showToast("Đã nhập dữ liệu thành công.");
  } catch (error) {
    console.error(error);
    showToast("File JSON không hợp lệ.");
  } finally {
    event.target.value = "";
  }
}

function renderAll() {
  renderCourseFilter();
  renderStats();
  renderReviews();
  renderNotes();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
