(async () => {
  const store = window.StudyStore;
  let data = await store.ensureData();
  let activeNav = 'dashboard';
  let activeChip = 'all';
  let reviewFilter = 'all';
  let reviewTag = 'all';
  let editingId = null;
  let viewingId = null;
  let compactView = false;
  let notesTag = 'all';
  let notesStatus = 'all';
  let editorFocusMode = false;
  let draftCache = null;
  let draftTimer = null;
  let suspendDraftAutosave = false;

  const $ = (id) => document.getElementById(id);
  const els = {
    overviewGrid: $('overviewGrid'),
    todayFocusCard: $('todayFocusCard'),
    reviewQueueList: $('reviewQueueList'),
    topicsList: $('topicsList'),
    topicCountPill: $('topicCountPill'),
    recentNotesList: $('recentNotesList'),
    notesSummaryGrid: $('notesSummaryGrid'),
    notesTagFilter: $('notesTagFilter'),
    notesStatusFilter: $('notesStatusFilter'),
    resetNotesFiltersBtn: $('resetNotesFiltersBtn'),
    pinnedNotesWrap: $('pinnedNotesWrap'),
    pinnedNotesList: $('pinnedNotesList'),
    pinnedMetaPill: $('pinnedMetaPill'),
    weakNotesWrap: $('weakNotesWrap'),
    weakNotesList: $('weakNotesList'),
    weakMetaPill: $('weakMetaPill'),
    notesMetaText: $('notesMetaText'),
    tasksList: $('tasksList'),
    taskProgressPill: $('taskProgressPill'),
    newTaskInput: $('newTaskInput'),
    addTaskBtn: $('addTaskBtn'),
    insightText: $('insightText'),
    reviewPanelList: $('reviewPanelList'),
    reviewOverview: $('reviewOverview'),
    reviewMetaText: $('reviewMetaText'),
    reviewTagFilter: $('reviewTagFilter'),
    reviewSortSelect: $('reviewSortSelect'),
    resetReviewFiltersBtn: $('resetReviewFiltersBtn'),
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
    editorHeading: $('editorHeading'),
    editorStatusText: $('editorStatusText'),
    editorDraftInfo: $('editorDraftInfo'),
    restoreDraftBtn: $('restoreDraftBtn'),
    discardDraftBtn: $('discardDraftBtn'),
    editorFocusBtn: $('editorFocusBtn'),
    clearEditorBtn: $('clearEditorBtn'),
    markdownPreview: $('markdownPreview'),
    previewMeta: $('previewMeta'),
    historyList: $('historyList'),
    historyMeta: $('historyMeta'),
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


  function formatTime(ts) {
    return new Date(ts).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function applyInlineMarkdown(text) {
    return String(text || '')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }

  function renderMarkdown(source) {
    const input = String(source || '').replace(/\r\n/g, '\n');
    if (!input.trim()) return '<p class="md-empty">Chưa có nội dung để preview.</p>';

    const fences = [];
    let tokenized = input.replace(/```([\w-]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const token = `@@CODE_${fences.length}@@`;
      fences.push(`<pre class="md-pre"><div class="md-pre-head">${esc(lang || 'code')}</div><code>${esc(code.trim())}</code></pre>`);
      return token;
    });

    tokenized = esc(tokenized);
    const blocks = tokenized.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
    const html = blocks.map((block) => {
      const codeMatch = block.match(/^@@CODE_(\d+)@@$/);
      if (codeMatch) return fences[Number(codeMatch[1])] || '';

      const lines = block.split('\n');
      if (lines.every((line) => /^[-*+] \[[ xX]\] /.test(line))) {
        return `<ul class="md-list checklist">${lines.map((line) => {
          const checked = /\[[xX]\]/.test(line);
          const content = applyInlineMarkdown(line.replace(/^[-*+] \[[ xX]\] /, ''));
          return `<li class="${checked ? 'checked' : ''}"><span class="check-dot">${checked ? '✓' : ''}</span><span>${content}</span></li>`;
        }).join('')}</ul>`;
      }
      if (lines.every((line) => /^[-*+] /.test(line))) {
        return `<ul class="md-list">${lines.map((line) => `<li>${applyInlineMarkdown(line.replace(/^[-*+] /, ''))}</li>`).join('')}</ul>`;
      }
      if (lines.every((line) => /^> /.test(line))) {
        return `<blockquote class="md-quote">${lines.map((line) => applyInlineMarkdown(line.replace(/^> /, ''))).join('<br />')}</blockquote>`;
      }
      if (/^###\s+/.test(block)) return `<h3>${applyInlineMarkdown(block.replace(/^###\s+/, ''))}</h3>`;
      if (/^##\s+/.test(block)) return `<h2>${applyInlineMarkdown(block.replace(/^##\s+/, ''))}</h2>`;
      if (/^#\s+/.test(block)) return `<h1>${applyInlineMarkdown(block.replace(/^#\s+/, ''))}</h1>`;
      return `<p>${lines.map((line) => applyInlineMarkdown(line)).join('<br />')}</p>`;
    }).join('');

    return html.replace(/@@CODE_(\d+)@@/g, (_, index) => fences[Number(index)] || '');
  }

  function editorTargetId() {
    return editingId || 'new';
  }

  function currentEditorPayload() {
    return {
      noteId: editorTargetId(),
      title: els.editTitle.value.trim(),
      tag: els.editTag.value,
      status: els.editStatus.value,
      mastery: els.editMastery.value,
      preview: els.editContent.value,
      pinned: els.editPinned.checked,
      important: els.editImportant.checked
    };
  }

  function setEditorStatus(message) {
    els.editorStatusText.textContent = message;
  }

  function setDraftInfo(message) {
    els.editorDraftInfo.textContent = message;
  }

  function editorHasContent(payload = currentEditorPayload()) {
    return Boolean(payload.title.trim() || payload.preview.trim());
  }

  function applyEditorState(payload = {}) {
    suspendDraftAutosave = true;
    els.editTitle.value = payload.title || '';
    if (payload.tag) els.editTag.value = payload.tag;
    els.editStatus.value = payload.status || 'Đang học';
    els.editMastery.value = payload.mastery ?? 60;
    els.editContent.value = payload.preview || '';
    els.editPinned.checked = !!payload.pinned;
    els.editImportant.checked = !!payload.important;
    suspendDraftAutosave = false;
    updateEditorPreview();
  }

  function updateEditorPreview() {
    const payload = currentEditorPayload();
    const content = payload.preview.trim();
    els.markdownPreview.innerHTML = renderMarkdown(content || payload.title || '');
    const length = content.length;
    els.previewMeta.textContent = `${length} ký tự · ${Math.max(1, Math.ceil(length / 420))} phút đọc`;
  }

  async function saveEditorDraft(force = false) {
    if (suspendDraftAutosave) return;
    const payload = currentEditorPayload();
    if (!force && !editorHasContent(payload)) return;
    if (!editorHasContent(payload)) {
      draftCache = null;
      await store.clearDraft();
      setDraftInfo('Chưa có bản nháp.');
      setEditorStatus('Editor trống.');
      return;
    }
    draftCache = await store.saveDraft(payload);
    setDraftInfo(`Bản nháp cục bộ · ${formatTime(draftCache.updatedAt)}`);
    setEditorStatus(`Đã autosave · ${formatTime(draftCache.updatedAt)}`);
  }

  function scheduleDraftSave() {
    if (suspendDraftAutosave) return;
    setEditorStatus('Đang autosave...');
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      saveEditorDraft(false).catch((error) => console.error(error));
    }, 420);
  }

  async function refreshDraftCache() {
    draftCache = await store.getDraft();
    if (!draftCache) {
      setDraftInfo('Chưa có bản nháp.');
      return null;
    }
    setDraftInfo(`Có bản nháp · ${formatTime(draftCache.updatedAt)}`);
    return draftCache;
  }

  function renderHistoryList(note) {
    const history = Array.isArray(note?.history) ? note.history : [];
    els.historyMeta.textContent = `${history.length} phiên bản`;
    if (!history.length) {
      els.historyList.innerHTML = '<div class="empty-mini">Chưa có revision nào. Lưu note ít nhất 1 lần để tạo lịch sử chỉnh sửa.</div>';
      return;
    }
    els.historyList.innerHTML = history.map((item, index) => `
      <div class="history-item">
        <div class="history-copy">
          <p class="history-title">${esc(item.label || `Revision ${index + 1}`)}</p>
          <p class="history-meta">${formatTime(item.updatedAt)} · ${esc(item.tag)} · ${item.mastery}%</p>
        </div>
        <button class="mini-btn" data-history-index="${index}">Khôi phục</button>
      </div>
    `).join('');
  }

  async function restoreDraftIntoEditor() {
    const draft = await refreshDraftCache();
    if (!draft) {
      showToast('Chưa có bản nháp để khôi phục');
      return;
    }
    if (draft.noteId !== editorTargetId()) {
      showToast('Bản nháp này thuộc note khác');
      return;
    }
    applyEditorState(draft);
    setEditorStatus(`Đã khôi phục nháp · ${formatTime(draft.updatedAt)}`);
  }

  async function clearEditorDraft(showMessage = true) {
    draftCache = null;
    await store.clearDraft();
    setDraftInfo('Chưa có bản nháp.');
    if (showMessage) setEditorStatus('Đã xóa bản nháp.');
  }

  function insertMarkdown(type) {
    const textarea = els.editContent;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selected = value.slice(start, end);
    const map = {
      h1: `# ${selected || 'Tiêu đề lớn'}`,
      h2: `## ${selected || 'Tiêu đề nhỏ'}`,
      bullet: `- ${selected || 'Ý chính'}`,
      check: `- [ ] ${selected || 'Việc cần làm'}`,
      quote: `> ${selected || 'Ghi chú quan trọng'}`,
      code: `
\`\`\`js
${selected || '// code của bạn'}
\`\`\`
`,
      inline: `\`${selected || 'code'}\``
    };
    const snippet = map[type] || selected;
    textarea.value = `${value.slice(0, start)}${snippet}${value.slice(end)}`;
    const cursor = start + snippet.length;
    textarea.focus();
    textarea.setSelectionRange(cursor, cursor);
    updateEditorPreview();
    scheduleDraftSave();
  }

  function weakNote() {
    return [...data.notes].sort((a, b) => a.mastery - b.mastery)[0] || null;
  }

  function reviewNotes() {
    return [...data.notes].filter((note) => note.review).sort((a, b) => a.mastery - b.mastery || b.updatedAt - a.updatedAt);
  }

  function reviewBucket(note) {
    if (note.mastery < 35 || (note.important && note.mastery < 60)) return 'urgent';
    if (note.mastery < 50) return 'today';
    if (note.pinned) return 'pinned';
    return 'progressing';
  }

  function filteredReviewNotes() {
    let notes = reviewNotes();
    const search = els.searchInput.value.trim().toLowerCase();
    if (search) {
      notes = notes.filter((note) => [note.title, note.tag, note.preview].join(' ').toLowerCase().includes(search));
    }
    if (reviewFilter !== 'all') {
      notes = notes.filter((note) => reviewBucket(note) === reviewFilter);
    }
    if (reviewTag !== 'all') {
      notes = notes.filter((note) => note.tag === reviewTag);
    }

    switch (els.reviewSortSelect.value) {
      case 'masteryHigh':
        notes.sort((a, b) => b.mastery - a.mastery || b.updatedAt - a.updatedAt);
        break;
      case 'newest':
        notes.sort((a, b) => b.updatedAt - a.updatedAt);
        break;
      case 'tagAZ':
        notes.sort((a, b) => a.tag.localeCompare(b.tag, 'vi') || a.mastery - b.mastery);
        break;
      default:
        notes.sort((a, b) => a.mastery - b.mastery || b.updatedAt - a.updatedAt);
    }
    return notes;
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
    const reviewPrev = reviewTag;
    els.reviewTagFilter.innerHTML = `<option value="all">Tất cả tag</option>${html}`;
    if (reviewPrev === 'all' || !tags.includes(reviewPrev)) {
      els.reviewTagFilter.value = 'all';
      reviewTag = 'all';
    } else {
      els.reviewTagFilter.value = reviewPrev;
    }
    const notesPrev = notesTag;
    els.notesTagFilter.innerHTML = `<option value="all">Tất cả tag</option>${html}`;
    if (notesPrev === 'all' || !tags.includes(notesPrev)) {
      els.notesTagFilter.value = 'all';
      notesTag = 'all';
    } else {
      els.notesTagFilter.value = notesPrev;
    }
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
    if (notesTag !== 'all') notes = notes.filter((note) => note.tag === notesTag);
    if (notesStatus !== 'all') notes = notes.filter((note) => note.status === notesStatus);

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


  function noteMiniCard(note, label = '') {
    return `
      <div class="queue-item compact">
        <div class="queue-rank mini">${label ? esc(label) : '•'}</div>
        <div class="queue-body">
          <p class="queue-title">${esc(note.title)}</p>
          <p class="queue-sub">${esc(note.tag)} · Mastery ${note.mastery}% · ${esc(note.timeLabel)}</p>
        </div>
        <div class="inline-actions">
          <button class="link-btn" data-view-id="${esc(note.id)}">Mở</button>
          <button class="link-btn muted-link" data-edit-id="${esc(note.id)}">Sửa</button>
        </div>
      </div>
    `;
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
            <button class="mini-action muted" data-duplicate-id="${esc(note.id)}">Nhân bản</button>
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

    const allReview = reviewNotes();
    const reviewList = filteredReviewNotes();
    const overviewItems = [
      { label: 'Khẩn cấp', value: allReview.filter((note) => reviewBucket(note) === 'urgent').length, hint: 'Mastery thấp hoặc quan trọng' },
      { label: 'Hôm nay', value: allReview.filter((note) => reviewBucket(note) === 'today').length, hint: 'Nên ôn trong ngày' },
      { label: 'Đang tiến bộ', value: allReview.filter((note) => reviewBucket(note) === 'progressing').length, hint: 'Đã nhích lên nhưng chưa chắc' },
      { label: 'Đã ghim', value: allReview.filter((note) => note.pinned && note.review).length, hint: 'Ưu tiên vì bạn tự ghim' }
    ];
    els.reviewOverview.innerHTML = overviewItems.map((item) => `
      <div class="overview-card review-mini-card">
        <p class="overview-label">${esc(item.label)}</p>
        <div class="overview-row">
          <p class="overview-value">${esc(item.value)}</p>
          <div class="overview-dot">•</div>
        </div>
        <p class="overview-hint">${esc(item.hint)}</p>
      </div>
    `).join('');

    document.querySelectorAll('[data-review-filter]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.reviewFilter === reviewFilter);
    });
    els.reviewMetaText.textContent = `${reviewList.length} note đang hiển thị trong Review · bộ lọc ${reviewFilter === 'all' ? 'Tất cả' : reviewFilter} · tag ${reviewTag === 'all' ? 'Tất cả' : reviewTag}`;
    els.reviewPanelList.innerHTML = reviewList.length
      ? reviewList.map((note) => noteCard(note, { reviewMode: true })).join('')
      : `<div class="empty-mini">Không có note phù hợp với bộ lọc review hiện tại.</div>`;
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
    const pinnedNotes = notes.filter((note) => note.pinned).slice(0, compactView ? 2 : 3);
    const weakNotes = [...notes].sort((a, b) => a.mastery - b.mastery || b.updatedAt - a.updatedAt).slice(0, compactView ? 2 : 3);
    const avgMastery = notes.length ? Math.round(notes.reduce((sum, note) => sum + note.mastery, 0) / notes.length) : 0;
    const reviewCount = notes.filter((note) => note.review).length;
    const importantCount = notes.filter((note) => note.important).length;
    const summaryCards = [
      { label: 'Đang hiển thị', value: notes.length, hint: notesTag === 'all' ? 'mọi tag' : notesTag },
      { label: 'Mastery TB', value: `${avgMastery}%`, hint: notesStatus === 'all' ? 'mọi trạng thái' : notesStatus },
      { label: 'Cần ôn', value: reviewCount, hint: 'lọc riêng cho Notes' },
      { label: 'Quan trọng', value: importantCount, hint: `${pinnedNotes.length} note đang ghim` }
    ];
    els.notesSummaryGrid.innerHTML = summaryCards.map((item) => `
      <div class="overview-card review-mini-card">
        <p class="overview-label">${esc(item.label)}</p>
        <div class="overview-row">
          <p class="overview-value">${esc(item.value)}</p>
          <div class="overview-dot">•</div>
        </div>
        <p class="overview-hint">${esc(item.hint)}</p>
      </div>
    `).join('');

    els.pinnedMetaPill.textContent = `${pinnedNotes.length} note`;
    els.weakMetaPill.textContent = `${weakNotes.length} note`;
    els.pinnedNotesWrap.classList.toggle('hidden', pinnedNotes.length === 0);
    els.weakNotesWrap.classList.toggle('hidden', weakNotes.length === 0);
    els.pinnedNotesList.innerHTML = pinnedNotes.map((note, idx) => noteMiniCard(note, String(idx + 1))).join('');
    els.weakNotesList.innerHTML = weakNotes.map((note, idx) => noteMiniCard(note, String(idx + 1))).join('');

    els.recentNotesList.innerHTML = notes.map((note) => noteCard(note)).join('');
    const chipText = activeChip === 'all' ? 'Tất cả' : activeChip === 'review' ? 'Cần ôn' : activeChip === 'pinned' ? 'Đã ghim' : 'Quan trọng';
    els.notesMetaText.textContent = `${notes.length} note đang hiển thị · chip ${chipText} · tag ${notesTag === 'all' ? 'Tất cả' : notesTag} · trạng thái ${notesStatus === 'all' ? 'Tất cả' : notesStatus} · chế độ ${compactView ? 'compact' : 'đầy đủ'}`;
    els.emptyState.classList.toggle('hidden', notes.length > 0);
    els.clearSearchBtn.classList.toggle('hidden', !els.searchInput.value.trim());
    els.toggleViewBtn.textContent = compactView ? 'Đầy đủ' : 'Compact';
    els.reviewSortSelect.value = els.reviewSortSelect.value || 'masteryLow';
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
    document.querySelectorAll('[data-chip]').forEach((btn) => {
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
    els.viewBody.innerHTML = renderMarkdown(note.preview);
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

  async function openEditor(noteId = null) {
    editingId = noteId || null;
    const note = editingId ? data.notes.find((item) => item.id === editingId) : null;
    els.editorHeading.textContent = note ? 'Sửa note với Editor Pro' : 'Tạo note mới với Editor Pro';
    applyEditorState(note || {
      title: '',
      tag: els.quickTag.value || els.editTag.value || data.tags[0],
      status: 'Đang học',
      mastery: 60,
      preview: '',
      pinned: false,
      important: false
    });
    renderHistoryList(note);
    await refreshDraftCache();
    if (draftCache && draftCache.noteId === editorTargetId()) {
      applyEditorState(draftCache);
      setEditorStatus(`Đã nạp bản nháp · ${formatTime(draftCache.updatedAt)}`);
    } else {
      setEditorStatus(note ? 'Autosave sẽ tạo revision cục bộ khi bạn bắt đầu sửa.' : 'Bắt đầu gõ để autosave bản nháp mới.');
    }
    editorFocusMode = false;
    els.editorModal.classList.remove('editor-focus-mode');
    els.editorFocusBtn.textContent = 'Focus';
    els.editorModal.classList.remove('hidden');
  }

  function closeEditor() {
    editingId = null;
    clearTimeout(draftTimer);
    els.editorModal.classList.add('hidden');
    els.editorModal.classList.remove('editor-focus-mode');
    editorFocusMode = false;
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
    note.history = [];
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

  document.querySelectorAll('[data-review-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      reviewFilter = button.dataset.reviewFilter;
      renderReviewQueue();
    });
  });

  els.reviewTagFilter.addEventListener('change', () => {
    reviewTag = els.reviewTagFilter.value;
    renderReviewQueue();
  });

  els.notesTagFilter.addEventListener('change', () => {
    notesTag = els.notesTagFilter.value;
    renderNotes();
  });

  els.notesStatusFilter.addEventListener('change', () => {
    notesStatus = els.notesStatusFilter.value;
    renderNotes();
  });

  els.reviewSortSelect.addEventListener('change', () => {
    renderReviewQueue();
  });

  els.resetReviewFiltersBtn.addEventListener('click', () => {
    reviewFilter = 'all';
    reviewTag = 'all';
    els.reviewTagFilter.value = 'all';
    els.reviewSortSelect.value = 'masteryLow';
    renderReviewQueue();
    showToast('Đã đặt lại bộ lọc review');
  });

  document.querySelectorAll('[data-nav]').forEach((button) => {
    button.addEventListener('click', () => {
      activeNav = button.dataset.nav;
      renderVisibility();
    });
  });

  els.searchInput.addEventListener('input', () => { renderNotes(); renderReviewQueue(); });
  els.sortSelect.addEventListener('change', renderNotes);
  els.clearSearchBtn.addEventListener('click', () => {
    els.searchInput.value = '';
    renderNotes();
    renderReviewQueue();
    els.searchInput.focus();
  });
  els.toggleViewBtn.addEventListener('click', () => {
    compactView = !compactView;
    renderNotes();
  });
  els.resetNotesFiltersBtn.addEventListener('click', () => {
    notesTag = 'all';
    notesStatus = 'all';
    els.notesTagFilter.value = 'all';
    els.notesStatusFilter.value = 'all';
    els.sortSelect.value = 'newest';
    renderNotes();
    showToast('Đã đặt lại bộ lọc Notes');
  });
  $('openSearchBtn').addEventListener('click', () => els.searchInput.focus());
  $('openComposerBtn').addEventListener('click', () => { void openEditor(); });
  $('saveQuickBtn').addEventListener('click', () => saveQuickNote(false));
  $('pinQuickBtn').addEventListener('click', () => saveQuickNote(true));
  els.quickContent.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') saveQuickNote(false);
  });

  [els.editTitle, els.editTag, els.editStatus, els.editMastery, els.editContent, els.editPinned, els.editImportant].forEach((input) => {
    const evt = input.tagName === 'SELECT' || input.type === 'checkbox' ? 'change' : 'input';
    input.addEventListener(evt, () => {
      updateEditorPreview();
      scheduleDraftSave();
    });
  });

  document.querySelectorAll('[data-md]').forEach((button) => {
    button.addEventListener('click', () => insertMarkdown(button.dataset.md));
  });

  els.restoreDraftBtn.addEventListener('click', () => { void restoreDraftIntoEditor(); });
  els.discardDraftBtn.addEventListener('click', () => { void clearEditorDraft(); });
  els.clearEditorBtn.addEventListener('click', () => {
    applyEditorState({
      title: '',
      tag: els.editTag.value || data.tags[0],
      status: 'Đang học',
      mastery: 60,
      preview: '',
      pinned: false,
      important: false
    });
    setEditorStatus('Đã làm sạch editor.');
    scheduleDraftSave();
  });
  els.editorFocusBtn.addEventListener('click', () => {
    editorFocusMode = !editorFocusMode;
    els.editorModal.classList.toggle('editor-focus-mode', editorFocusMode);
    els.editorFocusBtn.textContent = editorFocusMode ? 'Thoát focus' : 'Focus';
  });
  els.addTaskBtn.addEventListener('click', addTask);
  els.newTaskInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') addTask();
  });

  $('saveEditBtn').addEventListener('click', async () => {
    const payload = currentEditorPayload();
    const isEditMode = Boolean(editingId);
    if (!payload.title.trim() || !payload.preview.trim()) {
      showToast('Nhập tiêu đề và nội dung note');
      return;
    }
    if (editingId) {
      const note = data.notes.find((item) => item.id === editingId);
      if (!note) return;
      store.pushHistory(note, 'Before save');
      note.title = payload.title;
      note.tag = payload.tag;
      note.status = payload.status;
      note.mastery = Math.max(0, Math.min(100, Number(payload.mastery) || 0));
      note.preview = payload.preview.trim();
      note.pinned = payload.pinned;
      note.important = payload.important;
      note.review = note.status === 'Cần ôn' || note.mastery < 65;
      note.updatedAt = Date.now();
      note.timeLabel = store.timeLabel(note.updatedAt);
      if (!Array.isArray(note.history)) note.history = [];
    } else {
      const note = store.makeNote(payload);
      note.history = [];
      data.notes.unshift(note);
      editingId = note.id;
    }
    if (!data.tags.includes(payload.tag)) data.tags.push(payload.tag);
    await clearEditorDraft(false);
    closeEditor();
    await persist(isEditMode ? 'Đã lưu note trong Editor Pro' : 'Đã tạo note mới trong Editor Pro');
  });

  $('bulkReviewBtn').addEventListener('click', async () => {
    const targets = new Set(filteredReviewNotes().map((note) => note.id));
    data.notes.forEach((note) => {
      if (targets.has(note.id)) {
        note.mastery = Math.min(100, note.mastery + 10);
        note.review = note.status === 'Cần ôn' || note.mastery < 65;
        note.updatedAt = Date.now();
        note.timeLabel = store.timeLabel(note.updatedAt);
      }
    });
    await persist('Đã ôn nhóm review hiện tại');
  });

  $('bulkCompleteBtn').addEventListener('click', async () => {
    const targets = new Set(filteredReviewNotes().map((note) => note.id));
    data.notes.forEach((note) => {
      if (targets.has(note.id) && note.review && note.mastery >= 55) {
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
    void openEditor(id);
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
      void openEditor(target.dataset.editId);
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
    if (target.dataset.historyIndex) {
      const note = data.notes.find((item) => item.id === editingId);
      const entry = note?.history?.[Number(target.dataset.historyIndex)];
      if (!entry) return;
      applyEditorState(entry);
      setEditorStatus(`Đã nạp revision · ${formatTime(entry.updatedAt)}`);
      showToast('Đã nạp revision vào editor');
      return;
    }
    if (target.dataset.duplicateId) {
      const source = data.notes.find((item) => item.id === target.dataset.duplicateId);
      if (!source) return;
      const copy = store.makeNote({
        title: `${source.title} (copy)`,
        tag: source.tag,
        preview: source.preview,
        status: source.status,
        mastery: source.mastery,
        pinned: false,
        important: source.important
      });
      copy.review = source.review;
      copy.history = Array.isArray(source.history) ? source.history.slice(0, 5) : [];
      data.notes.unshift(copy);
      await persist('Đã nhân bản note');
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

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      els.searchInput.focus();
      els.searchInput.select();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r') {
      event.preventDefault();
      activeNav = 'review';
      renderVisibility();
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'e') {
      event.preventDefault();
      void openEditor(editingId);
    }
  });

  render();
})();
