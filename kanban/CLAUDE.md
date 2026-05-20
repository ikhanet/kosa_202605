# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

순수 프론트엔드(HTML/CSS/JS) 칸반보드. To-Do / In-Progress / Done 3개 컬럼, HTML5 Drag and Drop API 기반 카드 이동, localStorage 데이터 영속성. 외부 라이브러리 없음.

자세한 요구사항과 설계는 아래 문서를 참조한다:

| 문서 | 내용 |
|------|------|
| [PRD.md](PRD.md) | 기능·비기능 요구사항, 범위 외 항목 |
| [TRD.md](TRD.md) | HTML 구조 명세, JS 함수 명세, 이벤트 흐름 |
| [USER_FLOW.md](USER_FLOW.md) | 카드 추가/이동/삭제 흐름 (Mermaid) |
| [DATABASE_DESIGN.md](DATABASE_DESIGN.md) | localStorage 스키마, 상태 동기화 전략 |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | CSS 변수 전체 선언, 컴포넌트 스펙 |
| [TASKS.md](TASKS.md) | 구현 태스크 체크리스트 (T-01 ~ T-45) |
| [CODING_CONVENTION.md](CODING_CONVENTION.md) | HTML/CSS/JS 스타일 규칙, 커밋 메시지 형식 |

---

## 로컬 실행

```bash
cd src/exercise/ikhanet/day03/kanban
python3 -m http.server 8765
# 브라우저: http://localhost:8765/index.html
```

---

## 아키텍처

### 파일 역할

```
index.html  ←  DOM 구조 (빌드 없음, 링크만 포함)
style.css   ←  :root CSS 변수 + 컴포넌트 스타일
script.js   ←  DnD 이벤트, 카드 CRUD, localStorage 동기화
```

### 상태 관리 전략

**DOM이 단일 진실 공급원(source of truth)**이다. `saveBoard()`는 독립적인 state 객체를 유지하지 않고, 매번 현재 DOM에서 카드 순서를 읽어 localStorage에 스냅샷으로 저장한다.

```
DOM 변경 → saveBoard() → DOM 순회 → JSON.stringify → localStorage
페이지 로드 → loadBoard() → localStorage → JSON.parse → DOM 생성
```

### 핵심 함수 호출 관계

```
DOMContentLoaded
  └─ loadBoard()
       └─ createCard(columnId, text)  ← 카드 DOM + 이벤트 바인딩

사용자 인터랙션
  ├─ onDragStart / onDragOver / onDragLeave / onDrop / onDragEnd
  │    └─ [drop 시] saveBoard()
  ├─ openInputForm / closeInputForm
  │    └─ [확인 시] createCard() → saveBoard()
  └─ deleteCard(cardEl)
       └─ saveBoard()
```

### localStorage 스키마 (key: `"kanban-cards"`)

```json
{ "todo": [{id, text, createdAt}], "inprogress": [...], "done": [...] }
```

상세 필드 명세 → [DATABASE_DESIGN.md](DATABASE_DESIGN.md)

---

## 코딩 규칙 요약

- **HTML/CSS/JS 분리 필수** — `<style>`, 인라인 `<script>` 사용 금지
- **CSS 변수 필수** — 색상·간격·그림자를 하드코딩하지 않고 `var(--*)` 사용 ([DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) § 7 참조)
- **JS**: ES6+, `var` 금지, 세미콜론 필수, 2칸 들여쓰기
- **DOM 조회**: 반복 조회 금지 — 변수에 한 번 저장 후 재사용
- **함수**: DOM 조작과 `saveBoard()` 호출을 같은 함수에 혼합하지 않음

네이밍 규칙, CSS 선언 순서, 이벤트 위임 정책 → [CODING_CONVENTION.md](CODING_CONVENTION.md)

---

## 커밋 메시지

`type(scope):` 는 영문, 설명은 한글로 작성한다.

```
feat(kanban): 드래그 앤 드롭 기능 구현
fix(kanban): 드롭 후 drag-over 클래스 미제거 버그 수정
style(kanban): CSS 변수 기반 디자인 시스템 적용
```

---

## Git 주의사항

```bash
# ✅ pull은 항상 merge
git pull --no-rebase origin main

# ✅ 스테이징은 명시적 경로
git add src/exercise/ikhanet/day03/kanban/

# ❌ 절대 금지
git pull --rebase / git rebase
git add -A / git add .
```
