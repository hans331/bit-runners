const fs = require('fs');
const path = require('path');

// 노션 데이터 (정확한 월별 목표/달성)
const NOTION = {
  '최철용': { 7: {g:100,a:109.66}, 8: {g:120,a:122.79}, 9: {g:130,a:170.61}, 10: {g:180,a:214.32}, 11: {g:200,a:202.43}, 12: {g:200,a:234.25}, 1: {g:200,a:201.39}, 2: {g:200,a:203.7} },
  '성차민': { 7: {g:100,a:137}, 8: {g:160,a:154.1}, 9: {g:180,a:180.9}, 10: {g:200,a:166.9}, 11: {g:170,a:105.7}, 12: {g:130,a:168.4}, 1: {g:100,a:100.2}, 2: {g:200,a:130} },
  '이승우': { 7: {g:100,a:107.34}, 8: {g:110,a:111.43}, 9: {g:120,a:73.08}, 10: {g:120,a:83.83}, 11: {g:120,a:55.91}, 12: {g:120,a:50.87}, 1: {g:120,a:69.94}, 2: {g:120,a:64.28} },
  '오민혁': { 7: {g:100,a:152.3}, 8: {g:150,a:150.62}, 9: {g:200,a:200.11}, 10: {g:150,a:106.6}, 11: {g:120,a:131.55}, 12: {g:80,a:90.09}, 1: {g:126,a:69.92}, 2: {g:120,a:120.4} },
  '이지영': { 7: {g:100,a:116}, 8: {g:110,a:130.48}, 9: {g:130,a:132.05}, 10: {g:140,a:141.04}, 11: {g:140,a:143.53}, 12: {g:140,a:148.4}, 1: {g:145,a:147.27}, 2: {g:100,a:100} },
  '강수남': { 9: {g:15,a:40.98}, 10: {g:50,a:48}, 11: {g:50,a:50.87}, 12: {g:60,a:60.63}, 1: {g:60,a:30.29}, 2: {g:60,a:61.16} },
  '최명훈': { 9: {g:30,a:62.71}, 10: {g:70,a:71.17}, 11: {g:70,a:76.32}, 12: {g:70,a:74.38}, 1: {g:70,a:71.69}, 2: {g:70,a:71.79} },
  '김창옥': { 9: {g:70,a:76.42}, 10: {g:150,a:150.78}, 11: {g:120,a:120.18}, 12: {g:130,a:95.27}, 1: {g:110,a:37.56}, 2: {g:110,a:110} },
  '손승현': { 9: {g:100,a:87.65}, 10: {g:50,a:76.57}, 11: {g:100,a:101.05}, 12: {g:100,a:122.95}, 1: {g:100,a:67.42}, 2: {g:50,a:26.49} },
  '심성재': { 9: {g:30,a:52.88}, 10: {g:70,a:90.43}, 11: {g:60,a:70.51}, 12: {g:60,a:50.54}, 1: {g:60,a:60.28}, 2: {g:60,a:60.06} },
  '박현용': { 9: {g:130,a:182.4}, 10: {g:180,a:200.2}, 11: {g:180,a:197.3}, 12: {g:100,a:163.3}, 1: {g:150,a:158.7}, 2: {g:150,a:177} },
  '박영건': { 9: {g:10,a:10.01}, 10: {g:30,a:16.41}, 11: {g:50,a:53.45}, 12: {g:50,a:51.2}, 1: {g:50,a:50.98}, 2: {g:50,a:68.91} },
  '윤화식': { 9: {g:10,a:18.44}, 10: {g:88,a:70.24}, 11: {g:50,a:51.15}, 12: {g:50,a:50.52}, 1: {g:50,a:50.25}, 2: {g:50,a:51.05} },
  '정성원': { 9: {g:25,a:25.17}, 10: {g:80,a:48.66}, 11: {g:80,a:63.7}, 12: {g:80,a:80.4}, 1: {g:80,a:80.3}, 2: {g:80,a:67} },
  '김연주': { 10: {g:30,a:12.62}, 11: {g:100,a:109}, 12: {g:110,a:110}, 1: {g:120,a:121.22}, 2: {g:120,a:120.58} },
  '문신기': { 10: {g:120,a:120.2}, 11: {g:120,a:93.3}, 12: {g:100,a:118.4}, 1: {g:100,a:101.8}, 2: {g:120,a:123.3} },
  '이상화': { 11: {g:null,a:2.25}, 12: {g:50,a:50}, 1: {g:50,a:51.74}, 2: {g:60,a:36.23} },
  '강도균': { 12: {g:150,a:150.69}, 1: {g:160,a:160.6}, 2: {g:165,a:167.29} },
  '김태현': { 2: {g:85,a:120.46} },
};

