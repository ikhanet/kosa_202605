let draggingCardEl = null;
let activeCardEl = null;
let currentUser = null;
let boardOwnerId = null;
let _wasDragged = false;
let _justSaved = false;

// ── 초기화 ──────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const session = await requireAuth();
  if (!session) return;

  currentUser = await getUser();

  const params = new URLSearchParams(window.location.search);
  boardOwnerId = params.get('board') || currentUser.id;

  document.getElementById('user-email').textContent = currentUser.email;
  document.getElementById('btn-logout').addEventListener('click', signOut);
  document.getElementById('share-btn').addEventListener('click', generateInviteLink);
  document.getElementById('log-toggle').addEventListener('click', toggleLogPanel);
  document.getElementById('log-close').addEventListener('click', toggleLogPanel);
  document.getElementById('modal-save').addEventListener('click', saveCardModal);
  document.getElementById('modal-cancel').addEventListener('click', closeCardModal);
  document.getElementById('card-modal').addEventListener('click', e => {
    if (e.target.id === 'card-modal') closeCardModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeCardModal();
  });

  // 소유자가 아닌 멤버는 공유 버튼 숨김
  if (boardOwnerId !== currentUser.id) {
    document.getElementById('share-btn').style.display = 'none';
  }

  await processPendingInvite();
  await loadBoard();
  await loadActivityLog();
  bindColumnEvents();
  bindAddCardButtons();
  initRealtime();
  initPresence();
});

// ── 데이터 영속성 ─────────────────────────────────────────

async function loadBoard() {
  const { data, error } = await supabaseClient
    .from('kanban_boards')
    .select('data')
    .eq('user_id', boardOwnerId)
    .single();

  if (error || !data) {
    if (boardOwnerId === currentUser.id) await setSampleCards();
    return;
  }

  const state = data.data;
  ['todo', 'inprogress', 'done'].forEach(columnId => {
    (state[columnId] || []).forEach(card => createCard(columnId, card.text, card.id, card));
  });
}

async function saveBoard() {
  _justSaved = true;
  const state = {};
  ['todo', 'inprogress', 'done'].forEach(columnId => {
    const cardList = getCardList(columnId);
    state[columnId] = Array.from(cardList.querySelectorAll('.card')).map(cardEl => ({
      id: cardEl.id,
      text: cardEl.querySelector('.card-text').textContent,
      createdAt: cardEl.dataset.createdAt,
      priority: cardEl.dataset.priority || null,
      dueDate: cardEl.dataset.dueDate || null,
      tags: JSON.parse(cardEl.dataset.tags || '[]'),
    }));
  });

  await supabaseClient.from('kanban_boards').upsert({
    user_id: boardOwnerId,
    data: state,
    updated_at: new Date().toISOString(),
  });
}

