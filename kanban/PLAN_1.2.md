# 칸반보드 v1.2 협업 기능 추가 계획

## Context

현재 칸반보드는 Supabase 인증 + JSONB 저장소 기반의 1인 보드다. 팀 협업을 위해 아래 4가지 기능을 추가한다:
1. **링크 공유** — 초대 URL을 생성해 팀원이 보드에 참여
2. **실시간 동기화** — Supabase Realtime으로 변경사항 즉시 반영
3. **활동 로그** — 카드 추가/삭제/이동 이력을 우측 사이드패널에 표시
4. **카드 상세 필드** — 모달로 마감일/우선순위/태그 편집, 카드에 인라인 배지 표시

**결정 요약**:
- 보드 구조: 소유자 1명 + 초대된 팀원 (동등 권한)
- 공유 방식: 링크 (UUID 토큰) → `invite.html?token=<uuid>`
- 활동 로그 위치: 우측 접이식 사이드패널
- 카드 UI: 카드 클릭 → 모달, 카드에는 배지로 요약 표시
- 프레전스: 헤더에 현재 접속 중인 유저 아바타 표시

---

## Phase 1 — Supabase 스키마 추가

제공할 SQL 파일: `supabase_migration.sql`

```sql
-- 초대 토큰
CREATE TABLE board_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE board_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read invite" ON board_invites FOR SELECT USING (true);
CREATE POLICY "Owner can create invite" ON board_invites FOR INSERT WITH CHECK (auth.uid() = board_owner_id);
CREATE POLICY "Owner can delete invite" ON board_invites FOR DELETE USING (auth.uid() = board_owner_id);

-- 보드 멤버
CREATE TABLE board_members (
  board_owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (board_owner_id, member_id)
);
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can join" ON board_members FOR INSERT WITH CHECK (auth.uid() = member_id);
CREATE POLICY "Owner and members can read" ON board_members FOR SELECT USING (auth.uid() = board_owner_id OR auth.uid() = member_id);
CREATE POLICY "Self can leave" ON board_members FOR DELETE USING (auth.uid() = board_owner_id OR auth.uid() = member_id);

-- 활동 로그
CREATE TABLE activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  actor_email text NOT NULL,
  action text NOT NULL CHECK (action IN ('card_added', 'card_deleted', 'card_moved')),
  card_text text NOT NULL,
  from_column text,
  to_column text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board members can read logs" ON activity_logs FOR SELECT USING (
  auth.uid() = board_owner_id OR
  EXISTS (SELECT 1 FROM board_members WHERE board_owner_id = activity_logs.board_owner_id AND member_id = auth.uid())
);
CREATE POLICY "Board members can insert logs" ON activity_logs FOR INSERT WITH CHECK (
  auth.uid() = actor_id AND (
    auth.uid() = board_owner_id OR
    EXISTS (SELECT 1 FROM board_members WHERE board_owner_id = activity_logs.board_owner_id AND member_id = auth.uid())
  )
);

-- kanban_boards RLS 업데이트 (멤버도 접근 가능)
DROP POLICY IF EXISTS "Own board only" ON kanban_boards;
CREATE POLICY "Board access" ON kanban_boards FOR ALL USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM board_members WHERE board_owner_id = kanban_boards.user_id AND member_id = auth.uid())
) WITH CHECK (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM board_members WHERE board_owner_id = kanban_boards.user_id AND member_id = auth.uid())
);

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE kanban_boards;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE board_members;
```

---

## Phase 2 — 카드 데이터 모델 확장

**수정 파일**: `script.js`

카드 JSON에 새 필드 추가 (기존 호환 유지):
```json
{
  "id": "card-uuid",
  "text": "...",
  "createdAt": "...",
  "priority": "high | medium | low | null",
  "dueDate": "2026-06-01 | null",
  "tags": ["태그1", "태그2"]
}
```

`createCard(columnId, text, id, cardData)` 시그니처 확장:
- `cardData`에 priority/dueDate/tags 포함
- 카드 DOM에 배지 렌더링: 우선순위 색 점(●), 마감일 텍스트, 태그 칩

---

## Phase 3 — 카드 상세 모달

**수정 파일**: `index.html`, `style.css`, `script.js`

### HTML (index.html에 추가)
```html
<div id="card-modal" class="modal-overlay hidden">
  <div class="modal">
    <h3>카드 상세</h3>
    <textarea id="modal-text"></textarea>
    <div class="modal-field">
      <label>우선순위</label>
      <select id="modal-priority">
        <option value="">없음</option>
        <option value="high">높음</option>
        <option value="medium">보통</option>
        <option value="low">낮음</option>
      </select>
    </div>
    <div class="modal-field">
      <label>마감일</label>
      <input type="date" id="modal-due-date" />
    </div>
    <div class="modal-field">
      <label>태그 (쉼표 구분)</label>
      <input type="text" id="modal-tags" placeholder="예: 기획, 디자인" />
    </div>
    <div class="modal-actions">
      <button id="modal-save">저장</button>
      <button id="modal-cancel">취소</button>
    </div>
  </div>
</div>
```

### JS 함수 (script.js에 추가)
- `openCardModal(cardEl)` — 카드 클릭 시 모달 열기, 기존 값 채우기
- `closeCardModal()` — 모달 닫기
- `saveCardModal()` — dataset 업데이트 → `renderCardBadges()` → `saveBoard()`
- `renderCardBadges(cardEl, cardData)` — 우선순위 점, 마감일, 태그 칩 렌더링

카드에 `data-priority`, `data-due-date`, `data-tags` dataset 속성 저장.

---

## Phase 4 — 링크 공유 & 멀티유저 보드 접근

