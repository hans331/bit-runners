-- clubs 테이블에 대한 RLS 정책 재확인 및 보완
-- 혹시 마이그레이션이 적용되지 않은 경우를 대비

-- clubs: 모든 로그인 사용자가 public 클럽 조회 가능
DROP POLICY IF EXISTS "clubs_select" ON clubs;
CREATE POLICY "clubs_select" ON clubs FOR SELECT USING (
  is_public = true
  OR id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid())
);

-- clubs: 로그인 사용자가 클럽 생성 가능
DROP POLICY IF EXISTS "clubs_insert" ON clubs;
CREATE POLICY "clubs_insert" ON clubs FOR INSERT WITH CHECK (auth.uid() = created_by);

-- clubs: 관리자만 수정 가능
DROP POLICY IF EXISTS "clubs_update" ON clubs;
CREATE POLICY "clubs_update" ON clubs FOR UPDATE USING (
  id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- club_members: 클럽 멤버 조회 (같은 클럽 멤버 또는 공개 클럽)
DROP POLICY IF EXISTS "club_members_select" ON club_members;
CREATE POLICY "club_members_select" ON club_members FOR SELECT USING (
  club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid())
  OR club_id IN (SELECT id FROM clubs WHERE is_public = true)
);

-- club_members: 본인을 멤버로 추가 가능, 또는 관리자가 추가 가능
DROP POLICY IF EXISTS "club_members_insert" ON club_members;
CREATE POLICY "club_members_insert" ON club_members FOR INSERT WITH CHECK (
  auth.uid() = user_id
  OR club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- club_members: 본인 탈퇴 또는 관리자가 삭제 가능
DROP POLICY IF EXISTS "club_members_delete" ON club_members;
CREATE POLICY "club_members_delete" ON club_members FOR DELETE USING (
  auth.uid() = user_id
  OR club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- calendar_photos RLS도 확인
ALTER TABLE IF EXISTS calendar_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendar_photos_select" ON calendar_photos;
CREATE POLICY "calendar_photos_select" ON calendar_photos FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "calendar_photos_insert" ON calendar_photos;
CREATE POLICY "calendar_photos_insert" ON calendar_photos FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "calendar_photos_update" ON calendar_photos;
CREATE POLICY "calendar_photos_update" ON calendar_photos FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "calendar_photos_delete" ON calendar_photos;
CREATE POLICY "calendar_photos_delete" ON calendar_photos FOR DELETE USING (user_id = auth.uid());

-- photos 스토리지 버킷 정책 (이미 있으면 무시)
-- INSERT: 로그인 사용자가 자기 폴더에만 업로드
-- SELECT: 누구나 읽기 가능 (공개 URL)
