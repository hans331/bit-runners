-- Phase 6: Apple Health 데이터 확장
-- activities 테이블에 심박수, 활동에너지, 운동종류 컬럼 추가

ALTER TABLE activities ADD COLUMN IF NOT EXISTS heart_rate_avg integer;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS heart_rate_max integer;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS active_energy_kcal numeric;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS activity_type text DEFAULT 'running';

-- Phase 7: 캘린더 사진
CREATE TABLE IF NOT EXISTS calendar_photos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  photo_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- RLS 정책
ALTER TABLE calendar_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calendar photos"
  ON calendar_photos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar photos"
  ON calendar_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar photos"
  ON calendar_photos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar photos"
  ON calendar_photos FOR DELETE
  USING (auth.uid() = user_id);
