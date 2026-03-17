(async () => {
  const store = window.StudyStore;
  let data = await store.ensureData();
  let activeNav = 'dashboard';
  let activeChip = 'all';
  let editingId = null;

  const $ = (id) => document.getElementById(id);
  const els = {
    overviewGrid: $('overviewGrid'),
    reviewQueueList: $('reviewQueueList'),
    topicsList: $('topicsList'),
    recentNotesList: $('recentNotesList'),
    tasksList: $('tasksList'),
    insightText: $('insightText'),
    reviewPanelList: $('reviewPanelList'),
    backupList: $('backupList'),
    backupStatus: $('backupStatus'),
    searchInput: $('searchInput'),
    sortSelect: $('sortSelect'),
    emptyState: $('emptyState'),
    quickTitle: $('quickTitle'),
    quickTag: $('quickTag'),
    quickStatus: $('quickStatus'),
    quickMastery: $('quickMastery'),
    quickContent: $('quickContent'),
    reviewPanel: $('reviewPanel'),
    settingsPanel: $('settingsPanel'),
    notesSection: $('notesSection'),
    tasksSection: $('tasksList'),
    editorModal: $('editorModal'),
    editTitle: $('editTitle'),
    editTag: $('editTag'),
    editStatus: $('editStatus'),
    editMastery: $('editMastery'),
    editContent: $('editContent'),
    editPinned: $('editPinned'),
    editImportant: $('editImportant'),
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
        notes.sort((a, b) => a.mastery - b.mastery);
        break;
      case 'masteryHigh':
        notes.sort((a, b) => b.mastery - a.mastery);
        break;
      default:
        notes.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    return notes;
  }

  function renderOverview() {
    const total = data.notes.length;
    const review = data.notes.filter((note) => note.review).length;
    const pinned = data.notes.filter((note) => note.pinned).length;
    const important = data.notes.filter((note) => note.important).length;
    const recentWeek = data.notes.filter((note) => Date.now() - note.createdAt < 7 * 24 * 60 * 60 * 1000).length;
    const streak = String(Math.min(99, Math.max(3, recentWeek + 4))).padStart(2, '0');

    const items = [
      { label: 'Tổng note', value: total, hint: `+${recentWeek} tuần này` },
      { label: 'Cần ôn', value: review, hint: `${Math.max(0, review - 2)} note quá hạn` },
      { label: 'Đã ghim', value: pinned, hint: `${important} note quan trọng` },
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

  function renderReviewQueue() {
    const queue = [...data.notes].filter((note) => note.review).sort((a, b) => a.mastery - b.mastery).slice(0, 3);
    const html = queue.length
      ? queue.map((note, index) => `
        <div class="queue-item">
          <div class="queue-rank">${index + 1}</div>
          <div class="queue-body">
            <p class="queue-title">${esc(note.title)}</p>
            <p class="queue-sub">${esc(note.status)} · Mastery ${note.mastery}%</p>
          </div>
          <button class="link-btn" data-review-id="${esc(note.id)}">Ôn ngay</button>
        </div>
      `).join('')
      : `<div class="empty-mini">Không có note cần ôn.</div>`;
    els.reviewQueueList.innerHTML = html;

    const reviewList = [...data.notes].filter((note) => note.review).sort((a, b) => a.mastery - b.mastery);
    els.reviewPanelList.innerHTML = reviewList.length
      ? reviewList.map((note) => noteCard(note, true)).join('')
      : `<div class="empty-mini">Không có note cần ôn.</div>`;
  }

  function renderTopics() {
    const tags = [...new Set(data.notes.map((note) => note.tag))].slice(0, 4);
    const topics = (tags.length ? tags : ['Frontend', 'Backend', 'React', 'Algorithms']).map((tag) => {
      const related = data.notes.filter((note) => note.tag === tag);
      const progress = related.length ? Math.round(related.reduce((sum, note) => sum + note.mastery, 0) / related.length) : 0;
      return { name: tag, progress };
    });

    els.topicsList.innerHTML = topics.map((topic) => `
      <div>
        <div class="topic-row"><span>${esc(topic.name)}</span><span>${topic.progress}%</span></div>
        <div class="topic-bar"><div class="topic-fill" style="width:${topic.progress}%"></div></div>
      </div>
    `).join('');
  }

  function priorityText(note) {
    if (note.important) return 'Quan trọng';
    if (note.review) return 'Cần ôn';
    return 'Đã lưu';
  }

  function noteCard(note, reviewMode = false) {
    return `
      <article class="note-card">
        <div class="note-top">
          <div class="min-zero">
            <div class="note-title-row">
              <h4 class="note-title">${esc(note.title)}</h4>
              <span class="tag-pill">${esc(note.tag)}</span>
            </div>
            <p class="note-time">${esc(note.timeLabel)}</p>
          </div>
          <span class="priority-pill">${esc(priorityText(note))}</span>
        </div>
        <p class="note-preview">${esc(note.preview)}</p>
        <div class="mastery-row spread-row">
          <span>Mastery</span>
          <span>${note.mastery}%</span>
        </div>
        <div class="mastery-bar"><div class="mastery-fill" style="width:${note.mastery}%"></div></div>
        <div class="note-actions">
          <div class="action-group">
            <button class="mini-action" data-open-id="${esc(note.id)}">Mở lại</button>
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

  function renderNotes() {
    const notes = filteredNotes();
    els.recentNotesList.innerHTML = notes.map((note) => noteCard(note)).join('');
    els.emptyState.classList.toggle('hidden', notes.length > 0);
  }

  function renderTasks() {
    els.tasksList.innerHTML = data.tasks.map((task) => `
      <label class="task-item">
        <input type="checkbox" data-task-id="${esc(task.id)}" ${task.done ? 'checked' : ''} />
        <span>${esc(task.text)}</span>
      </label>
    `).join('');
  }

  function renderInsight() {
    const reviewCount = data.notes.filter((note) => note.review).length;
    const weakest = [...data.notes].sort((a, b) => a.mastery - b.mastery)[0];
    if (!weakest) {
      els.insightText.textContent = 'Bắt đầu tạo note đầu tiên để hệ thống gợi ý tối ưu học tập.';
      return;
    }
    els.insightText.textContent = `Hiện tại bạn có ${reviewCount} note cần ôn. Chủ đề yếu nhất đang là ${weakest.tag} với note “${weakest.title}”. Nên dành 20–25 phút để ôn lại nhóm note mastery thấp trước khi thêm note mới.`;
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
          <button class="link-btn" data-restore-id="${esc(backup.id)}">Khôi phục</button>
        </div>
      `).join('')
      : `<div class="empty-mini">Chưa có backup nào.</div>`;
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

  function render() {
    fillTagSelects();
    renderOverview();
    renderReviewQueue();
    renderTopics();
    renderNotes();
    renderTasks();
    renderInsight();
    renderBackups();
    renderVisibility();
  }

  async function persist(message) {
    data = await store.saveData(data);
    render();
    if (message) showToast(message);
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
  $('openSearchBtn').addEventListener('click', () => els.searchInput.focus());
  $('openComposerBtn').addEventListener('click', () => els.quickTitle.focus());
  $('saveQuickBtn').addEventListener('click', () => saveQuickNote(false));
  $('pinQuickBtn').addEventListener('click', () => saveQuickNote(true));

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
    data = await store.restoreBackup(latest.id);
    render();
    showToast('Đã khôi phục backup mới nhất');
  });

  $('exportDataBtn').addEventListener('click', async () => {
    await store.exportCurrentData();
    showToast('Đã xuất dữ liệu');
  });

  $('restoreSeedBtn').addEventListener('click', async () => {
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

  document.body.addEventListener('click', async (event) => {
    const target = event.target;
    if (target.dataset.close === 'modal') {
      closeEditor();
      return;
    }
    if (target.dataset.openId || target.dataset.editId) {
      openEditor(target.dataset.openId || target.dataset.editId);
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
      data.notes = data.notes.filter((item) => item.id !== target.dataset.deleteId);
      await persist('Đã xóa note');
      return;
    }
    if (target.dataset.reviewId) {
      const note = data.notes.find((item) => item.id === target.dataset.reviewId);
      if (!note) return;
      note.mastery = Math.min(100, note.mastery + 10);
      note.review = note.status === 'Cần ôn' || note.mastery < 65;
      note.updatedAt = Date.now();
      note.timeLabel = store.timeLabel(note.updatedAt);
      await persist('Đã ôn note');
      return;
    }
    if (target.dataset.restoreId) {
      data = await store.restoreBackup(target.dataset.restoreId);
      render();
      showToast('Đã khôi phục backup');
    }
  });

  els.tasksList.addEventListener('change', async (event) => {
    const taskId = event.target.dataset.taskId;
    if (!taskId) return;
    const task = data.tasks.find((item) => item.id === taskId);
    if (!task) return;
    task.done = event.target.checked;
    await persist('Đã cập nhật checklist');
  });

  render();
})();
