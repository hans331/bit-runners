-- 2026-04-21: 클럽 활성화 4종 — 챌린지 / 이벤트 / 응원 이모지 / 주간 MVP RPC
-- (QR 초대카드는 DB 불필요 — 기존 초대 링크 재사용)

-- ============================================================================
-- 1. 주간 목표 챌린지
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.club_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 60),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 300),
  -- 목표 — 둘 중 하나 이상 설정 가능
  target_km NUMERIC(6, 2),         -- 기간 내 누적 km (예: 10.00)
  target_run_count INTEGER,         -- 기간 내 러닝 횟수 (예: 3)
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (target_km IS NOT NULL OR target_run_count IS NOT NULL),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS club_challenges_club_date_idx
  ON public.club_challenges (club_id, end_date DESC);

ALTER TABLE public.club_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "club_challenges_select" ON public.club_challenges;
CREATE POLICY "club_challenges_select" ON public.club_challenges FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = club_challenges.club_id AND cm.user_id = auth.uid()
  )
);

-- 생성/수정/삭제: owner/admin 만
DROP POLICY IF EXISTS "club_challenges_admin_write" ON public.club_challenges;
CREATE POLICY "club_challenges_admin_write" ON public.club_challenges FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = club_challenges.club_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
  )
) WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = club_challenges.club_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
  )
);

-- 챌린지별 멤버 진행도 RPC — 기간 내 activities 집계
CREATE OR REPLACE FUNCTION public.get_club_challenge_progress(p_challenge_id UUID)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  distance_km NUMERIC,
  run_count BIGINT,
  km_pct NUMERIC,
  count_pct NUMERIC,
  completed BOOLEAN
)
LANGUAGE SQL STABLE SECURITY INVOKER AS $$
  WITH ch AS (
    SELECT club_id, start_date, end_date, target_km, target_run_count
    FROM public.club_challenges WHERE id = p_challenge_id
  ),
  agg AS (
    SELECT
      cm.user_id,
      COALESCE(SUM(a.distance_km), 0)::NUMERIC AS distance_km,
      COUNT(a.id)::BIGINT AS run_count
    FROM public.club_members cm
    CROSS JOIN ch
    LEFT JOIN public.activities a ON a.user_id = cm.user_id
      AND a.activity_date BETWEEN ch.start_date AND ch.end_date
    WHERE cm.club_id = (SELECT club_id FROM ch)
    GROUP BY cm.user_id, ch.target_km, ch.target_run_count
  )
  SELECT
    agg.user_id,
    pr.display_name,
    pr.avatar_url,
    agg.distance_km,
    agg.run_count,
    CASE WHEN ch.target_km IS NULL OR ch.target_km = 0 THEN NULL
         ELSE ROUND((agg.distance_km / ch.target_km) * 100, 1) END AS km_pct,
    CASE WHEN ch.target_run_count IS NULL OR ch.target_run_count = 0 THEN NULL
         ELSE ROUND((agg.run_count::NUMERIC / ch.target_run_count) * 100, 1) END AS count_pct,
    (
      (ch.target_km IS NULL OR agg.distance_km >= ch.target_km)
      AND (ch.target_run_count IS NULL OR agg.run_count >= ch.target_run_count)
    ) AS completed
  FROM agg
  JOIN public.profiles pr ON pr.id = agg.user_id
  CROSS JOIN ch
  ORDER BY completed DESC, agg.distance_km DESC;
$$;

-- ============================================================================
-- 2. 클럽 이벤트 / RSVP
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.club_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 500),
  event_at TIMESTAMPTZ NOT NULL,
  location TEXT CHECK (location IS NULL OR char_length(location) <= 120),
  max_participants INTEGER CHECK (max_participants IS NULL OR max_participants > 0),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS club_events_club_date_idx
  ON public.club_events (club_id, event_at ASC);

ALTER TABLE public.club_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "club_events_select" ON public.club_events;
CREATE POLICY "club_events_select" ON public.club_events FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = club_events.club_id AND cm.user_id = auth.uid()
  )
);

-- 작성: 멤버 누구나 (요청 다양화). 수정/삭제: 작성자 + owner/admin
DROP POLICY IF EXISTS "club_events_insert" ON public.club_events;
CREATE POLICY "club_events_insert" ON public.club_events FOR INSERT WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = club_events.club_id AND cm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "club_events_update" ON public.club_events;
CREATE POLICY "club_events_update" ON public.club_events FOR UPDATE USING (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = club_events.club_id
      AND cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "club_events_delete" ON public.club_events;
CREATE POLICY "club_events_delete" ON public.club_events FOR DELETE USING (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = club_events.club_id
      AND cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin')
  )
  OR (auth.jwt() ->> 'email') = 'hans@openhan.kr'
);

-- RSVP
CREATE TABLE IF NOT EXISTS public.club_event_rsvps (
  event_id UUID NOT NULL REFERENCES public.club_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('going', 'maybe', 'no')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

ALTER TABLE public.club_event_rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "club_event_rsvps_select" ON public.club_event_rsvps;
CREATE POLICY "club_event_rsvps_select" ON public.club_event_rsvps FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.club_events e
    JOIN public.club_members cm ON cm.club_id = e.club_id
    WHERE e.id = club_event_rsvps.event_id AND cm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "club_event_rsvps_upsert" ON public.club_event_rsvps;
CREATE POLICY "club_event_rsvps_upsert" ON public.club_event_rsvps FOR ALL USING (
  auth.uid() = user_id
) WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.club_events e
    JOIN public.club_members cm ON cm.club_id = e.club_id
    WHERE e.id = club_event_rsvps.event_id AND cm.user_id = auth.uid()
  )
);

