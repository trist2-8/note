(() => {
  const VERSION = '3.7.2';
  const APP_KEY = 'study_note_dashboard_v3_stable';
  const DRAFT_KEY = `${APP_KEY}_editor_draft`;

  const MAX_BACKUPS = 12;
  const MS_DAY = 24 * 60 * 60 * 1000;
  const NOTE_KINDS = ['concept', 'formula', 'example', 'question', 'code', 'mistake', 'summary'];
  const KIND_LABELS = {
    concept: 'Khái niệm',
    formula: 'Công thức',
    example: 'Ví dụ',
    question: 'Câu hỏi',
    code: 'Code',
    mistake: 'Lỗi sai',
    summary: 'Tóm tắt'
  };
  const DEFAULT_SUBJECTS = ['Lập trình', 'Toán', 'Thống kê', 'Ngoại ngữ', 'Kinh tế', 'Lý thuyết', 'Công cụ'];
  const DEFAULT_TAGS = ['JavaScript', 'Backend', 'React', 'Frontend', 'Algorithms', 'Math', 'Statistics', 'English', 'Economics', 'Git & Tools'];
  const LEGACY_OBJECT_KEYS = ['studyNoteV3Data'];
  const LEGACY_NOTE_KEYS = [
    'study_note_workspace_v2_plus_notes',
    'study_note_workspace_v2_notes',
    'study_note_workspace_notes'
  ];
  const LEGACY_TAG_KEYS = [
    'study_note_workspace_v2_plus_custom_tags',
    'study_note_workspace_v2_custom_tags',
    'study_note_workspace_custom_tags'
  ];

  const now = Date.now();
  const seed = {
    version: VERSION,
    notes: [
      {
        id: 'n1',
        title: 'Closure trong JavaScript',
        subject: 'Lập trình',
        chapter: 'Hàm và lexical scope',
        tag: 'JavaScript',
        kind: 'concept',
        source: 'Lecture',
        answer: 'Closure giúp hàm giữ lại biến trong lexical environment ngay cả khi được gọi ngoài phạm vi ban đầu.',
        preview: 'Closure xuất hiện khi một hàm ghi nhớ phạm vi lexical của nó ngay cả khi được gọi bên ngoài phạm vi ban đầu.',
        status: 'Đã lưu',
        mastery: 78,
        pinned: true,
        important: true,
        review: false,
        reviewCount: 3,
        studyStage: 2,
        lastReviewedAt: now - 2 * MS_DAY,
        nextReviewAt: now + 3 * MS_DAY,
        createdAt: now - 20 * 60 * 1000,
        updatedAt: now - 20 * 60 * 1000,
        timeLabel: 'Hôm nay · 09:40',
        history: []
      },
      {
        id: 'n2',
        title: 'HTTP status code cần nhớ',
        subject: 'Lập trình',
        chapter: 'REST API cơ bản',
        tag: 'Backend',
        kind: 'summary',
        source: 'Docs',
        answer: '200/201 cho thành công, 400 cho request sai, 401 cho thiếu quyền, 404 cho không tìm thấy, 500 cho lỗi server.',
        preview: '200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error.',
        status: 'Cần ôn',
        mastery: 48,
        pinned: false,
        important: false,
        review: true,
        reviewCount: 1,
        studyStage: 0,
        lastReviewedAt: now - MS_DAY,
        nextReviewAt: now - 3 * 60 * 60 * 1000,
        createdAt: now - 90 * 60 * 1000,
        updatedAt: now - 90 * 60 * 1000,
        timeLabel: 'Hôm nay · 08:10',
        history: []
      },
      {
        id: 'n3',
        title: 'Đạo hàm của sin(x)',
        subject: 'Toán',
        chapter: 'Đạo hàm cơ bản',
        tag: 'Math',
        kind: 'formula',
        source: 'Self-study',
        answer: '(sin x)\' = cos x',
        preview: 'Ghi nhớ mối quan hệ giữa sin và cos để giải nhanh bài đạo hàm lượng giác.',
        status: 'Đang học',
        mastery: 61,
        pinned: false,
        important: false,
        review: true,
        reviewCount: 2,
        studyStage: 1,
        lastReviewedAt: now - 12 * 60 * 60 * 1000,
        nextReviewAt: now + 12 * 60 * 60 * 1000,
        createdAt: now - 12 * 60 * 60 * 1000,
        updatedAt: now - 12 * 60 * 60 * 1000,
        timeLabel: 'Hôm qua · 21:14',
        history: []
      }
    ],
    tasks: [
      { id: 't1', text: 'Ôn lại 3 note mastery thấp nhất', done: false },
      { id: 't2', text: 'Tạo một note theo template cho bài đang học', done: false },
      { id: 't3', text: 'Ghim 2 note cốt lõi để review cuối tuần', done: true }
    ],
    tags: [...DEFAULT_TAGS],
    backups: [],
    meta: {
      installedAt: new Date().toISOString(),
      lastVersion: VERSION,
      lastMigratedFrom: null
    }
  };

  function hasChromeStorage() {
    return typeof chrome !== 'undefined' && Boolean(chrome?.storage?.local);
  }

  function hasLocalStorage() {
    try {
      return typeof localStorage !== 'undefined';
    } catch {
      return false;
    }
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function storageGetCompat(key) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.get([key], (result) => {
          const error = chrome.runtime?.lastError;
          if (error) {
            reject(new Error(error.message));
            return;
          }
          resolve(result?.[key] ?? null);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  function storageSetCompat(key, value) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.set({ [key]: value }, () => {
          const error = chrome.runtime?.lastError;
          if (error) {
            reject(new Error(error.message));
            return;
          }
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  function storageRemoveCompat(key) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.remove(key, () => {
          const error = chrome.runtime?.lastError;
          if (error) {
            reject(new Error(error.message));
            return;
          }
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async function rawGet(key) {
    if (hasChromeStorage()) {
      return storageGetCompat(key);
    }
    if (!hasLocalStorage()) return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async function rawSet(key, value) {
    if (hasChromeStorage()) {
      await storageSetCompat(key, value);
      return;
    }
    if (hasLocalStorage()) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  async function rawRemove(key) {
    if (hasChromeStorage()) {
      await storageRemoveCompat(key);
      return;
    }
    if (hasLocalStorage()) {
      localStorage.removeItem(key);
    }
  }

  function clampMastery(value) {
    const num = Number(value);
    if (Number.isNaN(num)) return 0;
    return Math.max(0, Math.min(100, Math.round(num)));
  }

  function clampStage(value) {
    const num = Number(value);
    if (Number.isNaN(num)) return 0;
    return Math.max(0, Math.min(6, Math.round(num)));
  }

  function timeLabel(ts) {
    const d = new Date(ts);
    const current = new Date();
    const yesterday = new Date(current);
    yesterday.setDate(current.getDate() - 1);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    if (d.toDateString() === current.toDateString()) return `Hôm nay · ${hh}:${mm}`;
    if (d.toDateString() === yesterday.toDateString()) return `Hôm qua · ${hh}:${mm}`;
    return `${d.getDate()}/${d.getMonth() + 1} · ${hh}:${mm}`;
  }

  function normalizeStatus(value) {
    if (value === 'Ôn lại') return 'Cần ôn';
    if (['Đang học', 'Đã lưu', 'Cần ôn'].includes(value)) return value;
    return 'Đang học';
  }

  function normalizeKind(value) {
    return NOTE_KINDS.includes(value) ? value : 'concept';
  }

  function kindLabel(kind) {
    return KIND_LABELS[normalizeKind(kind)] || KIND_LABELS.concept;
  }

  function inferTitle(text) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return 'Note mới';
    return clean.length > 42 ? `${clean.slice(0, 42)}...` : clean;
  }

  function inferSubject(raw = {}) {
    const value = String(raw.subject || '').trim();
    if (value) return value;
    const tag = String(raw.tag || '').trim().toLowerCase();
    if (['javascript', 'react', 'backend', 'frontend', 'algorithms', 'git & tools'].includes(tag)) return 'Lập trình';
    if (['math'].includes(tag)) return 'Toán';
    if (['statistics'].includes(tag)) return 'Thống kê';
    if (['english'].includes(tag)) return 'Ngoại ngữ';
    if (['economics'].includes(tag)) return 'Kinh tế';
    return String(raw.tag || 'Lập trình').trim() || 'Lập trình';
  }

  function reviewIntervals(note) {
    switch (normalizeKind(note.kind)) {
      case 'formula':
        return [0, 1, 2, 5, 10, 21, 45];
      case 'question':
        return [0, 1, 2, 4, 7, 14, 30];
      case 'mistake':
        return [0, 1, 2, 4, 7, 14, 30];
      default:
        return [0, 1, 3, 7, 14, 30, 60];
    }
  }

  function scheduleNextReview(note, outcome = 'remember') {
    const current = Date.now();
    if (outcome === 'forget') {
      note.studyStage = 0;
      note.lastReviewedAt = current;
      note.nextReviewAt = current + 6 * 60 * 60 * 1000;
      return note;
    }
    note.studyStage = clampStage((note.studyStage ?? 0) + 1);
    note.lastReviewedAt = current;
    const intervals = reviewIntervals(note);
    const days = Math.max(1, intervals[Math.min(note.studyStage, intervals.length - 1)] || 1);
    note.nextReviewAt = current + days * MS_DAY;
    return note;
  }

  function dueLabel(ts) {
    if (!ts) return 'Chưa có lịch ôn';
    const diff = Number(ts) - Date.now();
    if (diff <= 0) return 'Đến hạn';
    const hours = Math.round(diff / (60 * 60 * 1000));
    if (hours < 24) return `${hours} giờ nữa`;
    const days = Math.round(diff / MS_DAY);
    if (days <= 1) return 'Ngày mai';
    if (days <= 7) return `${days} ngày nữa`;
    return new Date(ts).toLocaleDateString('vi-VN');
  }

  function isDue(note) {
    return Boolean(note && typeof note.nextReviewAt === 'number' && note.nextReviewAt <= Date.now());
  }

  function syncReviewState(note) {
    note.review = Boolean(note.status === 'Cần ôn' || note.mastery < 65 || isDue(note));
    return note;
  }

  function normalizeHistory(history) {
    if (!Array.isArray(history)) return [];
    return history
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const updatedAt = Number(new Date(item.updatedAt || Date.now()));
        return {
          id: String(item.id || `h-${updatedAt}-${Math.random().toString(36).slice(2, 6)}`),
          label: String(item.label || 'Revision').trim() || 'Revision',
          title: String(item.title || '').trim(),
          subject: inferSubject(item),
          chapter: String(item.chapter || '').trim(),
          tag: String(item.tag || 'JavaScript').trim() || 'JavaScript',
          kind: normalizeKind(item.kind),
          source: String(item.source || '').trim(),
          answer: String(item.answer || '').trim(),
          preview: String(item.preview || item.content || '').trim(),
          status: normalizeStatus(item.status),
          mastery: clampMastery(item.mastery ?? 0),
          pinned: Boolean(item.pinned),
          important: Boolean(item.important),
          reviewCount: Math.max(0, Number(item.reviewCount || 0)),
          studyStage: clampStage(item.studyStage || 0),
          lastReviewedAt: item.lastReviewedAt ? Number(new Date(item.lastReviewedAt)) : null,
          nextReviewAt: item.nextReviewAt ? Number(new Date(item.nextReviewAt)) : null,
          updatedAt
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 10);
  }

  function snapshotFromNote(raw, label = 'Revision') {
    const updatedAt = Date.now();
    return {
      id: `h-${updatedAt}-${Math.random().toString(36).slice(2, 6)}`,
      label,
      title: String(raw.title || '').trim(),
      subject: inferSubject(raw),
      chapter: String(raw.chapter || '').trim(),
      tag: String(raw.tag || 'JavaScript').trim() || 'JavaScript',
      kind: normalizeKind(raw.kind),
      source: String(raw.source || '').trim(),
      answer: String(raw.answer || '').trim(),
      preview: String(raw.preview || raw.content || '').trim(),
      status: normalizeStatus(raw.status),
      mastery: clampMastery(raw.mastery ?? 0),
      pinned: Boolean(raw.pinned),
      important: Boolean(raw.important),
      reviewCount: Math.max(0, Number(raw.reviewCount || 0)),
      studyStage: clampStage(raw.studyStage || 0),
      lastReviewedAt: raw.lastReviewedAt ? Number(new Date(raw.lastReviewedAt)) : null,
      nextReviewAt: raw.nextReviewAt ? Number(new Date(raw.nextReviewAt)) : null,
      updatedAt
    };
  }

  function normalizeNote(raw, fallbackTag = 'JavaScript') {
    if (!raw || typeof raw !== 'object') return null;
    const createdAt = Number(new Date(raw.createdAt || raw.updatedAt || Date.now()));
    const updatedAt = Number(new Date(raw.updatedAt || raw.createdAt || Date.now()));
    const preview = String(raw.preview || raw.content || '').trim();
    const title = String(raw.title || inferTitle(preview)).trim();
    if (!title) return null;
    const tag = String(raw.tag || fallbackTag || 'JavaScript').trim() || 'JavaScript';
    const mastery = clampMastery(raw.mastery ?? raw.progress ?? 60);
    const status = normalizeStatus(raw.status);
    const note = {
      id: String(raw.id || `n-${createdAt}-${Math.random().toString(36).slice(2, 6)}`),
      title,
      subject: inferSubject(raw),
      chapter: String(raw.chapter || '').trim(),
      tag,
      kind: normalizeKind(raw.kind),
      source: String(raw.source || '').trim(),
      answer: String(raw.answer || '').trim(),
      preview,
      status,
      mastery,
      pinned: Boolean(raw.pinned),
      important: Boolean(raw.important),
      review: Boolean(raw.review ?? (status === 'Cần ôn' || mastery < 65)),
      reviewCount: Math.max(0, Number(raw.reviewCount || 0)),
      studyStage: clampStage(raw.studyStage || 0),
      lastReviewedAt: raw.lastReviewedAt ? Number(new Date(raw.lastReviewedAt)) : null,
      nextReviewAt: raw.nextReviewAt ? Number(new Date(raw.nextReviewAt)) : null,
      createdAt,
      updatedAt,
      timeLabel: raw.timeLabel || timeLabel(updatedAt),
      history: normalizeHistory(raw.history)
    };
    if (!note.nextReviewAt) {
      scheduleNextReview(note, note.mastery < 65 || note.status === 'Cần ôn' ? 'forget' : 'remember');
      if (note.mastery >= 70 && note.status !== 'Cần ôn') {
        note.studyStage = clampStage(raw.studyStage || 1);
        scheduleNextReview(note, 'remember');
      }
    }
    note.timeLabel = raw.timeLabel || timeLabel(updatedAt);
    return syncReviewState(note);
  }

  function normalizeTask(raw, index) {
    if (!raw) return null;
    if (typeof raw === 'string') {
      return { id: `t-${index}-${Date.now()}`, text: raw, done: false };
    }
    if (typeof raw === 'object' && raw.text) {
      return { id: String(raw.id || `t-${index}-${Date.now()}`), text: String(raw.text), done: Boolean(raw.done) };
    }
    return null;
  }

  function normalizeTags(tags, notes) {
    const fromNotes = Array.isArray(notes) ? notes.map((n) => n.tag) : [];
    return Array.from(new Set([...(Array.isArray(tags) ? tags : []), ...fromNotes, ...DEFAULT_TAGS].map((tag) => String(tag || '').trim()).filter(Boolean)));
  }

  function normalizeData(input) {
    const notes = Array.isArray(input?.notes) ? input.notes.map((note) => normalizeNote(note)).filter(Boolean) : [];
    const tasksInput = Array.isArray(input?.tasks) ? input.tasks : seed.tasks;
    const tasks = tasksInput.map(normalizeTask).filter(Boolean).slice(0, 50);
    const backups = Array.isArray(input?.backups)
      ? input.backups.filter(Boolean).slice(0, MAX_BACKUPS)
      : [];
    return {
      version: input?.version || VERSION,
      notes,
      tasks: tasks.length ? tasks : deepClone(seed.tasks),
      tags: normalizeTags(input?.tags || input?.customTags, notes),
      backups,
      meta: {
        installedAt: input?.meta?.installedAt || new Date().toISOString(),
        lastVersion: input?.meta?.lastVersion || input?.version || VERSION,
        lastMigratedFrom: input?.meta?.lastMigratedFrom || null
      }
    };
  }

  async function createBackupInData(data, label) {
    const snapshot = {
      id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
      label,
      payload: deepClone({ ...data, backups: [] })
    };
    data.backups = [snapshot, ...(Array.isArray(data.backups) ? data.backups : [])].slice(0, MAX_BACKUPS);
    return snapshot;
  }

  async function migrateLegacyData() {
    for (const key of LEGACY_OBJECT_KEYS) {
      const obj = await rawGet(key);
      if (obj && typeof obj === 'object' && Array.isArray(obj.notes) && obj.notes.length) {
        const normalized = normalizeData(obj);
        normalized.meta.lastMigratedFrom = key;
        return normalized;
      }
    }

    for (const key of LEGACY_NOTE_KEYS) {
      const notes = await rawGet(key);
      if (Array.isArray(notes) && notes.length) {
        const normalizedNotes = notes.map((note) => normalizeNote(note)).filter(Boolean);
        let tags = [];
        for (const tagKey of LEGACY_TAG_KEYS) {
          const foundTags = await rawGet(tagKey);
          if (Array.isArray(foundTags) && foundTags.length) {
            tags = foundTags;
            break;
          }
        }
        const migrated = normalizeData({ notes: normalizedNotes, tags, version: VERSION });
        migrated.meta.lastMigratedFrom = key;
        return migrated;
      }
    }
    return null;
  }

  async function saveData(data) {
    const normalized = normalizeData(data);
    normalized.version = VERSION;
    normalized.meta.lastVersion = VERSION;
    await rawSet(APP_KEY, normalized);
    return normalized;
  }

  async function ensureData() {
    let current = await rawGet(APP_KEY);
    if (!current) {
      const migrated = await migrateLegacyData();
      current = migrated || deepClone(seed);
      if (migrated) {
        await createBackupInData(current, `Migration từ ${migrated.meta.lastMigratedFrom}`);
      }
      current.version = VERSION;
      current.meta.lastVersion = VERSION;
      await rawSet(APP_KEY, current);
      return normalizeData(current);
    }

    current = normalizeData(current);
    if (current.meta.lastVersion !== VERSION || current.version !== VERSION) {
      await createBackupInData(current, `Auto backup ${current.meta.lastVersion || current.version || 'old'} → ${VERSION}`);
      current.version = VERSION;
      current.meta.lastVersion = VERSION;
      await rawSet(APP_KEY, current);
    }
    return normalizeData(current);
  }

  function makeNote({ title, subject, chapter, tag, kind, source, answer, preview, status, mastery, pinned = false, important = false }) {
    const current = Date.now();
    const note = normalizeNote({
      id: `n-${current}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      subject,
      chapter,
      tag,
      kind,
      source,
      answer,
      preview,
      status,
      mastery,
      pinned,
      important,
      reviewCount: 0,
      studyStage: 0,
      createdAt: current,
      updatedAt: current,
      timeLabel: timeLabel(current)
    });
    return syncReviewState(note);
  }

  function exportToFile(filename, payload) {
    if (typeof document === 'undefined' || typeof URL === 'undefined') {
      throw new Error('Không thể xuất file ở context hiện tại.');
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body?.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function exportCurrentData() {
    const current = await ensureData();
    exportToFile(`study-note-backup-${new Date().toISOString().slice(0, 10)}.json`, current);
  }

  async function exportBackup(backupId) {
    const current = await ensureData();
    const snapshot = (current.backups || []).find((item) => item.id === backupId);
    if (!snapshot) throw new Error('Không tìm thấy backup');
    exportToFile(`study-note-backup-${new Date(snapshot.createdAt).toISOString().slice(0, 10)}.json`, snapshot.payload);
  }

  async function importData(parsed) {
    if (!parsed || typeof parsed !== 'object') throw new Error('Dữ liệu không hợp lệ');
    const current = await ensureData();
    await createBackupInData(current, 'Pre-import backup');
    const imported = normalizeData(parsed.meta || parsed.notes ? parsed : { notes: parsed });
    imported.backups = [...(Array.isArray(parsed.backups) ? parsed.backups : []), ...current.backups].slice(0, MAX_BACKUPS);
    imported.version = VERSION;
    imported.meta.lastVersion = VERSION;
    await rawSet(APP_KEY, imported);
    return imported;
  }

  async function createManualBackup(label = 'Manual backup') {
    const current = await ensureData();
    await createBackupInData(current, label);
    await rawSet(APP_KEY, current);
    return normalizeData(current);
  }

  async function restoreBackup(backupId) {
    const current = await ensureData();
    const snapshot = (current.backups || []).find((item) => item.id === backupId);
    if (!snapshot) throw new Error('Không tìm thấy backup');
    const restored = normalizeData(snapshot.payload);
    restored.backups = current.backups;
    restored.version = VERSION;
    restored.meta.lastVersion = VERSION;
    await rawSet(APP_KEY, restored);
    return restored;
  }

  async function restoreSeedData() {
    const current = await ensureData();
    await createBackupInData(current, 'Pre-seed restore backup');
    const next = deepClone(seed);
    next.backups = current.backups;
    await rawSet(APP_KEY, next);
    return normalizeData(next);
  }

  async function saveDraft(draft) {
    const payload = {
      noteId: String(draft?.noteId || 'new'),
      title: String(draft?.title || '').trim(),
      subject: inferSubject(draft || {}),
      chapter: String(draft?.chapter || '').trim(),
      tag: String(draft?.tag || 'JavaScript').trim() || 'JavaScript',
      kind: normalizeKind(draft?.kind),
      source: String(draft?.source || '').trim(),
      answer: String(draft?.answer || '').trim(),
      status: normalizeStatus(draft?.status),
      mastery: clampMastery(draft?.mastery ?? 0),
      preview: String(draft?.preview || '').replace(/\r\n/g, '\n'),
      pinned: Boolean(draft?.pinned),
      important: Boolean(draft?.important),
      updatedAt: Date.now()
    };
    await rawSet(DRAFT_KEY, payload);
    return payload;
  }

  async function getDraft() {
    const draft = await rawGet(DRAFT_KEY);
    if (!draft || typeof draft !== 'object') return null;
    return {
      noteId: String(draft.noteId || 'new'),
      title: String(draft.title || ''),
      subject: inferSubject(draft),
      chapter: String(draft.chapter || ''),
      tag: String(draft.tag || 'JavaScript'),
      kind: normalizeKind(draft.kind),
      source: String(draft.source || ''),
      answer: String(draft.answer || ''),
      status: normalizeStatus(draft.status),
      mastery: clampMastery(draft.mastery ?? 0),
      preview: String(draft.preview || ''),
      pinned: Boolean(draft.pinned),
      important: Boolean(draft.important),
      updatedAt: Number(new Date(draft.updatedAt || Date.now()))
    };
  }

  async function clearDraft() {
    await rawRemove(DRAFT_KEY);
  }

  function pushHistory(note, label = 'Revision') {
    const snapshot = snapshotFromNote(note, label);
    note.history = [snapshot, ...(Array.isArray(note.history) ? note.history : [])].slice(0, 10);
    return note.history;
  }

  function completeReview(note, outcome = 'remember') {
    if (!note || typeof note !== 'object') return note;
    note.reviewCount = Math.max(0, Number(note.reviewCount || 0)) + 1;
    if (outcome === 'forget') {
      note.mastery = Math.max(0, note.mastery - 12);
      note.status = 'Cần ôn';
      scheduleNextReview(note, 'forget');
    } else {
      note.mastery = Math.min(100, note.mastery + 12);
      if (note.status === 'Cần ôn' && note.mastery >= 65) note.status = 'Đã lưu';
      scheduleNextReview(note, 'remember');
    }
    note.updatedAt = Date.now();
    note.timeLabel = timeLabel(note.updatedAt);
    return syncReviewState(note);
  }

  globalThis.StudyStore = {
    VERSION,
    APP_KEY,
    DRAFT_KEY,
    NOTE_KINDS,
    KIND_LABELS,
    DEFAULT_SUBJECTS,
    DEFAULT_TAGS,
    ensureData,
    saveData,
    makeNote,
    timeLabel,
    exportCurrentData,
    exportBackup,
    importData,
    createManualBackup,
    restoreBackup,
    restoreSeedData,
    saveDraft,
    getDraft,
    clearDraft,
    pushHistory,
    inferTitle,
    normalizeData,
    clampMastery,
    clampStage,
    normalizeKind,
    kindLabel,
    dueLabel,
    isDue,
    completeReview,
    scheduleNextReview,
    reviewIntervals
  };
})();
