 칸반보드 인증 추가 계획

 Context

 현재 칸반보드는 순수 프론트엔드(localStorage) 앱이다. Google/GitHub/이메일 로그인을 추가하여 사용자별 카드 데이터를
 클라우드(Supabase)에 저장한다. 별도 백엔드 서버 없이 Supabase BaaS로 인증과 DB를 처리한다.

 결정 사항:
 - 백엔드: Supabase BaaS (FastAPI 없음)
 - 데이터: Supabase PostgreSQL (localStorage → 클라우드)
 - 로그인 UI: 별도 login.html 페이지
 - 이메일 인증: 이메일 + 비밀번호
 - Supabase 프로젝트: 신규 생성 필요

 ---
 파일 구조 (변경 후)

 kanban/
 ├── index.html     ← 수정: 인증 체크 + 사용자 헤더
 ├── login.html     ← 신규: Google/GitHub/이메일 로그인 페이지
 ├── style.css      ← 수정: 로그인 + 헤더 스타일 추가
 ├── script.js      ← 수정: localStorage → Supabase DB
 ├── config.js      ← 신규: Supabase URL/key (사용자가 채워야 함)
 └── auth.js        ← 신규: Supabase 클라이언트 + 인증 유틸

 ---
 Phase 0: Supabase 대시보드 설정 (사용자 직접 진행)

 이 단계는 코드 작업 전에 사용자가 직접 완료해야 한다.

 0-1. 프로젝트 생성

 - https://supabase.com → New Project 생성
 - Project URL과 anon key를 복사해 둔다 (Settings > API)

 0-2. Google OAuth 설정

 1. Google Cloud Console (https://console.cloud.google.com) → 새 프로젝트 → OAuth 동의 화면 구성
 2. 사용자 인증 정보 → OAuth 2.0 클라이언트 ID 생성 (웹 애플리케이션)
 3. 승인된 리디렉션 URI: https://<your-project>.supabase.co/auth/v1/callback
 4. Client ID, Client Secret → Supabase 대시보드 Authentication > Providers > Google 에 입력

 0-3. GitHub OAuth 설정

 1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
 2. Authorization callback URL: https://<your-project>.supabase.co/auth/v1/callback
 3. Client ID, Client Secret → Supabase Authentication > Providers > GitHub 에 입력

 0-4. URL 설정

 - Supabase 대시보드 → Authentication > URL Configuration
 - Site URL: http://localhost:8765
 - Redirect URLs에 http://localhost:8765/** 추가

 0-5. DB 테이블 생성 (SQL Editor에서 실행)

 -- 사용자별 보드 데이터를 JSON으로 저장
 create table public.kanban_boards (
   user_id uuid references auth.users(id) on delete cascade primary key,
   data jsonb not null default '{"todo":[],"inprogress":[],"done":[]}'::jsonb,
   updated_at timestamptz default now()
 );

 -- RLS 활성화
 alter table public.kanban_boards enable row level security;

 -- 자신의 보드만 읽기/쓰기 가능
 create policy "Own board only"
   on public.kanban_boards
   for all
   using (auth.uid() = user_id)
   with check (auth.uid() = user_id);

 ---
 Phase 1: config.js 생성

 const SUPABASE_URL = 'https://your-project-id.supabase.co';
 const SUPABASE_ANON_KEY = 'your-anon-key-here';

 사용자가 0-1 단계에서 복사한 값으로 채운다.

 ---
 Phase 2: auth.js 생성

 - Supabase JS SDK를 CDN으로 로드 (@supabase/supabase-js)
 - supabase 클라이언트 초기화 (SUPABASE_URL, SUPABASE_ANON_KEY 사용)
 - requireAuth(): 세션 없으면 login.html로 리다이렉트
 - signOut(): 로그아웃 후 login.html로 이동
 - getUser(): 현재 사용자 정보 반환

 ---
 Phase 3: login.html + login.js 생성

 login.html 구조:
 헤더: "칸반보드 로그인"
 [Google로 계속하기] 버튼
 [GitHub로 계속하기] 버튼
 구분선 "또는"
 이메일 입력
 비밀번호 입력
 [로그인] [회원가입] 버튼
 에러 메시지 표시 영역

 login.js 핵심 로직:
 - 이미 로그인된 상태면 index.html로 바로 이동
 - supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'http://localhost:8765/index.html' } })
 - supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: 'http://localhost:8765/index.html' } })
 - supabase.auth.signInWithPassword({ email, password })
 - supabase.auth.signUp({ email, password }) → 확인 메일 안내 표시

 ---
 Phase 4: index.html 수정

 추가할 내용:
 1. <script src="config.js"> + <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"> —
 </head> 직전
 2. <script src="auth.js"> — script.js보다 먼저
 3. 헤더에 사용자 정보 영역:
 <div class="user-header">
   <span id="user-email"></span>
   <button id="btn-logout">로그아웃</button>
 </div>

 ---
 Phase 5: script.js 수정

 변경 전후 대비:

 ┌─────────────────────────────────┬─────────────────────────────────────────┐
 │              현재               │                 변경 후                 │
 ├─────────────────────────────────┼─────────────────────────────────────────┤
 │ loadBoard() - localStorage 읽기 │ loadBoard() - Supabase에서 읽기 (async) │
 ├─────────────────────────────────┼─────────────────────────────────────────┤
 │ saveBoard() - localStorage 쓰기 │ saveBoard() - Supabase upsert (async)   │
 ├─────────────────────────────────┼─────────────────────────────────────────┤
 │ setSampleCards() - 첫 방문 시   │ 신규 사용자 첫 로그인 시 동일하게       │
 └─────────────────────────────────┴─────────────────────────────────────────┘

 핵심 변경:
 // 기존
 function saveBoard() {
   const data = readBoardFromDOM();
   localStorage.setItem('kanban-cards', JSON.stringify(data));
 }

 // 변경 후
 async function saveBoard() {
   const data = readBoardFromDOM();
   const { data: { user } } = await supabase.auth.getUser();
   await supabase.from('kanban_boards').upsert({ user_id: user.id, data, updated_at: new Date() });
 }

 // 기존
 function loadBoard() {
   const raw = localStorage.getItem('kanban-cards');
   // ...
 }

 // 변경 후
 async function loadBoard() {
   const { data: { user } } = await supabase.auth.getUser();
   const { data } = await supabase.from('kanban_boards').select('data').eq('user_id', user.id).single();
   // data가 null이면 setSampleCards() 호출
 }

 DOMContentLoaded 핸들러를 async로 변경하고, requireAuth() 후 loadBoard() 호출.

 ---
 Phase 6: style.css 수정

 추가 스타일:
 - .user-header — 우측 상단 사용자 이메일 + 로그아웃 버튼
 - login.html 전용 스타일 (.login-container, .btn-oauth, .divider 등)
 - CSS 변수(--*) 활용, 기존 디자인 시스템과 일치

 ---
 구현 순서 (코드 작업 시)

 1. config.js 생성           → 확인: 파일 존재
 2. auth.js 생성             → 확인: console에서 supabase 객체 접근 가능
 3. login.html + login.js    → 확인: 로그인 페이지 열림, 버튼 클릭 시 OAuth 리다이렉트
 4. index.html 수정          → 확인: 비로그인 시 login.html로 이동
 5. script.js 수정           → 확인: 로그인 후 카드 로드/저장이 Supabase DB에 반영
 6. style.css 수정           → 확인: 로그인 페이지와 헤더 디자인

 ---
 검증 방법

 cd src/exercise/ikhanet/day03/kanban
 python3 -m http.server 8765
 # 브라우저: http://localhost:8765/index.html

 1. 비로그인 상태 → login.html로 자동 이동 확인
 2. 이메일/비밀번호 회원가입 → 확인 이메일 안내 확인
 3. 이메일 로그인 → index.html로 이동, 카드 로드 확인
 4. 카드 추가/이동/삭제 → Supabase Table Editor에서 DB 반영 확인
 5. 로그아웃 → login.html로 이동 확인
 6. Google 로그인 → Supabase 대시보드 Authentication > Users에서 확인
 7. GitHub 로그인 → 동일

 ---
 주의사항

 - config.js에 anon key 노출: Supabase anon key는 공개 키이므로 괜찮음 (RLS가 보안 담당)
 - OAuth 리다이렉트 URL: 로컬 개발 시 http://localhost:8765, 배포 시 변경 필요
 - saveBoard()가 async가 되므로 호출부 전체 async/await 체인 확인 필요