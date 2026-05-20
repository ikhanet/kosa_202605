# Todo List 앱

ikhanet day03 실습 — Supabase 인증 + DB를 백엔드로 사용하는 Todo List.

🌐 **배포 URL**: https://ikhanet.github.io/kosa_202605/todo/

## 실행

```bash
python3 -m http.server 8765
# 브라우저: http://localhost:8765/index.html
```

외부 CSS/JS를 참조하므로 반드시 HTTP 서버를 띄워야 한다. `file://` 직접 열기는 동작하지 않는다.

## 파일 구조

```
todo/
├── index.html          — 마크업 (인증 화면 + 사이드바 + 메인 2단 레이아웃)
├── style.css           — 글래스모피즘 스타일 + 애니메이션
├── script.js           — 인증 처리 + 상태 관리 + Supabase CRUD + DOM 조작
├── CLAUDE.md           — 이 파일
├── SUPABASE.md         — Supabase 프로젝트 설정 및 마이그레이션 가이드
├── DEPLOY.md           — 배포 가이드 (GitHub Pages / Netlify / Vercel)
├── google_sns_login.md — Google OAuth 설정 단계별 가이드
└── images/             — 화면 캡처 (login, main, register 등)
```

## 기능

| 기능 | 방법 |
|------|------|
| 회원가입 | 이메일 + 비밀번호 (6자 이상) |
| 로그인 | 이메일/비밀번호 또는 Google / GitHub 소셜 로그인 |
| 로그아웃 | 사이드바 로그아웃 버튼 |
| 할일 추가 | 입력 후 추가 버튼 또는 Enter |
| 완료 체크 | 체크박스 클릭 (취소선 + 통계 갱신) |
| 삭제 | 🗑 버튼 (fade-out + collapse 애니메이션) |
| 우선순위 설정 | 추가 시 🔴높음 / 🟡중간 / 🟢낮음 선택 |
| 우선순위 변경 | 배지 클릭 → 높음 → 중간 → 낮음 → 높음 순환 |
| 드래그앤드롭 | `⠿` 핸들 드래그로 순서 변경, 다른 등급 위에 드롭 시 등급 자동 변경 |
| 필터 | 사이드바에서 전체 / 미완료 / 완료 전환 |
| 영속성 | Supabase `todos` 테이블에 저장, 새로고침 / 다기기 접속 후 자동 복원 |

## 데이터 모델 (Supabase `todos` 테이블)

```
id          bigint PK  — 자동 증가
user_id     uuid       — auth.users(id) FK, RLS로 본인 행만 접근
text        text       — 할일 내용
completed   boolean    — 완료 여부 (default false)
priority    text       — 'high' | 'medium' | 'low' (default 'medium')
position    integer    — 드래그앤드롭 순서 (default 0)
created_at  timestamptz — 생성 시각
```

## 주요 구현 패턴

- **단일 배열 소스** — `todos[]`가 유일한 클라이언트 상태. 모든 변경은 Supabase CRUD → 배열 수정 → `renderTodos()` 순으로 처리한다.
- **인증 흐름** — `db.auth.onAuthStateChange()`로 세션 변경을 감지. 세션 있으면 `showApp()`, 없으면 `showLogin()`. 소셜 로그인은 Supabase가 PKCE 플로우로 처리 후 `redirectTo` URL로 돌아온다.
- **소셜 로그인 (OAuth)** — `signInWithOAuth()` 호출 시 `redirectTo`로 `origin + pathname`을 명시하여 query params / hash 오염 방지. 로그아웃 후 페이지 리로드(`window.location.reload()`)로 Supabase 내부 GoTrue 클라이언트 상태를 완전 초기화하여 2번째 소셜 로그인 시 PKCE state 충돌 방지.
- **이벤트 위임** — `#todo-list`에 `click` / `change` / `dragover` / `drop` 하나씩만 등록. 개별 아이템에는 `dragstart` / `dragend`만 추가.
- **드래그앤드롭** — HTML5 Drag & Drop API 사용. `dropTodo()`에서 드래그된 아이템의 priority를 드롭 대상 priority로 덮어쓴 뒤 배열에서 뽑아 재삽입. 드롭 위치는 커서가 아이템 중앙선 위/아래 여부로 판별. 전체 position 재계산 후 Supabase에 일괄 update.
- **애니메이션** — 추가: `slideDown` keyframe. 삭제: `collapsing` 클래스 → `collapseOut` keyframe → `animationend` 이벤트 후 Supabase delete. 드래그 고스트: `requestAnimationFrame`으로 `.dragging` 클래스를 한 프레임 뒤에 적용해 고스트 이미지가 원본 외형을 유지.

## 외부 의존성

| 항목 | 출처 |
|------|------|
| Supabase JS SDK | jsDelivr CDN `@supabase/supabase-js@2` |
| Pretendard 폰트 | jsDelivr CDN (오프라인 시 시스템 sans-serif 폴백) |
| 그 외 라이브러리 | 없음 — 빌드 도구, 패키지 매니저 모두 불필요 |

## 알려진 이슈 및 해결 이력

| 증상 | 원인 | 해결 |
|------|------|------|
| 로그아웃 후 GitHub/Google 소셜 로그인 2번째 시도 실패 | `signOut()` 후 Supabase GoTrue 클라이언트 내부 PKCE state 불완전 초기화 | 로그아웃 후 `window.location.reload()`로 클라이언트 완전 재초기화 |
