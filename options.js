(async () => {
  const store = window.StudyStore;
  if (!store?.ensureData) {
    console.error('StudyStore chưa được nạp trong options page.');
    return;
  }
  let data = await store.ensureData();
  let activeNav = 'dashboard';
  let activeChip = 'all';
  let reviewFilter = 'all';
  let reviewSubject = 'all';
  let reviewTag = 'all';
  let reviewKind = 'all';
  let notesSubject = 'all';
  let notesTag = 'all';
  let notesKind = 'all';
  let notesStatus = 'all';
  let editingId = null;
  let viewingId = null;
  let compactView = false;
  let sprintNoteId = null;
  let sprintReveal = false;
  let editorFocusMode = false;
  let draftCache = null;
  let draftTimer = null;
  let suspendDraftAutosave = false;

  let lastNav = activeNav;

  const $ = (id) => document.getElementById(id);
  const els = {
    overviewGrid: $('overviewGrid'),
    todayFocusCard: $('todayFocusCard'),
    reviewQueueList: $('reviewQueueList'),
    topicsList: $('topicsList'),
    topicCountPill: $('topicCountPill'),
    notesSummaryGrid: $('notesSummaryGrid'),
    recentNotesList: $('recentNotesList'),
    notesMetaText: $('notesMetaText'),
    notesSubjectFilter: $('notesSubjectFilter'),
    notesTagFilter: $('notesTagFilter'),
    notesKindFilter: $('notesKindFilter'),
    notesStatusFilter: $('notesStatusFilter'),
    sortSelect: $('sortSelect'),
    resetNotesFiltersBtn: $('resetNotesFiltersBtn'),
    pinnedNotesWrap: $('pinnedNotesWrap'),
    pinnedNotesList: $('pinnedNotesList'),
    pinnedMetaPill: $('pinnedMetaPill'),
    weakNotesWrap: $('weakNotesWrap'),
    weakNotesList: $('weakNotesList'),
    weakMetaPill: $('weakMetaPill'),
    emptyState: $('emptyState'),
    toggleViewBtn: $('toggleViewBtn'),
    quickTitle: $('quickTitle'),
    quickSubject: $('quickSubject'),
    quickTag: $('quickTag'),
    quickChapter: $('quickChapter'),
    quickKind: $('quickKind'),
    quickStatus: $('quickStatus'),
    quickMastery: $('quickMastery'),
    quickSource: $('quickSource'),
    quickContent: $('quickContent'),
    quickAnswer: $('quickAnswer'),
    saveQuickBtn: $('saveQuickBtn'),
    pinQuickBtn: $('pinQuickBtn'),
    studySprintCard: $('studySprintCard'),
    sprintMetaPill: $('sprintMetaPill'),
    sprintQuestionTitle: $('sprintQuestionTitle'),
    sprintQuestionBody: $('sprintQuestionBody'),
    sprintAnswerWrap: $('sprintAnswerWrap'),
    sprintAnswerBody: $('sprintAnswerBody'),
    revealSprintBtn: $('revealSprintBtn'),
    rememberSprintBtn: $('rememberSprintBtn'),
    forgetSprintBtn: $('forgetSprintBtn'),
    tasksList: $('tasksList'),
    taskProgressPill: $('taskProgressPill'),
    newTaskInput: $('newTaskInput'),
    addTaskBtn: $('addTaskBtn'),
    insightText: $('insightText'),
    reviewPanel: $('reviewPanel'),
    reviewOverview: $('reviewOverview'),
    reviewPanelList: $('reviewPanelList'),
    reviewMetaText: $('reviewMetaText'),
    reviewSubjectFilter: $('reviewSubjectFilter'),
    reviewTagFilter: $('reviewTagFilter'),
    reviewKindFilter: $('reviewKindFilter'),
    reviewSortSelect: $('reviewSortSelect'),
    resetReviewFiltersBtn: $('resetReviewFiltersBtn'),
    bulkReviewBtn: $('bulkReviewBtn'),
    bulkCompleteBtn: $('bulkCompleteBtn'),
    settingsPanel: $('settingsPanel'),
    backupList: $('backupList'),
    backupStatus: $('backupStatus'),
    storageOverview: $('storageOverview'),
    searchInput: $('searchInput'),
    clearSearchBtn: $('clearSearchBtn'),
    openSearchBtn: $('openSearchBtn'),
    openComposerBtn: $('openComposerBtn'),
    backupNowBtn: $('backupNowBtn'),
    restoreLatestBtn: $('restoreLatestBtn'),
    exportDataBtn: $('exportDataBtn'),
    restoreSeedBtn: $('restoreSeedBtn'),
    importFileInput: $('importFileInput'),
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
    editTitle: $('editTitle'),
    editSubject: $('editSubject'),
    editTag: $('editTag'),
    editChapter: $('editChapter'),
    editKind: $('editKind'),
    editStatus: $('editStatus'),
    editMastery: $('editMastery'),
    editSource: $('editSource'),
    editContent: $('editContent'),
    editAnswer: $('editAnswer'),
    editPinned: $('editPinned'),
    editImportant: $('editImportant'),
    markdownPreview: $('markdownPreview'),
    previewMeta: $('previewMeta'),
    historyList: $('historyList'),
    historyMeta: $('historyMeta'),
    saveEditBtn: $('saveEditBtn'),
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

  const TEMPLATE_MAP = {
    coding: {
      subject: 'Lập trình',
      tag: 'JavaScript',
      kind: 'code',
      source: 'Docs',
      title: 'Template lập trình',
      preview: '## Ý tưởng chính\n- \n\n## Code mẫu\n```js\n// code của bạn\n```\n\n## Lưu ý\n- ',
      answer: 'Tóm tắt điều kiện dùng, lỗi dễ gặp và cách sửa.'
    },
    math: {
      subject: 'Toán',
      tag: 'Math',
      kind: 'formula',
      source: 'Lecture',
      title: 'Template toán',
      preview: '## Công thức\n- \n\n## Ý nghĩa\n- \n\n## Ví dụ nhanh\n- ',
      answer: 'Ghi công thức cuối cùng hoặc kết luận ngắn.'
    },
    language: {
      subject: 'Ngoại ngữ',
      tag: 'English',
      kind: 'question',
      source: 'Self-study',
      title: 'Template ngoại ngữ',
      preview: '## Từ / cấu trúc\n- \n\n## Nghĩa\n- \n\n## Ví dụ\n- ',
      answer: 'Ghi nghĩa, cách dùng hoặc mẫu câu cần nhớ.'
    },
    theory: {
      subject: 'Lý thuyết',
      tag: 'Summary',
      kind: 'summary',
      source: 'Lecture',
      title: 'Template lý thuyết',
      preview: '## Ý chính\n- \n\n## Giải thích ngắn\n- \n\n## Điều dễ nhầm\n- ',
      answer: 'Viết 1–2 câu kết luận để ôn nhanh.'
    },
    mistake: {
      subject: 'Lập trình',
      tag: 'Git & Tools',
      kind: 'mistake',
      source: 'Practice',
      title: 'Template lỗi sai',
      preview: '## Lỗi gặp phải\n- \n\n## Nguyên nhân\n- \n\n## Cách sửa\n- ',
      answer: 'Tóm tắt dấu hiệu nhận biết và cách tránh lặp lại.'
    }
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
    if (!ts) return 'Chưa có';
    return new Date(ts).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function renderMarkdown(source) {
    const input = String(source || '').replace(/\r\n/g, '\n');
    if (!input.trim()) return '<p class="md-empty">Chưa có nội dung.</p>';

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
          const content = line.replace(/^[-*+] \[[ xX]\] /, '');
          return `<li class="${checked ? 'checked' : ''}"><span class="check-dot">${checked ? '✓' : ''}</span><span>${content}</span></li>`;
        }).join('')}</ul>`;
      }
      if (lines.every((line) => /^[-*+] /.test(line))) {
        return `<ul class="md-list">${lines.map((line) => `<li>${line.replace(/^[-*+] /, '')}</li>`).join('')}</ul>`;
      }
      if (lines.every((line) => /^> /.test(line))) {
        return `<blockquote class="md-quote">${lines.map((line) => line.replace(/^> /, '')).join('<br />')}</blockquote>`;
      }
      if (/^###\s+/.test(block)) return `<h3>${block.replace(/^###\s+/, '')}</h3>`;
      if (/^##\s+/.test(block)) return `<h2>${block.replace(/^##\s+/, '')}</h2>`;
      if (/^#\s+/.test(block)) return `<h1>${block.replace(/^#\s+/, '')}</h1>`;
      return `<p>${lines.join('<br />')}</p>`;
    }).join('');

    return html.replace(/@@CODE_(\d+)@@/g, (_, index) => fences[Number(index)] || '');
  }

  function subjects() {
    return [...new Set([...(store.DEFAULT_SUBJECTS || []), ...data.notes.map((note) => note.subject)].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
  }

  function tags() {
    return [...new Set([...(data.tags || []), ...data.notes.map((note) => note.tag)].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
  }

  function kinds() {
    return store.NOTE_KINDS || [];
  }

  function reviewNotes() {
    return [...data.notes].filter((note) => note.review || store.isDue(note)).sort((a, b) => {
      const aDue = noteDueValue(a);
      const bDue = noteDueValue(b);
      return aDue - bDue || a.mastery - b.mastery || b.updatedAt - a.updatedAt;
    });
  }

  function noteDueValue(note) {
    return typeof note.nextReviewAt === 'number' ? note.nextReviewAt : Number.MAX_SAFE_INTEGER;
  }

  function filteredReviewNotes() {
    let notes = reviewNotes();
    const search = els.searchInput.value.trim().toLowerCase();
    if (search) notes = notes.filter((note) => searchable(note).includes(search));
    if (reviewFilter !== 'all') notes = notes.filter((note) => reviewBucket(note) === reviewFilter);
    if (reviewSubject !== 'all') notes = notes.filter((note) => note.subject === reviewSubject);
    if (reviewTag !== 'all') notes = notes.filter((note) => note.tag === reviewTag);
    if (reviewKind !== 'all') notes = notes.filter((note) => note.kind === reviewKind);
    switch (els.reviewSortSelect.value) {
      case 'masteryHigh':
        notes.sort((a, b) => b.mastery - a.mastery || noteDueValue(a) - noteDueValue(b));
        break;
      case 'newest':
        notes.sort((a, b) => b.updatedAt - a.updatedAt);
        break;
      case 'tagAZ':
        notes.sort((a, b) => a.tag.localeCompare(b.tag, 'vi') || a.mastery - b.mastery);
        break;
      default:
        notes.sort((a, b) => a.mastery - b.mastery || noteDueValue(a) - noteDueValue(b));
    }
    return notes;
  }

  function filteredNotes() {
    const search = els.searchInput.value.trim().toLowerCase();
    let notes = [...data.notes];
    if (search) notes = notes.filter((note) => searchable(note).includes(search));
    if (activeChip === 'review') notes = notes.filter((note) => note.review || store.isDue(note));
    if (activeChip === 'pinned') notes = notes.filter((note) => note.pinned);
    if (activeChip === 'important') notes = notes.filter((note) => note.important);
    if (notesSubject !== 'all') notes = notes.filter((note) => note.subject === notesSubject);
    if (notesTag !== 'all') notes = notes.filter((note) => note.tag === notesTag);
    if (notesKind !== 'all') notes = notes.filter((note) => note.kind === notesKind);
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

  function searchable(note) {
    return [note.title, note.subject, note.chapter, note.tag, note.kind, note.source, note.answer, note.preview].join(' ').toLowerCase();
  }

  function reviewBucket(note) {
    if (note.mastery < 35 || store.isDue(note)) return 'urgent';
    if (note.mastery < 55) return 'today';
    return 'progressing';
  }

  function notePriorityText(note) {
    if (store.isDue(note)) return 'Đến hạn';
    if (note.important) return 'Quan trọng';
    if (note.review) return 'Cần ôn';
    return note.status;
  }

  function noteStateBadges(note) {
    const items = [
      `<span class="state-badge ${note.review || store.isDue(note) ? 'warn' : 'good'}">${esc(note.status)}</span>`,
      `<span class="state-badge info">${esc(store.kindLabel(note.kind))}</span>`
    ];
    if (note.subject) items.push(`<span class="state-badge">${esc(note.subject)}</span>`);
    if (note.chapter) items.push(`<span class="state-badge">${esc(note.chapter)}</span>`);
    if (note.pinned) items.push('<span class="state-badge info">Đã ghim</span>');
    if (note.important) items.push('<span class="state-badge warn">Quan trọng</span>');
    if (note.reviewCount) items.push(`<span class="state-badge">Ôn ${note.reviewCount} lần</span>`);
    return items.join('');
  }

  function noteMiniCard(note, label = '') {
    return `
      <div class="queue-item compact">
        <div class="queue-rank mini">${label ? esc(label) : '•'}</div>
        <div class="queue-body">
          <p class="queue-title">${esc(note.title)}</p>
          <p class="queue-sub">${esc(note.subject)} · ${esc(note.tag)} · ${esc(store.kindLabel(note.kind))} · ${esc(store.dueLabel(note.nextReviewAt))}</p>
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
            <p class="note-time">${esc(note.subject)}${note.chapter ? ` · ${esc(note.chapter)}` : ''} · ${esc(store.dueLabel(note.nextReviewAt))}</p>
          </div>
          <span class="priority-pill">${esc(notePriorityText(note))}</span>
        </div>
        <p class="note-preview">${esc(note.preview || note.answer || '')}</p>
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

  function subjectSummary() {
    const map = new Map();
    data.notes.forEach((note) => {
      if (!map.has(note.subject)) map.set(note.subject, []);
      map.get(note.subject).push(note);
    });
    return [...map.entries()].map(([name, items]) => ({
      name,
      count: items.length,
      avgMastery: Math.round(items.reduce((sum, note) => sum + note.mastery, 0) / items.length),
      due: items.filter((note) => note.review || store.isDue(note)).length,
      chapters: new Set(items.map((note) => note.chapter).filter(Boolean)).size,
      strongest: [...items].sort((a, b) => b.mastery - a.mastery)[0]?.title || ''
    })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi'));
  }

  function weakNote() {
    return [...data.notes].sort((a, b) => a.mastery - b.mastery || noteDueValue(a) - noteDueValue(b))[0] || null;
  }

  function renderOverview() {
    const total = data.notes.length;
    const due = data.notes.filter((note) => note.review || store.isDue(note)).length;
    const pinned = data.notes.filter((note) => note.pinned).length;
    const avgMastery = total ? Math.round(data.notes.reduce((sum, note) => sum + note.mastery, 0) / total) : 0;
    const items = [
      { label: 'Tổng note', value: total, hint: `${subjectSummary().length} môn đang học` },
      { label: 'Cần ôn', value: due, hint: `${data.notes.filter((note) => store.isDue(note)).length} note đến hạn` },
      { label: 'Đã ghim', value: pinned, hint: `${data.notes.filter((note) => note.important).length} note quan trọng` },
      { label: 'Mastery TB', value: `${avgMastery}%`, hint: 'độ chắc kiến thức hiện tại' }
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
    const reviewQueue = reviewNotes().slice(0, 3);
    const latestBackup = data.backups?.[0];
    const backupText = latestBackup ? new Date(latestBackup.createdAt).toLocaleDateString('vi-VN') : 'Chưa có';
    if (!weakest) {
      els.todayFocusCard.innerHTML = `
        <div class="hero-row">
          <div class="hero-copy">
            <p class="section-kicker accent">Today Focus</p>
            <h2 class="hero-title">Bắt đầu lưu note đầu tiên</h2>
            <p class="hero-text">Tạo note đầu tiên để dashboard bắt đầu tính toán review queue, tiến độ theo môn và Study Sprint.</p>
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
          <p class="hero-text">${esc(weakest.subject)}${weakest.chapter ? ` · ${esc(weakest.chapter)}` : ''} · ${esc(store.kindLabel(weakest.kind))}. Mastery hiện tại ${weakest.mastery}% và lịch ôn là ${esc(store.dueLabel(weakest.nextReviewAt))}.</p>
          <div class="hero-actions">
            <button class="btn btn-primary" data-focus-open="${esc(weakest.id)}">Mở note</button>
            <button class="btn" data-focus-review="${esc(weakest.id)}">Ôn +10</button>
          </div>
        </div>
        <div class="hero-statbox">
          <div class="hero-kpi"><span>Đến hạn</span><strong>${reviewNotes().length}</strong></div>
          <div class="hero-kpi"><span>Backup</span><strong>${esc(backupText)}</strong></div>
          <div class="hero-pill-list">
            ${reviewQueue.map((note) => `<span class="pill subtle-pill">${esc(note.tag)}</span>`).join('') || '<span class="pill subtle-pill">Chưa có hàng đợi</span>'}
          </div>
        </div>
      </div>`;
  }

  function renderReviewQueue() {
    const queue = reviewNotes().slice(0, 5);
    els.reviewQueueList.innerHTML = queue.length
      ? queue.map((note, index) => noteMiniCard(note, String(index + 1).padStart(2, '0'))).join('')
      : '<div class="empty-mini">Không có note cần ôn.</div>';

    const reviewList = filteredReviewNotes();
    const urgentCount = reviewList.filter((note) => reviewBucket(note) === 'urgent').length;
    const todayCount = reviewList.filter((note) => reviewBucket(note) === 'today').length;
    const progressingCount = reviewList.filter((note) => reviewBucket(note) === 'progressing').length;
    const avgStage = reviewList.length ? Math.round(reviewList.reduce((sum, note) => sum + (note.studyStage || 0), 0) / reviewList.length) : 0;

    const cards = [
      { label: 'Đang lọc', value: reviewList.length, hint: `${urgentCount} khẩn cấp` },
      { label: 'Hôm nay', value: todayCount, hint: `${progressingCount} đang tiến bộ` },
      { label: 'Stage TB', value: avgStage, hint: 'mức ôn lặp lại' },
      { label: 'Khẩn cấp', value: urgentCount, hint: 'nên ôn trước' }
    ];
    els.reviewOverview.innerHTML = cards.map((item) => `
      <div class="overview-card">
        <p class="overview-label">${esc(item.label)}</p>
        <div class="overview-row">
          <p class="overview-value">${esc(item.value)}</p>
          <div class="overview-dot">●</div>
        </div>
        <p class="overview-hint">${esc(item.hint)}</p>
      </div>
    `).join('');
    els.reviewMetaText.textContent = `${reviewList.length} note phù hợp bộ lọc review hiện tại.`;
    els.reviewPanelList.innerHTML = reviewList.length
      ? reviewList.map((note) => noteCard(note, { reviewMode: true })).join('')
      : '<div class="empty-mini">Không có note phù hợp bộ lọc review.</div>';
  }

  function renderTopics() {
    const items = subjectSummary();
    els.topicCountPill.textContent = `${items.length} môn`;
    els.topicsList.innerHTML = items.length ? items.map((item) => `
      <div class="topic-card">
        <div class="spread-row">
          <div>
            <p class="topic-title">${esc(item.name)}</p>
            <p class="topic-meta">${item.count} note · ${item.chapters} chương · ${item.due} cần ôn</p>
          </div>
          <span class="pill subtle-pill">${item.avgMastery}%</span>
        </div>
        <div class="mastery-bar"><div class="mastery-fill" style="width:${item.avgMastery}%"></div></div>
        <p class="topic-foot">Note chắc nhất: ${esc(item.strongest || 'Chưa có')}</p>
      </div>
    `).join('') : '<div class="empty-mini">Chưa có dữ liệu môn học.</div>';
  }

  function renderNotes() {
    const notes = filteredNotes();
    const pinned = notes.filter((note) => note.pinned).slice(0, 3);
    const weakest = [...notes].sort((a, b) => a.mastery - b.mastery).slice(0, 3);
    const uniqueChapters = new Set(notes.map((note) => note.chapter).filter(Boolean)).size;
    const cards = [
      { label: 'Đang xem', value: notes.length, hint: `${uniqueChapters} chương/bài` },
      { label: 'Đến hạn', value: notes.filter((note) => store.isDue(note)).length, hint: 'ưu tiên ôn trước' },
      { label: 'Câu hỏi', value: notes.filter((note) => note.kind === 'question').length, hint: 'hợp cho quiz nhanh' },
      { label: 'Công thức', value: notes.filter((note) => note.kind === 'formula').length, hint: 'nên ôn lặp lại' }
    ];
    els.notesSummaryGrid.innerHTML = cards.map((item) => `
      <div class="overview-card">
        <p class="overview-label">${esc(item.label)}</p>
        <div class="overview-row">
          <p class="overview-value">${esc(item.value)}</p>
          <div class="overview-dot">●</div>
        </div>
        <p class="overview-hint">${esc(item.hint)}</p>
      </div>
    `).join('');

    els.notesMetaText.textContent = `${notes.length} note khớp bộ lọc · ${data.notes.length} note tổng cộng.`;

    els.pinnedNotesWrap.classList.toggle('hidden', !pinned.length);
    els.weakNotesWrap.classList.toggle('hidden', !weakest.length);
    els.pinnedMetaPill.textContent = `${pinned.length} note`;
    els.weakMetaPill.textContent = `${weakest.length} note`;
    els.pinnedNotesList.innerHTML = pinned.map((note) => noteMiniCard(note)).join('');
    els.weakNotesList.innerHTML = weakest.map((note) => noteMiniCard(note)).join('');

    els.recentNotesList.innerHTML = notes.length ? notes.map((note) => noteCard(note)).join('') : '';
    els.emptyState.classList.toggle('hidden', Boolean(notes.length));
    els.clearSearchBtn.classList.toggle('hidden', !els.searchInput.value.trim());
    els.toggleViewBtn.textContent = compactView ? 'Expanded' : 'Compact';
  }

  function renderTasks() {
    const tasks = data.tasks || [];
    const done = tasks.filter((task) => task.done).length;
    els.taskProgressPill.textContent = `${done}/${tasks.length} hoàn thành`;
    els.tasksList.innerHTML = tasks.length
      ? tasks.map((task) => `
        <label class="task-card">
          <input type="checkbox" data-task-id="${esc(task.id)}" ${task.done ? 'checked' : ''} />
          <span>${esc(task.text)}</span>
          <button class="icon-action" type="button" data-task-delete="${esc(task.id)}">🗑</button>
        </label>
      `).join('')
      : '<div class="empty-mini">Chưa có mục tiêu hôm nay.</div>';
  }

  function renderInsight() {
    const review = reviewNotes();
    const topSubject = subjectSummary()[0];
    const weakest = weakNote();
    const line1 = review.length ? `Bạn đang có ${review.length} note cần ôn. Hãy xử lý nhóm đến hạn trước để không bị dồn backlog.` : 'Hiện chưa có note đến hạn. Đây là lúc tốt để tạo note mới hoặc củng cố note quan trọng.';
    const line2 = topSubject ? `Môn đang chiếm nhiều note nhất là ${topSubject.name} với ${topSubject.count} note và mastery trung bình ${topSubject.avgMastery}%.` : '';
    const line3 = weakest ? `Note yếu nhất hiện tại là “${weakest.title}” (${weakest.mastery}%). Nên đưa nó vào 1–2 vòng Study Sprint trước khi học thêm nội dung mới.` : '';
    els.insightText.textContent = [line1, line2, line3].filter(Boolean).join(' ');
  }

  function sprintQueue() {
    const due = reviewNotes();
    if (due.length) return due;
    return [...data.notes].sort((a, b) => a.mastery - b.mastery || b.updatedAt - a.updatedAt).slice(0, 10);
  }

  function sprintNote() {
    const queue = sprintQueue();
    if (!queue.length) return null;
    const existing = queue.find((note) => note.id === sprintNoteId);
    if (existing) return existing;
    sprintNoteId = queue[0].id;
    return queue[0];
  }

  function sprintQuestionFor(note) {
    const body = note.kind === 'question'
      ? (note.preview || 'Hãy tự trả lời câu hỏi này.')
      : (note.chapter ? `Nhắc lại kiến thức ở phần ${note.chapter}.` : 'Nhắc lại ý chính hoặc giải thích ngắn gọn.');
    return {
      title: note.kind === 'question' ? note.title : `Nhắc lại: ${note.title}`,
      body,
      answer: note.answer || note.preview || 'Chưa có đáp án/mặt sau riêng.'
    };
  }

  function renderStudySprint() {
    const note = sprintNote();
    const queue = sprintQueue();
    els.sprintMetaPill.textContent = `${queue.length} note`;
    if (!note) {
      els.sprintQuestionTitle.textContent = 'Chưa có câu hỏi';
      els.sprintQuestionBody.textContent = 'Thêm note để bắt đầu Study Sprint.';
      els.sprintAnswerWrap.classList.add('hidden');
      return;
    }
    const sprint = sprintQuestionFor(note);
    els.sprintQuestionTitle.textContent = sprint.title;
    els.sprintQuestionBody.textContent = sprint.body;
    els.sprintAnswerBody.innerHTML = renderMarkdown(sprint.answer);
    els.sprintAnswerWrap.classList.toggle('hidden', !sprintReveal);
    els.revealSprintBtn.textContent = sprintReveal ? 'Ẩn đáp án' : 'Lật đáp án';
  }

  function fillSelects() {
    const subjectOptions = subjects();
    const tagOptions = tags();
    const kindOptions = kinds();

    const subjectHtml = subjectOptions.map((subject) => `<option value="${esc(subject)}">${esc(subject)}</option>`).join('');
    const tagHtml = tagOptions.map((tag) => `<option value="${esc(tag)}">${esc(tag)}</option>`).join('');
    const kindHtml = kindOptions.map((kind) => `<option value="${esc(kind)}">${esc(store.kindLabel(kind))}</option>`).join('');

    [els.quickSubject, els.editSubject].forEach((select) => {
      const current = select.value;
      select.innerHTML = subjectHtml;
      if (current && subjectOptions.includes(current)) select.value = current;
    });
    [els.quickTag, els.editTag].forEach((select) => {
      const current = select.value;
      select.innerHTML = tagHtml;
      if (current && tagOptions.includes(current)) select.value = current;
    });
    [els.quickKind, els.editKind].forEach((select) => {
      const current = select.value;
      select.innerHTML = kindHtml;
      if (current && kindOptions.includes(current)) select.value = current;
    });

    const notesSubjectPrev = notesSubject;
    const reviewSubjectPrev = reviewSubject;
    const notesTagPrev = notesTag;
    const reviewTagPrev = reviewTag;
    const notesKindPrev = notesKind;
    const reviewKindPrev = reviewKind;

    els.notesSubjectFilter.innerHTML = `<option value="all">Tất cả môn</option>${subjectHtml}`;
    els.reviewSubjectFilter.innerHTML = `<option value="all">Tất cả môn</option>${subjectHtml}`;
    els.notesTagFilter.innerHTML = `<option value="all">Tất cả tag</option>${tagHtml}`;
    els.reviewTagFilter.innerHTML = `<option value="all">Tất cả tag</option>${tagHtml}`;
    els.notesKindFilter.innerHTML = `<option value="all">Tất cả loại</option>${kindHtml}`;
    els.reviewKindFilter.innerHTML = `<option value="all">Tất cả loại</option>${kindHtml}`;

    els.notesSubjectFilter.value = subjectOptions.includes(notesSubjectPrev) ? notesSubjectPrev : 'all';
    notesSubject = els.notesSubjectFilter.value;
    els.reviewSubjectFilter.value = subjectOptions.includes(reviewSubjectPrev) ? reviewSubjectPrev : 'all';
    reviewSubject = els.reviewSubjectFilter.value;

    els.notesTagFilter.value = tagOptions.includes(notesTagPrev) ? notesTagPrev : 'all';
    notesTag = els.notesTagFilter.value;
    els.reviewTagFilter.value = tagOptions.includes(reviewTagPrev) ? reviewTagPrev : 'all';
    reviewTag = els.reviewTagFilter.value;

    els.notesKindFilter.value = kindOptions.includes(notesKindPrev) ? notesKindPrev : 'all';
    notesKind = els.notesKindFilter.value;
    els.reviewKindFilter.value = kindOptions.includes(reviewKindPrev) ? reviewKindPrev : 'all';
    reviewKind = els.reviewKindFilter.value;

    if (!els.quickSubject.value && subjectOptions.length) els.quickSubject.value = subjectOptions[0];
    if (!els.quickTag.value && tagOptions.length) els.quickTag.value = tagOptions[0];
    if (!els.quickKind.value) els.quickKind.value = 'concept';
    if (!els.editSubject.value && subjectOptions.length) els.editSubject.value = subjectOptions[0];
    if (!els.editTag.value && tagOptions.length) els.editTag.value = tagOptions[0];
    if (!els.editKind.value) els.editKind.value = 'concept';
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
    const cards = [
      { label: 'Version', value: store.VERSION, hint: 'manifest + schema' },
      { label: 'Dung lượng', value: `${payloadSize.toFixed(1)} KB`, hint: 'ước tính dữ liệu hiện tại' },
      { label: 'Tags', value: data.tags.length, hint: 'đang dùng trong dashboard' },
      { label: 'Backups', value: backups.length, hint: 'đang lưu cục bộ' }
    ];
    els.storageOverview.innerHTML = cards.map((item) => `
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

  function renderViewer() {
    const note = data.notes.find((item) => item.id === viewingId);
    if (!note) {
      els.viewerModal.classList.add('hidden');
      return;
    }
    const answerBlock = note.answer ? `\n<hr class="viewer-sep" />\n<h3>Đáp án / mặt sau</h3>\n${renderMarkdown(note.answer)}` : '';
    els.viewTitle.textContent = note.title;
    els.viewMeta.textContent = `${note.subject} · ${note.chapter || 'Chưa gắn chương'} · ${note.tag} · ${store.kindLabel(note.kind)} · ${store.dueLabel(note.nextReviewAt)}`;
    els.viewBadges.innerHTML = noteStateBadges(note);
    els.viewBody.innerHTML = `${renderMarkdown(note.preview)}${answerBlock}`;
    els.viewReviewBtn.textContent = note.review || store.isDue(note) ? 'Ôn +10' : 'Tăng +10';
    els.viewPinBtn.textContent = note.pinned ? 'Bỏ ghim' : 'Ghim';
    els.viewImportantBtn.textContent = note.important ? 'Bỏ quan trọng' : 'Quan trọng';
  }

  function editorTargetId() {
    return editingId || 'new';
  }

  function currentEditorPayload() {
    return {
      noteId: editorTargetId(),
      title: els.editTitle.value.trim(),
      subject: els.editSubject.value,
      chapter: els.editChapter.value.trim(),
      tag: els.editTag.value,
      kind: els.editKind.value,
      source: els.editSource.value.trim(),
      answer: els.editAnswer.value.trim(),
      status: els.editStatus.value,
      mastery: els.editMastery.value,
      preview: els.editContent.value,
      pinned: els.editPinned.checked,
      important: els.editImportant.checked
    };
  }

  function editorHasContent(payload = currentEditorPayload()) {
    return Boolean(payload.title || payload.preview || payload.answer);
  }

  function setEditorStatus(message) {
    els.editorStatusText.textContent = message;
  }

  function setDraftInfo(message) {
    els.editorDraftInfo.textContent = message;
  }

  function applyEditorState(payload = {}) {
    suspendDraftAutosave = true;
    els.editTitle.value = payload.title || '';
    if (payload.subject) els.editSubject.value = payload.subject;
    if (payload.tag) els.editTag.value = payload.tag;
    els.editChapter.value = payload.chapter || '';
    els.editKind.value = payload.kind || 'concept';
    els.editStatus.value = payload.status || 'Đang học';
    els.editMastery.value = payload.mastery ?? 60;
    els.editSource.value = payload.source || '';
    els.editContent.value = payload.preview || '';
    els.editAnswer.value = payload.answer || '';
    els.editPinned.checked = !!payload.pinned;
    els.editImportant.checked = !!payload.important;
    suspendDraftAutosave = false;
    updateEditorPreview();
  }

  function updateEditorPreview() {
    const payload = currentEditorPayload();
    const content = payload.preview.trim();
    const answer = payload.answer.trim();
    const previewHtml = [
      payload.title ? `<h2>${esc(payload.title)}</h2>` : '',
      content ? renderMarkdown(content) : '<p class="md-empty">Chưa có nội dung để preview.</p>',
      answer ? `<hr class="viewer-sep" /><h3>Đáp án / mặt sau</h3>${renderMarkdown(answer)}` : ''
    ].join('');
    els.markdownPreview.innerHTML = previewHtml;
    const totalChars = content.length + answer.length;
    els.previewMeta.textContent = `${totalChars} ký tự · ${Math.max(1, Math.ceil(totalChars / 420))} phút đọc`;
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
      els.historyList.innerHTML = '<div class="empty-mini">Chưa có revision nào.</div>';
      return;
    }
    els.historyList.innerHTML = history.map((item, index) => `
      <div class="history-item">
        <div class="history-copy">
          <p class="history-title">${esc(item.label || `Revision ${index + 1}`)}</p>
          <p class="history-meta">${formatTime(item.updatedAt)} · ${esc(item.subject)} · ${esc(item.tag)}</p>
        </div>
        <button class="mini-btn" data-history-index="${index}">Khôi phục</button>
      </div>
    `).join('');
  }

  async function restoreDraftIntoEditor() {
    const draft = await refreshDraftCache();
    if (!draft) {
      showToast('Chưa có nháp để khôi phục');
      return;
    }
    applyEditorState(draft);
    setEditorStatus(`Đã nạp bản nháp · ${formatTime(draft.updatedAt)}`);
  }

  async function clearEditorDraft(showMessage = true) {
    await store.clearDraft();
    draftCache = null;
    setDraftInfo('Chưa có bản nháp.');
    if (showMessage) {
      setEditorStatus('Đã xóa bản nháp.');
      showToast('Đã xóa bản nháp');
    }
  }

  function insertMarkdown(type) {
    const map = {
      h1: '# ',
      h2: '## ',
      bullet: '- ',
      check: '- [ ] ',
      quote: '> ',
      code: '```js\n\n```',
      inline: '`code`'
    };
    const token = map[type] || '';
    const area = els.editContent;
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const value = area.value;
    area.value = `${value.slice(0, start)}${token}${value.slice(end)}`;
    area.focus();
    area.selectionStart = area.selectionEnd = start + token.length;
    updateEditorPreview();
    scheduleDraftSave();
  }

  function renderVisibility() {
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.nav === activeNav);
    });
    document.querySelectorAll('[data-chip]').forEach((btn) => {
      if (!btn.dataset.reviewFilter && !btn.dataset.template) btn.classList.toggle('active', btn.dataset.chip === activeChip);
    });
    document.querySelectorAll('[data-review-filter]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.reviewFilter === reviewFilter);
    });

    els.reviewPanel.classList.toggle('hidden', activeNav !== 'review');
    els.settingsPanel.classList.toggle('hidden', activeNav !== 'settings');

    if (lastNav !== activeNav) {
      if (activeNav === 'notes') els.notesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (activeNav === 'review') els.reviewPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (activeNav === 'settings') els.settingsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (activeNav === 'dashboard') els.scrollRoot.scrollTo({ top: 0, behavior: 'smooth' });
      lastNav = activeNav;
    }
  }

  function render() {
    fillSelects();
    renderOverview();
    renderTodayFocus();
    renderStudySprint();
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
    fillSelects();
    const note = editingId ? data.notes.find((item) => item.id === editingId) : null;
    els.editorHeading.textContent = note ? 'Sửa note với Editor Pro' : 'Tạo note mới với Editor Pro';
    applyEditorState(note || {
      title: '',
      subject: els.quickSubject.value || subjects()[0] || 'Lập trình',
      chapter: '',
      tag: els.quickTag.value || tags()[0] || 'JavaScript',
      kind: 'concept',
      source: '',
      answer: '',
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
    els.quickChapter.value = '';
    els.quickKind.value = 'concept';
    els.quickStatus.value = 'Đang học';
    els.quickMastery.value = 60;
    els.quickSource.value = '';
    els.quickContent.value = '';
    els.quickAnswer.value = '';
  }

  async function saveQuickNote(pinned) {
    if (!els.quickTitle.value.trim() || !els.quickContent.value.trim()) {
      showToast('Nhập tiêu đề và nội dung note');
      return;
    }
    const note = store.makeNote({
      title: els.quickTitle.value,
      subject: els.quickSubject.value,
      chapter: els.quickChapter.value,
      tag: els.quickTag.value,
      kind: els.quickKind.value,
      source: els.quickSource.value,
      answer: els.quickAnswer.value,
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
    store.completeReview(note, 'remember');
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

  function applyTemplate(name) {
    const template = TEMPLATE_MAP[name];
    if (!template) return;
    if (!els.quickTitle.value.trim()) els.quickTitle.value = template.title;
    els.quickSubject.value = template.subject;
    if ([...els.quickTag.options].some((opt) => opt.value === template.tag)) els.quickTag.value = template.tag;
    els.quickKind.value = template.kind;
    if (!els.quickSource.value.trim()) els.quickSource.value = template.source;
    els.quickContent.value = els.quickContent.value.trim() ? `${els.quickContent.value.trim()}\n\n${template.preview}` : template.preview;
    if (!els.quickAnswer.value.trim()) els.quickAnswer.value = template.answer;
    showToast(`Đã chèn ${template.title.toLowerCase()}`);
  }

  document.querySelectorAll('[data-template]').forEach((button) => {
    button.addEventListener('click', () => applyTemplate(button.dataset.template));
  });

  document.querySelectorAll('[data-chip]').forEach((button) => {
    if (button.dataset.template) return;
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
      renderVisibility();
    });
  });

  document.querySelectorAll('[data-nav]').forEach((button) => {
    button.addEventListener('click', () => {
      activeNav = button.dataset.nav;
      renderVisibility();
    });
  });

  els.searchInput.addEventListener('input', () => { renderNotes(); renderReviewQueue(); });
  els.openSearchBtn.addEventListener('click', () => els.searchInput.focus());
  els.clearSearchBtn.addEventListener('click', () => {
    els.searchInput.value = '';
    renderNotes();
    renderReviewQueue();
    els.searchInput.focus();
  });

  els.notesSubjectFilter.addEventListener('change', () => { notesSubject = els.notesSubjectFilter.value; renderNotes(); });
  els.notesTagFilter.addEventListener('change', () => { notesTag = els.notesTagFilter.value; renderNotes(); });
  els.notesKindFilter.addEventListener('change', () => { notesKind = els.notesKindFilter.value; renderNotes(); });
  els.notesStatusFilter.addEventListener('change', () => { notesStatus = els.notesStatusFilter.value; renderNotes(); });
  els.sortSelect.addEventListener('change', renderNotes);
  els.toggleViewBtn.addEventListener('click', () => { compactView = !compactView; renderNotes(); });
  els.resetNotesFiltersBtn.addEventListener('click', () => {
    notesSubject = 'all';
    notesTag = 'all';
    notesKind = 'all';
    notesStatus = 'all';
    els.notesSubjectFilter.value = 'all';
    els.notesTagFilter.value = 'all';
    els.notesKindFilter.value = 'all';
    els.notesStatusFilter.value = 'all';
    els.sortSelect.value = 'newest';
    renderNotes();
    showToast('Đã đặt lại bộ lọc Notes');
  });

  els.reviewSubjectFilter.addEventListener('change', () => { reviewSubject = els.reviewSubjectFilter.value; renderReviewQueue(); });
  els.reviewTagFilter.addEventListener('change', () => { reviewTag = els.reviewTagFilter.value; renderReviewQueue(); });
  els.reviewKindFilter.addEventListener('change', () => { reviewKind = els.reviewKindFilter.value; renderReviewQueue(); });
  els.reviewSortSelect.addEventListener('change', renderReviewQueue);
  els.resetReviewFiltersBtn.addEventListener('click', () => {
    reviewFilter = 'all';
    reviewSubject = 'all';
    reviewTag = 'all';
    reviewKind = 'all';
    els.reviewSubjectFilter.value = 'all';
    els.reviewTagFilter.value = 'all';
    els.reviewKindFilter.value = 'all';
    els.reviewSortSelect.value = 'masteryLow';
    renderReviewQueue();
    renderVisibility();
    showToast('Đã đặt lại bộ lọc review');
  });

  els.saveQuickBtn.addEventListener('click', () => { void saveQuickNote(false); });
  els.pinQuickBtn.addEventListener('click', () => { void saveQuickNote(true); });
  els.quickContent.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      void saveQuickNote(false);
    }
  });

  els.revealSprintBtn.addEventListener('click', () => {
    sprintReveal = !sprintReveal;
    renderStudySprint();
  });
  els.rememberSprintBtn.addEventListener('click', async () => {
    const note = sprintNote();
    if (!note) return;
    store.completeReview(note, 'remember');
    sprintReveal = false;
    sprintNoteId = null;
    await persist('Đã cập nhật Study Sprint');
  });
  els.forgetSprintBtn.addEventListener('click', async () => {
    const note = sprintNote();
    if (!note) return;
    store.completeReview(note, 'forget');
    sprintReveal = false;
    sprintNoteId = null;
    await persist('Đã đưa note vào hàng ôn lại');
  });

  els.addTaskBtn.addEventListener('click', () => { void addTask(); });
  els.newTaskInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void addTask();
    }
  });

  els.openComposerBtn.addEventListener('click', () => { void openEditor(); });
  [els.editTitle, els.editSubject, els.editTag, els.editChapter, els.editKind, els.editStatus, els.editMastery, els.editSource, els.editContent, els.editAnswer, els.editPinned, els.editImportant].forEach((input) => {
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
      subject: els.editSubject.value || subjects()[0] || 'Lập trình',
      chapter: '',
      tag: els.editTag.value || tags()[0] || 'JavaScript',
      kind: 'concept',
      source: '',
      answer: '',
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

  els.saveEditBtn.addEventListener('click', async () => {
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
      note.subject = payload.subject;
      note.chapter = payload.chapter;
      note.tag = payload.tag;
      note.kind = payload.kind;
      note.source = payload.source;
      note.answer = payload.answer;
      note.status = payload.status;
      note.mastery = Math.max(0, Math.min(100, Number(payload.mastery) || 0));
      note.preview = payload.preview.trim();
      note.pinned = payload.pinned;
      note.important = payload.important;
      note.updatedAt = Date.now();
      note.timeLabel = store.timeLabel(note.updatedAt);
      note.review = note.status === 'Cần ôn' || note.mastery < 65 || store.isDue(note);
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


  els.bulkReviewBtn.addEventListener('click', async () => {
    const targets = filteredReviewNotes();
    if (!targets.length) {
      showToast('Không có note nào trong nhóm review hiện tại');
      return;
    }
    targets.forEach((note) => {
      note.mastery = Math.min(100, note.mastery + 10);
      store.completeReview(note, 'remember');
    });
    await persist('Đã ôn nhóm review hiện tại');
  });

  els.bulkCompleteBtn.addEventListener('click', async () => {
    const targets = filteredReviewNotes();
    if (!targets.length) {
      showToast('Không có note nào trong nhóm review hiện tại');
      return;
    }
    targets.forEach((note) => {
      if (note.status === 'Cần ôn' && note.mastery >= 55) note.status = 'Đã lưu';
      note.review = false;
      note.updatedAt = Date.now();
      note.timeLabel = store.timeLabel(note.updatedAt);
      store.scheduleNextReview(note, 'remember');
    });
    await persist('Đã cập nhật nhóm note đã tiến bộ');
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

  els.backupNowBtn.addEventListener('click', async () => {
    data = await store.createManualBackup('Manual backup');
    render();
    showToast('Đã tạo backup');
  });
  els.restoreLatestBtn.addEventListener('click', async () => {
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
  els.exportDataBtn.addEventListener('click', async () => {
    await store.exportCurrentData();
    showToast('Đã xuất dữ liệu');
  });
  els.restoreSeedBtn.addEventListener('click', async () => {
    if (!confirm('Khôi phục dữ liệu mẫu? Dữ liệu hiện tại sẽ được backup trước.')) return;
    data = await store.restoreSeedData();
    render();
    showToast('Đã khôi phục dữ liệu mẫu');
  });
  els.importFileInput.addEventListener('change', async (event) => {
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
        subject: source.subject,
        chapter: source.chapter,
        tag: source.tag,
        kind: source.kind,
        source: source.source,
        answer: source.answer,
        preview: source.preview,
        status: source.status,
        mastery: source.mastery,
        pinned: false,
        important: source.important
      });
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
      return;
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
    if (event.key === 'Escape') {
      if (!els.editorModal.classList.contains('hidden')) closeEditor();
      if (!els.viewerModal.classList.contains('hidden')) closeViewer();
    }
  });

  render();
})();
