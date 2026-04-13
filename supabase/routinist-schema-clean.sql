-- =============================================
-- Routinist 스키마 (v2)
-- =============================================

-- 1. 사용자 프로필 (Supabase Auth 연동)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  locale TEXT DEFAULT 'ko',
  privacy_zone_lat DOUBLE PRECISION,
  privacy_zone_lng DOUBLE PRECISION,
  privacy_zone_radius_m INT DEFAULT 500,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 활동 기록 (개인 러닝 로그)
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  distance_km DECIMAL(8,3) NOT NULL,
  duration_seconds INT,
  pace_avg_sec_per_km INT,
  calories INT,
  memo TEXT,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'gps', 'health_kit', 'health_connect')),
  route_data JSONB,
  map_snapshot_url TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 월간 목표
CREATE TABLE monthly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL,
  goal_km DECIMAL(6,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year, month)
);

-- 인덱스
CREATE INDEX idx_activities_user ON activities(user_id);
CREATE INDEX idx_activities_date ON activities(activity_date);
CREATE INDEX idx_activities_user_date ON activities(user_id, activity_date);
CREATE INDEX idx_monthly_goals_user ON monthly_goals(user_id);
CREATE INDEX idx_monthly_goals_period ON monthly_goals(year, month);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_goals ENABLE ROW LEVEL SECURITY;

-- profiles 정책
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- activities 정책
CREATE POLICY "activities_select_own" ON activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "activities_insert_own" ON activities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "activities_update_own" ON activities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "activities_delete_own" ON activities FOR DELETE USING (auth.uid() = user_id);

-- monthly_goals 정책
CREATE POLICY "goals_select_own" ON monthly_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "goals_insert_own" ON monthly_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals_update_own" ON monthly_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "goals_delete_own" ON monthly_goals FOR DELETE USING (auth.uid() = user_id);

-- Storage 버킷
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('route-snapshots', 'route-snapshots', false);

-- Storage 정책
CREATE POLICY "avatars_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "routes_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'route-snapshots' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "routes_select_own" ON storage.objects FOR SELECT USING (bucket_id = 'route-snapshots' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 프로필 자동 생성 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', '러너')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
