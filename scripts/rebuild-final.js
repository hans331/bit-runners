const fs = require('fs');
const path = require('path');

const runCounts = require('./run-counts.json');

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

// 3월 마지막 스냅샷 기준
const MARCH_FINAL = {
  '최철용': {g:200, a:201.38}, '강도균': {g:170, a:171.83}, '문신기': {g:150, a:162.9},
  '박현용': {g:150, a:226.98}, '성차민': {g:150, a:119.9}, '오민혁': {g:120, a:80.95},
  '김연주': {g:100, a:100.37}, '이지영': {g:100, a:100.27}, '이승우': {g:100, a:60.62},
  '김창옥': {g:100, a:76.3}, '김태현': {g:100, a:108.43}, '강수남': {g:60, a:50.98},
  '최명훈': {g:60, a:67.17}, '심성재': {g:60, a:56.72}, '박영건': {g:50, a:50.75},
  '윤화식': {g:50, a:52.38},
};
for (const [name, data] of Object.entries(MARCH_FINAL)) {
  if (!NOTION[name]) NOTION[name] = {};
  NOTION[name][3] = data;
}

function yearForMonth(m) { return m >= 7 ? 2025 : 2026; }

// 1단계: run-counts.json에서 일별 기록 생성 (같은 날 합산)
const dailyRuns = [];

for (const [monthKey, members] of Object.entries(runCounts)) {
  const [year, month] = monthKey.split('-').map(Number);

  for (const [name, data] of Object.entries(members)) {
    // 해당 날짜에 뛴 거리를 알아야 함
    // run-counts는 총 거리와 날짜 목록만 있음
    // -> parse-all-chats의 원본 데이터에서 날짜별 거리 가져오기
  }
}

// run-counts에는 날짜별 거리가 없으므로, parse-all-chats의 결과를 기반으로 재구성
// count-runs.js의 dailyRuns를 직접 사용해야 함
// -> count-runs.js에서 dailyRuns도 저장하도록 하자

// 대신 parse-all-chats의 daily-runs-new.json을 사용하되,
// 같은 날 같은 멤버 건들을 합산 (1일 1건으로)
const rawData = require('./daily-runs-new.json');

// 날짜별 합산
const dayMap = {}; // 'name|date' -> {total, month, year}
for (const r of rawData.dailyRuns) {
  const key = `${r.name}|${r.date}`;
  if (!dayMap[key]) dayMap[key] = { name: r.name, date: r.date, distance_km: 0, year: r.year, month: r.month, goal_km: r.goal_km };
  dayMap[key].distance_km = Math.round((dayMap[key].distance_km + r.distance_km) * 100) / 100;
}

// run-counts의 날짜와 비교 — run-counts에 있지만 dayMap에 없는 날짜 추가 필요
for (const [monthKey, members] of Object.entries(runCounts)) {
  const [year, month] = monthKey.split('-').map(Number);
  for (const [name, data] of Object.entries(members)) {
    for (const date of data.dates) {
      const key = `${name}|${date}`;
      if (!dayMap[key]) {
        // run-counts에는 있지만 parse에 없는 날짜 = 날짜가 합쳐졌었던 것
        // 이 경우 정확한 거리를 모르므로 나중에 보정
        dayMap[key] = { name, date, distance_km: 0, year, month, goal_km: null, needsFix: true };
      }
    }
  }
}

// dayMap을 배열로
let parsedDailyRuns = Object.values(dayMap).filter(r => r.distance_km > 0);
parsedDailyRuns.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));

// 2단계: 노션 달성값과 비교해서 보정
const allMonthlyRecords = [];

