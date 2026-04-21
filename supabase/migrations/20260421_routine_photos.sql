-- 2026-04-21: 루틴포토 (Routinist Photos) — 좋아요 + 메인 하단 캐러셀
-- 경쟁·소셜 컨셉 피벗 일환. activity_photos 에 like_count 추가 + photo_likes 테이블 신설.
-- 친구 가중치·동네 가중치는 RPC 에서 처리.

BEGIN;

-- 좋아요 카운트 컬럼
ALTER TABLE activity_photos
  ADD COLUMN IF NOT EXISTS like_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_count INT NOT NULL DEFAULT 0;

-- 좋아요 테이블
CREATE TABLE IF NOT EXISTS photo_likes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES activity_photos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, photo_id)
);

CREATE INDEX IF NOT EXISTS idx_photo_likes_photo ON photo_likes(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_likes_user ON photo_likes(user_id, created_at DESC);

ALTER TABLE photo_likes ENABLE ROW LEVEL SECURITY;

-- 누구나 자신의 좋아요는 조회/생성/삭제 가능. 다른 사람 좋아요는 조회만.
DROP POLICY IF EXISTS photo_likes_read ON photo_likes;
CREATE POLICY photo_likes_read ON photo_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS photo_likes_insert ON photo_likes;
CREATE POLICY photo_likes_insert ON photo_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS photo_likes_delete ON photo_likes;
CREATE POLICY photo_likes_delete ON photo_likes
  FOR DELETE USING (auth.uid() = user_id);

-- like_count 자동 동기화 트리거
CREATE OR REPLACE FUNCTION _update_photo_like_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE activity_photos SET like_count = like_count + 1 WHERE id = NEW.photo_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE activity_photos SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.photo_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_photo_likes_count ON photo_likes;
CREATE TRIGGER trg_photo_likes_count
  AFTER INSERT OR DELETE ON photo_likes
  FOR EACH ROW EXECUTE FUNCTION _update_photo_like_count();

-- 메인 하단 인기 캐러셀용 RPC — 친구 가중치 1.5, 내 구 1.3 배
-- 최근 7일 루틴포토 + 친구·동네 가중치 점수 반영 Top N
CREATE OR REPLACE FUNCTION routine_photos_trending(
  viewer_id UUID,
  limit_n INT DEFAULT 20
)
RETURNS TABLE (
  photo_id UUID,
  photo_url TEXT,
  caption TEXT,
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  region_gu TEXT,
  distance_km NUMERIC,
  activity_date DATE,
  like_count INT,
  liked_by_me BOOLEAN,
  score NUMERIC,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  viewer_gu TEXT;
BEGIN
  SELECT region_gu INTO viewer_gu FROM profiles WHERE id = viewer_id;

  RETURN QUERY
  WITH friend_ids AS (
    SELECT followed_id AS id FROM follows WHERE follower_id = viewer_id
  )
  SELECT
    ph.id,
    ph.photo_url,
    ph.caption,
    ph.user_id,
    p.display_name,
    p.avatar_url,
    p.region_gu,
    a.distance_km,
    a.activity_date,
    ph.like_count,
    EXISTS(SELECT 1 FROM photo_likes pl WHERE pl.photo_id = ph.id AND pl.user_id = viewer_id) AS liked_by_me,
    (
      ph.like_count::NUMERIC
      * CASE WHEN ph.user_id IN (SELECT id FROM friend_ids) THEN 1.5 ELSE 1.0 END
      * CASE WHEN viewer_gu IS NOT NULL AND p.region_gu = viewer_gu THEN 1.3 ELSE 1.0 END
      + GREATEST(0, 7 - EXTRACT(DAY FROM (now() - ph.created_at)))::NUMERIC * 0.5
    ) AS score,
    ph.created_at
  FROM activity_photos ph
  JOIN profiles p ON p.id = ph.user_id
  JOIN activities a ON a.id = ph.activity_id
  WHERE ph.share_in_gallery = true
    AND p.is_public = true
    AND a.visibility = 'public'
    AND ph.created_at > now() - INTERVAL '7 days'
  ORDER BY score DESC, ph.created_at DESC
  LIMIT limit_n;
END;
$$;

GRANT EXECUTE ON FUNCTION routine_photos_trending(UUID, INT) TO authenticated;

-- 포토 탭 내부: [🔥 인기] / [👥 친구] / [📍 동네] / [🕐 최신] / [❤️ 좋아요함]
-- 각각을 단순 쿼리로 처리 (RPC 필요 없음) — 포토 탭 SQL 은 앱에서 직접 쿼리.

-- 사용자가 좋아요한 사진
CREATE OR REPLACE FUNCTION my_liked_photos(
  viewer_id UUID,
  limit_n INT DEFAULT 50
)
RETURNS TABLE (
  photo_id UUID,
  photo_url TEXT,
  caption TEXT,
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  region_gu TEXT,
  distance_km NUMERIC,
  activity_date DATE,
  like_count INT,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT
    ph.id,
    ph.photo_url,
    ph.caption,
    ph.user_id,
    p.display_name,
    p.avatar_url,
    p.region_gu,
    a.distance_km,
    a.activity_date,
    ph.like_count,
    ph.created_at
  FROM photo_likes pl
  JOIN activity_photos ph ON ph.id = pl.photo_id
  JOIN profiles p ON p.id = ph.user_id
  JOIN activities a ON a.id = ph.activity_id
  WHERE pl.user_id = viewer_id
    AND ph.share_in_gallery = true
  ORDER BY pl.created_at DESC
  LIMIT limit_n;
$$;

GRANT EXECUTE ON FUNCTION my_liked_photos(UUID, INT) TO authenticated;

COMMIT;
