-- ================================================================
-- 칸반보드 v1.2 협업 기능 마이그레이션
-- Supabase 대시보드 → SQL Editor에서 실행하세요.
-- ================================================================

-- 1. 초대 토큰 테이블
CREATE TABLE IF NOT EXISTS public.board_invites (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  board_owner_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.board_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read invite"
  ON public.board_invites FOR SELECT
  USING (true);

CREATE POLICY "Owner can create invite"
  ON public.board_invites FOR INSERT
  WITH CHECK (auth.uid() = board_owner_id);

CREATE POLICY "Owner can delete invite"
  ON public.board_invites FOR DELETE
  USING (auth.uid() = board_owner_id);


-- 2. 보드 멤버 테이블
CREATE TABLE IF NOT EXISTS public.board_members (
  board_owner_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at       timestamptz DEFAULT now(),
  PRIMARY KEY (board_owner_id, member_id)
);

ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can join"
  ON public.board_members FOR INSERT
  WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Owner and members can read"
  ON public.board_members FOR SELECT
  USING (auth.uid() = board_owner_id OR auth.uid() = member_id);

CREATE POLICY "Self can leave"
  ON public.board_members FOR DELETE
  USING (auth.uid() = board_owner_id OR auth.uid() = member_id);


-- 3. 활동 로그 테이블
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  board_owner_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id        uuid        NOT NULL REFERENCES auth.users(id),
  actor_email     text        NOT NULL,
  action          text        NOT NULL CHECK (action IN ('card_added', 'card_deleted', 'card_moved')),
  card_text       text        NOT NULL,
  from_column     text,
  to_column       text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Board members can read logs"
  ON public.activity_logs FOR SELECT
  USING (
    auth.uid() = board_owner_id OR
    EXISTS (
      SELECT 1 FROM public.board_members
      WHERE board_owner_id = activity_logs.board_owner_id
        AND member_id = auth.uid()
    )
  );

CREATE POLICY "Board members can insert logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (
    auth.uid() = actor_id AND (
      auth.uid() = board_owner_id OR
      EXISTS (
        SELECT 1 FROM public.board_members
        WHERE board_owner_id = activity_logs.board_owner_id
          AND member_id = auth.uid()
      )
    )
  );


-- 4. kanban_boards RLS 업데이트 (멤버도 접근 가능하도록)
DROP POLICY IF EXISTS "Own board only" ON public.kanban_boards;

CREATE POLICY "Board access"
  ON public.kanban_boards FOR ALL
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.board_members
      WHERE board_owner_id = kanban_boards.user_id
        AND member_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.board_members
      WHERE board_owner_id = kanban_boards.user_id
        AND member_id = auth.uid()
    )
  );


-- 5. Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE public.kanban_boards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.board_members;
