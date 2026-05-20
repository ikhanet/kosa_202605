# TASKS — 구현 작업 목록

## 진행 상태 범례

| 기호 | 의미 |
|------|------|
| `[ ]` | 미완료 |
| `[x]` | 완료 |
| `[-]` | 스킵 / 해당 없음 |

---

## Phase 0. 문서 작성

- [x] PLAN.md 작성
- [x] PRD.md 작성
- [x] TRD.md 작성
- [x] USER_FLOW.md 작성
- [x] DATABASE_DESIGN.md 작성
- [x] DESIGN_SYSTEM.md 작성
- [x] TASKS.md 작성
- [x] CODING_CONVENTION.md 작성

---

## Phase 1. HTML 마크업 (`index.html`)

- [x] **T-01** 기본 HTML5 보일러플레이트 작성 (`<!DOCTYPE html>`, `<head>`, `<body>`)
- [x] **T-02** `style.css`, `script.js` 링크 추가
- [x] **T-03** `.board` 컨테이너 생성
- [x] **T-04** To-Do 컬럼 마크업 작성
  - [x] `.column[data-column="todo"]`
  - [x] `.column-header` (제목 + 카드 수 뱃지)
  - [x] `.card-list` (드롭 대상 영역)
  - [x] `.add-card-area` (버튼 + 입력창)
- [x] **T-05** In-Progress 컬럼 마크업 작성 (T-04와 동일 구조)
- [x] **T-06** Done 컬럼 마크업 작성 (T-04와 동일 구조)
- [x] **T-07** 샘플 카드 3개 초기 배치 (각 컬럼에 1개씩) — `setSampleCards()`로 JS에서 처리

---

## Phase 2. CSS 스타일 (`style.css`)

- [x] **T-08** CSS 변수 선언 (`:root` — DESIGN_SYSTEM.md 기준)
- [x] **T-09** 전역 reset 스타일 (`*, box-sizing: border-box`, margin/padding 초기화)
- [x] **T-10** `.board` 레이아웃 (Flexbox, gap, padding, 배경색)
- [x] **T-11** `.column` 스타일 (너비, 배경, 테두리 반경, 그림자)
- [x] **T-12** `.column-header` 스타일 (컬럼별 색상, 패딩, 텍스트)
- [x] **T-13** `.card-list` 스타일 (최소 높이, 패딩)
- [x] **T-14** `.card` 스타일 (배경, 패딩, 그림자, 반경, cursor: grab)
- [x] **T-15** `.card:hover` 스타일 (translateY, shadow 강화)
- [x] **T-16** `.card.dragging` 스타일 (opacity: 0.4)
- [x] **T-17** `.column.drag-over` 스타일 (배경색, dashed outline 강조)
- [x] **T-18** `.card-delete` 버튼 스타일 및 hover
- [x] **T-19** `.btn-add` 버튼 스타일
- [x] **T-20** `.card-input-form` 스타일 (textarea, 버튼 그룹)
- [x] **T-21** 카드 생성 fadeIn 애니메이션 + slideDown(입력폼) + shake(빈 입력 경고)
- [x] **T-22** 반응형 스타일 (768px 이하: 컬럼 세로 배치)

---

## Phase 3. JavaScript 로직 (`script.js`)

### 초기화

- [x] **T-23** `DOMContentLoaded` 이벤트 리스너 등록
- [x] **T-24** `loadBoard()` — localStorage에서 데이터 읽어 카드 렌더링
- [x] **T-25** 각 컬럼에 `dragover`, `dragleave`, `drop` 이벤트 바인딩

### 카드 CRUD

- [x] **T-26** `createCard(columnId, text)` — 카드 DOM 생성 + 이벤트 바인딩
- [x] **T-27** `deleteCard(cardEl)` — 카드 DOM 제거 + saveBoard()
- [x] **T-28** `openInputForm(columnId)` — 입력창 표시 + 포커스
- [x] **T-29** `closeInputForm(columnId)` — 입력창 숨김 + 초기화
- [x] **T-30** 빈 텍스트 유효성 검사 (shake 애니메이션으로 경고)
- [x] **T-31** Enter 키로 카드 추가, ESC 키로 입력창 닫기

