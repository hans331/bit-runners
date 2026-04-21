-- 2026-04-21: 클럽 삭제 RLS 정책 추가 + 클럽 게시글/공지 기능
-- 문제: clubs 에 DELETE 정책 누락 → 방장이 삭제 눌러도 조용히 거부됨 (에러 없음, 0 rows affected)
-- "Bit" 클럽이 멤버 0명으로 리스트에 계속 남아있던 원인

-- ============================================================================
-- 1. clubs DELETE 정책: 소유자 또는 앱 관리자(hans@openhan.kr)
-- ============================================================================
DROP POLICY IF EXISTS "clubs_delete" ON public.clubs;
CREATE POLICY "clubs_delete" ON public.clubs FOR DELETE USING (
  auth.uid() = created_by
  OR (auth.jwt() ->> 'email') = 'hans@openhan.kr'
);

-- club_members 는 이미 club_id FK 가 ON DELETE CASCADE. clubs 가 지워지면 자동 정리.
-- 다만 현재 RLS 정책은 방장만 자신의 멤버십을 지우게 되어 있을 수 있어
-- 클럽 삭제 시 연쇄 삭제가 안전하게 통과하도록 policy 한 줄 보강.
DROP POLICY IF EXISTS "club_members_delete_owner_cascade" ON public.club_members;
CREATE POLICY "club_members_delete_owner_cascade" ON public.club_members FOR DELETE USING (
  auth.uid() = user_id  -- 본인 탈퇴
  OR EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = club_id
      AND (c.created_by = auth.uid() OR (auth.jwt() ->> 'email') = 'hans@openhan.kr')
  )
);

-- ============================================================================
-- 2. 클럽 게시글/공지 테이블 (트위터 스타일)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.club_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  photo_url TEXT,  -- 선택. 1장만. 짧은 트윗 스타일이라 1장 제한.
  is_notice BOOLEAN DEFAULT false,  -- 공지: 피드 상단 고정
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS club_posts_club_created_idx
  ON public.club_posts (club_id, is_notice DESC, created_at DESC);

ALTER TABLE public.club_posts ENABLE ROW LEVEL SECURITY;

-- 읽기: 클럽 멤버 (+ 공개 클럽이면 누구나 목록만 볼 수 있게도 가능 — 여기선 멤버만)
DROP POLICY IF EXISTS "club_posts_select" ON public.club_posts;
CREATE POLICY "club_posts_select" ON public.club_posts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = club_posts.club_id AND cm.user_id = auth.uid()
  )
);

-- 작성: 클럽 멤버만
DROP POLICY IF EXISTS "club_posts_insert" ON public.club_posts;
CREATE POLICY "club_posts_insert" ON public.club_posts FOR INSERT WITH CHECK (
  auth.uid() = author_id
  AND EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = club_posts.club_id AND cm.user_id = auth.uid()
  )
);

-- 수정: 본인 작성자만 본문/공지 토글 가능 (공지는 owner/admin 만)
DROP POLICY IF EXISTS "club_posts_update" ON public.club_posts;
CREATE POLICY "club_posts_update" ON public.club_posts FOR UPDATE USING (
  auth.uid() = author_id
  OR EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = club_posts.club_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
  )
);

-- 삭제: 본인 + owner/admin + 앱 관리자
DROP POLICY IF EXISTS "club_posts_delete" ON public.club_posts;
CREATE POLICY "club_posts_delete" ON public.club_posts FOR DELETE USING (
  auth.uid() = author_id
  OR EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = club_posts.club_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
  )
  OR (auth.jwt() ->> 'email') = 'hans@openhan.kr'
);

