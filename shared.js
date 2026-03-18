(() => {
  const VERSION = '3.5.1';
  const APP_KEY = 'study_note_dashboard_v3_stable';
  const DRAFT_KEY = `${APP_KEY}_editor_draft`;

  const MAX_BACKUPS = 12;
  const DEFAULT_TAGS = ['JavaScript', 'Backend', 'React', 'Frontend', 'Algorithms', 'Git & Tools'];
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
        tag: 'JavaScript',
        preview: 'Closure xuất hiện khi một hàm ghi nhớ phạm vi lexical của nó ngay cả khi được gọi bên ngoài phạm vi ban đầu.',
        status: 'Đã lưu',
        mastery: 78,
        pinned: true,
        important: true,
        review: false,
        createdAt: now - 20 * 60 * 1000,
        updatedAt: now - 20 * 60 * 1000,
        timeLabel: 'Hôm nay · 09:40'
      },
      {
        id: 'n2',
        title: 'HTTP status code cần nhớ',
        tag: 'Backend',
        preview: '200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error.',
        status: 'Cần ôn',
        mastery: 48,
        pinned: false,
        important: false,
        review: true,
        createdAt: now - 90 * 60 * 1000,
        updatedAt: now - 90 * 60 * 1000,
        timeLabel: 'Hôm nay · 08:10'
      },
      {
        id: 'n3',
        title: 'useMemo và useCallback',
        tag: 'React',
        preview: 'Dùng để tối ưu render, nhưng chỉ thật sự cần khi có chi phí tính toán lớn hoặc truyền props xuống component con nhạy cảm.',
        status: 'Đang học',
        mastery: 61,
        pinned: false,
        important: false,
        review: true,
        createdAt: now - 12 * 60 * 60 * 1000,
        updatedAt: now - 12 * 60 * 60 * 1000,
        timeLabel: 'Hôm qua · 21:14'
      }
    ],
    tasks: [
      { id: 't1', text: 'Ôn lại note React hooks trước 20:00', done: false },
      { id: 't2', text: 'Viết note mới cho phần RESTful API', done: false },
      { id: 't3', text: 'Ghim 3 note cốt lõi để review cuối tuần', done: true }
    ],
    tags: DEFAULT_TAGS,
    backups: [],
    meta: {
      installedAt: new Date().toISOString(),
      lastVersion: VERSION,
      lastMigratedFrom: null
    }
  };

  function hasChromeStorage() {
    return typeof chrome !== 'undefined' && chrome?.storage?.local;
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  async function rawGet(key) {
    if (hasChromeStorage()) {
      const data = await chrome.storage.local.get([key]);
      return data[key] ?? null;
    }
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
      await chrome.storage.local.set({ [key]: value });
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  }

  async function rawRemove(key) {
    if (hasChromeStorage()) {
      await chrome.storage.local.remove(key);
      return;
    }
    localStorage.removeItem(key);
  }

  function clampMastery(value) {
    const num = Number(value);
    if (Number.isNaN(num)) return 0;
    return Math.max(0, Math.min(100, Math.round(num)));
  }

  function timeLabel(ts) {
    const d = new Date(ts);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    if (d.toDateString() === now.toDateString()) return `Hôm nay · ${hh}:${mm}`;
    if (d.toDateString() === yesterday.toDateString()) return `Hôm qua · ${hh}:${mm}`;
    return `${d.getDate()}/${d.getMonth() + 1} · ${hh}:${mm}`;
  }

  function normalizeStatus(value) {
    if (value === 'Ôn lại') return 'Cần ôn';
    if (['Đang học', 'Đã lưu', 'Cần ôn'].includes(value)) return value;
    return 'Đang học';
  }

  function inferTitle(text) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return 'Note mới';
    return clean.length > 42 ? `${clean.slice(0, 42)}...` : clean;
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
          tag: String(item.tag || 'Frontend').trim() || 'Frontend',
          preview: String(item.preview || item.content || '').trim(),
          status: normalizeStatus(item.status),
          mastery: clampMastery(item.mastery ?? 0),
          pinned: Boolean(item.pinned),
          important: Boolean(item.important),
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
      tag: String(raw.tag || 'Frontend').trim() || 'Frontend',
      preview: String(raw.preview || raw.content || '').trim(),
      status: normalizeStatus(raw.status),
      mastery: clampMastery(raw.mastery ?? 0),
      pinned: Boolean(raw.pinned),
      important: Boolean(raw.important),
      updatedAt
    };
  }

  function normalizeNote(raw, fallbackTag = 'Frontend') {
    if (!raw || typeof raw !== 'object') return null;
    const createdAt = Number(new Date(raw.createdAt || raw.updatedAt || Date.now()));
    const updatedAt = Number(new Date(raw.updatedAt || raw.createdAt || Date.now()));
    const preview = String(raw.preview || raw.content || '').trim();
    const title = String(raw.title || inferTitle(preview)).trim();
    if (!title) return null;
    const tag = String(raw.tag || fallbackTag || 'Frontend').trim() || 'Frontend';
    const mastery = clampMastery(raw.mastery ?? raw.progress ?? 60);
    const status = normalizeStatus(raw.status);
    return {
      id: String(raw.id || `n-${createdAt}-${Math.random().toString(36).slice(2, 6)}`),
      title,
      tag,
      preview,
      status,
      mastery,
      pinned: Boolean(raw.pinned),
      important: Boolean(raw.important),
      review: Boolean(raw.review ?? (status === 'Cần ôn' || mastery < 65)),
      createdAt,
      updatedAt,
      timeLabel: raw.timeLabel || timeLabel(updatedAt),
      history: normalizeHistory(raw.history)
    };
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
    const tasks = tasksInput.map(normalizeTask).filter(Boolean).slice(0, 40);
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

  function makeNote({ title, tag, preview, status, mastery, pinned = false, important = false }) {
    const now = Date.now();
    return normalizeNote({
      id: `n-${now}`,
      title,
      tag,
      preview,
      status,
      mastery,
      pinned,
      important,
      review: normalizeStatus(status) === 'Cần ôn' || clampMastery(mastery) < 65,
      createdAt: now,
      updatedAt: now,
      timeLabel: timeLabel(now)
    });
  }

  function exportToFile(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
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
      tag: String(draft?.tag || 'Frontend').trim() || 'Frontend',
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
      tag: String(draft.tag || 'Frontend'),
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

  globalThis.StudyStore = {
    VERSION,
    APP_KEY,
    DRAFT_KEY,
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
    clampMastery
  };
})();
