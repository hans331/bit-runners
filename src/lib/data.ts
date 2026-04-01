import { Member, MonthlyRecord, Award, RunningLog } from '@/types';

// ===== 멤버 데이터 (노션에서 마이그레이션) =====
export const members: Member[] = [
  { id: '1', name: '최철용', member_number: 1, join_date: '2025-06-19', join_location: '도쿄', status: 'active' },
  { id: '2', name: '성차민', member_number: 2, join_date: '2025-06-19', join_location: '도쿄', status: 'active' },
  { id: '3', name: '이승우', member_number: 3, join_date: '2025-06-19', join_location: '방콕', status: 'active' },
  { id: '4', name: '오민혁', member_number: 4, join_date: '2025-06-19', join_location: '방콕', status: 'active' },
  { id: '5', name: '이지영', member_number: 5, join_date: '2025-06-23', join_location: '방콕', status: 'active' },
  { id: '6', name: '강수남', member_number: 6, join_date: '2025-09-13', join_location: '제주', status: 'active' },
  { id: '7', name: '최명훈', member_number: 7, join_date: '2025-09-13', join_location: '제주', status: 'active' },
  { id: '8', name: '김창옥', member_number: 8, join_date: '2025-09-13', join_location: '제주', status: 'active' },
  { id: '9', name: '손승현', member_number: 9, join_date: '2025-09-13', join_location: '제주', status: 'dormant' },
  { id: '10', name: '심성재', member_number: 10, join_date: '2025-09-13', join_location: '제주', status: 'active' },
  { id: '11', name: '박현용', member_number: 11, join_date: '2025-09-13', join_location: '제주', status: 'active' },
  { id: '12', name: '박영건', member_number: 12, join_date: '2025-09-21', join_location: '공주', status: 'active' },
  { id: '13', name: '윤화식', member_number: 13, join_date: '2025-09-23', join_location: '공주', status: 'active' },
  { id: '14', name: '정성원', member_number: 14, join_date: '2025-09-23', join_location: '공주', status: 'dormant' },
  { id: '15', name: '문신기', member_number: 15, join_date: '2025-10-09', join_location: '추천', status: 'active' },
  { id: '16', name: '김연주', member_number: 16, join_date: '2025-10-23', join_location: '추천', status: 'active' },
  { id: '17', name: '이상화', member_number: 17, join_date: '2025-11-15', join_location: '추천', status: 'dormant' },
  { id: '18', name: '강도균', member_number: 18, join_date: '2025-12-22', join_location: '추천', status: 'active' },
  { id: '19', name: '김태현', member_number: 19, join_date: '2026-02-01', join_location: '추천', status: 'active' },
];

// 활동 중인 멤버만
export function getActiveMembers(): Member[] {
  return members.filter(m => m.status === 'active');
}

// 휴면 멤버만
export function getDormantMembers(): Member[] {
  return members.filter(m => m.status === 'dormant');
}