-- 이벤트 + RSVP 집계 RPC
CREATE OR REPLACE FUNCTION public.get_club_events(p_club_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  event_at TIMESTAMPTZ,
  location TEXT,
  max_participants INTEGER,
  created_by UUID,
  created_by_name TEXT,
  going_count BIGINT,
  maybe_count BIGINT,
  my_status TEXT
)
LANGUAGE SQL STABLE SECURITY INVOKER AS $$
  SELECT
    e.id, e.title, e.description, e.event_at, e.location, e.max_participants,
    e.created_by,
    pr.display_name AS created_by_name,
    COALESCE(SUM(CASE WHEN r.status = 'going' THEN 1 ELSE 0 END), 0)::BIGINT AS going_count,
    COALESCE(SUM(CASE WHEN r.status = 'maybe' THEN 1 ELSE 0 END), 0)::BIGINT AS maybe_count,
    (SELECT status FROM public.club_event_rsvps WHERE event_id = e.id AND user_id = auth.uid()) AS my_status
  FROM public.club_events e
  JOIN public.profiles pr ON pr.id = e.created_by
  LEFT JOIN public.club_event_rsvps r ON r.event_id = e.id
  WHERE e.club_id = p_club_id
  GROUP BY e.id, pr.display_name
  ORDER BY e.event_at ASC;
$$;

-- ============================================================================
-- 3. 활동 응원 이모지 (activity_cheers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.activity_cheers (
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('👏', '🔥', '💪', '❤️', '🎉')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (activity_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS activity_cheers_activity_idx
  ON public.activity_cheers (activity_id);

ALTER TABLE public.activity_cheers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_cheers_select" ON public.activity_cheers;
CREATE POLICY "activity_cheers_select" ON public.activity_cheers FOR SELECT USING (true);

DROP POLICY IF EXISTS "activity_cheers_insert" ON public.activity_cheers;
CREATE POLICY "activity_cheers_insert" ON public.activity_cheers FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

DROP POLICY IF EXISTS "activity_cheers_delete" ON public.activity_cheers;
CREATE POLICY "activity_cheers_delete" ON public.activity_cheers FOR DELETE USING (
  auth.uid() = user_id
);

-- 활동별 응원 집계 RPC
CREATE OR REPLACE FUNCTION public.get_activity_cheers(p_activity_ids UUID[])
RETURNS TABLE (
  activity_id UUID,
  emoji TEXT,
  total BIGINT,
  cheered_by_me BOOLEAN
)
LANGUAGE SQL STABLE SECURITY INVOKER AS $$
  SELECT
    activity_id,
    emoji,
    COUNT(*)::BIGINT AS total,
    BOOL_OR(user_id = auth.uid()) AS cheered_by_me
  FROM public.activity_cheers
  WHERE activity_id = ANY(p_activity_ids)
  GROUP BY activity_id, emoji;
$$;

-- ============================================================================
-- 4. 이번 주 MVP RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_club_weekly_mvp(p_club_id UUID)
RETURNS TABLE (
  category TEXT,      -- 'distance' | 'runs' | 'streak'
  emoji TEXT,
  label TEXT,
  winner_id UUID,
  winner_name TEXT,
  winner_avatar TEXT,
  value NUMERIC
)
LANGUAGE SQL STABLE SECURITY INVOKER AS $$
  WITH week_start AS (
    SELECT (date_trunc('week', NOW())::DATE) AS s,
           (date_trunc('week', NOW())::DATE + INTERVAL '6 days')::DATE AS e
  ),
  agg AS (
    SELECT
      cm.user_id,
      pr.display_name,
      pr.avatar_url,
      COALESCE(SUM(a.distance_km), 0)::NUMERIC AS total_km,
      COUNT(a.id)::NUMERIC AS total_runs,
      COUNT(DISTINCT a.activity_date)::NUMERIC AS total_days
    FROM public.club_members cm
    JOIN public.profiles pr ON pr.id = cm.user_id
    CROSS JOIN week_start w
    LEFT JOIN public.activities a ON a.user_id = cm.user_id
      AND a.activity_date BETWEEN w.s AND w.e
    WHERE cm.club_id = p_club_id
    GROUP BY cm.user_id, pr.display_name, pr.avatar_url
  )
  SELECT 'distance'::TEXT, '🏆', '최장 거리',
         user_id, display_name, avatar_url, total_km
  FROM agg WHERE total_km > 0 ORDER BY total_km DESC LIMIT 1
  UNION ALL
  SELECT 'runs'::TEXT, '🔥', '최다 러닝',
         user_id, display_name, avatar_url, total_runs
  FROM agg WHERE total_runs > 0 ORDER BY total_runs DESC LIMIT 1
  UNION ALL
  SELECT 'streak'::TEXT, '📅', '가장 꾸준',
         user_id, display_name, avatar_url, total_days
  FROM agg WHERE total_days > 0 ORDER BY total_days DESC, total_km DESC LIMIT 1;
$$;
