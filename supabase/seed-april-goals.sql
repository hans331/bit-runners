-- 4월 monthly_records 생성 (3월 목표를 임시로 복사, achieved_km은 running_logs에서 계산)
INSERT INTO monthly_records (member_id, year, month, goal_km, achieved_km)
SELECT m.id, 2026, 4, 0, COALESCE(logs.total, 0)
FROM members m
LEFT JOIN (
  SELECT member_id, SUM(distance_km) as total
  FROM running_logs
  WHERE run_date >= '2026-04-01' AND run_date < '2026-05-01'
  GROUP BY member_id
) logs ON logs.member_id = m.id
WHERE m.status = 'active'
ON CONFLICT (member_id, year, month) DO UPDATE SET achieved_km = EXCLUDED.achieved_km;
