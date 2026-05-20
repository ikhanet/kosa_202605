# Database Design — 데이터베이스 설계

> v1.2부터 **협업 기능**을 위한 3개 테이블이 추가됐다.  
> 마이그레이션 SQL → `supabase_migration.sql`

---

## 1. 저장소 구조

| 버전 | 저장소 | 비고 |
|------|--------|------|
| v1 | 브라우저 localStorage | 로컬 전용, 비로그인 |
| v2 | Supabase PostgreSQL (`kanban_boards`) | 클라우드, 로그인 필수 |
| v1.2 | Supabase PostgreSQL (4개 테이블) | 협업, 실시간, 활동 로그 추가 |

---

## 2. 테이블 스키마

### 2.1 `kanban_boards` (기존)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `user_id` | `uuid` (PK) | 보드 소유자, `auth.users(id)` 참조 |
| `data` | `jsonb` | 보드 전체 상태 |
| `updated_at` | `timestamptz` | 마지막 저장 시각 |

```sql
create table public.kanban_boards (
  user_id    uuid        references auth.users(id) on delete cascade primary key,
  data       jsonb       not null default '{"todo":[],"inprogress":[],"done":[]}'::jsonb,
  updated_at timestamptz default now()
);
```

### 2.2 `board_invites` (v1.2 신규)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `uuid` (PK) | 초대 토큰 (URL에 포함) |
| `board_owner_id` | `uuid` | 보드 소유자 |
| `created_at` | `timestamptz` | 생성 시각 |

```sql
create table public.board_invites (
  id              uuid        primary key default gen_random_uuid(),
  board_owner_id  uuid        not null references auth.users(id) on delete cascade,
  created_at      timestamptz default now()
);
```

### 2.3 `board_members` (v1.2 신규)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `board_owner_id` | `uuid` | 보드 소유자 (복합 PK) |
| `member_id` | `uuid` | 참여 멤버 (복합 PK) |
| `joined_at` | `timestamptz` | 참여 시각 |

```sql
create table public.board_members (
  board_owner_id  uuid        not null references auth.users(id) on delete cascade,
  member_id       uuid        not null references auth.users(id) on delete cascade,
  joined_at       timestamptz default now(),
  primary key (board_owner_id, member_id)
);
```

### 2.4 `activity_logs` (v1.2 신규)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `uuid` (PK) | 로그 ID |
| `board_owner_id` | `uuid` | 대상 보드 소유자 |
| `actor_id` | `uuid` | 행위자 |
| `actor_email` | `text` | 행위자 이메일 (표시용) |
| `action` | `text` | `card_added \| card_deleted \| card_moved` |
| `card_text` | `text` | 대상 카드 내용 |
| `from_column` | `text` | 이동 출발 컬럼 (`card_moved` 시) |
| `to_column` | `text` | 이동 도착 컬럼 (`card_moved` 시) |
| `created_at` | `timestamptz` | 발생 시각 |

```sql
create table public.activity_logs (
  id              uuid        primary key default gen_random_uuid(),
  board_owner_id  uuid        not null references auth.users(id) on delete cascade,
  actor_id        uuid        not null references auth.users(id),
  actor_email     text        not null,
  action          text        not null check (action in ('card_added','card_deleted','card_moved')),
  card_text       text        not null,
  from_column     text,
  to_column       text,
  created_at      timestamptz default now()
);
```

---

## 3. `kanban_boards.data` JSON 구조 (v1.2)

```json
{
  "todo": [
    {
      "id": "card-a1b2c3d4-...",
      "text": "칸반보드 기획서 작성",
      "createdAt": "2026-05-20T09:00:00.000Z",
      "priority": "high",
      "dueDate": "2026-06-01",
      "tags": ["기획", "문서"]
    }
  ],
  "inprogress": [...],
  "done": [...]
}
```

