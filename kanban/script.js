let draggingCardEl = null;

// ── 초기화 ──────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const session = await requireAuth();
  if (!session) return;

  const user = await getUser();
  document.getElementById('user-email').textContent = user.email;
  document.getElementById('btn-logout').addEventListener('click', signOut);

  await loadBoard();
  bindColumnEvents();
  bindAddCardButtons();
});

// ── 데이터 영속성 ─────────────────────────────────────────

async function loadBoard() {
  const user = await getUser();
  const { data, error } = await supabaseClient
    .from('kanban_boards')
    .select('data')
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    await setSampleCards();
    return;
  }

  const state = data.data;
  ['todo', 'inprogress', 'done'].forEach(columnId => {
    (state[columnId] || []).forEach(card => createCard(columnId, card.text, card.id));
  });
}

async function saveBoard() {
  const state = {};
  ['todo', 'inprogress', 'done'].forEach(columnId => {
    const cardList = getCardList(columnId);
    state[columnId] = Array.from(cardList.querySelectorAll('.card')).map(cardEl => ({
      id: cardEl.id,
      text: cardEl.querySelector('.card-text').textContent,
      createdAt: cardEl.dataset.createdAt,
    }));
  });

  const user = await getUser();
  await supabaseClient.from('kanban_boards').upsert({
    user_id: user.id,
    data: state,
    updated_at: new Date().toISOString(),
  });
}

async function setSampleCards() {
  createCard('todo', 'PRD, TRD 작성하기');
  createCard('todo', '디자인 시스템 정의');
  createCard('inprogress', 'index.html 마크업 작성');
  createCard('done', 'PLAN.md 작성 완료');
  await saveBoard();
}

// ── 카드 CRUD ─────────────────────────────────────────────

function createCard(columnId, text, id) {
  const cardEl = document.createElement('div');
  cardEl.className = 'card';
  cardEl.id = id || `card-${crypto.randomUUID()}`;
  cardEl.draggable = true;
  cardEl.dataset.createdAt = new Date().toISOString();

  const textEl = document.createElement('span');
  textEl.className = 'card-text';
  textEl.textContent = text;

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'card-delete';
  deleteBtn.textContent = '×';
  deleteBtn.setAttribute('aria-label', '카드 삭제');

  cardEl.appendChild(textEl);
  cardEl.appendChild(deleteBtn);

  deleteBtn.addEventListener('click', () => deleteCard(cardEl));
  cardEl.addEventListener('dragstart', onDragStart);
  cardEl.addEventListener('dragend', onDragEnd);

  getCardList(columnId).appendChild(cardEl);
  updateCardCount(columnId);
}

async function deleteCard(cardEl) {
  const columnId = cardEl.closest('.column').dataset.column;
  cardEl.remove();
  updateCardCount(columnId);
  await saveBoard();
}

// ── 카드 입력 폼 ──────────────────────────────────────────

function bindAddCardButtons() {
  document.querySelectorAll('.column').forEach(columnEl => {
    const columnId = columnEl.dataset.column;
    const btnAdd = columnEl.querySelector('.btn-add');
    const btnConfirm = columnEl.querySelector('.btn-confirm');
    const btnCancel = columnEl.querySelector('.btn-cancel');
    const textarea = columnEl.querySelector('.card-input');

    btnAdd.addEventListener('click', () => openInputForm(columnId));
    btnCancel.addEventListener('click', () => closeInputForm(columnId));
    btnConfirm.addEventListener('click', () => confirmAddCard(columnId));

    textarea.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        confirmAddCard(columnId);
      }
      if (e.key === 'Escape') {
        closeInputForm(columnId);
      }
    });
  });
}

function openInputForm(columnId) {
  const columnEl = getColumn(columnId);
  columnEl.querySelector('.btn-add').hidden = true;
  const form = columnEl.querySelector('.card-input-form');
  form.hidden = false;
  form.querySelector('.card-input').focus();
}

function closeInputForm(columnId) {
  const columnEl = getColumn(columnId);
  const form = columnEl.querySelector('.card-input-form');
  const textarea = form.querySelector('.card-input');
  textarea.value = '';
  textarea.classList.remove('error');
  form.hidden = true;
  columnEl.querySelector('.btn-add').hidden = false;
}

async function confirmAddCard(columnId) {
  const columnEl = getColumn(columnId);
  const textarea = columnEl.querySelector('.card-input');
  const text = textarea.value.trim();

  if (!text) {
    textarea.classList.add('error');
    textarea.addEventListener('animationend', () => textarea.classList.remove('error'), { once: true });
    textarea.focus();
    return;
  }

  createCard(columnId, text);
  await saveBoard();
  closeInputForm(columnId);
}

// ── 드래그 앤 드롭 ────────────────────────────────────────

function bindColumnEvents() {
  document.querySelectorAll('.column').forEach(columnEl => {
    columnEl.addEventListener('dragover', onDragOver);
    columnEl.addEventListener('dragleave', onDragLeave);
    columnEl.addEventListener('drop', onDrop);
  });
}

function onDragStart(e) {
  draggingCardEl = e.currentTarget;
  e.dataTransfer.setData('text/plain', draggingCardEl.id);
  e.dataTransfer.effectAllowed = 'move';
  requestAnimationFrame(() => draggingCardEl.classList.add('dragging'));
}

function onDragEnd() {
  if (draggingCardEl) {
    draggingCardEl.classList.remove('dragging');
    draggingCardEl = null;
  }
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}

function onDragLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    e.currentTarget.classList.remove('drag-over');
  }
}

async function onDrop(e) {
  e.preventDefault();
  const columnEl = e.currentTarget;
  columnEl.classList.remove('drag-over');

  const cardId = e.dataTransfer.getData('text/plain');
  const cardEl = document.getElementById(cardId);
  if (!cardEl) return;

  const sourceColumnId = cardEl.closest('.column').dataset.column;
  const targetColumnId = columnEl.dataset.column;

  getCardList(targetColumnId).appendChild(cardEl);

  if (sourceColumnId !== targetColumnId) {
    updateCardCount(sourceColumnId);
    updateCardCount(targetColumnId);
  }
  await saveBoard();
}

// ── 유틸리티 ─────────────────────────────────────────────

function getColumn(columnId) {
  return document.querySelector(`.column[data-column="${columnId}"]`);
}

function getCardList(columnId) {
  return getColumn(columnId).querySelector('.card-list');
}

function updateCardCount(columnId) {
  const columnEl = getColumn(columnId);
  const count = columnEl.querySelectorAll('.card').length;
  columnEl.querySelector('.column-badge').textContent = count;
}
