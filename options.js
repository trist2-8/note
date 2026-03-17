(async () => {
  const store = window.StudyStore;
  let data = await store.ensureData();
  let activeNav = 'dashboard';
  let activeChip = 'all';
  let editingId = null;
  let viewingId = null;
  let compactView = false;

  const $ = (id) => document.getElementById(id);
  const els = {
    overviewGrid: $('overviewGrid'),
    todayFocusCard: $('todayFocusCard'),
    reviewQueueList: $('reviewQueueList'),
    topicsList: $('topicsList'),
    topicCountPill: $('topicCountPill'),
    recentNotesList: $('recentNotesList'),
    notesMetaText: $('notesMetaText'),
    tasksList: $('tasksList'),
    taskProgressPill: $('taskProgressPill'),
    newTaskInput: $('newTaskInput'),
    addTaskBtn: $('addTaskBtn'),
    insightText: $('insightText'),
    reviewPanelList: $('reviewPanelList'),
    backupList: $('backupList'),
    backupStatus: $('backupStatus'),
    storageOverview: $('storageOverview'),
    searchInput: $('searchInput'),
    clearSearchBtn: $('clearSearchBtn'),
    sortSelect: $('sortSelect'),
    toggleViewBtn: $('toggleViewBtn'),
    emptyState: $('emptyState'),
    quickTitle: $('quickTitle'),
    quickTag: $('quickTag'),
    quickStatus: $('quickStatus'),
    quickMastery: $('quickMastery'),
    quickContent: $('quickContent'),
    reviewPanel: $('reviewPanel'),
    settingsPanel: $('settingsPanel'),
    notesSection: $('notesSection'),
    editorModal: $('editorModal'),
    viewerModal: $('viewerModal'),
    editTitle: $('editTitle'),
    editTag: $('editTag'),
    editStatus: $('editStatus'),
    editMastery: $('editMastery'),
    editContent: $('editContent'),
    editPinned: $('editPinned'),
    editImportant: $('editImportant'),
    viewTitle: $('viewTitle'),
    viewMeta: $('viewMeta'),
    viewBadges: $('viewBadges'),
    viewBody: $('viewBody'),
    viewReviewBtn: $('viewReviewBtn'),
    viewPinBtn: $('viewPinBtn'),
    viewImportantBtn: $('viewImportantBtn'),
    viewEditBtn: $('viewEditBtn'),
    toast: $('toast'),
    scrollRoot: $('scrollRoot')
  };

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.remove('hidden');
    clearTimeout(window.__studyToast);
    window.__studyToast = setTimeout(() => els.toast.classList.add('hidden'), 2200);
  }

  function esc(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function weakNote() {
    return [...data.notes].sort((a, b) => a.mastery - b.mastery)[0] || null;
  }

  function reviewNotes() {
    return [...data.notes].filter((note) => note.review).sort((a, b) => a.mastery - b.mastery);
  }

  function topicSummary() {
    const topics = new Map();
    data.notes.forEach((note) => {
      if (!topics.has(note.tag)) topics.set(note.tag, []);
      topics.get(note.tag).push(note);
    });
    return [...topics.entries()].map(([name, items]) => ({
      name,
      progress: Math.round(items.reduce((sum, note) => sum + note.mastery, 0) / items.length),
      count: items.length
    })).sort((a, b) => b.count - a.count || b.progress - a.progress);
  }

  function fillTagSelects() {
    const tags = [...new Set((data.tags || []).concat(data.notes.map((note) => note.tag)))].sort((a, b) => a.localeCompare(b, 'vi'));
    const html = tags.map((tag) => `<option value="${esc(tag)}">${esc(tag)}</option>`).join('');
    [els.quickTag, els.editTag].forEach((select) => {
      const prev = select.value;
      select.innerHTML = html;
      if (prev && tags.includes(prev)) select.value = prev;
    });
    if (!els.quickTag.value && tags.length) els.quickTag.value = tags[0];
  }

  function filteredNotes() {
    const search = els.searchInput.value.trim().toLowerCase();
    let notes = [...data.notes];
    if (search) {
      notes = notes.filter((note) => [note.title, note.tag, note.preview].join(' ').toLowerCase().includes(search));
    }
    if (activeChip === 'review') notes = notes.filter((note) => note.review);
    if (activeChip === 'pinned') notes = notes.filter((note) => note.pinned);
    if (activeChip === 'important') notes = notes.filter((note) => note.important);

    switch (els.sortSelect.value) {
      case 'oldest':
        notes.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'masteryLow':
        notes.sort((a, b) => a.mastery - b.mastery || b.updatedAt - a.updatedAt);
        break;
      case 'masteryHigh':
        notes.sort((a, b) => b.mastery - a.mastery || b.updatedAt - a.updatedAt);
        break;
      case 'tagAZ':
        notes.sort((a, b) => a.tag.localeCompare(b.tag, 'vi') || b.updatedAt - a.updatedAt);
        break;
      default:
        notes.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    return notes;
  }

  function priorityText(note) {
    if (note.important) return 'Quan trọng';
    if (note.review) return 'Cần ôn';
    return note.status;
  }

  function dueText(note, index = 0) {
    if (note.mastery < 35) return 'Ôn ngay';
    if (note.mastery < 50) return 'Hôm nay';
    if (note.review) return index === 0 ? 'Trong 15 phút' : 'Tối nay';
    return 'Đã ổn';
  }

  function noteStateBadges(note) {
    const badges = [`<span class="state-badge ${note.review ? 'warn' : 'good'}">${esc(note.status)}</span>`];
    if (note.pinned) badges.push('<span class="state-badge info">Đã ghim</span>');
    if (note.important) badges.push('<span class="state-badge warn">Quan trọng</span>');
    if (note.mastery >= 80) badges.push('<span class="state-badge good">Nắm chắc</span>');
    return badges.join('');
  }

  function noteCard(note, { reviewMode = false } = {}) {
    return `
      <article class="note-card ${compactView ? 'compact-note' : ''}">
        <div class="note-top">
          <div class="min-zero">
            <div class="note-title-row">
              <h4 class="note-title">${esc(note.title)}</h4>
              <span class="tag-pill">${esc(note.tag)}</span>
            </div>
            <p class="note-time">${esc(note.timeLabel)} · ${esc(dueText(note))}</p>
          </div>
          <span class="priority-pill">${esc(priorityText(note))}</span>
        </div>
        <p class="note-preview">${esc(note.preview)}</p>
        <div class="note-flags">${noteStateBadges(note)}</div>
        <div class="mastery-row spread-row">
          <span>Mastery</span>
          <span>${note.mastery}%</span>
        </div>
        <div class="mastery-bar"><div class="mastery-fill" style="width:${note.mastery}%"></div></div>
        <div class="note-actions">
          <div class="action-group">
            <button class="mini-action" data-view-id="${esc(note.id)}">Mở lại</button>
            <button class="mini-action muted" data-edit-id="${esc(note.id)}">Sửa</button>
            ${reviewMode ? `<button class="mini-action" data-review-id="${esc(note.id)}">Ôn +10</button>` : ''}
          </div>
          <div class="action-group">
            <button class="icon-action" title="Ghim" data-pin-id="${esc(note.id)}">📌</button>
            <button class="icon-action" title="Quan trọng" data-important-id="${esc(note.id)}">⭐</button>
            <button class="icon-action" title="Xóa" data-delete-id="${esc(note.id)}">🗑</button>
          </div>
        </div>
      </article>
    `;
  }

  function renderOverview() {
    const total = data.notes.length;
    const review = data.notes.filter((note) => note.review).length;
    const pinned = data.notes.filter((note) => note.pinned).length;
    const recentWeek = data.notes.filter((note) => Date.now() - note.createdAt < 7 * 24 * 60 * 60 * 1000).length;
    const streak = String(Math.min(99, Math.max(3, recentWeek + 4))).padStart(2, '0');

    const items = [
      { label: 'Tổng note', value: total, hint: `+${recentWeek} tuần này` },
      { label: 'Cần ôn', value: review, hint: `${Math.max(0, review - 2)} note cần ưu tiên` },
      { label: 'Đã ghim', value: pinned, hint: `${data.notes.filter((note) => note.important).length} note quan trọng` },
      { label: 'Chuỗi học', value: streak, hint: 'ngày liên tiếp' }
    ];

    els.overviewGrid.innerHTML = items.map((item) => `
      <div class="overview-card">
        <p class="overview-label">${esc(item.label)}</p>
        <div class="overview-row">
          <p class="overview-value">${esc(item.value)}</p>
          <div class="overview-dot">●</div>
        </div>
        <p class="overview-hint">${esc(item.hint)}</p>
      </div>
    `).join('');
  }

  function renderTodayFocus() {
    const weakest = weakNote();
    const tasksDone = data.tasks.filter((task) => task.done).length;
    const reviews = reviewNotes();
    const latestBackup = data.backups?.[0];
    const backupText = latestBackup ? new Date(latestBackup.createdAt).toLocaleDateString('vi-VN') : 'Chưa có';
    if (!weakest) {
      els.todayFocusCard.innerHTML = `
        <div class="hero-row">
          <div class="hero-copy">
            <p class="section-kicker accent">Today Focus</p>
            <h2 class="hero-title">Bắt đầu lưu note đầu tiên</h2>
            <p class="hero-text">Tạo note đầu tiên để dashboard bắt đầu tính toán review queue, tiến độ theo chủ đề và backup tự động.</p>
          </div>
          <div class="hero-statbox">
            <div class="hero-kpi"><span>Backup</span><strong>${esc(backupText)}</strong></div>
          </div>
        </div>`;
      return;
    }
    els.todayFocusCard.innerHTML = `
      <div class="hero-row">
        <div class="hero-copy">
          <p class="section-kicker accent">Today Focus</p>
          <h2 class="hero-title">Ưu tiên note “${esc(weakest.title)}” trước</h2>
          <p class="hero-text">Mastery hiện tại là ${weakest.mastery}% trong chủ đề ${esc(weakest.tag)}. Đây là note yếu nhất của bạn lúc này, nên ôn lại trước khi thêm nhiều note mới.</p>
          <div class="hero-actions">
            <button class="btn btn-primary" data-focus-open="${esc(weakest.id)}">Mở note yếu nhất</button>
            <button class="btn" data-focus-review="${esc(weakest.id)}">Ôn +10 ngay</button>
          </div>
        </div>
        <div class="hero-statbox">
          <div class="hero-kpi"><span>Cần ôn</span><strong>${reviews.length}</strong></div>
          <div class="hero-kpi"><span>Checklist</span><strong>${tasksDone}/${data.tasks.length}</strong></div>
          <div class="hero-pill-list">
            <span class="pill subtle-pill">Backup: ${esc(backupText)}</span>
            <span class="pill subtle-pill">Tag: ${data.tags.length}</span>
          </div>
        </div>
      </div>`;
  }

  function renderReviewQueue() {
    const queue = reviewNotes().slice(0, 3);
    els.reviewQueueList.innerHTML = queue.length
      ? queue.map((note, index) => `
        <div class="queue-item">
          <div class="queue-rank">${index + 1}</div>
          <div class="queue-body">
            <p class="queue-title">${esc(note.title)}</p>
            <p class="queue-sub">${esc(note.tag)} · ${esc(dueText(note, index))} · Mastery ${note.mastery}%</p>
          </div>
          <button class="link-btn" data-review-id="${esc(note.id)}">Ôn ngay</button>
        </div>
      `).join('')
      : `<div class="empty-mini">Không có note cần ôn.</div>`;

    const reviewList = reviewNotes();
    els.reviewPanelList.innerHTML = reviewList.length
      ? reviewList.map((note) => noteCard(note, { reviewMode: true })).join('')
      : `<div class="empty-mini">Không có note cần ôn.</div>`;
  }

  function renderTopics() {
    const topics = topicSummary().slice(0, 5);
    els.topicCountPill.textContent = `${topics.length} chủ đề`;
    els.topicsList.innerHTML = topics.length ? topics.map((topic) => `
      <div>
        <div class="topic-row"><span>${esc(topic.name)}</span><span>${topic.progress}% · ${topic.count} note</span></div>
        <div class="topic-bar"><div class="topic-fill" style="width:${topic.progress}%"></div></div>
      </div>
    `).join('') : `<div class="empty-mini">Chưa có dữ liệu theo chủ đề.</div>`;
  }

  function renderNotes() {
    const notes = filteredNotes();
    els.recentNotesList.innerHTML = notes.map((note) => noteCard(note)).join('');
    els.notesMetaText.textContent = `${notes.length} note đang hiển thị · chế độ ${compactView ? 'compact' : 'đầy đủ'}`;
    els.emptyState.classList.toggle('hidden', notes.length > 0);
    els.clearSearchBtn.classList.toggle('hidden', !els.searchInput.value.trim());
    els.toggleViewBtn.textContent = compactView ? 'Đầy đủ' : 'Compact';
  }

  function renderTasks() {
    const doneCount = data.tasks.filter((task) => task.done).length;
    els.taskProgressPill.textContent = `${doneCount}/${data.tasks.length} hoàn thành`;
    els.tasksList.innerHTML = data.tasks.length ? data.tasks.map((task) => `
      <label class="task-item ${task.done ? 'done' : ''}">
        <input type="checkbox" data-task-id="${esc(task.id)}" ${task.done ? 'checked' : ''} />
        <span class="task-text">${esc(task.text)}</span>
        <button class="task-delete" type="button" data-task-delete="${esc(task.id)}">✕</button>
      </label>
    `).join('') : `<div class="empty-mini">Chưa có mục tiêu hôm nay.</div>`;
  }

  function renderInsight() {
    const reviews = reviewNotes();
    const weakest = weakNote();
    const strongest = [...data.notes].sort((a, b) => b.mastery - a.mastery)[0];
    if (!weakest) {
      els.insightText.textContent = 'Bắt đầu tạo note đầu tiên để hệ thống gợi ý tối ưu học tập.';
      return;
    }
    const line1 = `Hiện tại bạn có ${reviews.length} note cần ôn. Note yếu nhất là “${weakest.title}” (${weakest.mastery}%) ở chủ đề ${weakest.tag}.`;
    const line2 = strongest ? `Chủ đề đang ổn nhất là ${strongest.tag} với note “${strongest.title}”.` : '';
    const line3 = 'Nên dành 20–25 phút ôn nhóm mastery thấp trước, rồi mới tạo thêm note mới để tránh tích lũy quá nhiều nội dung chưa tiêu hóa.';
    els.insightText.textContent = [line1, line2, line3].filter(Boolean).join(' ');
  }

  function renderBackups() {
    const backups = data.backups || [];
    els.backupStatus.textContent = backups.length
      ? `Backup gần nhất: ${new Date(backups[0].createdAt).toLocaleString('vi-VN')} · ${backups[0].label}`
      : 'Chưa có backup.';

    els.backupList.innerHTML = backups.length
      ? backups.map((backup) => `
        <div class="queue-item">
          <div class="queue-rank">⟲</div>
          <div class="queue-body">
            <p class="queue-title">${esc(backup.label)}</p>
            <p class="queue-sub">${new Date(backup.createdAt).toLocaleString('vi-VN')}</p>
          </div>
          <div class="inline-actions">
            <button class="link-btn" data-restore-id="${esc(backup.id)}">Khôi phục</button>
            <button class="link-btn muted-link" data-export-backup-id="${esc(backup.id)}">Xuất</button>
          </div>
        </div>
      `).join('')
      : `<div class="empty-mini">Chưa có backup nào.</div>`;

    const payloadSize = new Blob([JSON.stringify(data)]).size / 1024;
    const storageCards = [
      { label: 'Version', value: store.VERSION, hint: 'manifest + schema' },
      { label: 'Dung lượng', value: `${payloadSize.toFixed(1)} KB`, hint: 'ước tính dữ liệu hiện tại' },
      { label: 'Tags', value: data.tags.length, hint: 'đang dùng trong dashboard' },
      { label: 'Backups', value: backups.length, hint: 'đang lưu cục bộ' }
    ];
    els.storageOverview.innerHTML = storageCards.map((item) => `
      <div class="overview-card">
        <p class="overview-label">${esc(item.label)}</p>
        <div class="overview-row">
          <p class="overview-value">${esc(item.value)}</p>
          <div class="overview-dot">●</div>
        </div>
        <p class="overview-hint">${esc(item.hint)}</p>
      </div>
    `).join('');
  }

  function renderVisibility() {
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.nav === activeNav);
    });
    document.querySelectorAll('.chip').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.chip === activeChip);
    });

    els.reviewPanel.classList.toggle('hidden', activeNav !== 'review');
    els.settingsPanel.classList.toggle('hidden', activeNav !== 'settings');

    if (activeNav === 'notes') {
      els.notesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (activeNav === 'review') {
      els.reviewPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (activeNav === 'settings') {
      els.settingsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (activeNav === 'dashboard') {
      els.scrollRoot.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function renderViewer() {
    const note = data.notes.find((item) => item.id === viewingId);
    if (!note) {
      els.viewerModal.classList.add('hidden');
      return;
    }
    els.viewTitle.textContent = note.title;
    els.viewMeta.textContent = `${note.tag} · ${note.timeLabel} · Mastery ${note.mastery}%`;
    els.viewBadges.innerHTML = noteStateBadges(note);
    els.viewBody.textContent = note.preview;
    els.viewReviewBtn.textContent = note.review ? 'Ôn +10' : 'Tăng +10';
    els.viewPinBtn.textContent = note.pinned ? 'Bỏ ghim' : 'Ghim';
    els.viewImportantBtn.textContent = note.important ? 'Bỏ quan trọng' : 'Quan trọng';
  }

  function render() {
    fillTagSelects();
    renderOverview();
    renderTodayFocus();
    renderReviewQueue();
    renderTopics();
    renderNotes();
    renderTasks();
    renderInsight();
    renderBackups();
    renderViewer();
    renderVisibility();
  }

  async function persist(message) {
    data = await store.saveData(data);
    render();
    if (message) showToast(message);
  }

  function openViewer(noteId) {
    viewingId = noteId;
    renderViewer();
    els.viewerModal.classList.remove('hidden');
  }

  function closeViewer() {
    viewingId = null;
    els.viewerModal.classList.add('hidden');
  }

  function openEditor(noteId) {
    const note = data.notes.find((item) => item.id === noteId);
    if (!note) return;
    editingId = noteId;
    els.editTitle.value = note.title;
    els.editTag.value = note.tag;
    els.editStatus.value = note.status;
    els.editMastery.value = note.mastery;
    els.editContent.value = note.preview;
    els.editPinned.checked = !!note.pinned;
    els.editImportant.checked = !!note.important;
    els.editorModal.classList.remove('hidden');
  }

  function closeEditor() {
    editingId = null;
    els.editorModal.classList.add('hidden');
  }

  function resetQuickForm() {
    els.quickTitle.value = '';
    els.quickContent.value = '';
    els.quickMastery.value = 60;
    els.quickStatus.value = 'Đang học';
  }

  async function saveQuickNote(pinned) {
    if (!els.quickTitle.value.trim() || !els.quickContent.value.trim()) {
      showToast('Nhập tiêu đề và nội dung note');
      return;
    }
    const note = store.makeNote({
      title: els.quickTitle.value,
      tag: els.quickTag.value,
      preview: els.quickContent.value,
      status: els.quickStatus.value,
      mastery: els.quickMastery.value,
      pinned,
      important: false
    });
    data.notes.unshift(note);
    if (!data.tags.includes(note.tag)) data.tags.push(note.tag);
    resetQuickForm();
    await persist(pinned ? 'Đã lưu và ghim note' : 'Đã lưu note mới');
  }

  async function bumpReview(noteId, amount = 10) {
    const note = data.notes.find((item) => item.id === noteId);
    if (!note) return;
    note.mastery = Math.min(100, note.mastery + amount);
    note.review = note.status === 'Cần ôn' || note.mastery < 65;
    note.updatedAt = Date.now();
    note.timeLabel = store.timeLabel(note.updatedAt);
    await persist('Đã ôn note');
  }

  async function addTask() {
    const text = els.newTaskInput.value.trim();
    if (!text) {
      showToast('Nhập nội dung mục tiêu hôm nay');
      return;
    }
    data.tasks.unshift({ id: `t-${Date.now()}`, text, done: false });
    els.newTaskInput.value = '';
    await persist('Đã thêm mục tiêu');
  }

  document.querySelectorAll('[data-chip]').forEach((button) => {
    button.addEventListener('click', () => {
      activeChip = button.dataset.chip;
      renderNotes();
      renderVisibility();
    });
  });

  document.querySelectorAll('[data-nav]').forEach((button) => {
    button.addEventListener('click', () => {
      activeNav = button.dataset.nav;
      renderVisibility();
    });
  });

  els.searchInput.addEventListener('input', renderNotes);
  els.sortSelect.addEventListener('change', renderNotes);
  els.clearSearchBtn.addEventListener('click', () => {
    els.searchInput.value = '';
    renderNotes();
    els.searchInput.focus();
  });
  els.toggleViewBtn.addEventListener('click', () => {
    compactView = !compactView;
    renderNotes();
  });
  $('openSearchBtn').addEventListener('click', () => els.searchInput.focus());
  $('openComposerBtn').addEventListener('click', () => els.quickTitle.focus());
  $('saveQuickBtn').addEventListener('click', () => saveQuickNote(false));
  $('pinQuickBtn').addEventListener('click', () => saveQuickNote(true));
  els.quickContent.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') saveQuickNote(false);
  });
  els.addTaskBtn.addEventListener('click', addTask);
  els.newTaskInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') addTask();
  });

  $('saveEditBtn').addEventListener('click', async () => {
    const note = data.notes.find((item) => item.id === editingId);
    if (!note) return;
    note.title = els.editTitle.value.trim() || note.title;
    note.tag = els.editTag.value;
    note.status = els.editStatus.value;
    note.mastery = Math.max(0, Math.min(100, Number(els.editMastery.value) || 0));
    note.preview = els.editContent.value.trim() || note.preview;
    note.pinned = els.editPinned.checked;
    note.important = els.editImportant.checked;
    note.review = note.status === 'Cần ôn' || note.mastery < 65;
    note.updatedAt = Date.now();
    note.timeLabel = store.timeLabel(note.updatedAt);
    if (!data.tags.includes(note.tag)) data.tags.push(note.tag);
    closeEditor();
    await persist('Đã cập nhật note');
  });

  $('bulkReviewBtn').addEventListener('click', async () => {
    data.notes.forEach((note) => {
      if (note.review) {
        note.mastery = Math.min(100, note.mastery + 10);
        note.review = note.status === 'Cần ôn' || note.mastery < 65;
        note.updatedAt = Date.now();
        note.timeLabel = store.timeLabel(note.updatedAt);
      }
    });
    await persist('Đã ôn toàn bộ hàng đợi');
  });

  $('bulkCompleteBtn').addEventListener('click', async () => {
    data.notes.forEach((note) => {
      if (note.review && note.mastery >= 55) {
        note.review = false;
        note.status = note.status === 'Cần ôn' ? 'Đã lưu' : note.status;
        note.updatedAt = Date.now();
        note.timeLabel = store.timeLabel(note.updatedAt);
      }
    });
    await persist('Đã cập nhật nhóm note đã tiến bộ');
  });

  $('backupNowBtn').addEventListener('click', async () => {
    data = await store.createManualBackup('Manual backup');
    render();
    showToast('Đã tạo backup');
  });

  $('restoreLatestBtn').addEventListener('click', async () => {
    const latest = (data.backups || [])[0];
    if (!latest) {
      showToast('Chưa có backup để khôi phục');
      return;
    }
    if (!confirm('Khôi phục backup mới nhất? Dữ liệu hiện tại sẽ được thay thế.')) return;
    data = await store.restoreBackup(latest.id);
    render();
    showToast('Đã khôi phục backup mới nhất');
  });

  $('exportDataBtn').addEventListener('click', async () => {
    await store.exportCurrentData();
    showToast('Đã xuất dữ liệu');
  });

  $('restoreSeedBtn').addEventListener('click', async () => {
    if (!confirm('Khôi phục dữ liệu mẫu? Dữ liệu hiện tại sẽ được backup trước.')) return;
    data = await store.restoreSeedData();
    render();
    showToast('Đã khôi phục dữ liệu mẫu');
  });

  $('importFileInput').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      data = await store.importData(parsed);
      render();
      showToast('Đã nhập dữ liệu');
    } catch (error) {
      console.error(error);
      showToast('File JSON không hợp lệ');
    }
    event.target.value = '';
  });

  els.viewReviewBtn.addEventListener('click', () => viewingId && bumpReview(viewingId));
  els.viewPinBtn.addEventListener('click', async () => {
    const note = data.notes.find((item) => item.id === viewingId);
    if (!note) return;
    note.pinned = !note.pinned;
    await persist('Đã cập nhật ghim');
  });
  els.viewImportantBtn.addEventListener('click', async () => {
    const note = data.notes.find((item) => item.id === viewingId);
    if (!note) return;
    note.important = !note.important;
    await persist('Đã cập nhật mức ưu tiên');
  });
  els.viewEditBtn.addEventListener('click', () => {
    if (!viewingId) return;
    const id = viewingId;
    closeViewer();
    openEditor(id);
  });

  document.body.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.dataset.close === 'editor') {
      closeEditor();
      return;
    }
    if (target.dataset.close === 'viewer') {
      closeViewer();
      return;
    }
    if (target.dataset.viewId) {
      openViewer(target.dataset.viewId);
      return;
    }
    if (target.dataset.editId) {
      openEditor(target.dataset.editId);
      return;
    }
    if (target.dataset.pinId) {
      const note = data.notes.find((item) => item.id === target.dataset.pinId);
      if (!note) return;
      note.pinned = !note.pinned;
      await persist('Đã cập nhật ghim');
      return;
    }
    if (target.dataset.importantId) {
      const note = data.notes.find((item) => item.id === target.dataset.importantId);
      if (!note) return;
      note.important = !note.important;
      await persist('Đã cập nhật mức ưu tiên');
      return;
    }
    if (target.dataset.deleteId) {
      if (!confirm('Xóa note này?')) return;
      data.notes = data.notes.filter((item) => item.id !== target.dataset.deleteId);
      if (viewingId === target.dataset.deleteId) closeViewer();
      await persist('Đã xóa note');
      return;
    }
    if (target.dataset.reviewId) {
      await bumpReview(target.dataset.reviewId);
      return;
    }
    if (target.dataset.restoreId) {
      if (!confirm('Khôi phục backup này?')) return;
      data = await store.restoreBackup(target.dataset.restoreId);
      render();
      showToast('Đã khôi phục backup');
      return;
    }
    if (target.dataset.exportBackupId) {
      await store.exportBackup(target.dataset.exportBackupId);
      showToast('Đã xuất backup');
      return;
    }
    if (target.dataset.focusOpen) {
      openViewer(target.dataset.focusOpen);
      return;
    }
    if (target.dataset.focusReview) {
      await bumpReview(target.dataset.focusReview);
      return;
    }
    if (target.dataset.taskDelete) {
      data.tasks = data.tasks.filter((item) => item.id !== target.dataset.taskDelete);
      await persist('Đã xóa mục tiêu');
    }
  });

  els.tasksList.addEventListener('change', async (event) => {
    const target = event.target;
    const taskId = target.dataset?.taskId;
    if (!taskId) return;
    const task = data.tasks.find((item) => item.id === taskId);
    if (!task) return;
    task.done = target.checked;
    await persist('Đã cập nhật checklist');
  });

  render();
})();