### 새 파일: `invite.html`, `invite.js`

**`invite.js` 흐름**:
1. URL에서 `token` 파라미터 추출
2. `board_invites` 테이블에서 `board_owner_id` 조회
3. 로그인 안 됨 → token을 `sessionStorage`에 저장 → `login.html`로 리다이렉트
4. 로그인 됨 → `board_members`에 `(board_owner_id, current_user_id)` INSERT
5. `index.html?board=<board_owner_id>`로 리다이렉트

**`index.html` 추가**:
```html
<button id="share-btn">공유 링크 복사</button>
```

**`script.js` 수정**:
- URL 파라미터 `?board=<owner_id>` 읽기 → `boardOwnerId` 변수
- `boardOwnerId` 없으면 현재 유저 ID 사용 (기존 동작 유지)
- `loadBoard()`, `saveBoard()`, `logActivity()` 모두 `boardOwnerId` 기준으로 작동
- `generateInviteLink()` — `board_invites` INSERT → URL 생성 → 클립보드 복사

**`login.js` 수정**:
- 로그인 성공 후 `sessionStorage.pendingInviteToken` 확인 → 있으면 `invite.html?token=...`로 이동

---

## Phase 5 — 활동 로그 사이드패널

**수정 파일**: `index.html`, `style.css`, `script.js`

### HTML (index.html에 추가)
```html
<div id="log-panel" class="log-panel hidden">
  <div class="log-panel-header">
    <span>활동 로그</span>
    <button id="log-close">✕</button>
  </div>
  <ul id="log-list"></ul>
</div>
<button id="log-toggle">로그 ▶</button>
```

### JS 함수 (script.js에 추가)
- `loadActivityLog()` — `activity_logs` 최근 50건 조회 후 렌더링
- `logActivity(action, cardText, fromColumn, toColumn)` — `activity_logs` INSERT
  - `card_added` → "카드를 추가했습니다"
  - `card_deleted` → "카드를 삭제했습니다"
  - `card_moved` → "`from` → `to` 으로 이동했습니다"
- `renderLogItem(log)` — 시간, 유저 이메일, 메시지로 `<li>` 생성

**기존 함수에 `logActivity()` 호출 추가**:
- `confirmAddCard()` 성공 시
- `deleteCard()` 호출 시
- `onDrop()` 완료 시

---

## Phase 6 — 실시간 동기화 + 프레전스

**수정 파일**: `script.js`

### Realtime 보드 동기화
```js
supabase.channel('board-changes')
  .on('postgres_changes', {
    event: '*', schema: 'public', table: 'kanban_boards',
    filter: `user_id=eq.${boardOwnerId}`
  }, (payload) => {
    // 다른 유저의 변경사항만 반영 (내 변경은 이미 DOM에 있음)
    if (payload.new.user_id !== currentUser.id) {
      reloadBoard(payload.new.data);
    }
  })
  .subscribe();
```

### Realtime 활동 로그
```js
supabase.channel('log-changes')
  .on('postgres_changes', {
    event: 'INSERT', schema: 'public', table: 'activity_logs',
    filter: `board_owner_id=eq.${boardOwnerId}`
  }, (payload) => prependLogItem(payload.new))
  .subscribe();
```

### 프레전스 (헤더 아바타)
```js
const presenceChannel = supabase.channel(`presence-${boardOwnerId}`);
presenceChannel
  .on('presence', { event: 'sync' }, () => {
    renderAvatars(presenceChannel.presenceState());
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await presenceChannel.track({ user_id: currentUser.id, email: currentUser.email });
    }
  });
```

**`renderAvatars(state)`** — 각 유저 이메일 첫 글자로 원형 아바타 생성, 헤더에 표시

---

## 수정/신규 파일 목록

| 파일 | 변경 유형 | 주요 내용 |
|------|-----------|-----------|
| `supabase_migration.sql` | 신규 | Supabase SQL (사용자가 직접 실행) |
| `index.html` | 수정 | 모달, 사이드패널, 공유 버튼, 아바타 영역 추가 |
| `style.css` | 수정 | 모달, 사이드패널, 아바타, 카드 배지 스타일 |
| `script.js` | 수정 | 모달 CRUD, 로그 기록·표시, 실시간, 프레전스, 공유 |
| `invite.html` | 신규 | 초대 링크 처리 페이지 |
| `invite.js` | 신규 | 토큰 검증, 멤버 등록, 리다이렉트 |
| `login.js` | 수정 | 로그인 후 pendingInviteToken 처리 |

---

## 구현 순서

1. **SQL 파일 작성** → 사용자가 Supabase 대시보드에서 실행
2. **카드 모달** (Phase 2+3) — 가장 독립적, 기존 기능에 영향 없음
3. **공유 링크** (Phase 4) — 멀티유저 보드 접근 기반 구축
4. **활동 로그 패널** (Phase 5) — Phase 4 완료 후
5. **실시간 + 프레전스** (Phase 6) — 마지막 레이어로 추가

---

## 검증 시나리오

| 기능 | 시나리오 |
|------|---------|
| 카드 모달 | 카드 클릭 → 모달 열림, 우선순위 선택 → 카드에 배지 표시, 새로고침 후 유지 |
| 공유 링크 | 링크 복사 → 시크릿 탭에서 열기 → 로그인 → 원래 보드가 보임 |
| 활동 로그 | 카드 추가/이동/삭제 → 사이드패널에 항목 추가 |
| 실시간 동기화 | 탭 A에서 카드 추가 → 탭 B에서 자동으로 나타남 |
| 프레전스 | 탭 A, B 동시 접속 → 헤더에 아바타 2개 표시 |
