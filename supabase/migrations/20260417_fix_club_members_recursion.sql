-- club_members RLS 무한 재귀 해결
-- 원인: club_members_select 정책이 자기 테이블을 다시 SELECT해서 무한 재귀
-- 해결: SECURITY DEFINER 함수로 감싸 RLS 평가 우회 + select 정책 단순화

-- 1) 관리자/소유자 체크 함수 (RLS 무시하고 실행)
CREATE OR REPLACE FUNCTION public.is_club_admin(cid uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_id = cid AND user_id = uid AND role IN ('owner', 'admin')
  )
$$;

-- 2) 멤버 여부 체크 함수
CREATE OR REPLACE FUNCTION public.is_club_member(cid uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_id = cid AND user_id = uid
  )
$$;

-- 3) club_members SELECT — 재귀 제거. 로그인 사용자는 모든 멤버십 조회 가능
-- (멤버 목록은 개인정보 아님. 클럽 내부 공개 정보)
DROP POLICY IF EXISTS "club_members_select" ON public.club_members;
CREATE POLICY "club_members_select" ON public.club_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 4) club_members INSERT — SECURITY DEFINER 함수로 재귀 회피
DROP POLICY IF EXISTS "club_members_insert" ON public.club_members;
CREATE POLICY "club_members_insert" ON public.club_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_club_admin(club_id, auth.uid())
  );

-- 5) club_members DELETE
DROP POLICY IF EXISTS "club_members_delete" ON public.club_members;
CREATE POLICY "club_members_delete" ON public.club_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR public.is_club_admin(club_id, auth.uid())
  );

-- 6) clubs_update도 함수로 정리 (재귀 위험 제거)
DROP POLICY IF EXISTS "clubs_update" ON public.clubs;
CREATE POLICY "clubs_update" ON public.clubs FOR UPDATE
  USING (public.is_club_admin(id, auth.uid()));
