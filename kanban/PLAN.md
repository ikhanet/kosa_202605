# 칸반보드 구현 계획

## v1 — 기본 칸반보드 (완료)

순수 프론트엔드(localStorage) 칸반보드 구현.  
To-Do / In-Progress / Done 3개 컬럼, 카드 드래그 앤 드롭, 카드 추가/삭제.

---

## v2 — 인증 + 클라우드 저장 (진행 예정)

### Context

localStorage 기반 앱에 Google/GitHub/이메일 로그인을 추가하고,  
카드 데이터를 사용자별 클라우드 DB(Supabase)에 저장한다.  
별도 백엔드 서버 없이 Supabase BaaS로 인증과 DB를 처리한다.

**결정 사항:**
- 백엔드: Supabase BaaS (FastAPI 없음)
- 데이터: Supabase PostgreSQL (localStorage → 클라우드)
- 로그인 UI: 별도 `login.html` 페이지
- 이메일 인증: 이메일 + 비밀번호

### 파일 구조 (변경 후)

```
kanban/
├── index.html     ← 수정: 인증 체크 + 사용자 헤더
├── login.html     ← 신규: Google/GitHub/이메일 로그인 페이지
├── style.css      ← 수정: 로그인 + 헤더 스타일 추가
├── script.js      ← 수정: localStorage → Supabase DB
├── config.js      ← 신규: Supabase URL/key (사용자가 채워야 함)
└── auth.js        ← 신규: Supabase 클라이언트 + 인증 유틸
```

---

## Phase 0: Supabase 대시보드 설정 (사용자 직접 진행)

### 0-1. 프로젝트 생성
- supabase.com → New Project 생성
- Settings > API에서 Project URL과 anon key 복사

### 0-2. Google OAuth 설정
1. Google Cloud Console → 새 프로젝트 → OAuth 동의 화면 구성
2. 사용자 인증 정보 → OAuth 2.0 클라이언트 ID 생성 (웹 애플리케이션)
3. 승인된 리디렉션 URI: `https://<your-project>.supabase.co/auth/v1/callback`
4. Supabase 대시보드 Authentication > Providers > Google에 Client ID/Secret 입력

### 0-3. GitHub OAuth 설정
1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. Authorization callback URL: `https://<your-project>.supabase.co/auth/v1/callback`
3. Supabase Authentication > Providers > GitHub에 Client ID/Secret 입력

### 0-4. URL 설정
- Supabase → Authentication > URL Configuration
- Site URL: `http://localhost:8765`
- Redirect URLs: `http://localhost:8765/**`

### 0-5. DB 테이블 생성 (SQL Editor에서 실행)

```sql
create table public.kanban_boards (
  user_id uuid references auth.users(id) on delete cascade primary key,
  data jsonb not null default '{"todo":[],"inprogress":[],"done":[]}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.kanban_boards enable row level security;

create policy "Own board only"
  on public.kanban_boards
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## Phase 1: config.js 생성

Supabase URL과 anon key를 담는 설정 파일.  
사용자가 0-1 단계에서 복사한 값으로 채운다.

---

## Phase 2: auth.js 생성

- Supabase JS SDK CDN 로드
- `supabase` 클라이언트 초기화
- `requireAuth()`: 세션 없으면 `login.html`로 리다이렉트
- `signOut()`: 로그아웃 후 `login.html`로 이동
- `getUser()`: 현재 사용자 정보 반환

---

## Phase 3: login.html + login.js 생성

**UI 구조:**
```
[Google로 계속하기]
[GitHub로 계속하기]
──── 또는 ────
[ 이메일         ]
[ 비밀번호       ]
[로그인]  [회원가입]
에러 메시지 영역
```

**login.js 핵심 로직:**
- 이미 로그인 상태면 `index.html`로 바로 이동
- Google/GitHub: `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: '...' } })`
- 로그인: `supabase.auth.signInWithPassword({ email, password })`
- 회원가입: `supabase.auth.signUp({ email, password })` → 확인 메일 안내

---

## Phase 4: index.html 수정

- `config.js`, Supabase CDN, `auth.js` script 태그 추가
- 사용자 헤더 (이메일 + 로그아웃 버튼) HTML 추가

---

## Phase 5: script.js 수정

| 현재 | 변경 후 |
|------|---------|
| `loadBoard()` — localStorage 읽기 | `loadBoard()` — Supabase에서 읽기 (async) |
| `saveBoard()` — localStorage 쓰기 | `saveBoard()` — Supabase upsert (async) |

`DOMContentLoaded` 핸들러를 async로 변경, `requireAuth()` 후 `loadBoard()` 호출.

---

## Phase 6: style.css 수정

- `.user-header` — 우측 상단 사용자 이메일 + 로그아웃 버튼
- 로그인 페이지 전용 스타일 (`.login-container`, `.btn-oauth`, `.divider` 등)
- 기존 CSS 변수(`--*`) 재사용

---

## 구현 순서

```
1. config.js 생성        → 확인: 파일 존재
2. auth.js 생성          → 확인: supabase 객체 초기화 정상
3. login.html + login.js → 확인: 페이지 열림, OAuth 리다이렉트 동작
4. index.html 수정       → 확인: 비로그인 시 login.html로 이동
5. script.js 수정        → 확인: 카드 로드/저장이 Supabase DB에 반영
6. style.css 수정        → 확인: 로그인 페이지 + 헤더 디자인
```

---

## 검증 방법

```bash
cd src/exercise/ikhanet/day03/kanban
python3 -m http.server 8765
# 브라우저: http://localhost:8765/index.html
```

1. 비로그인 → `login.html`로 자동 이동 확인
2. 이메일 회원가입 → 확인 메일 안내 표시 확인
3. 이메일 로그인 → 카드 보드 표시 + Supabase DB 반영 확인
4. 카드 추가/이동/삭제 → Supabase Table Editor에서 data 컬럼 변경 확인
5. 로그아웃 → `login.html`로 이동 확인
6. Google/GitHub 로그인 → Supabase Authentication > Users에서 사용자 확인

---

## 주의사항

- `config.js`의 anon key 노출: Supabase anon key는 공개 키이므로 안전 (RLS가 보안 담당)
- OAuth 리다이렉트 URL: 로컬 개발용 `http://localhost:8765`, 배포 시 변경 필요
- `saveBoard()`가 async가 되므로 모든 호출부에 await 적용 필요
