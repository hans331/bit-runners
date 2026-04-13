-- =============================================
-- Routinist Phase 1 Migration
-- profiles 확장 + 소셜/커머스 테이블
-- =============================================

-- 1. profiles 테이블 확장
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS region_si TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS region_gu TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS region_dong TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_distance_km DECIMAL(10,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_runs INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_duration_seconds BIGINT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mileage_balance INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_profiles_region ON profiles(region_si, region_gu, region_dong);

-- profiles RLS 업데이트: 공개 프로필 읽기 허용
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (auth.uid() = id OR is_public = true);

-- activities 공개범위 추가
ALTER TABLE activities ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'
  CHECK (visibility IN ('public', 'followers', 'club', 'private'));

-- activities RLS 업데이트: 공개 활동 읽기 허용
DROP POLICY IF EXISTS "activities_select_own" ON activities;
CREATE POLICY "activities_select" ON activities
  FOR SELECT USING (
    auth.uid() = user_id
    OR visibility = 'public'
  );

-- 프로필 통계 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET
      total_distance_km = total_distance_km + NEW.distance_km,
      total_runs = total_runs + 1,
      total_duration_seconds = total_duration_seconds + COALESCE(NEW.duration_seconds, 0),
      updated_at = NOW()
    WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET
      total_distance_km = total_distance_km - OLD.distance_km,
      total_runs = total_runs - 1,
      total_duration_seconds = total_duration_seconds - COALESCE(OLD.duration_seconds, 0),
      updated_at = NOW()
    WHERE id = OLD.user_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE profiles SET
      total_distance_km = total_distance_km + NEW.distance_km - OLD.distance_km,
      total_duration_seconds = total_duration_seconds + COALESCE(NEW.duration_seconds, 0) - COALESCE(OLD.duration_seconds, 0),
      updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_activity_change ON activities;
CREATE TRIGGER on_activity_change
  AFTER INSERT OR UPDATE OR DELETE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_profile_stats();

-- =============================================
-- 2. 팔로우
-- =============================================
CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "follows_select" ON follows;
CREATE POLICY "follows_select" ON follows FOR SELECT USING (true);
DROP POLICY IF EXISTS "follows_insert" ON follows;
CREATE POLICY "follows_insert" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS "follows_delete" ON follows;
CREATE POLICY "follows_delete" ON follows FOR DELETE USING (auth.uid() = follower_id);

-- =============================================
-- 3. 클럽
-- =============================================
CREATE TABLE IF NOT EXISTS clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  is_public BOOLEAN DEFAULT true,
  member_count INT DEFAULT 0,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS club_members (
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (club_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_club_members_user ON club_members(user_id);

ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clubs_select" ON clubs;
CREATE POLICY "clubs_select" ON clubs FOR SELECT USING (
  is_public = true
  OR id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid())
);
DROP POLICY IF EXISTS "clubs_insert" ON clubs;
CREATE POLICY "clubs_insert" ON clubs FOR INSERT WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "clubs_update" ON clubs;
CREATE POLICY "clubs_update" ON clubs FOR UPDATE USING (
  id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);

DROP POLICY IF EXISTS "club_members_select" ON club_members;
CREATE POLICY "club_members_select" ON club_members FOR SELECT USING (
  club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid())
  OR club_id IN (SELECT id FROM clubs WHERE is_public = true)
);
DROP POLICY IF EXISTS "club_members_insert" ON club_members;
CREATE POLICY "club_members_insert" ON club_members FOR INSERT WITH CHECK (
  auth.uid() = user_id
  OR club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);
DROP POLICY IF EXISTS "club_members_delete" ON club_members;
CREATE POLICY "club_members_delete" ON club_members FOR DELETE USING (
  auth.uid() = user_id
  OR club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- 클럽 멤버 카운트 트리거
CREATE OR REPLACE FUNCTION update_club_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE clubs SET member_count = member_count + 1 WHERE id = NEW.club_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE clubs SET member_count = member_count - 1 WHERE id = OLD.club_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_club_member_change ON club_members;
CREATE TRIGGER on_club_member_change
  AFTER INSERT OR DELETE ON club_members
  FOR EACH ROW EXECUTE FUNCTION update_club_member_count();

-- =============================================
-- 4. 댓글 + 응원
-- =============================================
CREATE TABLE IF NOT EXISTS activity_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_activity ON activity_comments(activity_id, created_at);

CREATE TABLE IF NOT EXISTS activity_cheers (
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (activity_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_cheers_activity ON activity_cheers(activity_id);

ALTER TABLE activity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_cheers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_select" ON activity_comments;
CREATE POLICY "comments_select" ON activity_comments FOR SELECT USING (
  activity_id IN (SELECT id FROM activities)
);
DROP POLICY IF EXISTS "comments_insert" ON activity_comments;
CREATE POLICY "comments_insert" ON activity_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "comments_delete" ON activity_comments;
CREATE POLICY "comments_delete" ON activity_comments FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "cheers_select" ON activity_cheers;
CREATE POLICY "cheers_select" ON activity_cheers FOR SELECT USING (
  activity_id IN (SELECT id FROM activities)
);
DROP POLICY IF EXISTS "cheers_insert" ON activity_cheers;
CREATE POLICY "cheers_insert" ON activity_cheers FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "cheers_delete" ON activity_cheers;
CREATE POLICY "cheers_delete" ON activity_cheers FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 5. 활동 사진
-- =============================================
CREATE TABLE IF NOT EXISTS activity_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  sort_order SMALLINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_photos_activity ON activity_photos(activity_id);

ALTER TABLE activity_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_photos_select" ON activity_photos;
CREATE POLICY "activity_photos_select" ON activity_photos FOR SELECT USING (
  auth.uid() = user_id OR activity_id IN (SELECT id FROM activities)
);
DROP POLICY IF EXISTS "activity_photos_insert" ON activity_photos;
CREATE POLICY "activity_photos_insert" ON activity_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "activity_photos_delete" ON activity_photos;
CREATE POLICY "activity_photos_delete" ON activity_photos FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 6. 차단
-- =============================================
CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);

ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "blocks_select_own" ON user_blocks;
CREATE POLICY "blocks_select_own" ON user_blocks FOR SELECT USING (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "blocks_insert_own" ON user_blocks;
CREATE POLICY "blocks_insert_own" ON user_blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "blocks_delete_own" ON user_blocks;
CREATE POLICY "blocks_delete_own" ON user_blocks FOR DELETE USING (auth.uid() = blocker_id);

-- =============================================
-- 7. 쪽지
-- =============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_a, user_b),
  CHECK (user_a < user_b)
);
CREATE INDEX IF NOT EXISTS idx_conversations_user_a ON conversations(user_a, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user_b ON conversations(user_b, last_message_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) <= 2000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select" ON conversations;
CREATE POLICY "conversations_select" ON conversations FOR SELECT USING (auth.uid() IN (user_a, user_b));
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
CREATE POLICY "conversations_insert" ON conversations FOR INSERT WITH CHECK (
  auth.uid() IN (user_a, user_b)
  AND NOT EXISTS (
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = user_a AND blocked_id = user_b)
       OR (blocker_id = user_b AND blocked_id = user_a)
  )
);

DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages FOR SELECT USING (
  conversation_id IN (SELECT id FROM conversations WHERE auth.uid() IN (user_a, user_b))
);
DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id
  AND conversation_id IN (SELECT id FROM conversations WHERE auth.uid() IN (user_a, user_b))
);

-- 대화 타임스탬프 자동 갱신
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET last_message_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_message ON messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

-- =============================================
-- 8. 마일리지
-- =============================================
CREATE TABLE IF NOT EXISTS mileage_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  balance_after INT NOT NULL,
  tx_type TEXT NOT NULL CHECK (tx_type IN (
    'run_earn', 'purchase_spend', 'gift_send', 'gift_receive', 'admin_adjust', 'refund'
  )),
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mileage_tx_user ON mileage_transactions(user_id, created_at DESC);

ALTER TABLE mileage_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mileage_tx_select_own" ON mileage_transactions;
CREATE POLICY "mileage_tx_select_own" ON mileage_transactions FOR SELECT USING (auth.uid() = user_id);

-- 마일리지 RPC 함수들
CREATE OR REPLACE FUNCTION award_run_mileage(p_user_id UUID, p_activity_id UUID, p_distance_km DECIMAL)
RETURNS void AS $$
DECLARE
  v_points INT;
  v_new_balance INT;
BEGIN
  v_points := FLOOR(p_distance_km * 10);
  IF v_points <= 0 THEN RETURN; END IF;
  UPDATE profiles SET mileage_balance = mileage_balance + v_points WHERE id = p_user_id
    RETURNING mileage_balance INTO v_new_balance;
  INSERT INTO mileage_transactions (user_id, amount, balance_after, tx_type, reference_id, description)
  VALUES (p_user_id, v_points, v_new_balance, 'run_earn', p_activity_id, p_distance_km || 'km 러닝 적립');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION spend_mileage(p_user_id UUID, p_amount INT, p_order_id UUID)
RETURNS void AS $$
DECLARE
  v_new_balance INT;
BEGIN
  UPDATE profiles SET mileage_balance = mileage_balance - p_amount
  WHERE id = p_user_id AND mileage_balance >= p_amount
  RETURNING mileage_balance INTO v_new_balance;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient mileage balance'; END IF;
  INSERT INTO mileage_transactions (user_id, amount, balance_after, tx_type, reference_id)
  VALUES (p_user_id, -p_amount, v_new_balance, 'purchase_spend', p_order_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION gift_mileage(p_sender_id UUID, p_receiver_id UUID, p_amount INT)
RETURNS void AS $$
DECLARE
  v_sender_balance INT;
  v_receiver_balance INT;
  v_send_tx_id UUID;
BEGIN
  UPDATE profiles SET mileage_balance = mileage_balance - p_amount
  WHERE id = p_sender_id AND mileage_balance >= p_amount
  RETURNING mileage_balance INTO v_sender_balance;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient mileage balance'; END IF;
  v_send_tx_id := gen_random_uuid();
  INSERT INTO mileage_transactions (id, user_id, amount, balance_after, tx_type, reference_id)
  VALUES (v_send_tx_id, p_sender_id, -p_amount, v_sender_balance, 'gift_send', p_receiver_id);
  UPDATE profiles SET mileage_balance = mileage_balance + p_amount WHERE id = p_receiver_id
    RETURNING mileage_balance INTO v_receiver_balance;
  INSERT INTO mileage_transactions (user_id, amount, balance_after, tx_type, reference_id)
  VALUES (p_receiver_id, p_amount, v_receiver_balance, 'gift_receive', v_send_tx_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 9. 쇼핑
-- =============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_krw INT NOT NULL,
  mileage_price INT,
  image_url TEXT,
  stock INT NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'shipping', 'delivered', 'cancelled', 'refunded')),
  total_krw INT NOT NULL DEFAULT 0,
  mileage_used INT NOT NULL DEFAULT 0,
  shipping_name TEXT,
  shipping_phone TEXT,
  shipping_address TEXT,
  shipping_memo TEXT,
  payment_method TEXT CHECK (payment_method IN ('card', 'transfer', 'mileage', 'mixed')),
  payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INT NOT NULL,
  unit_price_krw INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_select" ON products;
CREATE POLICY "products_select" ON products FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "cart_select_own" ON cart_items;
CREATE POLICY "cart_select_own" ON cart_items FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "cart_insert_own" ON cart_items;
CREATE POLICY "cart_insert_own" ON cart_items FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "cart_update_own" ON cart_items;
CREATE POLICY "cart_update_own" ON cart_items FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "cart_delete_own" ON cart_items;
CREATE POLICY "cart_delete_own" ON cart_items FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "orders_select_own" ON orders;
CREATE POLICY "orders_select_own" ON orders FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "orders_insert_own" ON orders;
CREATE POLICY "orders_insert_own" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "order_items_select" ON order_items;
CREATE POLICY "order_items_select" ON order_items FOR SELECT USING (
  order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
);

-- =============================================
-- 10. Storage 버킷
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('activity-photos', 'activity-photos', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('club-logos', 'club-logos', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true)
  ON CONFLICT (id) DO NOTHING;

-- Storage 정책
DROP POLICY IF EXISTS "activity_photos_upload" ON storage.objects;
CREATE POLICY "activity_photos_upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'activity-photos' AND (storage.foldername(name))[1] = auth.uid()::text
);
DROP POLICY IF EXISTS "activity_photos_read" ON storage.objects;
CREATE POLICY "activity_photos_read" ON storage.objects FOR SELECT USING (bucket_id = 'activity-photos');

DROP POLICY IF EXISTS "club_logos_upload" ON storage.objects;
CREATE POLICY "club_logos_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'club-logos');
DROP POLICY IF EXISTS "club_logos_read" ON storage.objects;
CREATE POLICY "club_logos_read" ON storage.objects FOR SELECT USING (bucket_id = 'club-logos');

DROP POLICY IF EXISTS "products_upload" ON storage.objects;
CREATE POLICY "products_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'products');
DROP POLICY IF EXISTS "products_read" ON storage.objects;
CREATE POLICY "products_read" ON storage.objects FOR SELECT USING (bucket_id = 'products');

-- =============================================
-- 11. Realtime 활성화
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE activity_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_cheers;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE club_members;

-- =============================================
-- 12. 지역 랭킹 뷰
-- =============================================
CREATE OR REPLACE VIEW regional_rankings AS
SELECT
  p.region_si,
  p.region_gu,
  p.region_dong,
  a.user_id,
  p.display_name,
  p.avatar_url,
  EXTRACT(YEAR FROM a.activity_date)::INT AS year,
  EXTRACT(MONTH FROM a.activity_date)::INT AS month,
  SUM(a.distance_km) AS monthly_km,
  COUNT(*) AS run_count,
  RANK() OVER (
    PARTITION BY p.region_gu, EXTRACT(YEAR FROM a.activity_date), EXTRACT(MONTH FROM a.activity_date)
    ORDER BY SUM(a.distance_km) DESC
  ) AS rank_in_gu
FROM activities a
JOIN profiles p ON p.id = a.user_id
WHERE p.region_gu IS NOT NULL
  AND p.is_public = true
  AND a.visibility = 'public'
GROUP BY p.region_si, p.region_gu, p.region_dong, a.user_id,
         p.display_name, p.avatar_url,
         EXTRACT(YEAR FROM a.activity_date), EXTRACT(MONTH FROM a.activity_date);