for (const [name, months] of Object.entries(NOTION)) {
  for (const [monthStr, data] of Object.entries(months)) {
    const month = parseInt(monthStr);
    const year = yearForMonth(month);
    allMonthlyRecords.push({ name, year, month, goal_km: data.g || 0, achieved_km: data.a });

    const monthRuns = parsedDailyRuns.filter(r => r.name === name && r.year === year && r.month === month);
    const parsedSum = monthRuns.reduce((s, r) => s + r.distance_km, 0);
    const diff = Math.round((data.a - parsedSum) * 100) / 100;

    if (Math.abs(diff) > 0.5) {
      if (diff > 0) {
        // 누락 — 빈 날짜에 추정 추가
        const existingDates = new Set(monthRuns.map(r => r.date));

        // run-counts에서 이 멤버의 날짜 가져오기
        const rcKey = `${year}-${String(month).padStart(2,'0')}`;
        const rcDates = runCounts[rcKey]?.[name]?.dates || [];

        // run-counts 날짜 중 parsedDailyRuns에 없는 것
        const missingFromRC = rcDates.filter(d => !existingDates.has(d));

        if (missingFromRC.length > 0) {
          // 누락된 날짜에 균등 배분
          const perDay = Math.round((diff / missingFromRC.length) * 100) / 100;
          let distributed = 0;
          for (let i = 0; i < missingFromRC.length; i++) {
            const km = (i === missingFromRC.length - 1) ? Math.round((diff - distributed) * 100) / 100 : perDay;
            parsedDailyRuns.push({ name, date: missingFromRC[i], distance_km: km, year, month, goal_km: null, estimated: true });
            distributed += km;
          }
        } else {
          // run-counts에도 없는 날짜 — 월의 빈 날짜에 분배
          const daysInMonth = new Date(year, month, 0).getDate();
          const availDates = [];
          for (let d = 1; d <= daysInMonth; d++) {
            const ds = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            if (!existingDates.has(ds)) availDates.push(ds);
          }
          const numDays = Math.min(Math.ceil(diff / 8), availDates.length);
          const step = Math.max(1, Math.floor(availDates.length / (numDays + 1)));
          const selected = [];
          for (let i = 0; i < numDays && i * step < availDates.length; i++) {
            selected.push(availDates[Math.min(i * step + step - 1, availDates.length - 1)]);
          }
          if (selected.length === 0 && availDates.length > 0) selected.push(availDates[0]);
          const perDay = Math.round((diff / selected.length) * 100) / 100;
          let distributed = 0;
          for (let i = 0; i < selected.length; i++) {
            const km = (i === selected.length - 1) ? Math.round((diff - distributed) * 100) / 100 : perDay;
            parsedDailyRuns.push({ name, date: selected[i], distance_km: km, year, month, goal_km: null, estimated: true });
            distributed += km;
          }
        }
      } else {
        // 초과 — 비례 축소
        const scale = data.a / parsedSum;
        for (const r of monthRuns) {
          r.distance_km = Math.round(r.distance_km * scale * 100) / 100;
        }
      }
    }
  }
}

// 정렬
parsedDailyRuns.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));

// 검증
console.log('=== 검증 ===');
let allOk = true;
for (const [name, months] of Object.entries(NOTION)) {
  for (const [monthStr, data] of Object.entries(months)) {
    const month = parseInt(monthStr);
    const year = yearForMonth(month);
    const sum = parsedDailyRuns.filter(r => r.name === name && r.year === year && r.month === month)
      .reduce((s, r) => s + r.distance_km, 0);
    const diff = Math.round((data.a - Math.round(sum * 100) / 100) * 100) / 100;
    if (Math.abs(diff) > 0.5) {
      console.log(`❌ ${name} ${year}-${String(month).padStart(2,'0')}: 노션=${data.a} 합계=${Math.round(sum*100)/100} 차이=${diff}`);
      allOk = false;
    }
  }
}
if (allOk) console.log('✅ 모든 월별 합계 일치!');

// 개근상 데이터: 월별 멤버별 뛴 일수
console.log('\n=== 3월 개근상 순위 (뛴 일수 기준) ===');
const marchDays = {};
for (const r of parsedDailyRuns.filter(r => r.year === 2026 && r.month === 3 && !r.estimated)) {
  if (!marchDays[r.name]) marchDays[r.name] = new Set();
  marchDays[r.name].add(r.date);
}
const marchRank = Object.entries(marchDays).map(([name, dates]) => ({ name, days: dates.size })).sort((a,b) => b.days - a.days);
for (const r of marchRank) {
  console.log(`${r.name.padEnd(6)} ${r.days}일`);
}

// 저장
const estimated = parsedDailyRuns.filter(r => r.estimated).length;
const output = {
  dailyRuns: parsedDailyRuns,
  monthlyRecords: allMonthlyRecords,
  metadata: {
    parsedAt: new Date().toISOString(),
    totalRuns: parsedDailyRuns.length,
    estimatedRuns: estimated,
  }
};
fs.writeFileSync(path.join(__dirname, 'final-data.json'), JSON.stringify(output, null, 2));
console.log(`\n저장: final-data.json (${parsedDailyRuns.length}건, 추정 ${estimated}건)`);
