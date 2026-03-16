const App = window.StudyNoteApp;

function popupToast(message) {
  const el = document.getElementById("popupToast");
  el.textContent = message;
  el.classList.remove("hidden");
  clearTimeout(window.__popupToastTimer);
  window.__popupToastTimer = setTimeout(() => el.classList.add("hidden"), 1800);
}

function collectPopupForm() {
  return {
    title: document.getElementById("popupTitle").value.trim(),
    tag: document.getElementById("popupTag").value,
    status: document.getElementById("popupStatus").value,
    mastery: Number(document.getElementById("popupMastery").value || 60),
    content: document.getElementById("popupContent").value.trim(),
    important: document.getElementById("popupImportant").checked,
    pinned: document.getElementById("popupPinned").checked,
    review: document.getElementById("popupReview").checked,
    reviewDate: document.getElementById("popupReviewDate").value || App.todayISO()
  };
}

function resetPopupForm() {
  document.getElementById("popupTitle").value = "";
  document.getElementById("popupStatus").value = "Đang học";
  document.getElementById("popupMastery").value = 60;
  document.getElementById("popupContent").value = "";
  document.getElementById("popupImportant").checked = false;
  document.getElementById("popupPinned").checked = false;
  document.getElementById("popupReview").checked = true;
  document.getElementById("popupReviewDate").value = "";
}

function renderPopupReview(notes) {
  const list = document.getElementById("popupReviewList");
  const due = notes
    .filter((n) => n.review && ["today", "overdue"].includes(App.dueState(n)))
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 4);

  document.getElementById("popupDueCount").textContent = String(due.length);
  list.innerHTML = "";
  if (!due.length) {
    list.innerHTML = '<div class="empty-mini">Chưa có note đến hạn.</div>';
    return;
  }
  due.forEach((note) => {
    const item = document.createElement("div");
    item.className = "mini-item";
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(note.title)}</strong>
        <p>${escapeHtml(note.tag)} · ${note.mastery}%</p>
      </div>
      <span class="pill ${App.dueState(note) === "overdue" ? "danger" : "warn"}">${App.dueState(note) === "overdue" ? "Quá hạn" : "Hôm nay"}</span>
    `;
    list.appendChild(item);
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function initPopup() {
  await App.ensureVersionBackup();
  const data = await App.loadData();
  renderPopupReview(data.notes);

  document.getElementById("openDashboardBtn").addEventListener("click", () => chrome.runtime.openOptionsPage());
  document.getElementById("popupResetBtn").addEventListener("click", resetPopupForm);
  document.getElementById("popupSaveBtn").addEventListener("click", async () => {
    const payload = collectPopupForm();
    if (!payload.title || !payload.content) {
      popupToast("Nhập tiêu đề và nội dung trước đã.");
      return;
    }
    await App.addNote(payload);
    popupToast("Đã lưu note.");
    resetPopupForm();
    const updated = await App.loadData();
    renderPopupReview(updated.notes);
  });
}

document.addEventListener("DOMContentLoaded", initPopup);
