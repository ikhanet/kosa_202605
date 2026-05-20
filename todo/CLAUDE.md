# Todo List 앱

ikhanet day03 실습 — 순수 HTML/CSS/JS로 만든 Todo List.

## 실행

```bash
python3 -m http.server 8765
# 브라우저: http://localhost:8765/index.html
```

외부 CSS(`.js`, `.css`)를 참조하므로 반드시 HTTP 서버를 띄워야 한다. `file://` 직접 열기는 동작하지 않는다.

## 파일 구조

```
todo/
├── index.html   — 마크업 (사이드바 + 메인 2단 레이아웃)
├── style.css    — 글래스모피즘 스타일 + 애니메이션
└── script.js    — 전체 상태 관리 + DOM 조작
```

## 기능

| 기능 | 방법 |
|------|------|
| 할일 추가 | 입력 후 추가 버튼 또는 Enter |
| 완료 체크 | 체크박스 클릭 (취소선 + 통계 갱신) |
| 삭제 | 🗑 버튼 (fade-out + collapse 애니메이션) |
| 우선순위 설정 | 추가 시 🔴높음 / 🟡중간 / 🟢낮음 선택 |
| 우선순위 변경 | 배지 클릭 → 높음 → 중간 → 낮음 → 높음 순환 |
| 드래그앤드롭 | `⠿` 핸들 드래그로 순서 변경, 다른 등급 위에 드롭 시 등급 자동 변경 |
| 필터 | 사이드바에서 전체 / 미완료 / 완료 전환 |
| 영속성 | localStorage `todos` 키에 JSON 저장, 새로고침 후 자동 복원 |

## 데이터 모델

```js
// localStorage 'todos' 키에 배열로 저장
[
  { id: 1748000000000, text: "장보기", completed: false, priority: "high" },
  { id: 1748000000001, text: "치과 예약", completed: true,  priority: "medium" }
]
// priority: "high" | "medium" | "low"  (없으면 "medium" 폴백)
```

## 주요 구현 패턴

- **단일 배열 소스** — `todos[]`가 유일한 상태. 모든 변경은 배열 수정 → `saveTodos()` → `renderTodos()` 순으로 처리한다.
- **이벤트 위임** — `#todo-list`에 `click` / `change` / `dragover` / `drop` 하나씩만 등록. 개별 아이템에는 `dragstart` / `dragend`만 추가.
- **드래그앤드롭** — HTML5 Drag & Drop API 사용. `dropTodo()`에서 드래그된 아이템의 priority를 드롭 대상 priority로 덮어쓴 뒤 배열에서 뽑아 재삽입한다. 드롭 위치는 커서가 아이템 중앙선 위/아래 여부로 판별한다.
- **애니메이션** — 추가: `slideDown` keyframe. 삭제: `collapsing` 클래스 → `collapseOut` keyframe → `animationend` 이벤트 후 배열에서 제거. 드래그 고스트: `requestAnimationFrame`으로 `.dragging` 클래스를 한 프레임 뒤에 적용해 고스트 이미지가 원본 외형을 유지하게 한다.

## 외부 의존성

| 항목 | 출처 |
|------|------|
| Pretendard 폰트 | jsDelivr CDN (오프라인 시 시스템 sans-serif 폴백) |
| 그 외 라이브러리 | 없음 — 빌드 도구, 패키지 매니저 모두 불필요 |
