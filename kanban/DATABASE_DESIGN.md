# Database Design — 데이터베이스 설계

> v2부터 **Supabase PostgreSQL**을 영구 저장소로 사용한다.  
> 카드 데이터는 사용자별로 분리되어 클라우드에 저장된다.

---

## 1. 저장소 구조

| 버전 | 저장소 | 비고 |
|------|--------|------|
| v1 | 브라우저 localStorage | 로컬 전용, 비로그인 |
| v2 | Supabase PostgreSQL | 클라우드, 로그인 필수 |

---

## 2. Supabase 테이블 스키마

### `kanban_boards`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `user_id` | `uuid` (PK) | `auth.users(id)` 참조, 사용자당 1행 |
| `data` | `jsonb` | 보드 전체 상태 (아래 JSON 구조 참조) |
| `updated_at` | `timestamptz` | 마지막 저장 시각 |

```sql
create table public.kanban_boards (
  user_id uuid references auth.users(id) on delete cascade primary key,
  data jsonb not null default '{"todo":[],"inprogress":[],"done":[]}'::jsonb,
  updated_at timestamptz default now()
);
```

---

## 3. data 컬럼 JSON 구조

```json
{
  "todo": [
    {
      "id": "card-a1b2c3d4-...",
      "text": "칸반보드 기획서 작성",
      "createdAt": "2026-05-20T09:00:00.000Z"
    }
  ],
  "inprogress": [
    {
      "id": "card-e5f6g7h8-...",
      "text": "index.html 마크업 작성",
      "createdAt": "2026-05-20T10:30:00.000Z"
    }
  ],
  "done": [
    {
      "id": "card-i9j0k1l2-...",
      "text": "PLAN.md 작성 완료",
      "createdAt": "2026-05-20T08:00:00.000Z"
    }
  ]
}
```

### Card 객체 필드

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | string | O | `card-{crypto.randomUUID()}` |
| `text` | string | O | 카드 본문, 1자 이상 |
| `createdAt` | string | O | `new Date().toISOString()` |

---

## 4. Row Level Security (RLS)

```sql
alter table public.kanban_boards enable row level security;

create policy "Own board only"
  on public.kanban_boards
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

- 로그인한 사용자는 자신의 행만 SELECT / INSERT / UPDATE / DELETE 가능
- anon key가 프론트엔드에 노출되어도 안전한 이유: RLS가 다른 사용자 데이터를 차단

---

## 5. 데이터 접근 패턴

| 작업 | Supabase 호출 |
|------|--------------|
| 읽기 | `supabaseClient.from('kanban_boards').select('data').eq('user_id', userId).single()` |
| 쓰기 | `supabaseClient.from('kanban_boards').upsert({ user_id, data, updated_at })` |

---

## 6. 상태 동기화 전략

```
DOM 변경 (카드 추가/이동/삭제)
       ↓
saveBoard() 호출 (async)
       ↓
현재 DOM에서 카드 순서 읽어 state 객체 재구성
       ↓
supabaseClient.from('kanban_boards').upsert(...)
```

DOM을 단일 진실 공급원(single source of truth)으로 유지한다.  
Supabase에는 DOM 상태의 전체 스냅샷을 upsert 방식으로 저장한다.
