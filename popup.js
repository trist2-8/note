(async () => {
  const store = window.StudyStore;
  let data = await store.ensureData();
  const $ = (id) => document.getElementById(id);

  function showToast(message) {
    const toast = $('popupToast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(window.__popupToast);
    window.__popupToast = setTimeout(() => toast.classList.add('hidden'), 1800);
  }

  function esc(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fillTags() {
    const tags = [...new Set((data.tags || []).concat(data.notes.map((note) => note.tag)))].sort((a, b) => a.localeCompare(b, 'vi'));
    $('popupTag').innerHTML = tags.map((tag) => `<option value="${esc(tag)}">${esc(tag)}</option>`).join('');
  }

  function renderStats() {
    const items = [
      { value: data.notes.length, label: 'Tổng note' },
      { value: data.notes.filter((note) => note.review).length, label: 'Cần ôn' },
      { value: data.notes.filter((note) => note.pinned).length, label: 'Đã ghim' }
    ];
    $('popupStats').innerHTML = items.map((item) => `
      <div class="popup-stat">
        <strong>${esc(item.value)}</strong>
        <span>${esc(item.label)}</span>
      </div>
    `).join('');
  }

  function renderReviewList() {
    const queue = [...data.notes].filter((note) => note.review).sort((a, b) => a.mastery - b.mastery).slice(0, 3);
    $('popupReviewList').innerHTML = queue.length
      ? queue.map((note) => `
        <div class="queue-item compact">
          <div class="queue-rank mini">•</div>
          <div class="queue-body">
            <p class="queue-title">${esc(note.title)}</p>
            <p class="queue-sub">${esc(note.tag)} · Mastery ${note.mastery}%</p>
          </div>
        </div>
      `).join('')
      : '<div class="empty-mini">Không có note cần ôn.</div>';
  }

  $('popupSaveBtn').addEventListener('click', async () => {
    const title = $('popupTitle').value.trim();
    const preview = $('popupContent').value.trim();
    if (!title || !preview) {
      showToast('Nhập tiêu đề và nội dung');
      return;
    }
    data = await store.ensureData();
    const note = store.makeNote({
      title,
      tag: $('popupTag').value,
      preview,
      status: $('popupStatus').value,
      mastery: $('popupMastery').value,
      pinned: false,
      important: false
    });
    data.notes.unshift(note);
    if (!data.tags.includes(note.tag)) data.tags.push(note.tag);
    data = await store.saveData(data);
    $('popupTitle').value = '';
    $('popupContent').value = '';
    $('popupMastery').value = 60;
    renderStats();
    renderReviewList();
    showToast('Đã lưu note');
  });

  $('popupContent').addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      $('popupSaveBtn').click();
    }
  });

  $('openDashboardBtn').addEventListener('click', () => chrome.runtime.openOptionsPage());

  fillTags();
  renderStats();
  renderReviewList();
})();