-- ============================================================================
-- 3. 게시글 좋아요
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.club_post_likes (
  post_id UUID NOT NULL REFERENCES public.club_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE public.club_post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "club_post_likes_select" ON public.club_post_likes;
CREATE POLICY "club_post_likes_select" ON public.club_post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "club_post_likes_insert" ON public.club_post_likes;
CREATE POLICY "club_post_likes_insert" ON public.club_post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "club_post_likes_delete" ON public.club_post_likes;
CREATE POLICY "club_post_likes_delete" ON public.club_post_likes FOR DELETE USING (auth.uid() = user_id);

-- like_count 자동 동기화 트리거
CREATE OR REPLACE FUNCTION public.bump_club_post_like_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.club_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.club_posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS club_post_likes_bump_ins ON public.club_post_likes;
CREATE TRIGGER club_post_likes_bump_ins AFTER INSERT ON public.club_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.bump_club_post_like_count();
DROP TRIGGER IF EXISTS club_post_likes_bump_del ON public.club_post_likes;
CREATE TRIGGER club_post_likes_bump_del AFTER DELETE ON public.club_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.bump_club_post_like_count();

-- ============================================================================
-- 4. 게시글 댓글
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.club_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.club_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 300),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS club_post_comments_post_idx
  ON public.club_post_comments (post_id, created_at ASC);

ALTER TABLE public.club_post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "club_post_comments_select" ON public.club_post_comments;
CREATE POLICY "club_post_comments_select" ON public.club_post_comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.club_posts p
    JOIN public.club_members cm ON cm.club_id = p.club_id
    WHERE p.id = club_post_comments.post_id AND cm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "club_post_comments_insert" ON public.club_post_comments;
CREATE POLICY "club_post_comments_insert" ON public.club_post_comments FOR INSERT WITH CHECK (
  auth.uid() = author_id
  AND EXISTS (
    SELECT 1 FROM public.club_posts p
    JOIN public.club_members cm ON cm.club_id = p.club_id
    WHERE p.id = club_post_comments.post_id AND cm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "club_post_comments_delete" ON public.club_post_comments;
CREATE POLICY "club_post_comments_delete" ON public.club_post_comments FOR DELETE USING (
  auth.uid() = author_id
  OR EXISTS (
    SELECT 1 FROM public.club_posts p
    JOIN public.club_members cm ON cm.club_id = p.club_id
    WHERE p.id = club_post_comments.post_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
  )
);

CREATE OR REPLACE FUNCTION public.bump_club_post_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.club_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.club_posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS club_post_comments_bump_ins ON public.club_post_comments;
CREATE TRIGGER club_post_comments_bump_ins AFTER INSERT ON public.club_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.bump_club_post_comment_count();
DROP TRIGGER IF EXISTS club_post_comments_bump_del ON public.club_post_comments;
CREATE TRIGGER club_post_comments_bump_del AFTER DELETE ON public.club_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.bump_club_post_comment_count();

-- ============================================================================
-- 5. 피드 조회 RPC (join 편의)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_club_feed(
  p_club_id UUID,
  p_limit INTEGER DEFAULT 30
)
RETURNS TABLE (
  id UUID,
  body TEXT,
  photo_url TEXT,
  is_notice BOOLEAN,
  like_count INTEGER,
  comment_count INTEGER,
  liked_by_me BOOLEAN,
  created_at TIMESTAMPTZ,
  author_id UUID,
  author_name TEXT,
  author_avatar TEXT,
  author_role TEXT
)
LANGUAGE SQL STABLE SECURITY INVOKER AS $$
  SELECT
    p.id, p.body, p.photo_url, p.is_notice, p.like_count, p.comment_count,
    EXISTS (SELECT 1 FROM public.club_post_likes l WHERE l.post_id = p.id AND l.user_id = auth.uid()) AS liked_by_me,
    p.created_at,
    p.author_id,
    pr.display_name AS author_name,
    pr.avatar_url AS author_avatar,
    cm.role AS author_role
  FROM public.club_posts p
  JOIN public.profiles pr ON pr.id = p.author_id
  LEFT JOIN public.club_members cm ON cm.club_id = p.club_id AND cm.user_id = p.author_id
  WHERE p.club_id = p_club_id
  ORDER BY p.is_notice DESC, p.created_at DESC
  LIMIT p_limit;
$$;
