const fs = require('fs');
const path = require('path');

const data = require('./final-data.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'supabase', 'seed-all-data.sql');

let sql = '';

sql += `-- =============================================\n`;
sql += `-- BIT Runners 전체 데이터 시드\n`;
sql += `-- 노션 월별 데이터 기준 + 카카오톡 일별 파싱\n`;
sql += `-- 생성: ${new Date().toISOString()}\n`;
sql += `-- =============================================\n\n`;

// 1. 기존 데이터 초기화
sql += `-- 기존 데이터 초기화\n`;
sql += `DELETE FROM running_logs;\n`;
sql += `DELETE FROM monthly_records;\n`;
sql += `DELETE FROM awards;\n\n`;

// 2. 홍성조 추가 + 강도균, 김태현 업데이트
sql += `-- 홍성조 신규 회원 추가\n`;
sql += `INSERT INTO members (name, member_number, join_date, join_location, status) VALUES ('홍성조', 20, '2026-04-01', '추천', 'active') ON CONFLICT (name) DO NOTHING;\n\n`;
sql += `-- 강도균, 김태현 합류 정보 업데이트\n`;
sql += `UPDATE members SET join_date = '2025-12-22', join_location = '추천' WHERE name = '강도균';\n`;
sql += `UPDATE members SET join_date = '2026-02-01', join_location = '추천' WHERE name = '김태현';\n\n`;

// 3. 월별 기록 삽입
sql += `-- 월별 기록 (노션 기준 정확한 목표/달성)\n`;
sql += `INSERT INTO monthly_records (member_id, year, month, goal_km, achieved_km)\n`;
sql += `SELECT m.id, v.year, v.month, v.goal_km, v.achieved_km\n`;
sql += `FROM (VALUES\n`;

const monthlyLines = [];
for (const r of data.monthlyRecords) {
  monthlyLines.push(`  ('${r.name}', ${r.year}, ${r.month}, ${r.goal_km}, ${r.achieved_km})`);
}
sql += monthlyLines.join(',\n');
sql += `\n) AS v(name, year, month, goal_km, achieved_km)\n`;
sql += `JOIN members m ON m.name = v.name;\n\n`;

// 4. 일별 러닝 기록 삽입 (배치로 나누기 - 500건씩)
sql += `-- 일별 러닝 기록 (${data.dailyRuns.length}건)\n`;

const BATCH_SIZE = 500;
for (let i = 0; i < data.dailyRuns.length; i += BATCH_SIZE) {
  const batch = data.dailyRuns.slice(i, i + BATCH_SIZE);
  sql += `INSERT INTO running_logs (member_id, run_date, distance_km, memo)\n`;
  sql += `SELECT m.id, v.run_date::date, v.distance_km, v.memo\n`;
  sql += `FROM (VALUES\n`;

  const lines = [];
  for (const r of batch) {
    const memo = r.estimated ? '추정' : null;
    lines.push(`  ('${r.name}', '${r.date}', ${r.distance_km}, ${memo ? `'${memo}'` : 'NULL'})`);
  }
  sql += lines.join(',\n');
  sql += `\n) AS v(name, run_date, distance_km, memo)\n`;
  sql += `JOIN members m ON m.name = v.name;\n\n`;
}

// 4월 목표 추가
sql += `-- 4월 목표 (카톡 마지막 스냅샷 기준)\n`;
const aprilGoals = [
  { name: '최철용', goal: 0 },
  { name: '성차민', goal: 0 },
  { name: '강도균', goal: 0 },
  { name: '박현용', goal: 150 },
  { name: '이승우', goal: 0 },
  { name: '오민혁', goal: 120 },
  { name: '김연주', goal: 0 },
  { name: '문신기', goal: 0 },
  { name: '이지영', goal: 0 },
  { name: '김창옥', goal: 110 },
  { name: '정성원', goal: 60 },
  { name: '최명훈', goal: 0 },
  { name: '이상화', goal: 0 },
  { name: '심성재', goal: 0 },
  { name: '강수남', goal: 0 },
  { name: '박영건', goal: 0 },
  { name: '손승현', goal: 0 },
  { name: '윤화식', goal: 50 },
  { name: '김태현', goal: 100 },
  { name: '홍성조', goal: 50 },
];

// 4월 기록이 있는 멤버들 확인
const aprilRuns = data.dailyRuns.filter(r => r.year === 2026 && r.month === 4);
const aprilAchieved = {};
for (const r of aprilRuns) {
  if (!aprilAchieved[r.name]) aprilAchieved[r.name] = 0;
  aprilAchieved[r.name] = Math.round((aprilAchieved[r.name] + r.distance_km) * 100) / 100;
}

sql += `INSERT INTO monthly_records (member_id, year, month, goal_km, achieved_km)\n`;
sql += `SELECT m.id, 2026, 4, v.goal_km, v.achieved_km\n`;
sql += `FROM (VALUES\n`;
const aprilLines = [];
for (const g of aprilGoals) {
  const achieved = aprilAchieved[g.name] || 0;
  if (g.goal > 0 || achieved > 0) {
    aprilLines.push(`  ('${g.name}', ${g.goal}, ${achieved})`);
  }
}
sql += aprilLines.join(',\n');
sql += `\n) AS v(name, goal_km, achieved_km)\n`;
sql += `JOIN members m ON m.name = v.name;\n`;

fs.writeFileSync(OUTPUT_FILE, sql, 'utf-8');
console.log(`SQL 생성 완료: ${OUTPUT_FILE}`);
console.log(`월별 기록: ${data.monthlyRecords.length}건`);
console.log(`일별 기록: ${data.dailyRuns.length}건`);