function reloadBoard(state) {
  ['todo', 'inprogress', 'done'].forEach(columnId => {
    const cardList = getCardList(columnId);
    cardList.innerHTML = '';
    (state[columnId] || []).forEach(card => createCard(columnId, card.text, card.id, card));
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

function createCard(columnId, text, id, cardData = {}) {
  const cardEl = document.createElement('div');
  cardEl.className = 'card';
  cardEl.id = id || `card-${crypto.randomUUID()}`;
  cardEl.draggable = true;
  cardEl.dataset.createdAt = cardData.createdAt || new Date().toISOString();
  cardEl.dataset.priority = cardData.priority || '';
  cardEl.dataset.dueDate = cardData.dueDate || '';
  cardEl.dataset.tags = cardData.tags ? JSON.stringify(cardData.tags) : '[]';

  const headerEl = document.createElement('div');
  headerEl.className = 'card-header';

  const textEl = document.createElement('span');
  textEl.className = 'card-text';
  textEl.textContent = text;

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'card-delete';
  deleteBtn.textContent = '×';
  deleteBtn.setAttribute('aria-label', '카드 삭제');

  headerEl.appendChild(textEl);
  headerEl.appendChild(deleteBtn);

  const badgesEl = document.createElement('div');
  badgesEl.className = 'card-badges';

  cardEl.appendChild(headerEl);
  cardEl.appendChild(badgesEl);

  renderCardBadges(cardEl);

  deleteBtn.addEventListener('click', e => {
    e.stopPropagation();
    deleteCard(cardEl);
  });
  cardEl.addEventListener('click', () => {
    if (!_wasDragged) openCardModal(cardEl);
  });
  cardEl.addEventListener('dragstart', onDragStart);
  cardEl.addEventListener('dragend', onDragEnd);

  getCardList(columnId).appendChild(cardEl);
  updateCardCount(columnId);
}

async function deleteCard(cardEl) {
  const columnId = cardEl.closest('.column').dataset.column;
  const text = cardEl.querySelector('.card-text').textContent;
  cardEl.remove();
  updateCardCount(columnId);
  await saveBoard();
  await logActivity('card_deleted', text);
}

// ── 카드 모달 ──────────────────────────────────────────────

function openCardModal(cardEl) {
  activeCardEl = cardEl;
  document.getElementById('modal-text').value = cardEl.querySelector('.card-text').textContent;
  document.getElementById('modal-priority').value = cardEl.dataset.priority || '';
  document.getElementById('modal-due-date').value = cardEl.dataset.dueDate || '';
  const tags = JSON.parse(cardEl.dataset.tags || '[]');
  document.getElementById('modal-tags').value = tags.join(', ');
  document.getElementById('card-modal').classList.remove('hidden');
}

function closeCardModal() {
  document.getElementById('card-modal').classList.add('hidden');
  activeCardEl = null;
}

async function saveCardModal() {
  if (!activeCardEl) return;
  const text = document.getElementById('modal-text').value.trim();
  if (!text) return;

  activeCardEl.querySelector('.card-text').textContent = text;
  activeCardEl.dataset.priority = document.getElementById('modal-priority').value;
  activeCardEl.dataset.dueDate = document.getElementById('modal-due-date').value;
  const tagsRaw = document.getElementById('modal-tags').value;
  activeCardEl.dataset.tags = JSON.stringify(
    tagsRaw.split(',').map(t => t.trim()).filter(t => t)
  );

  renderCardBadges(activeCardEl);
  closeCardModal();
  await saveBoard();
}

function renderCardBadges(cardEl) {
  const badgesEl = cardEl.querySelector('.card-badges');
  badgesEl.innerHTML = '';

  const priority = cardEl.dataset.priority;
  const dueDate = cardEl.dataset.dueDate;
  const tags = JSON.parse(cardEl.dataset.tags || '[]');

  if (priority) {
    const colors = { high: '#EF4444', medium: '#F59E0B', low: '#10B981' };
    const labels = { high: '높음', medium: '보통', low: '낮음' };
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.style.backgroundColor = colors[priority];
    badge.textContent = labels[priority];
    badgesEl.appendChild(badge);
  }

  if (dueDate) {
    const badge = document.createElement('span');
    badge.className = 'badge badge-due';
    const today = new Date().toISOString().split('T')[0];
    if (dueDate < today) badge.classList.add('overdue');
    badge.textContent = dueDate;
    badgesEl.appendChild(badge);
  }

  tags.forEach(tag => {
    const badge = document.createElement('span');
    badge.className = 'badge badge-tag';
    badge.textContent = tag;
    badgesEl.appendChild(badge);
  });
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
  await logActivity('card_added', text);
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
  _wasDragged = true;
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
  setTimeout(() => { _wasDragged = false; }, 0);
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
  const text = cardEl.querySelector('.card-text').textContent;

  getCardList(targetColumnId).appendChild(cardEl);

  if (sourceColumnId !== targetColumnId) {
    updateCardCount(sourceColumnId);
    updateCardCount(targetColumnId);
    await saveBoard();
    await logActivity('card_moved', text, sourceColumnId, targetColumnId);
  } else {
    await saveBoard();
  }
}

// ── 활동 로그 ─────────────────────────────────────────────

async function loadActivityLog() {
  const { data } = await supabaseClient
    .from('activity_logs')
    .select('*')
    .eq('board_owner_id', boardOwnerId)
    .order('created_at', { ascending: false })
    .limit(50);

  const logList = document.getElementById('log-list');
  logList.innerHTML = '';
  (data || []).forEach(log => logList.appendChild(renderLogItem(log)));
}

function renderLogItem(log) {
  const li = document.createElement('li');
  li.className = 'log-item';
  const msgs = {
    card_added: '카드를 추가했습니다',
    card_deleted: '카드를 삭제했습니다',
    card_moved: `${columnLabel(log.from_column)} → ${columnLabel(log.to_column)} 이동했습니다`,
  };
  const time = new Date(log.created_at).toLocaleString('ko-KR', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  li.innerHTML = `
    <div class="log-actor">${log.actor_email}</div>
    <div class="log-message">「${log.card_text}」 ${msgs[log.action] || log.action}</div>
    <div class="log-time">${time}</div>
  `;
  return li;
}

function columnLabel(columnId) {
  const labels = { todo: 'To-Do', inprogress: 'In-Progress', done: 'Done' };
  return labels[columnId] || columnId;
}

async function logActivity(action, cardText, fromColumn = null, toColumn = null) {
  await supabaseClient.from('activity_logs').insert({
    board_owner_id: boardOwnerId,
    actor_id: currentUser.id,
    actor_email: currentUser.email,
    action,
    card_text: cardText,
    from_column: fromColumn,
    to_column: toColumn,
  });
}

function toggleLogPanel() {
  document.getElementById('log-panel').classList.toggle('hidden');
}

function prependLogItem(log) {
  document.getElementById('log-list').prepend(renderLogItem(log));
}

// ── 링크 공유 ─────────────────────────────────────────────

async function generateInviteLink() {
  const { data, error } = await supabaseClient
    .from('board_invites')
    .insert({ board_owner_id: currentUser.id })
    .select('id')
    .single();

  if (error) {
    alert('링크 생성에 실패했습니다.');
    return;
  }

  const inviteUrl = new URL(`invite.html?token=${data.id}`, window.location.href).href;
  await navigator.clipboard.writeText(inviteUrl);

  const btn = document.getElementById('share-btn');
  const original = btn.textContent;
  btn.textContent = '복사됨!';
  setTimeout(() => { btn.textContent = original; }, 2000);
}

async function processPendingInvite() {
  const token = sessionStorage.getItem('pendingInviteToken');
  if (!token) return;
  sessionStorage.removeItem('pendingInviteToken');

  const { data } = await supabaseClient
    .from('board_invites')
    .select('board_owner_id')
    .eq('id', token)
    .single();

  if (!data || data.board_owner_id === currentUser.id) return;

  await supabaseClient.from('board_members').upsert({
    board_owner_id: data.board_owner_id,
    member_id: currentUser.id,
  });

  window.location.href = new URL(`index.html?board=${data.board_owner_id}`, window.location.href).href;
}

// ── 실시간 동기화 ─────────────────────────────────────────

function initRealtime() {
  supabaseClient.channel('board-sync')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'kanban_boards',
      filter: `user_id=eq.${boardOwnerId}`,
    }, payload => {
      if (_justSaved) {
        _justSaved = false;
        return;
      }
      if (payload.new && payload.new.data) {
        reloadBoard(payload.new.data);
      }
    })
    .subscribe();

  supabaseClient.channel('log-sync')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'activity_logs',
      filter: `board_owner_id=eq.${boardOwnerId}`,
    }, payload => prependLogItem(payload.new))
    .subscribe();
}

// ── 프레전스 ──────────────────────────────────────────────

function initPresence() {
  const channel = supabaseClient.channel(`presence-${boardOwnerId}`);
  channel
    .on('presence', { event: 'sync' }, () => renderAvatars(channel.presenceState()))
    .subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: currentUser.id, email: currentUser.email });
      }
    });
}

function renderAvatars(state) {
  const container = document.getElementById('avatars');
  container.innerHTML = '';
  const seen = new Set();
  Object.values(state).forEach(presences => {
    presences.forEach(p => {
      if (seen.has(p.user_id)) return;
      seen.add(p.user_id);
      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      avatar.textContent = (p.email || '?')[0].toUpperCase();
      avatar.title = p.email;
      container.appendChild(avatar);
    });
  });
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
