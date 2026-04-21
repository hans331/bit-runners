-- 2026-04-21: 홈 히어로 랭킹 RPC (build 17)
-- 경쟁·소셜 중심 컨셉 피벗. 3시간축(오늘/이달/올해) + 진행형 메시지 ("X km 더 달리면 N-K위") 지원.
-- 기존 find_best_matched_rank (월간만) 는 하위 호환을 위해 유지. 이 함수는 홈 히어로 전용.

BEGIN;

-- 보조 유틸: 시간축별 활동 기간 [start_date, end_date] 반환
CREATE OR REPLACE FUNCTION _hero_date_range(time_axis TEXT)
RETURNS TABLE (start_d DATE, end_d DATE)
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF time_axis = 'today' THEN
    RETURN QUERY SELECT CURRENT_DATE, CURRENT_DATE;
  ELSIF time_axis = 'year' THEN
    RETURN QUERY SELECT DATE_TRUNC('year', CURRENT_DATE)::DATE, CURRENT_DATE;
  ELSE  -- 'month' (기본)
    RETURN QUERY SELECT DATE_TRUNC('month', CURRENT_DATE)::DATE, CURRENT_DATE;
  END IF;
END;
$$;

-- 보조 유틸: 주어진 스코프 조건에서 랭킹 CTE 생성 — 여기선 함수 분리가 어려우므로 RPC 내부에서 WITH로 처리.