// ===== 월별 기록 (노션 레거시 데이터) =====
export const monthlyRecords: MonthlyRecord[] = [
  // 최철용
  { member_id: '1', year: 2025, month: 7, goal_km: 100, achieved_km: 109.66 },
  { member_id: '1', year: 2025, month: 8, goal_km: 120, achieved_km: 122.79 },
  { member_id: '1', year: 2025, month: 9, goal_km: 130, achieved_km: 170.61 },
  { member_id: '1', year: 2025, month: 10, goal_km: 180, achieved_km: 214.32 },
  { member_id: '1', year: 2025, month: 11, goal_km: 200, achieved_km: 202.43 },
  { member_id: '1', year: 2025, month: 12, goal_km: 200, achieved_km: 234.25 },
  { member_id: '1', year: 2026, month: 1, goal_km: 200, achieved_km: 201.39 },
  { member_id: '1', year: 2026, month: 2, goal_km: 200, achieved_km: 203.70 },
  { member_id: '1', year: 2026, month: 3, goal_km: 200, achieved_km: 201.38 },

  // 성차민
  { member_id: '2', year: 2025, month: 7, goal_km: 100, achieved_km: 137.00 },
  { member_id: '2', year: 2025, month: 8, goal_km: 160, achieved_km: 154.10 },
  { member_id: '2', year: 2025, month: 9, goal_km: 180, achieved_km: 180.90 },
  { member_id: '2', year: 2025, month: 10, goal_km: 200, achieved_km: 166.90 },
  { member_id: '2', year: 2025, month: 11, goal_km: 170, achieved_km: 105.70 },
  { member_id: '2', year: 2025, month: 12, goal_km: 130, achieved_km: 168.40 },
  { member_id: '2', year: 2026, month: 1, goal_km: 100, achieved_km: 100.20 },
  { member_id: '2', year: 2026, month: 2, goal_km: 200, achieved_km: 130.00 },
  { member_id: '2', year: 2026, month: 3, goal_km: 150, achieved_km: 119.90 },

  // 이승우
  { member_id: '3', year: 2025, month: 7, goal_km: 100, achieved_km: 107.34 },
  { member_id: '3', year: 2025, month: 8, goal_km: 110, achieved_km: 111.43 },
  { member_id: '3', year: 2025, month: 9, goal_km: 120, achieved_km: 73.08 },
  { member_id: '3', year: 2025, month: 10, goal_km: 120, achieved_km: 83.83 },
  { member_id: '3', year: 2025, month: 11, goal_km: 120, achieved_km: 55.91 },
  { member_id: '3', year: 2025, month: 12, goal_km: 120, achieved_km: 50.87 },
  { member_id: '3', year: 2026, month: 1, goal_km: 120, achieved_km: 69.94 },
  { member_id: '3', year: 2026, month: 2, goal_km: 120, achieved_km: 64.28 },
  { member_id: '3', year: 2026, month: 3, goal_km: 100, achieved_km: 60.62 },

  // 오민혁
  { member_id: '4', year: 2025, month: 7, goal_km: 100, achieved_km: 152.30 },
  { member_id: '4', year: 2025, month: 8, goal_km: 150, achieved_km: 150.62 },
  { member_id: '4', year: 2025, month: 9, goal_km: 200, achieved_km: 200.11 },
  { member_id: '4', year: 2025, month: 10, goal_km: 150, achieved_km: 106.60 },
  { member_id: '4', year: 2025, month: 11, goal_km: 120, achieved_km: 131.55 },
  { member_id: '4', year: 2025, month: 12, goal_km: 80, achieved_km: 90.09 },
  { member_id: '4', year: 2026, month: 1, goal_km: 126, achieved_km: 69.92 },
  { member_id: '4', year: 2026, month: 2, goal_km: 120, achieved_km: 120.40 },
  { member_id: '4', year: 2026, month: 3, goal_km: 120, achieved_km: 80.95 },

  // 이지영
  { member_id: '5', year: 2025, month: 7, goal_km: 100, achieved_km: 116.00 },
  { member_id: '5', year: 2025, month: 8, goal_km: 110, achieved_km: 130.48 },
  { member_id: '5', year: 2025, month: 9, goal_km: 130, achieved_km: 132.05 },
  { member_id: '5', year: 2025, month: 10, goal_km: 140, achieved_km: 141.04 },
  { member_id: '5', year: 2025, month: 11, goal_km: 140, achieved_km: 143.53 },
  { member_id: '5', year: 2025, month: 12, goal_km: 140, achieved_km: 148.40 },
  { member_id: '5', year: 2026, month: 1, goal_km: 145, achieved_km: 147.27 },
  { member_id: '5', year: 2026, month: 2, goal_km: 100, achieved_km: 100.00 },
  { member_id: '5', year: 2026, month: 3, goal_km: 100, achieved_km: 100.27 },

  // 강수남
  { member_id: '6', year: 2025, month: 9, goal_km: 15, achieved_km: 40.98 },
  { member_id: '6', year: 2025, month: 10, goal_km: 50, achieved_km: 48.00 },
  { member_id: '6', year: 2025, month: 11, goal_km: 50, achieved_km: 50.87 },
  { member_id: '6', year: 2025, month: 12, goal_km: 60, achieved_km: 60.63 },
  { member_id: '6', year: 2026, month: 1, goal_km: 60, achieved_km: 30.29 },
  { member_id: '6', year: 2026, month: 2, goal_km: 60, achieved_km: 61.16 },
  { member_id: '6', year: 2026, month: 3, goal_km: 60, achieved_km: 50.98 },

  // 최명훈
  { member_id: '7', year: 2025, month: 9, goal_km: 30, achieved_km: 62.71 },
  { member_id: '7', year: 2025, month: 10, goal_km: 70, achieved_km: 71.17 },
  { member_id: '7', year: 2025, month: 11, goal_km: 70, achieved_km: 76.32 },
  { member_id: '7', year: 2025, month: 12, goal_km: 70, achieved_km: 74.38 },
  { member_id: '7', year: 2026, month: 1, goal_km: 70, achieved_km: 71.69 },
  { member_id: '7', year: 2026, month: 2, goal_km: 70, achieved_km: 71.79 },
  { member_id: '7', year: 2026, month: 3, goal_km: 60, achieved_km: 67.17 },

  // 김창옥
  { member_id: '8', year: 2025, month: 9, goal_km: 70, achieved_km: 76.42 },
  { member_id: '8', year: 2025, month: 10, goal_km: 150, achieved_km: 150.78 },
  { member_id: '8', year: 2025, month: 11, goal_km: 120, achieved_km: 120.18 },
  { member_id: '8', year: 2025, month: 12, goal_km: 130, achieved_km: 95.27 },
  { member_id: '8', year: 2026, month: 1, goal_km: 110, achieved_km: 37.56 },
  { member_id: '8', year: 2026, month: 2, goal_km: 110, achieved_km: 110.00 },
  { member_id: '8', year: 2026, month: 3, goal_km: 100, achieved_km: 76.30 },

  // 손승현
  { member_id: '9', year: 2025, month: 9, goal_km: 100, achieved_km: 87.65 },
  { member_id: '9', year: 2025, month: 10, goal_km: 50, achieved_km: 76.57 },
  { member_id: '9', year: 2025, month: 11, goal_km: 100, achieved_km: 101.05 },
  { member_id: '9', year: 2025, month: 12, goal_km: 100, achieved_km: 122.95 },
  { member_id: '9', year: 2026, month: 1, goal_km: 100, achieved_km: 67.42 },
  { member_id: '9', year: 2026, month: 2, goal_km: 50, achieved_km: 26.49 },
  { member_id: '9', year: 2026, month: 3, goal_km: 0, achieved_km: 0 },

  // 심성재
  { member_id: '10', year: 2025, month: 9, goal_km: 30, achieved_km: 52.88 },
  { member_id: '10', year: 2025, month: 10, goal_km: 70, achieved_km: 90.43 },
  { member_id: '10', year: 2025, month: 11, goal_km: 60, achieved_km: 70.51 },
  { member_id: '10', year: 2025, month: 12, goal_km: 60, achieved_km: 50.54 },
  { member_id: '10', year: 2026, month: 1, goal_km: 60, achieved_km: 60.28 },
  { member_id: '10', year: 2026, month: 2, goal_km: 60, achieved_km: 60.06 },
  { member_id: '10', year: 2026, month: 3, goal_km: 60, achieved_km: 56.72 },

  // 박현용
  { member_id: '11', year: 2025, month: 9, goal_km: 130, achieved_km: 182.40 },
  { member_id: '11', year: 2025, month: 10, goal_km: 180, achieved_km: 200.20 },
  { member_id: '11', year: 2025, month: 11, goal_km: 180, achieved_km: 197.30 },
  { member_id: '11', year: 2025, month: 12, goal_km: 100, achieved_km: 163.30 },
  { member_id: '11', year: 2026, month: 1, goal_km: 150, achieved_km: 158.70 },
  { member_id: '11', year: 2026, month: 2, goal_km: 150, achieved_km: 177.00 },
  { member_id: '11', year: 2026, month: 3, goal_km: 150, achieved_km: 226.98 },

  // 박영건
  { member_id: '12', year: 2025, month: 9, goal_km: 10, achieved_km: 10.01 },
  { member_id: '12', year: 2025, month: 10, goal_km: 30, achieved_km: 16.41 },
  { member_id: '12', year: 2025, month: 11, goal_km: 50, achieved_km: 53.45 },
  { member_id: '12', year: 2025, month: 12, goal_km: 50, achieved_km: 51.20 },
  { member_id: '12', year: 2026, month: 1, goal_km: 50, achieved_km: 50.98 },
  { member_id: '12', year: 2026, month: 2, goal_km: 50, achieved_km: 68.91 },
  { member_id: '12', year: 2026, month: 3, goal_km: 50, achieved_km: 50.75 },

  // 윤화식
  { member_id: '13', year: 2025, month: 9, goal_km: 10, achieved_km: 18.44 },
  { member_id: '13', year: 2025, month: 10, goal_km: 88, achieved_km: 70.24 },
  { member_id: '13', year: 2025, month: 11, goal_km: 50, achieved_km: 51.15 },
  { member_id: '13', year: 2025, month: 12, goal_km: 50, achieved_km: 50.52 },
  { member_id: '13', year: 2026, month: 1, goal_km: 50, achieved_km: 50.25 },
  { member_id: '13', year: 2026, month: 2, goal_km: 50, achieved_km: 51.05 },
  { member_id: '13', year: 2026, month: 3, goal_km: 50, achieved_km: 52.38 },

  // 정성원
  { member_id: '14', year: 2025, month: 9, goal_km: 25, achieved_km: 25.17 },
  { member_id: '14', year: 2025, month: 10, goal_km: 80, achieved_km: 48.66 },
  { member_id: '14', year: 2025, month: 11, goal_km: 80, achieved_km: 63.70 },
  { member_id: '14', year: 2025, month: 12, goal_km: 80, achieved_km: 80.40 },
  { member_id: '14', year: 2026, month: 1, goal_km: 80, achieved_km: 80.30 },
  { member_id: '14', year: 2026, month: 2, goal_km: 80, achieved_km: 67.00 },
  { member_id: '14', year: 2026, month: 3, goal_km: 0, achieved_km: 0 },

  // 문신기
  { member_id: '15', year: 2025, month: 10, goal_km: 120, achieved_km: 120.20 },
  { member_id: '15', year: 2025, month: 11, goal_km: 120, achieved_km: 93.30 },
  { member_id: '15', year: 2025, month: 12, goal_km: 100, achieved_km: 118.40 },
  { member_id: '15', year: 2026, month: 1, goal_km: 100, achieved_km: 101.80 },
  { member_id: '15', year: 2026, month: 2, goal_km: 120, achieved_km: 123.30 },
  { member_id: '15', year: 2026, month: 3, goal_km: 150, achieved_km: 162.90 },

  // 김연주
  { member_id: '16', year: 2025, month: 10, goal_km: 30, achieved_km: 12.62 },
  { member_id: '16', year: 2025, month: 11, goal_km: 100, achieved_km: 109.00 },
  { member_id: '16', year: 2025, month: 12, goal_km: 110, achieved_km: 110.00 },
  { member_id: '16', year: 2026, month: 1, goal_km: 120, achieved_km: 121.22 },
  { member_id: '16', year: 2026, month: 2, goal_km: 120, achieved_km: 120.58 },
  { member_id: '16', year: 2026, month: 3, goal_km: 100, achieved_km: 100.37 },

  // 이상화
  { member_id: '17', year: 2025, month: 11, goal_km: 0, achieved_km: 2.25 },
  { member_id: '17', year: 2025, month: 12, goal_km: 50, achieved_km: 50.00 },
  { member_id: '17', year: 2026, month: 1, goal_km: 50, achieved_km: 51.74 },
  { member_id: '17', year: 2026, month: 2, goal_km: 60, achieved_km: 36.23 },
  { member_id: '17', year: 2026, month: 3, goal_km: 0, achieved_km: 0 },

  // 강도균
  { member_id: '18', year: 2025, month: 12, goal_km: 150, achieved_km: 150.69 },
  { member_id: '18', year: 2026, month: 1, goal_km: 160, achieved_km: 160.60 },
  { member_id: '18', year: 2026, month: 2, goal_km: 165, achieved_km: 167.29 },
  { member_id: '18', year: 2026, month: 3, goal_km: 170, achieved_km: 171.83 },

  // 김태현
  { member_id: '19', year: 2026, month: 2, goal_km: 85, achieved_km: 120.46 },
  { member_id: '19', year: 2026, month: 3, goal_km: 100, achieved_km: 108.43 },
];

