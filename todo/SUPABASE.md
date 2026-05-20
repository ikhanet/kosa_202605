# Supabase 마이그레이션 가이드

ikhanet day03 Todo List — localStorage → Supabase (인증 포함)

---

## 1. 프로젝트 생성

1. [https://supabase.com](https://supabase.com) 접속 → **Start your project** → GitHub 계정으로 가입
2. **New project** 클릭
   - Organization: 개인 계정 선택
   - Project name: `todo-app` (자유)
   - Database Password: 안전한 비밀번호 입력 (저장해 둘 것)
   - Region: **Northeast Asia (Seoul)** 선택
3. 프로젝트 생성 완료까지 약 1분 대기

---

## 2. 인증(Auth) 설정

**Authentication → Providers** 에서 사용할 로그인 방식을 활성화한다.

| 방식 | 설정 위치 | 비고 |
|------|-----------|------|
| 이메일/비밀번호 | Providers → Email | 기본 활성화 상태 |
| Google OAuth | Providers → Google | Client ID / Secret 필요 |
| GitHub OAuth | Providers → GitHub | Client ID / Secret 필요 |

> 가장 단순하게 시작하려면 **이메일/비밀번호만** 켜두고 나머지는 나중에 추가한다.

**Authentication → URL Configuration**:
- Site URL: `http://localhost:8765` (로컬 개발 중)
- Redirect URLs: `http://localhost:8765` 추가

---

## 3. 테이블 구조

### `todos` 테이블

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | `bigint` | PK, generated always as identity | 자동 증가 ID |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` | 소유자 (로그인 사용자) |
| `text` | `text` | NOT NULL | 할일 내용 |
| `completed` | `boolean` | NOT NULL, default `false` | 완료 여부 |
| `priority` | `text` | NOT NULL, default `'medium'` | `'high'` \| `'medium'` \| `'low'` |
| `position` | `integer` | NOT NULL, default `0` | 드래그앤드롭 순서 |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | 생성 시각 |

> **`user_id`가 핵심**: 모든 할일은 특정 사용자에 귀속되며, RLS가 이 컬럼으로 행 접근을 제어한다.  
> **`position`**: 배열 인덱스 대신 명시적 숫자로 드래그앤드롭 순서를 저장한다.

### SQL (Table Editor → SQL Editor에서 실행)

```sql
create table todos (
  id          bigint generated always as identity primary key,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  text        text        not null,
  completed   boolean     not null default false,
  priority    text        not null default 'medium'
                check (priority in ('high', 'medium', 'low')),
  position    integer     not null default 0,
  created_at  timestamptz not null default now()
);

-- 사용자별 position 오름차순 조회 최적화
create index todos_user_position_idx on todos (user_id, position);
```

---

## 4. API 키 확인

**Project Settings → API** 에서 두 가지 값 확인:

| 항목 | 위치 | 용도 |
|------|------|------|
| Project URL | `https://<ref>.supabase.co` | API 엔드포인트 |
| `anon` public key | API Keys 섹션 | 브라우저에서 사용하는 공개 키 |

> `service_role` 키는 서버 전용. 브라우저 코드에 절대 넣지 않는다.

---

## 5. Row Level Security (RLS)

**로그인한 사용자는 자신의 할일만** 읽고 쓸 수 있다.

```sql
-- RLS 활성화
alter table todos enable row level security;

-- 본인 행만 조회
create policy "본인 할일 조회"
  on todos for select
  to authenticated
  using (user_id = auth.uid());

-- 본인 행만 삽입 (user_id를 임의로 다른 값으로 넣는 것 방지)
create policy "본인 할일 삽입"
  on todos for insert
  to authenticated
  with check (user_id = auth.uid());

-- 본인 행만 수정
create policy "본인 할일 수정"
  on todos for update
  to authenticated
  using (user_id = auth.uid());

-- 본인 행만 삭제
create policy "본인 할일 삭제"
  on todos for delete
  to authenticated
  using (user_id = auth.uid());
```

> `anon` 역할에는 아무 정책도 주지 않는다 → 비로그인 상태에서는 데이터에 접근 불가.

---

## 6. JS 클라이언트 연동 (CDN)

`index.html` `<head>`에 추가:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
```

`script.js` 상단에 추가:

```js
const SUPABASE_URL = 'https://<ref>.supabase.co';   // Project URL
const SUPABASE_KEY = '<anon-public-key>';            // anon key

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);
```

---

## 7. 인증 흐름 구현

### 세션 확인 (앱 시작 시)

```js
async function initAuth() {
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    showApp();       // 할일 화면 표시
    loadTodos();
  } else {
    showLogin();     // 로그인 화면 표시
  }
}

