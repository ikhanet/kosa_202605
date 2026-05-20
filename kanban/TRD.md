# TRD — 기술 요구사항 정의서

## 1. 기술 스택

| 구분 | 기술 | 비고 |
|------|------|------|
| 마크업 | HTML5 | Semantic 태그 사용 |
| 스타일 | CSS3 | Flexbox 레이아웃, CSS 변수 |
| 동작 | Vanilla JavaScript (ES6+) | Supabase SDK 외 외부 라이브러리 없음 |
| 인증 | Supabase Auth | Google / GitHub OAuth, 이메일+비밀번호 |
| 데이터 | Supabase PostgreSQL | 사용자별 클라우드 저장 (JSONB) |
| 실시간 | Supabase Realtime | postgres_changes + Presence |
| SDK | `@supabase/supabase-js v2` | CDN 로드 |
| 드래그 | HTML5 Drag and Drop API | 네이티브 브라우저 API |
| 서버 | `python3 -m http.server` | 로컬 개발 전용 |

---

## 2. 파일 구조

```
kanban/
├── index.html              ← 칸반보드 진입점 (로그인 필요)
├── login.html              ← 로그인 페이지 (Google / GitHub / 이메일)
├── invite.html             ← 초대 링크 처리 페이지
├── style.css               ← 전체 스타일 (보드 + 로그인 + 모달 + 패널)
├── script.js               ← 보드 동작 로직 (DnD, CRUD, 협업, 실시간)
├── auth.js                 ← Supabase 클라이언트 + 인증 유틸
├── login.js                ← 로그인 페이지 동작 로직
├── invite.js               ← 초대 토큰 처리 로직
├── config.js               ← Supabase URL / anon key 설정
├── supabase_migration.sql  ← v1.2 스키마 마이그레이션 SQL
├── CLAUDE.md
├── PLAN.md
├── PLAN_1.2.md
├── PRD.md
├── TRD.md
├── USER_FLOW.md
├── DATABASE_DESIGN.md
├── DESIGN_SYSTEM.md
├── TASKS.md
└── CODING_CONVENTION.md
```

---

## 3. HTML 구조 명세

### index.html

```html
<header class="app-header">
  <h1 class="app-title">칸반보드</h1>
  <div id="avatars" class="avatars"></div>        <!-- 프레전스 아바타 -->
  <div class="user-info">
    <button id="log-toggle">로그</button>         <!-- 사이드패널 토글 -->
    <button id="share-btn">공유 링크 복사</button> <!-- 초대 링크 생성 -->
    <span id="user-email"></span>
    <button id="btn-logout">로그아웃</button>
  </div>
</header>

<main class="board">
  <div class="column" data-column="todo|inprogress|done">
    <div class="column-header">...</div>
    <div class="card-list">
      <div class="card" id="card-{uuid}" draggable="true"
           data-created-at data-priority data-due-date data-tags>
        <div class="card-header">
          <span class="card-text">...</span>
          <button class="card-delete">×</button>
        </div>
        <div class="card-badges">
          <!-- .badge (priority), .badge-due, .badge-tag -->
        </div>
      </div>
    </div>
    <div class="add-card-area">...</div>
  </div>
</main>

<!-- 카드 상세 모달 -->
<div id="card-modal" class="modal-overlay hidden">
  <div class="modal">
    <h3 class="modal-title">카드 상세</h3>
    <textarea id="modal-text"></textarea>
    <div class="modal-field">우선순위 select</div>
    <div class="modal-field">마감일 date input</div>
    <div class="modal-field">태그 text input</div>
    <div class="modal-actions">
      <button id="modal-cancel"></button>
      <button id="modal-save"></button>
    </div>
  </div>
</div>

<!-- 활동 로그 사이드패널 -->
<aside id="log-panel" class="log-panel hidden">
  <div class="log-panel-header">
    <span>활동 로그</span>
    <button id="log-close">✕</button>
  </div>
  <ul id="log-list" class="log-list"></ul>
</aside>
```

---

## 4. JavaScript 모듈 명세

### 4.1 데이터 구조

```js
// Supabase kanban_boards.data 컬럼 (JSONB) — v1.2
{
  "todo": [
    {
      "id": "card-{uuid}",
      "text": "카드 내용",
      "createdAt": "2026-05-20T09:00:00.000Z",
      "priority": "high | medium | low | null",
      "dueDate": "2026-06-01 | null",
      "tags": ["태그1", "태그2"]
    }
  ],
  "inprogress": [...],
  "done": [...]
}
```

### 4.2 전역 변수

| 변수 | 타입 | 설명 |
|------|------|------|
| `draggingCardEl` | Element | 현재 드래그 중인 카드 요소 |
| `activeCardEl` | Element | 모달이 열려 있는 카드 요소 |
| `currentUser` | Object | Supabase Auth 사용자 객체 |
| `boardOwnerId` | string | 현재 보고 있는 보드의 소유자 UUID |
| `_wasDragged` | boolean | 드래그 후 click 이벤트 차단용 플래그 |
| `_justSaved` | boolean | 내 저장에 의한 실시간 이벤트 무시용 플래그 |