// 3월은 카톡 마지막 스냅샷 기준 (3/31 최종)
const MARCH_FINAL = {
  '최철용': {g:200, a:201.38},
  '강도균': {g:170, a:171.83},
  '문신기': {g:150, a:162.9},
  '박현용': {g:150, a:226.98},
  '성차민': {g:150, a:119.9},
  '오민혁': {g:120, a:80.95},
  '김연주': {g:100, a:100.37},
  '이지영': {g:100, a:100.27},
  '이승우': {g:100, a:60.62},
  '김창옥': {g:100, a:76.3},
  '김태현': {g:100, a:108.43},
  '강수남': {g:60, a:50.98},
  '최명훈': {g:60, a:67.17},
  '심성재': {g:60, a:56.72},
  '박영건': {g:50, a:50.75},
  '윤화식': {g:50, a:52.38},
};

// 노션에 3월 추가
for (const [name, data] of Object.entries(MARCH_FINAL)) {
  if (!NOTION[name]) NOTION[name] = {};
  NOTION[name][3] = data;
}

// 파싱 데이터 로드
const parsed = require('./daily-runs-new.json');
const dailyRuns = parsed.dailyRuns;

// 월 -> 연도 매핑
function yearForMonth(m) {
  return m >= 7 ? 2025 : 2026;
}

// 멤버별 월별 파싱 합계
const parsedSums = {};
for (const r of dailyRuns) {
  if (!parsedSums[r.name]) parsedSums[r.name] = {};
  if (!parsedSums[r.name][r.month]) parsedSums[r.name][r.month] = 0;
  parsedSums[r.name][r.month] = Math.round((parsedSums[r.name][r.month] + r.distance_km) * 100) / 100;
}

// 비교 및 보정
console.log('====================================');
console.log('노션 vs 카톡 파싱 비교 (월별 달성)');
console.log('====================================\n');

const adjustments = []; // 보정이 필요한 항목들
const allMonthlyRecords = []; // 최종 월별 기록

for (const [name, months] of Object.entries(NOTION)) {
  for (const [monthStr, data] of Object.entries(months)) {
    const month = parseInt(monthStr);
    const year = yearForMonth(month);
    const notionAchieved = data.a;
    const notionGoal = data.g || 0;
    const parsedSum = (parsedSums[name] && parsedSums[name][month]) || 0;
    const diff = Math.round((notionAchieved - parsedSum) * 100) / 100;

    allMonthlyRecords.push({
      name, year, month,
      goal_km: notionGoal,
      achieved_km: notionAchieved,
    });

    if (Math.abs(diff) > 0.5) {
      console.log(`${name} ${year}-${String(month).padStart(2,'0')}: 노션=${notionAchieved} 파싱=${parsedSum} 차이=${diff > 0 ? '+' : ''}${diff}`);
      adjustments.push({ name, year, month, notionAchieved, parsedSum, diff });
    }
  }
}

console.log(`\n총 ${adjustments.length}건 보정 필요\n`);

// 보정: 차이를 추정 일일 기록으로 채움
const estimatedRuns = [];

