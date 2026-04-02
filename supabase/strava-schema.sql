-- =============================================
-- Strava 연동 테이블
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- 1. Strava 연결 정보 테이블
CREATE TABLE strava_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  strava_athlete_id BIGINT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id),
  UNIQUE(strava_athlete_id)
);

-- 인덱스
CREATE INDEX idx_strava_connections_member ON strava_connections(member_id);
CREATE INDEX idx_strava_connections_athlete ON strava_connections(strava_athlete_id);

-- running_logs에 strava_activity_id 컬럼 추가 (중복 동기화 방지용)
ALTER TABLE running_logs ADD COLUMN IF NOT EXISTS strava_activity_id BIGINT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_running_logs_strava_activity ON running_logs(strava_activity_id) WHERE strava_activity_id IS NOT NULL;

-- RLS 설정 (기존 패턴과 동일)
ALTER TABLE strava_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON strava_connections FOR ALL USING (true) WITH CHECK (true);
