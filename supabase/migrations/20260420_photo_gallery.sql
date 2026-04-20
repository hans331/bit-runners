-- 2026-04-20: 루티니스트 갤러리 (메인 하단 사진 피드)
-- 캘린더/활동 상세에서 사진을 올릴 때 "루티니스트 갤러리에도 공유" 체크박스 → 아래 필드 true.
-- 갤러리 피드는 이 플래그가 true 이고 activity 의 visibility 가 public 인 사진만 노출.

BEGIN;

ALTER TABLE activity_photos ADD COLUMN IF NOT EXISTS share_in_gallery BOOLEAN DEFAULT false;
ALTER TABLE activity_photos ADD COLUMN IF NOT EXISTS caption TEXT;

-- 갤러리 최신 정렬용 인덱스
CREATE INDEX IF NOT EXISTS idx_activity_photos_gallery
  ON activity_photos (created_at DESC)
  WHERE share_in_gallery = true;

-- 공개 갤러리 피드 뷰 — 친구/동네 우선 정렬은 앱에서 별도 쿼리로 처리
CREATE OR REPLACE VIEW public_gallery_feed AS
SELECT
  ph.id AS photo_id,
  ph.activity_id,
  ph.user_id,
  ph.photo_url,
  ph.caption,
  ph.created_at,
  p.display_name,
  p.avatar_url,
  p.region_gu,
  a.distance_km,
  a.activity_date
FROM activity_photos ph
JOIN profiles p ON p.id = ph.user_id
JOIN activities a ON a.id = ph.activity_id
WHERE ph.share_in_gallery = true
  AND p.is_public = true
  AND a.visibility = 'public'
ORDER BY ph.created_at DESC;

-- 뷰에 대한 RLS 는 view 정의의 WHERE 절로 제약됨. 권한 부여.
GRANT SELECT ON public_gallery_feed TO authenticated, anon;

COMMIT;