// 로그인 상태 변경 감지 (탭 간 동기화, 세션 만료 처리)
db.auth.onAuthStateChange((event, session) => {
  if (session) { showApp(); loadTodos(); }
  else         { showLogin(); }
});
```

### 이메일/비밀번호 가입 & 로그인

```js
// 가입
const { error } = await db.auth.signUp({ email, password });

// 로그인
const { error } = await db.auth.signInWithPassword({ email, password });

// 로그아웃
await db.auth.signOut();
```

### 현재 사용자 ID 가져오기

```js
const { data: { user } } = await db.auth.getUser();
const userId = user.id;   // uuid — insert 시 user_id에 사용
```

---

## 8. CRUD 치환 계획

| 현재 (localStorage) | Supabase 치환 |
|---------------------|---------------|
| `loadTodos()` | `db.from('todos').select('*').order('position')` — RLS가 자동으로 본인 행만 반환 |
| `addTodo()` | `db.from('todos').insert({user_id: userId, text, completed, priority, position})` |
| `toggleTodo()` | `db.from('todos').update({completed}).eq('id', id)` |
| `changePriority()` | `db.from('todos').update({priority}).eq('id', id)` |
| `deleteTodo()` | `db.from('todos').delete().eq('id', id)` |
| `dropTodo()` — 배열 재정렬 | 영향받은 행들의 `position` 일괄 upsert |

> - `eq('id', id)` 필터에 `user_id` 조건을 별도로 추가할 필요 없다 — RLS가 대신 걸러준다.  
> - 모든 호출은 `async/await`로 처리한다.

---

## 9. Realtime (선택)

여러 탭/기기에서 실시간 동기화가 필요하면 추가한다.

```js
db.channel('todos')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, () => {
    loadTodos();
  })
  .subscribe();
```

기본 CRUD 연동 완료 후 필요 여부를 판단한다.

---

## 10. 마이그레이션 순서

```
1.  Supabase 프로젝트 생성
    → 확인: 대시보드 접속 가능

2.  Auth 설정 (이메일/비밀번호 활성화, Site URL 등록)
    → 확인: Authentication → Users 탭 접속 가능

3.  todos 테이블 + 인덱스 생성 (SQL Editor)
    → 확인: Table Editor에서 todos 테이블 보임

4.  RLS 정책 4개 생성 (SQL Editor)
    → 확인: Authentication → Policies 탭에서 4개 정책 보임

5.  index.html에 CDN 스크립트 추가

6.  script.js에 클라이언트 초기화 + initAuth() 추가
    → 확인: 비로그인 시 로그인 화면 표시

7.  가입 / 로그인 / 로그아웃 UI + 핸들러 구현
    → 확인: 가입 후 Authentication → Users에 계정 생성됨

8.  loadTodos() → async, Supabase 조회로 교체
    → 확인: 로그인 후 할일 목록 표시

9.  addTodo() → insert로 교체
    → 확인: 새 항목이 Table Editor에 저장됨 (user_id 포함)

10. toggleTodo() / changePriority() → update로 교체

11. deleteTodo() → delete로 교체

12. dropTodo() → position 일괄 업데이트로 교체

13. localStorage 코드 전부 제거
    → 확인: 새로고침 후에도 데이터 유지, 다른 계정 로그인 시 할일 분리됨
```