// ===== 유틸리티 함수 =====
export function getMemberById(id: string): Member | undefined {
  return members.find(m => m.id === id);
}

export function getMemberByName(name: string): Member | undefined {
  return members.find(m => m.name === name);
}

export function getMemberRecords(memberId: string): MonthlyRecord[] {
  return monthlyRecords.filter(r => r.member_id === memberId);
}

export function getTotalDistance(memberId: string): number {
  return monthlyRecords
    .filter(r => r.member_id === memberId)
    .reduce((sum, r) => sum + r.achieved_km, 0);
}

export function getMonthLabel(year: number, month: number): string {
  if (year === 2025) return `${month}월`;
  return `${month}월'26`;
}

export function getCurrentMonthRecord(memberId: string): MonthlyRecord | undefined {
  const now = new Date();
  return monthlyRecords.find(
    r => r.member_id === memberId && r.year === now.getFullYear() && r.month === now.getMonth() + 1
  );
}

// 월별 클럽 전체 거리
export function getClubMonthlyTotals(): { label: string; year: number; month: number; total: number; members: number }[] {
  const monthSet = new Map<string, { year: number; month: number; total: number; members: number }>();

  for (const r of monthlyRecords) {
    const key = `${r.year}-${r.month}`;
    if (!monthSet.has(key)) {
      monthSet.set(key, { year: r.year, month: r.month, total: 0, members: 0 });
    }
    const entry = monthSet.get(key)!;
    entry.total += r.achieved_km;
    if (r.achieved_km > 0) entry.members += 1;
  }

  return Array.from(monthSet.values())
    .sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month))
    .map(e => ({
      label: e.year === 2025 ? `'25.${e.month}월` : `'26.${e.month}월`,
      ...e,
    }));
}