### Card 객체 필드

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | string | O | `card-{crypto.randomUUID()}` |
| `text` | string | O | 카드 내용, 1자 이상 |
| `createdAt` | string | O | ISO 8601 타임스탬프 |
| `priority` | string\|null | X | `"high"`, `"medium"`, `"low"`, `null` |
| `dueDate` | string\|null | X | `"YYYY-MM-DD"` 또는 `null` |
| `tags` | string[] | X | 태그 배열 (빈 배열 가능) |

---

## 4. Row Level Security (RLS)

### `kanban_boards` (v1.2 수정)

```sql
-- 기존 "Own board only" 정책 교체
drop policy if exists "Own board only" on public.kanban_boards;

create policy "Board access"
  on public.kanban_boards for all
  using (
    auth.uid() = user_id or
    exists (select 1 from public.board_members
            where board_owner_id = kanban_boards.user_id
              and member_id = auth.uid())
  )
  with check (
    auth.uid() = user_id or
    exists (select 1 from public.board_members
            where board_owner_id = kanban_boards.user_id
              and member_id = auth.uid())
  );
```

### `board_invites`

| 정책 | 대상 | 조건 |
|------|------|------|
| Anyone can read invite | SELECT | `true` (토큰 검증 위해 모두 읽기 허용) |
| Owner can create invite | INSERT | `auth.uid() = board_owner_id` |
| Owner can delete invite | DELETE | `auth.uid() = board_owner_id` |

### `board_members`

| 정책 | 대상 | 조건 |
|------|------|------|
| Members can join | INSERT | `auth.uid() = member_id` |
| Owner and members can read | SELECT | 소유자 또는 멤버 본인 |
| Self can leave | DELETE | 소유자 또는 멤버 본인 |

### `activity_logs`

| 정책 | 대상 | 조건 |
|------|------|------|
| Board members can read logs | SELECT | 소유자 또는 board_members에 존재 |
| Board members can insert logs | INSERT | `actor_id = auth.uid()` + 소유자 또는 멤버 |

---

## 5. 데이터 접근 패턴

| 작업 | 테이블 | 쿼리 |
|------|--------|------|
| 보드 읽기 | `kanban_boards` | `.select('data').eq('user_id', boardOwnerId).single()` |
| 보드 쓰기 | `kanban_boards` | `.upsert({ user_id: boardOwnerId, data, updated_at })` |
| 초대 생성 | `board_invites` | `.insert({ board_owner_id }).select('id').single()` |
| 초대 조회 | `board_invites` | `.select('board_owner_id').eq('id', token).single()` |
| 멤버 등록 | `board_members` | `.upsert({ board_owner_id, member_id })` |
| 로그 조회 | `activity_logs` | `.select('*').eq('board_owner_id', ...).order('created_at', { ascending: false }).limit(50)` |
| 로그 기록 | `activity_logs` | `.insert({ board_owner_id, actor_id, actor_email, action, card_text, ... })` |

---

## 6. 상태 동기화 전략

```
[내 변경] DOM 변경 → saveBoard() → _justSaved=true → Supabase upsert
                          ↓
               Realtime 이벤트 수신 → _justSaved=true → skip

[타인 변경] Supabase upsert (다른 탭/사용자)
                          ↓
               Realtime 이벤트 수신 → _justSaved=false → reloadBoard()
```

Realtime 활성화: `ALTER PUBLICATION supabase_realtime ADD TABLE ...`
- `kanban_boards`, `activity_logs`, `board_members`

---

## 7. Realtime 채널 구조

| 채널명 | 테이블 | 필터 | 용도 |
|--------|--------|------|------|
| `board-sync` | `kanban_boards` | `user_id=eq.{boardOwnerId}` | 보드 변경 실시간 반영 |
| `log-sync` | `activity_logs` | `board_owner_id=eq.{boardOwnerId}` | 로그 실시간 추가 |
| `presence-{boardOwnerId}` | — | Presence 채널 | 현재 접속자 아바타 표시 |
