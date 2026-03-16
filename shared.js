(() => {
  const APP_VERSION = "3.0.0";
  const STORAGE_KEY = "studyNoteWorkspaceData";
  const LEGACY_KEYS = [
    "studyNotesData",
    "studyNoteData",
    "study-note-data",
    "notes",
    "study-notes"
  ];
  const MAX_BACKUPS = 15;

  const defaultNotes = [
    {
      id: String(Date.now() - 3),
      title: "React hooks cơ bản",
      tag: "Frontend",
      content: "useState quản lý state cục bộ, useEffect xử lý side effect, nên tách custom hook khi logic lặp lại.",
      status: "Đang học",
      pinned: true,
      important: true,
      review: true,
      mastery: 62,
      reviewDate: nextDate(1),
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 86400000
    },
    {
      id: String(Date.now() - 2),
      title: "REST API notes",
      tag: "Backend",
      content: "GET để lấy dữ liệu, POST để tạo mới, PUT/PATCH để cập nhật, cần chú ý status code 200, 201, 400, 404.",
      status: "Đã lưu",
      pinned: false,
      important: false,
      review: false,
      mastery: 78,
      reviewDate: nextDate(5),
      createdAt: Date.now() - 43200000,
      updatedAt: Date.now() - 43200000
    },
    {
      id: String(Date.now() - 1),
      title: "Git workflow",
      tag: "Tools",
      content: "Nên tạo branch riêng cho từng tính năng, commit ngắn gọn rõ nghĩa, pull trước khi merge để tránh conflict.",
      status: "Ôn lại",
      pinned: false,
      important: true,
      review: true,
      mastery: 41,
      reviewDate: todayISO(),
      createdAt: Date.now() - 21600000,
      updatedAt: Date.now() - 21600000
    }
  ];

  const defaultData = {
    version: APP_VERSION,
    notes: defaultNotes,
    customTags: ["Frontend", "Backend", "Tools", "Database", "DevOps"],
    backups: [],
    lastOpenedVersion: APP_VERSION
  };

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function nextDate(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  }

  function isChromeStorageAvailable() {
    return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
  }

  function storageGet(key) {
    return new Promise((resolve) => {
      if (isChromeStorageAvailable()) {
        chrome.storage.local.get([key], (result) => resolve(result[key]));
      } else {
        const raw = localStorage.getItem(key);
        resolve(raw ? JSON.parse(raw) : undefined);
      }
    });
  }

  function storageSet(obj) {
    return new Promise((resolve) => {
      if (isChromeStorageAvailable()) {
        chrome.storage.local.set(obj, resolve);
      } else {
        Object.entries(obj).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
        resolve();
      }
    });
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function ensureNoteShape(note) {
    const now = Date.now();
    return {
      id: String(note.id || now + Math.random()),
      title: String(note.title || "Không có tiêu đề"),
      tag: String(note.tag || "Frontend"),
      content: String(note.content || note.preview || ""),
      status: ["Đang học", "Đã lưu", "Ôn lại"].includes(note.status) ? note.status : "Đang học",
      pinned: Boolean(note.pinned),
      important: Boolean(note.important),
      review: note.review !== undefined ? Boolean(note.review) : true,
      mastery: clampNumber(note.mastery, 0, 100, 60),
      reviewDate: validDateString(note.reviewDate) ? note.reviewDate : todayISO(),
      createdAt: Number(note.createdAt) || now,
      updatedAt: Number(note.updatedAt) || now
    };
  }

  function clampNumber(value, min, max, fallback) {
    const n = Number(value);
    if (Number.isNaN(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function validDateString(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  function normalizeData(data) {
    const src = data && typeof data === "object" ? data : {};
    const notes = Array.isArray(src.notes) ? src.notes.map(ensureNoteShape) : clone(defaultNotes);
    const customTags = Array.isArray(src.customTags) && src.customTags.length
      ? uniqueStrings(src.customTags)
      : clone(defaultData.customTags);
    const backups = Array.isArray(src.backups) ? src.backups.filter(Boolean).slice(0, MAX_BACKUPS) : [];
    return {
      version: APP_VERSION,
      notes,
      customTags,
      backups,
      lastOpenedVersion: src.lastOpenedVersion || APP_VERSION
    };
  }

  function uniqueStrings(list) {
    return Array.from(new Set(list.map((x) => String(x).trim()).filter(Boolean)));
  }

  async function tryLegacyMigration() {
    for (const key of LEGACY_KEYS) {
      const legacy = await storageGet(key);
      if (!legacy) continue;

      if (Array.isArray(legacy)) {
        return normalizeData({ notes: legacy, customTags: defaultData.customTags, backups: [] });
      }

      if (legacy && typeof legacy === "object") {
        if (Array.isArray(legacy.notes) || Array.isArray(legacy.customTags)) {
          return normalizeData(legacy);
        }
      }
    }
    return null;
  }

  function createBackupRecord(data, reason) {
    return {
      id: String(Date.now()),
      createdAt: Date.now(),
      reason,
      payload: {
        notes: clone(data.notes),
        customTags: clone(data.customTags),
        version: data.version
      }
    };
  }

  async function loadData() {
    let data = await storageGet(STORAGE_KEY);
    if (!data) {
      const migrated = await tryLegacyMigration();
      data = migrated || clone(defaultData);
      await saveData(data);
    } else {
      data = normalizeData(data);
      await saveData(data);
    }
    return data;
  }

  async function saveData(data) {
    const normalized = normalizeData(data);
    await storageSet({ [STORAGE_KEY]: normalized });
    return normalized;
  }

  async function ensureVersionBackup() {
    const data = await loadData();
    if (data.lastOpenedVersion !== APP_VERSION) {
      const backup = createBackupRecord(data, `Auto backup trước khi mở phiên bản ${APP_VERSION}`);
      data.backups.unshift(backup);
      data.backups = data.backups.slice(0, MAX_BACKUPS);
      data.lastOpenedVersion = APP_VERSION;
      await saveData(data);
      return backup;
    }
    return null;
  }

  async function addNote(noteInput) {
    const data = await loadData();
    const note = ensureNoteShape({
      ...noteInput,
      id: String(Date.now()),
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    data.notes.unshift(note);
    if (note.tag && !data.customTags.includes(note.tag)) data.customTags.push(note.tag);
    await saveData(data);
    return note;
  }

  async function updateNote(id, patch) {
    const data = await loadData();
    data.notes = data.notes.map((note) => note.id === id ? ensureNoteShape({ ...note, ...patch, updatedAt: Date.now() }) : note);
    if (patch.tag && !data.customTags.includes(patch.tag)) data.customTags.push(patch.tag);
    await saveData(data);
    return data;
  }

  async function deleteNote(id) {
    const data = await loadData();
    data.notes = data.notes.filter((note) => note.id !== id);
    await saveData(data);
    return data;
  }

  async function createManualBackup(reason = "Backup thủ công") {
    const data = await loadData();
    const backup = createBackupRecord(data, reason);
    data.backups.unshift(backup);
    data.backups = data.backups.slice(0, MAX_BACKUPS);
    await saveData(data);
    return backup;
  }

  async function restoreBackup(backupId) {
    const data = await loadData();
    const found = data.backups.find((b) => b.id === backupId);
    if (!found) throw new Error("Không tìm thấy backup.");
    const restoreBefore = createBackupRecord(data, "Backup tự động trước khi khôi phục");
    const restored = normalizeData({
      notes: found.payload.notes,
      customTags: found.payload.customTags,
      backups: [restoreBefore, ...data.backups],
      lastOpenedVersion: APP_VERSION
    });
    restored.backups = restored.backups.slice(0, MAX_BACKUPS);
    await saveData(restored);
    return restored;
  }

  async function restoreLatestBackup() {
    const data = await loadData();
    const latest = data.backups[0];
    if (!latest) throw new Error("Chưa có backup nào.");
    return restoreBackup(latest.id);
  }

  async function importJsonPayload(payload) {
    const data = await loadData();
    const before = createBackupRecord(data, "Backup tự động trước khi import");

    let imported;
    if (Array.isArray(payload)) {
      imported = normalizeData({ notes: payload, customTags: data.customTags, backups: [before, ...data.backups] });
    } else if (payload && typeof payload === "object") {
      if (Array.isArray(payload.notes)) {
        imported = normalizeData({
          notes: payload.notes,
          customTags: Array.isArray(payload.customTags) ? payload.customTags : data.customTags,
          backups: [before, ...data.backups]
        });
      } else if (payload.payload && Array.isArray(payload.payload.notes)) {
        imported = normalizeData({
          notes: payload.payload.notes,
          customTags: Array.isArray(payload.payload.customTags) ? payload.payload.customTags : data.customTags,
          backups: [before, ...data.backups]
        });
      } else {
        throw new Error("File JSON không đúng định dạng notes hoặc backup.");
      }
    } else {
      throw new Error("Dữ liệu import không hợp lệ.");
    }

    imported.backups = imported.backups.slice(0, MAX_BACKUPS);
    await saveData(imported);
    return imported;
  }

  async function restoreSampleData() {
    const data = await loadData();
    const before = createBackupRecord(data, "Backup tự động trước khi khôi phục dữ liệu mẫu");
    const restored = normalizeData({
      notes: clone(defaultNotes),
      customTags: clone(defaultData.customTags),
      backups: [before, ...data.backups]
    });
    await saveData(restored);
    return restored;
  }

  function exportFile(filename, object) {
    const blob = new Blob([JSON.stringify(object, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function formatDateTime(ts) {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(ts));
  }

  function noteTimeText(note) {
    return formatDateTime(note.updatedAt || note.createdAt);
  }

  function dueState(note) {
    if (!note.reviewDate) return "none";
    const today = todayISO();
    if (note.reviewDate < today) return "overdue";
    if (note.reviewDate === today) return "today";
    return "future";
  }

  function computeStats(notes) {
    const overdue = notes.filter((n) => dueState(n) === "overdue").length;
    const review = notes.filter((n) => n.review).length;
    const pinned = notes.filter((n) => n.pinned).length;
    return { total: notes.length, review, pinned, overdue };
  }

  window.StudyNoteApp = {
    APP_VERSION,
    STORAGE_KEY,
    defaultData,
    todayISO,
    loadData,
    saveData,
    addNote,
    updateNote,
    deleteNote,
    createManualBackup,
    restoreBackup,
    restoreLatestBackup,
    importJsonPayload,
    restoreSampleData,
    exportFile,
    formatDateTime,
    noteTimeText,
    dueState,
    computeStats,
    ensureVersionBackup,
    uniqueStrings
  };
})();