// 이번 달 리더보드
export function getLeaderboard(year: number, month: number): { member: Member; distance: number; goal: number; rate: number }[] {
  return members
    .map(m => {
      const record = monthlyRecords.find(
        r => r.member_id === m.id && r.year === year && r.month === month
      );
      const distance = record?.achieved_km ?? 0;
      const goal = record?.goal_km ?? 0;
      const rate = goal > 0 ? (distance / goal) * 100 : 0;
      return { member: m, distance, goal, rate };
    })
    .filter(e => e.goal > 0 || e.distance > 0)
    .sort((a, b) => b.distance - a.distance);
}

// 전체 통산 거리 리더보드
export function getAllTimeLeaderboard(): { member: Member; totalDistance: number; months: number }[] {
  return members
    .map(m => {
      const records = getMemberRecords(m.id).filter(r => r.achieved_km > 0);
      return {
        member: m,
        totalDistance: records.reduce((sum, r) => sum + r.achieved_km, 0),
        months: records.length,
      };
    })
    .sort((a, b) => b.totalDistance - a.totalDistance);
}

// 2월(최근 완료 월) 시상 데이터
export function getLatestAwards(): { finishers: Member[]; longRun: Member | null; bestAttendance: Member | null; year: number; month: number } {
  // 가장 최근 완료된 달 찾기 (achieved > 0인 달 중 가장 마지막)
  const now = new Date();
  let targetYear = now.getFullYear();
  let targetMonth = now.getMonth(); // 전달
  if (targetMonth === 0) { targetYear--; targetMonth = 12; }

  const leaderboard = getLeaderboard(targetYear, targetMonth);

  const finishers = leaderboard
    .filter(e => e.goal > 0 && e.distance >= e.goal)
    .map(e => e.member);

  const longRun = leaderboard.length > 0 ? leaderboard[0].member : null;

  return {
    finishers,
    longRun,
    bestAttendance: null, // 일별 데이터 없으면 산정 불가
    year: targetYear,
    month: targetMonth,
  };
}

// 피니셔 비율 (목표 달성률)
export function getFinisherRate(year: number, month: number): number {
  const leaderboard = getLeaderboard(year, month);
  const withGoal = leaderboard.filter(e => e.goal > 0);
  if (withGoal.length === 0) return 0;
  const finished = withGoal.filter(e => e.distance >= e.goal);
  return (finished.length / withGoal.length) * 100;
}
