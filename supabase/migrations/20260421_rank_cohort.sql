-- 2026-04-21: 주간 랭킹 코호트 RPC (build 17)
-- "나를 쫓는 사람" / "따라잡기 타겟" 표시용. 내 앞 3명 + 나 + 내 뒤 3명 반환.
-- 리그 시스템 V1 — 영속 league_id 없이 주간 km 기준 동적 코호트.

BEGIN;

CREATE OR REPLACE FUNCTION weekly_rank_neighbors(
  target_user_id UUID,
  neighbor_count INT DEFAULT 3
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  region_gu TEXT,
  weekly_km NUMERIC,
  rank_position INT,
  is_me BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  u_gu TEXT;
  u_si TEXT;
  week_start DATE := (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 day')::DATE - INTERVAL '1 day';
  -- 월요일 기준 (DATE_TRUNC week는 월요일 시작) — 실제 한국 UX 는 월요일 기준
  my_rank INT;
  total INT;
BEGIN
  SELECT region_gu, region_si INTO u_gu, u_si FROM profiles WHERE id = target_user_id;

  -- 코호트: 내 구 > 내 시 > 국가 폴백
  RETURN QUERY
  WITH scope_users AS (
    SELECT p.id, p.display_name, p.avatar_url, p.region_gu
    FROM profiles p
    WHERE p.is_public = true
      AND (
        (u_gu IS NOT NULL AND p.region_gu = u_gu)
        OR (u_gu IS NULL AND u_si IS NOT NULL AND p.region_si = u_si)
        OR (u_gu IS NULL AND u_si IS NULL)
      )
  ),
  weekly AS (
    SELECT s.id, s.display_name, s.avatar_url, s.region_gu,
           COALESCE(SUM(a.distance_km), 0) AS km
    FROM scope_users s
    LEFT JOIN activities a ON a.user_id = s.id AND a.visibility = 'public'
      AND a.activity_date >= week_start
    GROUP BY s.id, s.display_name, s.avatar_url, s.region_gu
  ),
  ranked AS (
    SELECT w.*, RANK() OVER (ORDER BY km DESC, id) AS r
    FROM weekly w
  ),
  my_row AS (
    SELECT r FROM ranked WHERE id = target_user_id LIMIT 1
  )
  SELECT
    ranked.id,
    ranked.display_name,
    ranked.avatar_url,
    ranked.region_gu,
    ranked.km,
    ranked.r::INT,
    (ranked.id = target_user_id)
  FROM ranked, my_row
  WHERE ranked.r BETWEEN GREATEST(my_row.r - neighbor_count, 1) AND my_row.r + neighbor_count
  ORDER BY ranked.r;
END;
$$;

GRANT EXECUTE ON FUNCTION weekly_rank_neighbors(UUID, INT) TO authenticated;

COMMIT;
