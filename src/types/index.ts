export type MemberStatus = 'active' | 'dormant';

export interface Member {
  id: string;
  name: string;
  member_number: number;
  join_date: string | null;
  join_location: string | null;
  status: MemberStatus;
}

export interface RunningLog {
  id: string;
  member_id: string;
  run_date: string;
  distance_km: number;
  duration_minutes: number | null;
  memo: string | null;
  created_at: string;
}

export interface MonthlyGoal {
  id: string;
  member_id: string;
  year: number;
  month: number;
  goal_km: number;
}

export interface MonthlyRecord {
  member_id: string;
  year: number;
  month: number;
  goal_km: number;
  achieved_km: number;
}

export interface Award {
  id: string;
  member_id: string;
  year: number;
  month: number;
  award_type: '피니셔상' | '롱런상' | '개근상' | '특별상';
  description: string | null;
}

export interface MemberWithStats extends Member {
  total_distance: number;
  total_runs: number;
  current_month_distance: number;
  current_month_goal: number;
  current_month_runs: number;
  monthly_records: MonthlyRecord[];
  awards: Award[];
}

export interface DashboardStats {
  total_club_distance: number;
  active_members: number;
  total_members: number;
  current_month_total: number;
  current_month_avg: number;
}
