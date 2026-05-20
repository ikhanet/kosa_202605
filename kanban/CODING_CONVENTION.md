# Coding Convention & Collaboration Guide

---

## 1. 파일 구성 원칙

- HTML / CSS / JS는 반드시 **별도 파일**로 분리한다.
- `<style>` 태그, `<script>` 인라인 코드는 사용하지 않는다.
- 파일명은 소문자 + 하이픈: `index.html`, `style.css`, `script.js`

---

## 2. HTML 컨벤션

### 2.1 구조

```html
<!-- 컬럼 구분: data-column 속성 사용 -->
<div class="column" data-column="todo">...</div>
<div class="column" data-column="inprogress">...</div>
<div class="column" data-column="done">...</div>

<!-- 카드: id는 고유값, draggable 명시 -->
<div class="card" id="card-{uuid}" draggable="true">...</div>
```

### 2.2 규칙

- 들여쓰기: **공백 2칸**
- 속성 순서: `id` → `class` → `data-*` → 기타
- 불리언 속성은 값 생략: `draggable="true"` (DnD API는 문자열 필요하므로 예외)
- 시맨틱 태그 우선: `<button>`, `<textarea>`, `<header>`

---

## 3. CSS 컨벤션

### 3.1 CSS 변수

모든 색상, 간격, 그림자는 `:root`에 선언된 CSS 변수를 사용한다.

```css
/* ✅ 올바른 사용 */
background-color: var(--color-todo);

/* ❌ 하드코딩 금지 */
background-color: #3B82F6;
```

### 3.2 선택자 & 클래스 이름

- 클래스명: **케밥 케이스** (`card-list`, `btn-add`, `drag-over`)
- ID: JS에서 카드 식별용으로만 사용 (`card-{uuid}`)
- 선택자 깊이: 최대 3단계 (`  .column .card .card-delete`)
- `!important` 사용 금지

### 3.3 선언 순서

```css
.card {
  /* 1. 위치 */
  position: relative;
  /* 2. 박스 모델 */
  display: flex;
  width: 100%;
  padding: var(--space-md);
  margin-bottom: var(--space-sm);
  /* 3. 시각 */
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-card);
  /* 4. 타이포 */
  font-size: var(--font-md);
  color: var(--color-text-primary);
  /* 5. 기타 */
  cursor: grab;
  transition: transform 150ms ease, box-shadow 150ms ease;
}
```

### 3.4 들여쓰기

- 공백 **2칸**

---

## 4. JavaScript 컨벤션

### 4.1 기본 스타일

- **ES6+** 문법 사용 (`const`, `let`, 화살표 함수, 템플릿 리터럴)
- `var` 사용 금지
- 세미콜론 **필수**
- 들여쓰기: **공백 2칸**

### 4.2 변수 / 함수 이름

| 종류 | 규칙 | 예시 |
|------|------|------|
| 변수 | camelCase | `cardList`, `columnId` |
| 함수 | camelCase + 동사 접두사 | `createCard()`, `saveBoard()` |
| 상수 | UPPER_SNAKE_CASE | `STORAGE_KEY` |
| DOM 요소 | 접미사 `El` | `cardEl`, `columnEl` |
| 이벤트 핸들러 | `on` 접두사 | `onDragStart()`, `onDrop()` |

### 4.3 함수 설계 원칙

- 함수 하나는 **한 가지 일**만 한다.
- 매개변수는 최대 3개, 초과 시 객체로 묶는다.
- DOM 조작과 데이터 저장을 한 함수에 섞지 않는다.

```js
// ✅ 올바른 분리
function createCard(columnId, text) { /* DOM 생성만 */ }
function saveBoard() { /* localStorage 저장만 */ }

// ❌ 한 함수에 혼합
function addCardAndSave(columnId, text) { /* DOM 생성 + 저장 */ }
```

### 4.4 DOM 조회

- `querySelector` / `querySelectorAll` 사용
- 자주 쓰는 요소는 변수에 저장 (반복 조회 금지)

```js
// ✅ 한 번 조회 후 재사용
const column = document.querySelector(`[data-column="${columnId}"]`);
const cardList = column.querySelector('.card-list');

// ❌ 반복 조회
document.querySelector('.card-list').append(...);
document.querySelector('.card-list').style...;
```

### 4.5 이벤트 위임

카드 이벤트는 **이벤트 위임**을 사용하지 않고, 카드 생성 시 직접 바인딩한다.  
(카드 수가 적고 동적 생성이 명확한 구조이므로)

```js
function createCard(columnId, text) {
  const cardEl = document.createElement('div');
  cardEl.addEventListener('dragstart', onDragStart);
  // ...
}
```

### 4.6 에러 처리

- 사용자 입력 유효성만 검사한다.
- 내부 함수 간 호출에는 불필요한 try-catch를 추가하지 않는다.

```js
// ✅ 입력 유효성만
function confirmAddCard(columnId, text) {
  if (!text.trim()) return;  // 빈 입력 차단
  createCard(columnId, text.trim());
  saveBoard();
}
```

---

## 5. Git 커밋 컨벤션

`type(scope):` 는 영문, 설명은 한글로 작성한다.

```
feat(kanban): 칸반보드 HTML 마크업 초안 작성
feat(kanban): 드래그 앤 드롭 기능 구현
feat(kanban): localStorage 데이터 영속성 추가
style(kanban): CSS 변수 기반 디자인 시스템 적용
fix(kanban): 드롭 후 drag-over 클래스 미제거 버그 수정
docs(kanban): PRD, TRD, 디자인 시스템 문서 추가
```

### type 종류

| type | 용도 |
|------|------|
| `feat` | 새 기능 추가 |
| `fix` | 버그 수정 |
| `style` | 코드 의미 변경 없는 스타일/포맷 수정 |
| `refactor` | 기능 변경 없는 리팩터링 |
| `docs` | 문서 추가/수정 |
| `chore` | 빌드, 설정 등 기타 작업 |

---

## 6. 협업 가이드

### 6.1 브랜치 전략

이 프로젝트는 모노레포 내 개인 폴더 작업이므로 `main` 브랜치에 직접 커밋한다.

### 6.2 Pull 정책

원격 변경사항 통합은 **반드시 merge**를 사용한다.

```bash
git pull --no-rebase origin main
```

`git pull --rebase`, `git rebase`는 **절대 사용하지 않는다.**

### 6.3 스테이징

```bash
# ✅ 명시적 경로 지정
git add src/exercise/ikhanet/day03/kanban/

# ❌ 전체 추가 금지 (이웃 폴더 파일 실수 방지)
git add -A
git add .
```

### 6.4 코드 리뷰 체크리스트

- [ ] CSS 변수 미사용 하드코딩 색상 없음
- [ ] 함수가 단일 책임을 갖고 있음
- [ ] `var` 사용 없음
- [ ] 불필요한 console.log 제거됨
- [ ] 커밋 메시지 형식 준수 (`type(scope): 한글 설명`)

---

## 7. 로컬 실행 방법

```bash
cd src/exercise/ikhanet/day03/kanban
python3 -m http.server 8765
# 브라우저에서 http://localhost:8765/index.html 접속
```
