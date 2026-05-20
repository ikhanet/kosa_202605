// ── Supabase 초기화 ──────────────────────────────────────────
const SUPABASE_URL = 'https://wkxczksgfxuhmfsulwkm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreGN6a3NnZnh1aG1mc3Vsd2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDQ4MTAsImV4cCI6MjA5NDc4MDgxMH0.T5coBuHXUChj0ty01ILMpu696BNnpdvxudTuOdxFHTY';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── 상태 ─────────────────────────────────────────────────────
let todos = [];
let currentFilter = 'all';
let dragId = null;
let currentUser = null;

// ── DOM 참조 ─────────────────────────────────────────────────
const todoList         = document.getElementById('todo-list');
const todoInput        = document.getElementById('todo-input');
const prioritySelect   = document.getElementById('priority-select');
const addBtn           = document.getElementById('add-btn');
const emptyState       = document.getElementById('empty-state');
const progressFill     = document.getElementById('progress-fill');
const progressPercent  = document.getElementById('progress-percent');
const statTotal        = document.getElementById('stat-total');
const statDone         = document.getElementById('stat-done');
const statActive       = document.getElementById('stat-active');
const authScreen       = document.getElementById('auth-screen');
const authForm         = document.getElementById('auth-form');
const authEmail        = document.getElementById('auth-email');
const authPassword     = document.getElementById('auth-password');
const authSubmit       = document.getElementById('auth-submit');
const authMessage      = document.getElementById('auth-message');
const userEmailDisplay = document.getElementById('user-email-display');
const logoutBtn        = document.getElementById('logout-btn');

// ── 화면 전환 ─────────────────────────────────────────────────
function showLogin() {
  authScreen.classList.add('visible');
  currentUser = null;
  todos = [];
  renderTodos();
}

function showApp(user) {
  authScreen.classList.remove('visible');
  currentUser = user;
  userEmailDisplay.textContent = user.email;
}

// ── 인증 ─────────────────────────────────────────────────────
let currentTab = 'login';

document.querySelector('.auth-tabs').addEventListener('click', e => {
  const tab = e.target.closest('.auth-tab');
  if (!tab) return;
  currentTab = tab.dataset.tab;
  document.querySelectorAll('.auth-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === currentTab)
  );
  authSubmit.textContent = currentTab === 'login' ? '로그인' : '가입하기';
  authMessage.textContent = '';
});

authForm.addEventListener('submit', async e => {
  e.preventDefault();
  authSubmit.disabled = true;
  authMessage.textContent = '';

  const email    = authEmail.value.trim();
  const password = authPassword.value;

  let error;
  if (currentTab === 'login') {
    ({ error } = await db.auth.signInWithPassword({ email, password }));
  } else {
    ({ error } = await db.auth.signUp({ email, password }));
    if (!error) {
      authMessage.textContent = '가입 완료! 이메일을 확인하거나 바로 로그인하세요.';
    }
  }

  if (error) {
    const MSG = {
      'Invalid login credentials':            '이메일 또는 비밀번호가 올바르지 않습니다.',
      'Email not confirmed':                   '이메일 인증이 필요합니다. 받은 편지함을 확인하세요.',
      'User already registered':              '이미 가입된 이메일입니다. 로그인 탭을 이용하세요.',
      'Password should be at least 6 characters': '비밀번호는 6자 이상이어야 합니다.',
      'email rate limit exceeded':            '이메일 발송 한도를 초과했습니다. 잠시 후 다시 시도하세요.',
    };
    authMessage.textContent = MSG[error.message] ?? error.message;
  }
  authSubmit.disabled = false;
});

logoutBtn.addEventListener('click', () => db.auth.signOut());

document.getElementById('google-btn').addEventListener('click', async () => {
  const { error } = await db.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href }
  });
  if (error) authMessage.textContent = error.message;
});

document.getElementById('github-btn').addEventListener('click', async () => {
  const { error } = await db.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: window.location.href }
  });
  if (error) authMessage.textContent = error.message;
});

// 로그인 상태 변경 감지 (초기 세션 복원 포함)
db.auth.onAuthStateChange((event, session) => {
  if (session) {
    showApp(session.user);
    loadTodos();
  } else {
    showLogin();
  }
});

// ── Supabase CRUD ─────────────────────────────────────────────
async function loadTodos() {
  const { data, error } = await db.from('todos').select('*').order('position');
  if (error) { console.error(error); return; }
  todos = data;
  renderTodos();
}

async function addTodo(text) {
  if (!text) return;
  const priority = prioritySelect.value;
  const position = todos.length > 0 ? Math.max(...todos.map(t => t.position)) + 1 : 0;

  const { data, error } = await db.from('todos')
    .insert({ user_id: currentUser.id, text, completed: false, priority, position })
    .select()
    .single();

  if (error) { console.error(error); return; }
  todos.push(data);
  renderTodos();
  todoInput.value = '';
  todoInput.focus();
}

async function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;
  const { error } = await db.from('todos')
    .update({ completed: !todo.completed })
    .eq('id', id);
  if (error) { console.error(error); return; }
  todo.completed = !todo.completed;
  renderTodos();
}

async function changePriority(id) {
  const CYCLE = { high: 'medium', medium: 'low', low: 'high' };
  const todo = todos.find(t => t.id === id);
  if (!todo) return;
  const next = CYCLE[todo.priority || 'medium'];
  const { error } = await db.from('todos').update({ priority: next }).eq('id', id);
  if (error) { console.error(error); return; }
  todo.priority = next;
  renderTodos();
}