### 드래그 앤 드롭

- [x] **T-32** `onDragStart(e)` — dataTransfer 설정, `requestAnimationFrame`으로 dragging 클래스 추가
- [x] **T-33** `onDragOver(e)` — preventDefault(), drag-over 클래스 추가
- [x] **T-34** `onDragLeave(e)` — `contains(relatedTarget)` 체크로 자식 이동 시 깜빡임 방지
- [x] **T-35** `onDrop(e)` — 카드 이동 + drag-over 제거 + saveBoard()
- [x] **T-36** `onDragEnd(e)` — dragging 클래스 제거

### 데이터 영속성

- [x] **T-37** `saveBoard()` — 현재 DOM 상태를 localStorage에 저장
- [x] **T-38** `updateCardCount(columnId)` — 카드 수 뱃지 업데이트

---

## Phase 4. 검증

- [x] **T-39** 브라우저에서 보드 초기 렌더링 확인 (HTTP 200, 샘플 카드 표시)
- [x] **T-40** 카드 추가 정상 동작 확인
- [x] **T-41** 카드 삭제 정상 동작 확인
- [x] **T-42** 드래그 앤 드롭으로 카드 이동 확인
- [x] **T-43** 페이지 새로고침 후 카드 유지 확인 (localStorage)
- [x] **T-44** 빈 텍스트 카드 추가 차단 확인 (shake 애니메이션)
- [x] **T-45** ESC / 취소 버튼으로 입력창 닫기 확인

---

## 완료 기준

Phase 4의 모든 검증 항목(T-39 ~ T-45)이 정상 통과되면 v1.0 완료로 간주한다.

---

## Phase 5. 인증 + Supabase 클라우드 저장 (v2)

### 신규 파일

- [x] **T-46** `config.js` — Supabase URL / anon key 설정
- [x] **T-47** `auth.js` — Supabase 클라이언트 초기화, `requireAuth()` / `getUser()` / `signOut()`
- [x] **T-48** `login.html` — 로그인 페이지 마크업 (Google, GitHub, 이메일+비밀번호)
- [x] **T-49** `login.js` — OAuth 리다이렉트, 이메일 로그인/회원가입 로직

### 기존 파일 수정

- [x] **T-50** `index.html` — Supabase CDN / `config.js` / `auth.js` script 태그 추가, 사용자 헤더(`user-email` + `btn-logout`) 추가
- [x] **T-51** `script.js` — `loadBoard()` / `saveBoard()` async 전환, localStorage → Supabase DB, 인증 체크 + 사용자 이메일 표시
- [x] **T-52** `style.css` — `.user-info` / `.btn-logout` 헤더 스타일, 로그인 페이지 전용 스타일 추가

### Supabase 대시보드 설정

- [x] **T-53** `kanban_boards` 테이블 생성 (user_id PK, data JSONB, updated_at)
- [x] **T-54** Row Level Security 활성화 + "Own board only" 정책 생성
- [ ] **T-55** Authentication > URL Configuration — Site URL / Redirect URL 등록
- [ ] **T-56** Google OAuth Provider 설정 (Google Cloud Console 연동)
- [ ] **T-57** GitHub OAuth Provider 설정 (GitHub OAuth App 연동)

### v2 검증

- [ ] **T-58** 비로그인 상태에서 `index.html` 접근 시 `login.html`로 자동 이동 확인
- [ ] **T-59** 이메일 회원가입 → 확인 메일 안내 메시지 표시 확인
- [ ] **T-60** 이메일 로그인 → 칸반보드 진입, 사용자 이메일 헤더 표시 확인
- [ ] **T-61** 카드 추가/이동/삭제 → Supabase Table Editor에서 DB 반영 확인
- [ ] **T-62** 로그아웃 → `login.html`로 이동 확인
- [ ] **T-63** Google 로그인 → Supabase Authentication > Users 확인
- [ ] **T-64** GitHub 로그인 → Supabase Authentication > Users 확인
