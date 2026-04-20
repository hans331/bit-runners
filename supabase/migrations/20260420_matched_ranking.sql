-- 2026-04-20: 매칭 랭킹 RPC
-- 사용자에게 "내가 50위 안에 드는 조건" 을 자동 탐색해서 한 줄로 보여주기 위한 함수.
-- 조건을 점진적으로 넓히며 (가장 좁은 조건부터 시작) 50위 이내에 드는 최초의 조건을 리턴.

BEGIN;

-- 이번 달 거리 + 프로필 필터 기반 랭킹 계산 (공통 CTE 를 사용하는 RPC)
-- target_user_id 가 어떤 스코프(조건)에서 몇 위인지 찾고, 50위 이내면 반환.
CREATE OR REPLACE FUNCTION find_best_matched_rank(target_user_id UUID)
RETURNS TABLE (
  scope_label TEXT,        -- "강남구 50대 남성 중" 같은 사람 읽기 쉬운 라벨
  scope_type TEXT,         -- 'gu_gender_decade' | 'gu_gender' | 'gu' | 'si' | 'country' 등 (디버깅용)
  rank_position INT,
  total_in_scope INT,
  monthly_km NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  u_country TEXT;
  u_si TEXT;
  u_gu TEXT;
  u_gender TEXT;
  u_decade INT;
  u_birth INT;
  this_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  this_month INT := EXTRACT(MONTH FROM CURRENT_DATE)::INT;
BEGIN
  SELECT country_code, region_si, region_gu, gender, birth_year
  INTO u_country, u_si, u_gu, u_gender, u_birth
  FROM profiles WHERE id = target_user_id;

  u_decade := age_decade(u_birth);

  -- 조건 우선순위 (좁은 → 넓은): 구+성별+연령대 → 구+성별 → 구 → 시 → 국가 → 전체
  -- 각 조건에서 유저 본인의 이번 달 km 랭킹을 계산. 50위 이내면 즉시 반환.

  -- 조건 1: 구 + 성별 + 연령대 (가장 좁음)
  IF u_gu IS NOT NULL AND u_gender IS NOT NULL AND u_decade IS NOT NULL THEN
    RETURN QUERY
    WITH monthly AS (
      SELECT a.user_id, SUM(a.distance_km) AS km
      FROM activities a
      JOIN profiles p ON p.id = a.user_id
      WHERE p.region_gu = u_gu
        AND p.gender = u_gender
        AND age_decade(p.birth_year) = u_decade
        AND p.is_public = true
        AND a.visibility = 'public'
        AND EXTRACT(YEAR FROM a.activity_date)::INT = this_year
        AND EXTRACT(MONTH FROM a.activity_date)::INT = this_month
      GROUP BY a.user_id
    ),
    ranked AS (
      SELECT user_id, km, RANK() OVER (ORDER BY km DESC) AS r
      FROM monthly
    )
    SELECT
      u_gu || ' ' || u_decade::text || '대 ' ||
        CASE u_gender WHEN 'male' THEN '남성' WHEN 'female' THEN '여성' ELSE '' END || ' 중',
      'gu_gender_decade',
      r::INT, (SELECT COUNT(*)::INT FROM monthly), km
    FROM ranked WHERE user_id = target_user_id AND r <= 50
    LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  -- 조건 2: 구 + 성별
  IF u_gu IS NOT NULL AND u_gender IS NOT NULL THEN
    RETURN QUERY
    WITH monthly AS (
      SELECT a.user_id, SUM(a.distance_km) AS km
      FROM activities a
      JOIN profiles p ON p.id = a.user_id
      WHERE p.region_gu = u_gu AND p.gender = u_gender
        AND p.is_public = true AND a.visibility = 'public'
        AND EXTRACT(YEAR FROM a.activity_date)::INT = this_year
        AND EXTRACT(MONTH FROM a.activity_date)::INT = this_month
      GROUP BY a.user_id
    ),
    ranked AS (SELECT user_id, km, RANK() OVER (ORDER BY km DESC) AS r FROM monthly)
    SELECT
      u_gu || ' ' || CASE u_gender WHEN 'male' THEN '남성' WHEN 'female' THEN '여성' ELSE '' END || ' 중',
      'gu_gender',
      r::INT, (SELECT COUNT(*)::INT FROM monthly), km
    FROM ranked WHERE user_id = target_user_id AND r <= 50
    LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  -- 조건 3: 구
  IF u_gu IS NOT NULL THEN
    RETURN QUERY
    WITH monthly AS (
      SELECT a.user_id, SUM(a.distance_km) AS km
      FROM activities a
      JOIN profiles p ON p.id = a.user_id
      WHERE p.region_gu = u_gu
        AND p.is_public = true AND a.visibility = 'public'
        AND EXTRACT(YEAR FROM a.activity_date)::INT = this_year
        AND EXTRACT(MONTH FROM a.activity_date)::INT = this_month
      GROUP BY a.user_id
    ),
    ranked AS (SELECT user_id, km, RANK() OVER (ORDER BY km DESC) AS r FROM monthly)
    SELECT u_gu || ' 중', 'gu', r::INT, (SELECT COUNT(*)::INT FROM monthly), km
    FROM ranked WHERE user_id = target_user_id AND r <= 50
    LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  -- 조건 4: 시
  IF u_si IS NOT NULL THEN
    RETURN QUERY
    WITH monthly AS (
      SELECT a.user_id, SUM(a.distance_km) AS km
      FROM activities a
      JOIN profiles p ON p.id = a.user_id
      WHERE p.region_si = u_si
        AND p.is_public = true AND a.visibility = 'public'
        AND EXTRACT(YEAR FROM a.activity_date)::INT = this_year
        AND EXTRACT(MONTH FROM a.activity_date)::INT = this_month
      GROUP BY a.user_id
    ),
    ranked AS (SELECT user_id, km, RANK() OVER (ORDER BY km DESC) AS r FROM monthly)
    SELECT u_si || ' 중', 'si', r::INT, (SELECT COUNT(*)::INT FROM monthly), km
    FROM ranked WHERE user_id = target_user_id AND r <= 50
    LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  -- 조건 5: 국가 (필수 폴백)
  RETURN QUERY
  WITH monthly AS (
    SELECT a.user_id, SUM(a.distance_km) AS km
    FROM activities a
    JOIN profiles p ON p.id = a.user_id
    WHERE (u_country IS NULL OR p.country_code = u_country OR (u_country = 'KR' AND p.country_code IS NULL))
      AND p.is_public = true AND a.visibility = 'public'
      AND EXTRACT(YEAR FROM a.activity_date)::INT = this_year
      AND EXTRACT(MONTH FROM a.activity_date)::INT = this_month
    GROUP BY a.user_id
  ),
  ranked AS (SELECT user_id, km, RANK() OVER (ORDER BY km DESC) AS r FROM monthly)
  SELECT
    COALESCE(u_country, 'KR') || ' 전체 중',
    'country',
    r::INT, (SELECT COUNT(*)::INT FROM monthly), km
  FROM ranked WHERE user_id = target_user_id
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION find_best_matched_rank(UUID) TO authenticated;

-- 오늘의 동네 TOP N: 메인에서 "오늘 강남구 TOP 10" 가로 스크롤 용.
CREATE OR REPLACE FUNCTION today_local_top(target_gu TEXT, top_n INT DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  today_km NUMERIC,
  rank_position INT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  WITH today AS (
    SELECT a.user_id, SUM(a.distance_km) AS km
    FROM activities a
    JOIN profiles p ON p.id = a.user_id
    WHERE p.region_gu = target_gu
      AND p.is_public = true
      AND a.visibility = 'public'
      AND a.activity_date = CURRENT_DATE
    GROUP BY a.user_id
  )
  SELECT
    t.user_id,
    p.display_name,
    p.avatar_url,
    t.km,
    RANK() OVER (ORDER BY t.km DESC)::INT
  FROM today t
  JOIN profiles p ON p.id = t.user_id
  ORDER BY t.km DESC
  LIMIT top_n;
$$;

GRANT EXECUTE ON FUNCTION today_local_top(TEXT, INT) TO authenticated;

COMMIT;
