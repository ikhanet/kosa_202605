# TRD — 기술 요구사항 정의서

## 1. 기술 스택

| 구분 | 기술 | 비고 |
|------|------|------|
| 마크업 | HTML5 | Semantic 태그 사용 |
| 스타일 | CSS3 | Flexbox 레이아웃, CSS 변수 |
| 동작 | Vanilla JavaScript (ES6+) | 외부 라이브러리 없음 |
| 인증 | Supabase Auth | Google / GitHub OAuth, 이메일+비밀번호 |
| 데이터 | Supabase PostgreSQL | 사용자별 클라우드 저장 (JSONB) |
| SDK | `@supabase/supabase-js v2` | CDN 로드 |
| 드래그 | HTML5 Drag and Drop API | 네이티브 브라우저 API |
| 서버 | `python3 -m http.server` | 로컬 개발 전용 |

---

## 2. 파일 구조

```
kanban/
├── index.html          ← 칸반보드 진입점 (로그인 필요)
├── login.html          ← 로그인 페이지 (Google / GitHub / 이메일)
├── style.css           ← 전체 스타일 (보드 + 로그인 페이지)
├── script.js           ← 보드 동작 로직 (DnD, CRUD, Supabase DB)
├── auth.js             ← Supabase 클라이언트 + 인증 유틸
├── login.js            ← 로그인 페이지 동작 로직
├── config.js           ← Supabase URL / anon key 설정
├── CLAUDE.md
├── PLAN.md
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

```html
<div class="board">
  <div class="column" data-column="todo">
    <div class="column-header">...</div>
    <div class="card-list">
      <div class="card" id="card-{uuid}" draggable="true">
        <span class="card-text">...</span>
        <button class="card-delete">×</button>
      </div>
    </div>
    <div class="add-card-area">
      <button class="btn-add">+ 카드 추가</button>
      <div class="card-input-form" hidden>
        <textarea class="card-input"></textarea>
        <div class="input-actions">
          <button class="btn-confirm">추가</button>
          <button class="btn-cancel">취소</button>
        </div>
      </div>
    </div>
  </div>
  <!-- .column[data-column="inprogress"], .column[data-column="done"] 동일 구조 -->
</div>
```

---

## 4. JavaScript 모듈 명세

### 4.1 데이터 구조

```js
// Supabase kanban_boards.data 컬럼 (JSONB)
{
  "todo":       [ { id, text, createdAt }, ... ],
  "inprogress": [ { id, text, createdAt }, ... ],
  "done":       [ { id, text, createdAt }, ... ]
}
```

### 4.2 핵심 함수

#### `auth.js`

| 함수명 | 역할 |
|--------|------|
| `requireAuth()` | 세션 없으면 `login.html`로 리다이렉트, 있으면 session 반환 |
| `getUser()` | 현재 로그인 사용자 정보 반환 |
| `signOut()` | 로그아웃 후 `login.html`로 이동 |

#### `script.js`

| 함수명 | 역할 |
|--------|------|
| `loadBoard()` | Supabase → DOM 렌더링 (async, 초기 진입 시 호출) |
| `saveBoard()` | 현재 DOM 상태 → Supabase upsert (async) |
| `setSampleCards()` | 신규 사용자 첫 로그인 시 예시 카드 생성 (async) |
| `createCard(columnId, text)` | 카드 DOM 요소 생성 + 이벤트 바인딩 + 렌더링 |
| `deleteCard(cardEl)` | 카드 DOM 제거 + saveBoard() |
| `openInputForm(columnId)` | 인라인 입력창 표시 |
| `closeInputForm(columnId)` | 인라인 입력창 숨김 |
| `onDragStart(e)` | `dataTransfer`에 카드 ID 저장, 드래그 스타일 적용 |
| `onDragOver(e)` | `preventDefault()`, 컬럼 하이라이트 |
| `onDragLeave(e)` | 컬럼 하이라이트 제거 |
| `onDrop(e)` | 카드 이동 + saveBoard() (async) |
| `onDragEnd(e)` | 드래그 스타일 초기화 |

#### `login.js`

| 함수명 | 역할 |
|--------|------|
| `showError(msg)` | 에러 메시지 표시 |
| `showMessage(msg)` | 성공 메시지 표시 |

### 4.3 이벤트 흐름

```
[dragstart] → dataTransfer.set(cardId)
           → requestAnimationFrame(() => card.classList.add('dragging'))
             ※ rAF: 드래그 고스트에 반투명이 반영되지 않도록 다음 프레임에 적용

[dragover]  → e.preventDefault()
           → column.classList.add('drag-over')

[dragleave] → contains(relatedTarget) 체크
           → 자식 요소 이동 시 불필요한 하이라이트 제거 방지
           → column.classList.remove('drag-over')

[drop]      → dataTransfer.get(cardId)
           → column.querySelector('.card-list').append(card)
           → column.classList.remove('drag-over')
           → saveBoard()

[dragend]   → card.classList.remove('dragging')
```

---

## 5. CSS 아키텍처

- CSS 변수(`:root`)로 색상·간격·폰트 크기를 중앙 관리
- BEM 없이 단순 클래스 네이밍 사용 (소규모 프로젝트)
- 반응형: 브라우저 최소 너비 768px 기준, 이하에서는 컬럼 세로 배치

---

## 6. 브라우저 지원

| 브라우저 | 최소 버전 |
|----------|-----------|
| Chrome | 80+ |
| Firefox | 75+ |
| Edge | 80+ |
| Safari | 14+ (드래그 제한 있을 수 있음) |

> HTML5 Drag and Drop API는 모바일 브라우저에서 지원되지 않는다.

---

## 7. 성능 요구사항

- 초기 로드: 100ms 이내 (로컬 파일 기준)
- 카드 CRUD 작업: 즉각 반응 (DOM 조작 + localStorage write)
- 최대 카드 수: 컬럼당 50개 이내 권장 (localStorage 용량 제한 없음, DOM 성능 기준)