for (const adj of adjustments) {
  const { name, year, month, diff } = adj;

  if (diff > 0) {
    // 파싱 < 노션 → 누락된 일일 기록 추정 추가
    // 해당 월에서 기록 없는 날 찾기
    const existingDates = new Set(
      dailyRuns
        .filter(r => r.name === name && r.year === year && r.month === month)
        .map(r => r.date)
    );

    // 해당 월의 모든 날짜
    const daysInMonth = new Date(year, month, 0).getDate();
    const availableDates = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      if (!existingDates.has(dateStr)) {
        availableDates.push(dateStr);
      }
    }

    // 차이를 빈 날짜들에 분배
    let remaining = diff;
    if (availableDates.length > 0) {
      // 중간 날짜들에 골고루 분배 (최대 하루 15km)
      const numDays = Math.min(Math.ceil(remaining / 8), availableDates.length);
      // 중간 지점 날짜들 선택
      const step = Math.max(1, Math.floor(availableDates.length / (numDays + 1)));
      const selectedDates = [];
      for (let i = 0; i < numDays && i * step < availableDates.length; i++) {
        selectedDates.push(availableDates[Math.min(i * step + step - 1, availableDates.length - 1)]);
      }

      if (selectedDates.length === 0) selectedDates.push(availableDates[0]);

      const perDay = Math.round((remaining / selectedDates.length) * 100) / 100;
      let distributed = 0;
      for (let i = 0; i < selectedDates.length; i++) {
        const km = (i === selectedDates.length - 1)
          ? Math.round((remaining - distributed) * 100) / 100
          : perDay;
        estimatedRuns.push({
          name,
          date: selectedDates[i],
          distance_km: km,
          year,
          month,
          goal_km: null,
          estimated: true,
        });
        distributed += km;
      }
    }
  } else if (diff < 0) {
    // 파싱 > 노션 → 파싱 합이 초과. 일일 기록들을 비례 축소
    const monthRuns = dailyRuns.filter(r => r.name === name && r.year === year && r.month === month);
    const scale = adj.notionAchieved / adj.parsedSum;
    console.log(`  → ${name} ${year}-${String(month).padStart(2,'0')}: 비례 축소 (x${scale.toFixed(4)})`);
    for (const r of monthRuns) {
      r.distance_km = Math.round(r.distance_km * scale * 100) / 100;
    }
  }
}

// 최종 일일 기록 = 기존 파싱 + 추정
const finalDailyRuns = [...dailyRuns, ...estimatedRuns];
finalDailyRuns.sort((a, b) => {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  return a.name.localeCompare(b.name);
});

// 보정 후 검증
console.log('\n====================================');
console.log('보정 후 검증');
console.log('====================================\n');

let allMatch = true;
for (const [name, months] of Object.entries(NOTION)) {
  for (const [monthStr, data] of Object.entries(months)) {
    const month = parseInt(monthStr);
    const year = yearForMonth(month);
    const sum = finalDailyRuns
      .filter(r => r.name === name && r.year === year && r.month === month)
      .reduce((s, r) => s + r.distance_km, 0);
    const roundedSum = Math.round(sum * 100) / 100;
    const diff = Math.round((data.a - roundedSum) * 100) / 100;
    const ok = Math.abs(diff) <= 0.5;
    if (!ok) {
      console.log(`❌ ${name} ${year}-${String(month).padStart(2,'0')}: 노션=${data.a} 합계=${roundedSum} 차이=${diff}`);
      allMatch = false;
    }
  }
}

if (allMatch) {
  console.log('✅ 모든 월별 합계가 노션 달성값과 일치합니다!');
}

// 추정 기록 요약
console.log(`\n추정 기록 ${estimatedRuns.length}건 추가됨:`);
for (const r of estimatedRuns) {
  console.log(`  ${r.name} ${r.date} ${r.distance_km}km (추정)`);
}

// 저장
const output = {
  dailyRuns: finalDailyRuns,
  monthlyRecords: allMonthlyRecords,
  metadata: {
    parsedAt: new Date().toISOString(),
    totalRuns: finalDailyRuns.length,
    estimatedRuns: estimatedRuns.length,
    months: [...new Set(finalDailyRuns.map(r => `${r.year}-${String(r.month).padStart(2,'0')}`))].sort(),
  }
};

const OUTPUT_FILE = path.join(__dirname, 'final-data.json');
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
console.log(`\n저장: ${OUTPUT_FILE}`);
console.log(`총 ${finalDailyRuns.length}건 (실제 ${finalDailyRuns.length - estimatedRuns.length} + 추정 ${estimatedRuns.length})`);