async function deleteTodo(id, li) {
  li.classList.add('collapsing');
  li.addEventListener('animationend', async () => {
    const { error } = await db.from('todos').delete().eq('id', id);
    if (error) { console.error(error); return; }
    todos = todos.filter(t => t.id !== id);
    renderTodos();
  }, { once: true });
}

async function dropTodo(draggedId, targetId, position) {
  const draggedTodo = todos.find(t => t.id === draggedId);
  const targetTodo  = todos.find(t => t.id === targetId);
  if (!draggedTodo || !targetTodo) return;

  draggedTodo.priority = targetTodo.priority;
  todos = todos.filter(t => t.id !== draggedId);
  const targetIndex = todos.findIndex(t => t.id === targetId);
  todos.splice(position === 'before' ? targetIndex : targetIndex + 1, 0, draggedTodo);

  // 전체 순서 재계산 후 개별 update
  todos.forEach((t, i) => { t.position = i; });
  const results = await Promise.all(
    todos.map(t => db.from('todos').update({ position: t.position, priority: t.priority }).eq('id', t.id))
  );
  const failed = results.find(r => r.error);
  if (failed) { console.error(failed.error); return; }
  renderTodos();
}

// ── 렌더링 ───────────────────────────────────────────────────
const PRIORITY_LABEL = { high: '높음', medium: '중간', low: '낮음' };
const PRIORITY_CYCLE = { high: 'medium', medium: 'low', low: 'high' };

function createTodoItem(todo) {
  const priority = todo.priority || 'medium';
  const li = document.createElement('li');
  li.className = `todo-item priority-${priority}` + (todo.completed ? ' done' : '');
  li.dataset.id = todo.id;
  li.draggable = true;

  const handle = document.createElement('span');
  handle.className = 'drag-handle';
  handle.textContent = '⠿';
  handle.setAttribute('aria-hidden', 'true');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'todo-checkbox';
  checkbox.checked = todo.completed;

  const span = document.createElement('span');
  span.className = 'todo-text';
  span.textContent = todo.text;

  const badge = document.createElement('span');
  badge.className = 'priority-badge';
  badge.textContent = PRIORITY_LABEL[priority];
  badge.title = '클릭하여 우선순위 변경';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = '🗑';
  deleteBtn.setAttribute('aria-label', '삭제');

  li.addEventListener('dragstart', e => {
    dragId = todo.id;
    e.dataTransfer.effectAllowed = 'move';
    requestAnimationFrame(() => li.classList.add('dragging'));
  });

  li.addEventListener('dragend', () => {
    dragId = null;
    li.classList.remove('dragging');
    clearDropIndicators();
  });

  li.appendChild(handle);
  li.appendChild(checkbox);
  li.appendChild(span);
  li.appendChild(badge);
  li.appendChild(deleteBtn);
  return li;
}

function getFilteredTodos() {
  if (currentFilter === 'active') return todos.filter(t => !t.completed);
  if (currentFilter === 'done')   return todos.filter(t => t.completed);
  return todos;
}

function updateStats() {
  const total   = todos.length;
  const done    = todos.filter(t => t.completed).length;
  const active  = total - done;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  statTotal.textContent        = total;
  statDone.textContent         = done;
  statActive.textContent       = active;
  progressFill.style.width     = percent + '%';
  progressPercent.textContent  = percent + '%';
}

function renderTodos() {
  const filtered = getFilteredTodos();
  todoList.innerHTML = '';
  filtered.forEach(todo => todoList.appendChild(createTodoItem(todo)));
  emptyState.classList.toggle('visible', filtered.length === 0);
  updateStats();
}

function clearDropIndicators() {
  todoList.querySelectorAll('.todo-item').forEach(el =>
    el.classList.remove('drop-before', 'drop-after')
  );
}

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.filter === filter)
  );
  renderTodos();
}

// ── 이벤트 리스너 ─────────────────────────────────────────────
addBtn.addEventListener('click', () => addTodo(todoInput.value.trim()));

todoInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addTodo(todoInput.value.trim());
});

document.querySelector('.filter-buttons').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (btn) setFilter(btn.dataset.filter);
});

todoList.addEventListener('change', e => {
  if (e.target.classList.contains('todo-checkbox')) {
    const li = e.target.closest('.todo-item');
    toggleTodo(Number(li.dataset.id));
  }
});

todoList.addEventListener('click', e => {
  const li = e.target.closest('.todo-item');
  if (!li) return;
  if (e.target.classList.contains('delete-btn'))
    deleteTodo(Number(li.dataset.id), li);
  else if (e.target.classList.contains('priority-badge'))
    changePriority(Number(li.dataset.id));
});

todoList.addEventListener('dragover', e => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const targetLi = e.target.closest('.todo-item');
  if (!targetLi || Number(targetLi.dataset.id) === dragId) return;
  const rect = targetLi.getBoundingClientRect();
  const pos  = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
  clearDropIndicators();
  targetLi.classList.add(pos === 'before' ? 'drop-before' : 'drop-after');
});

todoList.addEventListener('dragleave', e => {
  if (!todoList.contains(e.relatedTarget)) clearDropIndicators();
});

todoList.addEventListener('drop', e => {
  e.preventDefault();
  const targetLi = e.target.closest('.todo-item');
  if (!targetLi || !dragId) return;
  const targetId = Number(targetLi.dataset.id);
  if (targetId === dragId) return;
  const rect = targetLi.getBoundingClientRect();
  const pos  = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
  dropTodo(dragId, targetId, pos);
});