### 4.3 핵심 함수

#### `auth.js`

| 함수명 | 역할 |
|--------|------|
| `requireAuth()` | 세션 없으면 `login.html`로 리다이렉트 |
| `getUser()` | 현재 로그인 사용자 정보 반환 |
| `signOut()` | 로그아웃 후 `login.html`로 이동 |

#### `script.js`

| 함수명 | 역할 |
|--------|------|
| `loadBoard()` | Supabase → DOM 렌더링 |
| `saveBoard()` | 현재 DOM 상태 → Supabase upsert |
| `reloadBoard(state)` | 실시간 수신 데이터로 보드 재렌더링 |
| `createCard(columnId, text, id, cardData)` | 카드 DOM + 이벤트 바인딩 |
| `deleteCard(cardEl)` | 카드 DOM 제거 + saveBoard + logActivity |
| `openCardModal(cardEl)` | 카드 상세 모달 열기 |
| `closeCardModal()` | 모달 닫기 |
| `saveCardModal()` | 모달 내용 카드에 반영 + saveBoard |
| `renderCardBadges(cardEl)` | 우선순위/마감일/태그 배지 렌더링 |
| `confirmAddCard(columnId)` | 입력창 검증 + createCard + logActivity |
| `onDragStart/Over/Leave/Drop/End` | DnD 이벤트 핸들러 |
| `loadActivityLog()` | 활동 로그 50건 조회 후 패널 렌더링 |
| `logActivity(action, cardText, from, to)` | activity_logs INSERT |
| `renderLogItem(log)` | 로그 항목 `<li>` 생성 |
| `toggleLogPanel()` | 사이드패널 열기/닫기 |
| `prependLogItem(log)` | 실시간 수신 로그 항목 패널 앞에 추가 |
| `generateInviteLink()` | board_invites INSERT + 클립보드 복사 |
| `processPendingInvite()` | sessionStorage 토큰 처리 → board_members upsert |
| `initRealtime()` | Supabase Realtime 구독 초기화 |
| `initPresence()` | Presence 채널 구독 + track |
| `renderAvatars(state)` | Presence 상태로 헤더 아바타 렌더링 |

#### `invite.js`

| 흐름 | 설명 |
|------|------|
| 토큰 없음 | "유효하지 않은 링크" 표시 |
| 미로그인 | token → sessionStorage → login.html 이동 |
| 로그인 + 본인 링크 | index.html로 이동 |
| 로그인 + 타인 링크 | board_members upsert → index.html?board=ownerID |

### 4.4 이벤트 흐름

#### 카드 추가
```
[btn-add click] → openInputForm()
[btn-confirm / Enter] → confirmAddCard() → createCard() → saveBoard() → logActivity('card_added')
```

#### 카드 클릭 (모달)
```
[card click] (_wasDragged === false 조건) → openCardModal()
[modal-save click] → saveCardModal() → renderCardBadges() → saveBoard()
[Escape / overlay click / modal-cancel] → closeCardModal()
```

#### 드래그 앤 드롭
```
[dragstart] → _wasDragged=true, dataTransfer.set(cardId), rAF → .dragging
[dragover]  → preventDefault(), .drag-over
[dragleave] → contains() 체크 → .drag-over 제거
[drop]      → card 이동, saveBoard(), logActivity('card_moved') (컬럼 변경 시)
[dragend]   → .dragging 제거, setTimeout → _wasDragged=false
```

#### 실시간 동기화
```
[Realtime postgres_changes: kanban_boards]
  _justSaved=true → skip (내 변경)
  _justSaved=false → reloadBoard(payload.new.data)

[Realtime postgres_changes: activity_logs INSERT]
  → prependLogItem(payload.new)

[Presence sync] → renderAvatars(presenceState())
```

---

## 5. CSS 아키텍처

- CSS 변수(`:root`)로 색상·간격·폰트 크기를 중앙 관리
- BEM 없이 단순 클래스 네이밍 사용
- 반응형: 768px 이하에서 컬럼 세로 배치
- 모달: `position: fixed; inset: 0` — `.hidden` 시 `display: none`
- 사이드패널: `position: fixed; right: 0` — `.hidden` 시 `transform: translateX(100%)`로 슬라이드 아웃

---

## 6. 브라우저 지원

| 브라우저 | 최소 버전 |
|----------|-----------|
| Chrome | 80+ |
| Firefox | 75+ |
| Edge | 80+ |
| Safari | 14+ (드래그 제한 있을 수 있음) |

---

## 7. 성능 요구사항

- 초기 로드: Supabase 네트워크 레이턴시 포함 1초 이내
- 카드 CRUD DOM 반응: 즉각 (DB 저장은 백그라운드 async)
- 최대 카드 수: 컬럼당 50개 이내 권장
- 활동 로그: 최근 50건만 조회 (무한 스크롤 미지원)
