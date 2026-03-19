(async () => {
  try {
    (async () => {
      const $ = (id) => document.getElementById(id);

      function showFatal(message) {
        const errorBox = $('popupError');
        if (!errorBox) return;
        errorBox.textContent = message;
        errorBox.classList.remove('hidden');
      }

      try {
        const store = window.StudyStore;
        if (!store || typeof store.ensureData !== 'function') {
          throw new Error('Không tải được lớp dữ liệu StudyStore.');
        }

        let data = await store.ensureData();

        const TEMPLATE_MAP = {
          coding: {
            subject: 'Lập trình',
            tag: 'JavaScript',
            kind: 'code',
            source: 'Docs',
            title: 'Template lập trình',
            content: '## Ý tưởng chính\n- \n\n## Code mẫu\n```js\n// code của bạn\n```\n\n## Lưu ý\n- ',
            answer: 'Tóm tắt điều kiện dùng, lỗi dễ gặp và cách sửa.'
          },
          math: {
            subject: 'Toán',
            tag: 'Math',
            kind: 'formula',
            source: 'Lecture',
            title: 'Template toán',
            content: '## Công thức\n- \n\n## Ý nghĩa\n- \n\n## Ví dụ\n- ',
            answer: 'Ghi công thức cuối cùng hoặc kết luận ngắn.'
          },
          language: {
            subject: 'Ngoại ngữ',
            tag: 'English',
            kind: 'question',
            source: 'Self-study',
            title: 'Template ngoại ngữ',
            content: '## Từ / cấu trúc\n- \n\n## Nghĩa\n- \n\n## Ví dụ\n- ',
            answer: 'Ghi nghĩa, cách dùng hoặc mẫu câu cần nhớ.'
          },
          mistake: {
            subject: 'Lập trình',
            tag: 'Git & Tools',
            kind: 'mistake',
            source: 'Practice',
            title: 'Template lỗi sai',
            content: '## Lỗi gặp phải\n- \n\n## Nguyên nhân\n- \n\n## Cách sửa\n- ',
            answer: 'Tóm tắt dấu hiệu nhận biết và cách tránh lặp lại.'
          }
        };

        const SUBJECT_TAG_MAP = {
          'Lập trình': 'JavaScript',
          'Toán': 'Math',
          'Thống kê': 'Statistics',
          'Ngoại ngữ': 'English',
          'Kinh tế': 'Economics',
          'Lý thuyết': 'Algorithms',
          'Công cụ': 'Git & Tools'
        };

        const DEFAULT_TAGS = [
          'JavaScript',
          'Math',
          'Statistics',
          'English',
          'Economics',
          'Algorithms',
          'Git & Tools',
          'Lecture',
          'Practice'
        ];

        function showToast(message) {
          const toast = $('popupToast');
          if (!toast) return;
          toast.textContent = message;
          toast.classList.remove('hidden');
          clearTimeout(window.__popupToast);
          window.__popupToast = setTimeout(() => toast.classList.add('hidden'), 1800);
        }

        function esc(value) {
          return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        }

        function subjects() {
          const values = [
            ...(Array.isArray(store.DEFAULT_SUBJECTS) ? store.DEFAULT_SUBJECTS : []),
            ...((data.notes || []).map((note) => note.subject))
          ].filter(Boolean);
          const unique = [...new Set(values)];
          return unique.length ? unique.sort((a, b) => a.localeCompare(b, 'vi')) : ['Lập trình', 'Toán', 'Ngoại ngữ'];
        }

        function tags() {
          const values = [
            ...(Array.isArray(data.tags) ? data.tags : []),
            ...((data.notes || []).map((note) => note.tag)),
            ...Object.values(SUBJECT_TAG_MAP),
            ...DEFAULT_TAGS
          ].filter(Boolean);
          return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'vi'));
        }

        function setSelectOptions(selectEl, values, selectedValue, formatter) {
          if (!selectEl) return;
          const safeValues = Array.isArray(values) && values.length ? values : ['Chưa phân loại'];
          selectEl.innerHTML = safeValues.map((value) => {
            const label = formatter ? formatter(value) : value;
            return `<option value="${esc(value)}">${esc(label)}</option>`;
          }).join('');
          if (selectedValue && safeValues.includes(selectedValue)) {
            selectEl.value = selectedValue;
          }
          if (!selectEl.value && safeValues.length) {
            selectEl.value = safeValues[0];
          }
        }

        function fillSelects() {
          setSelectOptions($('popupSubject'), subjects(), $('popupSubject').value);
          setSelectOptions($('popupTag'), tags(), $('popupTag').value);
          setSelectOptions(
            $('popupKind'),
            Array.isArray(store.NOTE_KINDS) && store.NOTE_KINDS.length ? store.NOTE_KINDS : ['concept', 'summary', 'question'],
            $('popupKind').value || 'concept',
            (kind) => (typeof store.kindLabel === 'function' ? store.kindLabel(kind) : kind)
          );
        }

        function renderSubjectChips() {
          const list = subjects();
          const current = $('popupSubject').value || list[0] || 'Lập trình';
          $('popupSubjectChips').innerHTML = list.slice(0, 6).map((subject) => `
            <button type="button" class="subject-chip ${current === subject ? 'active' : ''}" data-subject="${esc(subject)}">${esc(subject)}</button>
          `).join('');

          document.querySelectorAll('[data-subject]').forEach((button) => {
            button.addEventListener('click', () => {
              $('popupSubject').value = button.dataset.subject;
              syncSubjectToTag();
              renderSubjectChips();
            });
          });
        }

        function syncSubjectToTag(force = false) {
          const mapped = SUBJECT_TAG_MAP[$('popupSubject').value];
          const tagSelect = $('popupTag');
          if (!tagSelect) return;
          const current = tagSelect.value;
          const hasCurrent = [...tagSelect.options].some((opt) => opt.value === current);
          const hasMapped = [...tagSelect.options].some((opt) => opt.value === mapped);
          if (hasMapped && (force || !hasCurrent || !current)) {
            tagSelect.value = mapped;
          }
        }

        function renderStats() {
          const notes = Array.isArray(data.notes) ? data.notes : [];
          const dueCount = notes.filter((note) => note.review || store.isDue(note)).length;
          const lowMastery = notes.filter((note) => Number(note.mastery) < 65).length;
          const items = [
            { value: notes.length, label: 'Tổng note' },
            { value: dueCount, label: 'Cần ôn' },
            { value: lowMastery, label: 'Mastery thấp' }
          ];
          $('popupStats').innerHTML = items.map((item) => `
            <div class="popup-summary-card">
              <strong>${esc(item.value)}</strong>
              <span>${esc(item.label)}</span>
            </div>
          `).join('');
        }

        async function renderDraftInfo() {
          const draft = await store.getDraft();
          const info = $('popupDraftInfo');
          const btn = $('continueDraftBtn');
          if (!draft || !(draft.title || draft.preview)) {
            info.textContent = 'Chưa có bản nháp đang viết.';
            btn.textContent = 'Mở Editor Pro';
            return;
          }
          const timeLabel = draft.updatedAt
            ? new Date(draft.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            : 'vừa xong';
          info.textContent = `${draft.title || 'Note chưa đặt tên'} · ${timeLabel}`;
          btn.textContent = 'Tiếp tục viết';
        }

        function renderReviewList() {
          const notes = [...(data.notes || [])]
            .filter((note) => note.review || store.isDue(note))
            .sort((a, b) => (a.nextReviewAt || Infinity) - (b.nextReviewAt || Infinity) || Number(a.mastery || 0) - Number(b.mastery || 0));

          $('popupDueMeta').textContent = `${notes.length} note`;
          $('popupReviewList').innerHTML = notes.length
            ? notes.slice(0, 4).map((note) => `
                <div class="queue-item compact popup-queue-item">
                  <div class="popup-queue-dot"></div>
                  <div class="queue-body">
                    <p class="queue-title">${esc(note.title || 'Note chưa có tiêu đề')}</p>
                    <p class="queue-sub">${esc(note.subject || 'Chưa phân loại')} · ${esc(store.kindLabel(note.kind || 'concept'))} · ${esc(store.dueLabel(note.nextReviewAt))}</p>
                  </div>
                </div>
              `).join('')
            : '<div class="empty-mini popup-empty-state">Chưa có note nào cần ôn ngay.</div>';
        }

        function setCollapsibleState(panel, button, expanded, labels) {
          if (!panel || !button) return;
          panel.classList.toggle('hidden', !expanded);
          button.textContent = expanded ? labels.open : labels.closed;
          button.classList.toggle('active', expanded);
        }

        function applyTemplate(name) {
          const template = TEMPLATE_MAP[name];
          if (!template) return;

          if (!$('popupTitle').value.trim()) $('popupTitle').value = template.title;
          $('popupSubject').value = template.subject;
          renderSubjectChips();

          if ([...$('popupTag').options].some((opt) => opt.value === template.tag)) {
            $('popupTag').value = template.tag;
          }

          $('popupKind').value = template.kind;
          if (!$('popupSource').value.trim()) $('popupSource').value = template.source;
          $('popupContent').value = $('popupContent').value.trim()
            ? `${$('popupContent').value.trim()}\n\n${template.content}`
            : template.content;

          if (!$('popupAnswer').value.trim()) $('popupAnswer').value = template.answer;
          setCollapsibleState($('popupAnswerWrap'), $('toggleAnswerBtn'), true, {
            closed: '+ Thêm đáp án / flashcard',
            open: '− Ẩn đáp án / flashcard'
          });
          showToast(`Đã chèn ${template.title.toLowerCase()}`);
        }

        function resetForm() {
          $('popupTitle').value = '';
          $('popupContent').value = '';
          $('popupAnswer').value = '';
          $('popupChapter').value = '';
          $('popupSource').value = '';
          $('popupStatus').value = 'Đang học';
          $('popupMastery').value = 60;
          $('popupKind').value = [...$('popupKind').options].some((opt) => opt.value === 'concept') ? 'concept' : $('popupKind').options[0]?.value || '';
          $('popupSubject').value = subjects()[0] || 'Lập trình';
          syncSubjectToTag(true);
          renderSubjectChips();
          setCollapsibleState($('popupAnswerWrap'), $('toggleAnswerBtn'), false, {
            closed: '+ Thêm đáp án / flashcard',
            open: '− Ẩn đáp án / flashcard'
          });
          setCollapsibleState($('popupDetailsPanel'), $('toggleDetailsBtn'), false, {
            closed: '+ Mở chi tiết',
            open: '− Thu gọn chi tiết'
          });
        }

        async function saveNote() {
          const title = $('popupTitle').value.trim();
          const preview = $('popupContent').value.trim();
          if (!title || !preview) {
            showToast('Nhập tiêu đề và nội dung');
            return;
          }

          data = await store.ensureData();
          const note = store.makeNote({
            title,
            subject: $('popupSubject').value,
            chapter: $('popupChapter').value,
            tag: $('popupTag').value,
            kind: $('popupKind').value,
            source: $('popupSource').value,
            answer: $('popupAnswer').value,
            preview,
            status: $('popupStatus').value,
            mastery: $('popupMastery').value,
            pinned: false,
            important: false
          });

          data.notes.unshift(note);
          data.tags = Array.isArray(data.tags) ? data.tags : [];
          if (note.tag && !data.tags.includes(note.tag)) data.tags.push(note.tag);
          data = await store.saveData(data);

          renderStats();
          renderReviewList();
          fillSelects();
          resetForm();
          showToast('Đã lưu note');
        }

        function openDashboard() {
          if (chrome?.runtime?.openOptionsPage) {
            chrome.runtime.openOptionsPage();
          }
        }

        $('popupSaveBtn').addEventListener('click', saveNote);
        $('openDashboardBtn').addEventListener('click', openDashboard);
        $('continueDraftBtn').addEventListener('click', openDashboard);
        $('resetPopupBtn').addEventListener('click', resetForm);

        $('popupContent').addEventListener('keydown', (event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            saveNote();
          }
        });

        $('toggleAnswerBtn').addEventListener('click', () => {
          const expanded = $('popupAnswerWrap').classList.contains('hidden');
          setCollapsibleState($('popupAnswerWrap'), $('toggleAnswerBtn'), expanded, {
            closed: '+ Thêm đáp án / flashcard',
            open: '− Ẩn đáp án / flashcard'
          });
        });

        $('toggleDetailsBtn').addEventListener('click', () => {
          const expanded = $('popupDetailsPanel').classList.contains('hidden');
          setCollapsibleState($('popupDetailsPanel'), $('toggleDetailsBtn'), expanded, {
            closed: '+ Mở chi tiết',
            open: '− Thu gọn chi tiết'
          });
        });

        $('popupSubject').addEventListener('change', () => {
          syncSubjectToTag();
          renderSubjectChips();
        });

        document.querySelectorAll('[data-popup-template]').forEach((button) => {
          button.addEventListener('click', () => applyTemplate(button.dataset.popupTemplate));
        });

        fillSelects();
        syncSubjectToTag(true);
        renderSubjectChips();
        renderStats();
        renderReviewList();
        await renderDraftInfo();
        resetForm();
      } catch (error) {
        console.error('Popup init failed:', error);
        showFatal(`Popup lỗi khởi tạo: ${error?.message || error}`);
      }
    })();
  } catch (error) {
    console.error('[Study Note popup]', error);
    const box = document.getElementById('popupError');
    if (box) {
      box.textContent = `Popup lỗi: ${error?.message || error}`;
      box.classList.remove('hidden');
    }
  }
})();
