-- 2026-04-20: 매칭 랭킹을 위한 프로필 인구통계 확장
-- "내가 50위 안에 드는 조건" 자동 탐색을 위해 인구통계학적 필터 3종 추가.
-- 키/체중은 의도적으로 제외 (러닝 성적 상관관계 약함 + 체중 랭킹 심리적 역효과).

BEGIN;

-- 생년: INT 로 저장 (나이는 매년 바뀌므로 계산 필드). NULL 허용 (점진적 프로파일링).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_year INT CHECK (birth_year IS NULL OR (birth_year >= 1920 AND birth_year <= EXTRACT(YEAR FROM CURRENT_DATE)::INT));

-- 성별: 자기 기입 자유 문자열이 아니라 enum 유사 제약. 'male' | 'female' | 'other' | NULL.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IS NULL OR gender IN ('male', 'female', 'other'));

-- 러닝 시작 연월: 'YYYY-MM' 포맷 텍스트. 경력 그룹핑 (6개월 이내, 6개월~1년, 1~3년, 3년+) 파생.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS running_since DATE;

-- 국가 코드: 해외 유저 지원. ISO 3166-1 alpha-2 ('KR', 'US', 'JP' …).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country_code TEXT CHECK (country_code IS NULL OR char_length(country_code) = 2);

-- 랭킹 매칭 대상 필터링용 인덱스
CREATE INDEX IF NOT EXISTS idx_profiles_demographics
  ON profiles (country_code, region_si, region_gu, gender, birth_year)
  WHERE is_public = true;

-- 러닝 경력 그룹 계산 함수 (랭킹 쿼리에서 참조)
CREATE OR REPLACE FUNCTION running_tenure_bucket(started DATE)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE
    WHEN started IS NULL THEN NULL
    WHEN started > CURRENT_DATE - INTERVAL '6 months' THEN 'lt_6m'
    WHEN started > CURRENT_DATE - INTERVAL '1 year' THEN '6m_1y'
    WHEN started > CURRENT_DATE - INTERVAL '3 years' THEN '1y_3y'
    ELSE 'gt_3y'
  END;
$$;

-- 연령대 그룹 계산 함수 (10대/20대/30대/...)
CREATE OR REPLACE FUNCTION age_decade(birth INT)
RETURNS INT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE
    WHEN birth IS NULL THEN NULL
    ELSE ((EXTRACT(YEAR FROM CURRENT_DATE)::INT - birth) / 10) * 10
  END;
$$;

COMMIT;