-- 홈 히어로 랭킹 — 10위 이내 드는 가장 좁은 조건을 자동 선택하여 반환
-- 좌절 방어: 350위 같은 큰 숫자 노출 금지. 10위 이내가 없으면 최종 폴백은 '전국 전체' 의 현재 순위 그대로 반환.
CREATE OR REPLACE FUNCTION find_hero_rank(
  target_user_id UUID,
  time_axis TEXT DEFAULT 'month'
)
RETURNS TABLE (
  scope_label TEXT,
  scope_type TEXT,
  rank_position INT,
  total_in_scope INT,
  my_km NUMERIC,
  km_to_next NUMERIC,
  target_rank INT,
  time_axis_out TEXT
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
  d_start DATE;
  d_end DATE;
  v_rank INT;
  v_total INT;
  v_my_km NUMERIC;
  v_next_km NUMERIC;
  v_target_rank INT;
  v_label TEXT;
  v_type TEXT;
BEGIN
  SELECT country_code, region_si, region_gu, gender, birth_year
  INTO u_country, u_si, u_gu, u_gender, u_birth
  FROM profiles WHERE id = target_user_id;

  u_decade := age_decade(u_birth);
  SELECT start_d, end_d INTO d_start, d_end FROM _hero_date_range(time_axis);

  -- 내부 헬퍼: 주어진 조건으로 랭킹 계산 후 10위 이내면 담는다.
  -- 반환 가능한 경우: (조건 좁은 순) 구+성별+연령대 → 구+성별 → 구 → 시 → 성별+연령대 (전국) → 국가 → 전체

  -- 재사용을 위해 DO 블록 대신 각 케이스 분리 — 초기 값은 NULL.
  v_rank := NULL;

  -- 케이스 1: 구+성별+연령대
  IF u_gu IS NOT NULL AND u_gender IS NOT NULL AND u_decade IS NOT NULL THEN
    WITH period AS (
      SELECT a.user_id, SUM(a.distance_km) AS km
      FROM activities a
      JOIN profiles p ON p.id = a.user_id
      WHERE p.region_gu = u_gu
        AND p.gender = u_gender
        AND age_decade(p.birth_year) = u_decade
        AND p.is_public = true
        AND a.visibility = 'public'
        AND a.activity_date BETWEEN d_start AND d_end
      GROUP BY a.user_id
    ),
    ranked AS (
      SELECT user_id, km, RANK() OVER (ORDER BY km DESC) AS r FROM period
    )
    SELECT r::INT, (SELECT COUNT(*)::INT FROM period), km
    INTO v_rank, v_total, v_my_km
    FROM ranked WHERE user_id = target_user_id LIMIT 1;

    IF v_rank IS NOT NULL AND v_rank <= 10 THEN
      v_label := u_gu || ' ' || u_decade::text || '대 ' ||
                 CASE u_gender WHEN 'male' THEN '남성' WHEN 'female' THEN '여성' ELSE '' END;
      v_type := 'gu_gender_decade';
      -- 다음 순위까지 km
      WITH period AS (
        SELECT a.user_id, SUM(a.distance_km) AS km
        FROM activities a
        JOIN profiles p ON p.id = a.user_id
        WHERE p.region_gu = u_gu AND p.gender = u_gender AND age_decade(p.birth_year) = u_decade
          AND p.is_public = true AND a.visibility = 'public'
          AND a.activity_date BETWEEN d_start AND d_end
        GROUP BY a.user_id
      )
      SELECT (SELECT km FROM period ORDER BY km DESC OFFSET GREATEST(v_rank - 2, 0) LIMIT 1) - v_my_km
      INTO v_next_km;
      v_target_rank := GREATEST(v_rank - 1, 1);
      RETURN QUERY SELECT v_label, v_type, v_rank, v_total, v_my_km,
                          COALESCE(v_next_km, 0)::NUMERIC, v_target_rank, time_axis;
      RETURN;
    END IF;
  END IF;

  -- 케이스 2: 구+성별
  IF u_gu IS NOT NULL AND u_gender IS NOT NULL THEN
    WITH period AS (
      SELECT a.user_id, SUM(a.distance_km) AS km
      FROM activities a
      JOIN profiles p ON p.id = a.user_id
      WHERE p.region_gu = u_gu AND p.gender = u_gender
        AND p.is_public = true AND a.visibility = 'public'
        AND a.activity_date BETWEEN d_start AND d_end
      GROUP BY a.user_id
    ),
    ranked AS (SELECT user_id, km, RANK() OVER (ORDER BY km DESC) AS r FROM period)
    SELECT r::INT, (SELECT COUNT(*)::INT FROM period), km
    INTO v_rank, v_total, v_my_km
    FROM ranked WHERE user_id = target_user_id LIMIT 1;

    IF v_rank IS NOT NULL AND v_rank <= 10 THEN
      v_label := u_gu || ' ' ||
                 CASE u_gender WHEN 'male' THEN '남성' WHEN 'female' THEN '여성' ELSE '' END;
      v_type := 'gu_gender';
      WITH period AS (
        SELECT a.user_id, SUM(a.distance_km) AS km
        FROM activities a
        JOIN profiles p ON p.id = a.user_id
        WHERE p.region_gu = u_gu AND p.gender = u_gender
          AND p.is_public = true AND a.visibility = 'public'
          AND a.activity_date BETWEEN d_start AND d_end
        GROUP BY a.user_id
      )
      SELECT (SELECT km FROM period ORDER BY km DESC OFFSET GREATEST(v_rank - 2, 0) LIMIT 1) - v_my_km
      INTO v_next_km;
      v_target_rank := GREATEST(v_rank - 1, 1);
      RETURN QUERY SELECT v_label, v_type, v_rank, v_total, v_my_km,
                          COALESCE(v_next_km, 0)::NUMERIC, v_target_rank, time_axis;
      RETURN;
    END IF;
  END IF;

  -- 케이스 3: 구 (동네 전체)
  IF u_gu IS NOT NULL THEN
    WITH period AS (
      SELECT a.user_id, SUM(a.distance_km) AS km
      FROM activities a
      JOIN profiles p ON p.id = a.user_id
      WHERE p.region_gu = u_gu
        AND p.is_public = true AND a.visibility = 'public'
        AND a.activity_date BETWEEN d_start AND d_end
      GROUP BY a.user_id
    ),
    ranked AS (SELECT user_id, km, RANK() OVER (ORDER BY km DESC) AS r FROM period)
    SELECT r::INT, (SELECT COUNT(*)::INT FROM period), km
    INTO v_rank, v_total, v_my_km
    FROM ranked WHERE user_id = target_user_id LIMIT 1;

    IF v_rank IS NOT NULL AND v_rank <= 10 THEN
      v_label := u_gu;
      v_type := 'gu';
      WITH period AS (
        SELECT a.user_id, SUM(a.distance_km) AS km
        FROM activities a
        JOIN profiles p ON p.id = a.user_id
        WHERE p.region_gu = u_gu
          AND p.is_public = true AND a.visibility = 'public'
          AND a.activity_date BETWEEN d_start AND d_end
        GROUP BY a.user_id
      )
      SELECT (SELECT km FROM period ORDER BY km DESC OFFSET GREATEST(v_rank - 2, 0) LIMIT 1) - v_my_km
      INTO v_next_km;
      v_target_rank := GREATEST(v_rank - 1, 1);
      RETURN QUERY SELECT v_label, v_type, v_rank, v_total, v_my_km,
                          COALESCE(v_next_km, 0)::NUMERIC, v_target_rank, time_axis;
      RETURN;
    END IF;
  END IF;

  -- 케이스 4: 시
  IF u_si IS NOT NULL THEN
    WITH period AS (
      SELECT a.user_id, SUM(a.distance_km) AS km
      FROM activities a
      JOIN profiles p ON p.id = a.user_id
      WHERE p.region_si = u_si
        AND p.is_public = true AND a.visibility = 'public'
        AND a.activity_date BETWEEN d_start AND d_end
      GROUP BY a.user_id
    ),
    ranked AS (SELECT user_id, km, RANK() OVER (ORDER BY km DESC) AS r FROM period)
    SELECT r::INT, (SELECT COUNT(*)::INT FROM period), km
    INTO v_rank, v_total, v_my_km
    FROM ranked WHERE user_id = target_user_id LIMIT 1;

    IF v_rank IS NOT NULL AND v_rank <= 10 THEN
      v_label := u_si;
      v_type := 'si';
      WITH period AS (
        SELECT a.user_id, SUM(a.distance_km) AS km
        FROM activities a
        JOIN profiles p ON p.id = a.user_id
        WHERE p.region_si = u_si
          AND p.is_public = true AND a.visibility = 'public'
          AND a.activity_date BETWEEN d_start AND d_end
        GROUP BY a.user_id
      )
      SELECT (SELECT km FROM period ORDER BY km DESC OFFSET GREATEST(v_rank - 2, 0) LIMIT 1) - v_my_km
      INTO v_next_km;
      v_target_rank := GREATEST(v_rank - 1, 1);
      RETURN QUERY SELECT v_label, v_type, v_rank, v_total, v_my_km,
                          COALESCE(v_next_km, 0)::NUMERIC, v_target_rank, time_axis;
      RETURN;
    END IF;
  END IF;

  -- 케이스 5: 전국 성별+연령대 (같은 또래, 같은 성별)
  IF u_gender IS NOT NULL AND u_decade IS NOT NULL THEN
    WITH period AS (
      SELECT a.user_id, SUM(a.distance_km) AS km
      FROM activities a
      JOIN profiles p ON p.id = a.user_id
      WHERE p.gender = u_gender AND age_decade(p.birth_year) = u_decade
        AND p.is_public = true AND a.visibility = 'public'
        AND a.activity_date BETWEEN d_start AND d_end
      GROUP BY a.user_id
    ),
    ranked AS (SELECT user_id, km, RANK() OVER (ORDER BY km DESC) AS r FROM period)
    SELECT r::INT, (SELECT COUNT(*)::INT FROM period), km
    INTO v_rank, v_total, v_my_km
    FROM ranked WHERE user_id = target_user_id LIMIT 1;

    IF v_rank IS NOT NULL AND v_rank <= 10 THEN
      v_label := '전국 ' || u_decade::text || '대 ' ||
                 CASE u_gender WHEN 'male' THEN '남성' WHEN 'female' THEN '여성' ELSE '' END;
      v_type := 'nation_gender_decade';
      WITH period AS (
        SELECT a.user_id, SUM(a.distance_km) AS km
        FROM activities a
        JOIN profiles p ON p.id = a.user_id
        WHERE p.gender = u_gender AND age_decade(p.birth_year) = u_decade
          AND p.is_public = true AND a.visibility = 'public'
          AND a.activity_date BETWEEN d_start AND d_end
        GROUP BY a.user_id
      )
      SELECT (SELECT km FROM period ORDER BY km DESC OFFSET GREATEST(v_rank - 2, 0) LIMIT 1) - v_my_km
      INTO v_next_km;
      v_target_rank := GREATEST(v_rank - 1, 1);
      RETURN QUERY SELECT v_label, v_type, v_rank, v_total, v_my_km,
                          COALESCE(v_next_km, 0)::NUMERIC, v_target_rank, time_axis;
      RETURN;
    END IF;
  END IF;

  -- 케이스 최종: 10위 내 드는 조건이 없으면 — 가장 좁은 조건 중 하나 그대로 반환 (구 > 시 > 국가)
  -- 350위 같은 큰 숫자 대신 "새로운 스코프라 데이터가 적어요" UX 를 위해 total 이 매우 작으면 대신 전국 10위 이내 달성 기회 메시지 (클라에서 처리)
  IF u_gu IS NOT NULL THEN
    WITH period AS (
      SELECT a.user_id, SUM(a.distance_km) AS km
      FROM activities a
      JOIN profiles p ON p.id = a.user_id
      WHERE p.region_gu = u_gu
        AND p.is_public = true AND a.visibility = 'public'
        AND a.activity_date BETWEEN d_start AND d_end
      GROUP BY a.user_id
    ),
    ranked AS (SELECT user_id, km, RANK() OVER (ORDER BY km DESC) AS r FROM period)
    SELECT r::INT, (SELECT COUNT(*)::INT FROM period), km
    INTO v_rank, v_total, v_my_km
    FROM ranked WHERE user_id = target_user_id LIMIT 1;

    IF v_rank IS NOT NULL THEN
      v_label := u_gu;
      v_type := 'gu_fallback';
      v_target_rank := GREATEST(v_rank - 1, 1);
      WITH period AS (
        SELECT a.user_id, SUM(a.distance_km) AS km
        FROM activities a
        JOIN profiles p ON p.id = a.user_id
        WHERE p.region_gu = u_gu
          AND p.is_public = true AND a.visibility = 'public'
          AND a.activity_date BETWEEN d_start AND d_end
        GROUP BY a.user_id
      )
      SELECT (SELECT km FROM period ORDER BY km DESC OFFSET GREATEST(v_rank - 2, 0) LIMIT 1) - v_my_km
      INTO v_next_km;
      RETURN QUERY SELECT v_label, v_type, v_rank, v_total, v_my_km,
                          COALESCE(v_next_km, 0)::NUMERIC, v_target_rank, time_axis;
      RETURN;
    END IF;
  END IF;

  -- 프로필 거의 없음 → 빈 결과
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION find_hero_rank(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION _hero_date_range(TEXT) TO authenticated;

COMMIT;
