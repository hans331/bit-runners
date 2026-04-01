-- =============================================
-- BIT Runners 대시보드 스키마
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- 1. 멤버 테이블
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  member_number INT NOT NULL,
  join_date DATE,
  join_location TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dormant')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 월별 기록 테이블
CREATE TABLE monthly_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL,
  goal_km DECIMAL(6,2) NOT NULL DEFAULT 0,
  achieved_km DECIMAL(6,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, year, month)
);

-- 3. 일별 러닝 기록 (향후 사용)
CREATE TABLE running_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  run_date DATE NOT NULL,
  distance_km DECIMAL(6,2) NOT NULL,
  duration_minutes INT,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 시상 기록
CREATE TABLE awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL,
  award_type TEXT NOT NULL CHECK (award_type IN ('피니셔상', '롱런상', '개근상', '특별상')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_monthly_records_member ON monthly_records(member_id);
CREATE INDEX idx_monthly_records_period ON monthly_records(year, month);
CREATE INDEX idx_running_logs_member ON running_logs(member_id);
CREATE INDEX idx_running_logs_date ON running_logs(run_date);

-- RLS 비활성화 (클럽 내부 사용이므로)
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE running_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;

-- 모든 사용자 읽기/쓰기 허용 정책
CREATE POLICY "Allow all" ON members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON monthly_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON running_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON awards FOR ALL USING (true) WITH CHECK (true);
