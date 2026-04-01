const fs = require('fs');
const path = require('path');

// 3개 파일을 순서대로 합쳐서 처리
const INPUT_FILES = [
  'C:/Users/muzzi/Downloads/Kakaotalk_Chat_BIT Runners/Talk_2026.4.2 07_38-1.txt',
  'C:/Users/muzzi/Downloads/Kakaotalk_Chat_BIT Runners/Talk_2026.4.2 07_38-2.txt',
  'C:/Users/muzzi/Downloads/Kakaotalk_Chat_BIT Runners/Talk_2026.4.2 07_38-3.txt',
];
const OUTPUT_FILE = path.join(__dirname, 'daily-runs-new.json');

const MEMBER_NAMES = [
  '최철용', '성차민', '이승우', '오민혁', '이지영', '강수남', '최명훈',
  '김창옥', '손승현', '심성재', '박현용', '박영건', '윤화식', '정성원',
  '문신기', '김연주', '이상화', '강도균', '김태현', '정영미', '홍성조'
];

function extractMemberName(text) {
  for (const name of MEMBER_NAMES) {
    if (text.includes(name)) return name;
  }
  return null;
}

function main() {
  // 모든 파일을 합침
  let allLines = [];
  for (const f of INPUT_FILES) {
    const content = fs.readFileSync(f, 'utf-8');
    allLines = allLines.concat(content.split(/\r?\n/));
  }
  console.log(`총 ${allLines.length} 줄 로드`);

  // 날짜 패턴 (모바일 형식)
  const DATE_LINE = /^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/;
  // 메시지 + Dashboard 패턴
  const MSG_DASHBOARD = /^\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.\s*(?:오전|오후)\s*\d+:\d+,\s*([^:]+)\s*:\s*.*Dashboard/;

  // Dashboard 엔트리 패턴들 (3가지 형식)
  // 형식1: "이름 목표 : 누적" (9~10월)
  // 형식2: "번호. 이름 목표 : 누적" (11~2월)
  // 형식3: "번호.이름(횟수)_목표 : 누적" (3~4월)

  const ENTRY_PATTERNS = [
    // 형식3: 3.강도균(00회)_200 : 71.9  또는  3.강도균(00회)_  또는  17.손승현(휴무)
    /^\d+\.\s*([^\s(]+)\s*\(.*?\)\s*[_]\s*([\d.]*)\s*(?::\s*([\d.]*))?/,
    // 형식2: 3. 강도균 165: 106.25  또는  1. 최철용 200 : 121.65
    /^\d+\.\s*([^\s\d]+)\s+([\d.]+)\s*:\s*([\d.]*)/,
    // 형식1: 성차민 180 : 71.4
    /^([^\s\d.]+)\s+([\d.]+)\s*:\s*([\d.]*)/,
  ];

  let currentDate = null;
  const snapshots = []; // { date, dashboardMonth, entries: [{name, goal, achieved}] }

  let i = 0;
  while (i < allLines.length) {
    const line = allLines[i].trim();

    // 날짜 라인 체크
    const dateMatch = line.match(DATE_LINE);
    if (dateMatch) {
      const y = parseInt(dateMatch[1]);
      const m = parseInt(dateMatch[2]);
      const d = parseInt(dateMatch[3]);
      currentDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      i++;
      continue;
    }

    // Dashboard 메시지 체크
    if (line.includes('Dashboard') && currentDate) {
      // Dashboard 월 추출
      const monthMatch = line.match(/(\d+)월\s*Dashboard/);
      if (!monthMatch) { i++; continue; }
      const dashMonth = parseInt(monthMatch[1]);

      // Dashboard 엔트리 파싱 (다음 줄들)
      const entries = [];
      let j = i + 1;

      // 빈 줄 스킵
      while (j < allLines.length && allLines[j].trim() === '') j++;

      while (j < allLines.length) {
        const entryLine = allLines[j].trim();
        if (entryLine === '') { j++; break; }
        // 새 메시지 라인이면 중단
        if (entryLine.match(/^\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.\s*(?:오전|오후)/)) break;
        // 날짜 라인이면 중단
        if (entryLine.match(DATE_LINE)) break;

        let matched = false;
        for (const pattern of ENTRY_PATTERNS) {
          const m = entryLine.match(pattern);
          if (m) {
            const name = extractMemberName(m[1]);
            if (name) {
              const goal = m[2] ? parseFloat(m[2]) : null;
              const achieved = (m[3] !== undefined && m[3] !== '') ? parseFloat(m[3]) : null;
              entries.push({ name, goal, achieved });
              matched = true;
            }
            break;
          }
        }

        // 형식3에서 목표/누적 없는 케이스: "1.최철용(00회)_" 또는 "17.손승현(휴무)"
        if (!matched) {
          const simpleMatch = entryLine.match(/^\d+\.\s*([^\s(]+)\s*\(/);
          if (simpleMatch) {
            const name = extractMemberName(simpleMatch[1]);
            if (name) {
              entries.push({ name, goal: null, achieved: null });
            }
          }
        }

        j++;
      }

      if (entries.length > 0) {
        // Dashboard의 연도 결정
        let dashYear;
        if (dashMonth >= 7) {
          dashYear = 2025;
        } else {
          dashYear = 2026;
        }

        snapshots.push({
          date: currentDate,
          dashboardMonth: dashMonth,
          dashboardYear: dashYear,
          entries,
        });
      }

      i = j;
      continue;
    }

    i++;
  }

  console.log(`Dashboard 스냅샷 ${snapshots.length}개 발견`);

  // 월별 그룹핑
  const monthGroups = {};
  for (const snap of snapshots) {
    const key = `${snap.dashboardYear}-${String(snap.dashboardMonth).padStart(2, '0')}`;
    if (!monthGroups[key]) monthGroups[key] = [];
    monthGroups[key].push(snap);
  }

  console.log(`\n월별 대시보드:`, Object.keys(monthGroups).sort().join(', '));

  // 각 월별로 누적 거리 차이 계산 → 일일 러닝 추출
  const dailyRuns = [];

  for (const [monthKey, snaps] of Object.entries(monthGroups)) {
    const [year, month] = monthKey.split('-').map(Number);
    const maxAchieved = {}; // 멤버별 지금까지의 최대 누적 거리 (감소 무시용)

    for (const snap of snaps) {
      for (const entry of snap.entries) {
        if (entry.achieved === null || entry.achieved === undefined) continue;

        const prevMax = maxAchieved[entry.name];

        // 누적값이 감소한 경우 → 잘못된(오래된) 스냅샷이므로 무시
        if (prevMax !== undefined && entry.achieved < prevMax) {
          continue;
        }

        if (prevMax !== undefined && prevMax !== null) {
          const diff = Math.round((entry.achieved - prevMax) * 100) / 100;
          // 하루 최대 60km 필터 (비현실적 급증 = 이전 월 누적 오기재)
          if (diff > 0 && diff <= 60) {
            dailyRuns.push({
              name: entry.name,
              date: snap.date,
              distance_km: diff,
              year,
              month,
              goal_km: entry.goal,
            });
          }
        } else if (entry.achieved > 0 && entry.achieved <= 60) {
          // 첫 등장인데 이미 누적이 있음 → 그 전에 뛴 것
          dailyRuns.push({
            name: entry.name,
            date: snap.date,
            distance_km: entry.achieved,
            year,
            month,
            goal_km: entry.goal,
          });
        }
        maxAchieved[entry.name] = Math.max(entry.achieved, prevMax || 0);
      }
    }
  }

  // 정렬
  dailyRuns.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.name.localeCompare(b.name);
  });

  console.log(`\n총 ${dailyRuns.length}건의 일일 러닝 기록 추출`);

  // 월별 요약
  console.log('\n============================');
  console.log('월별 요약');
  console.log('============================');

  const monthSummary = {};
  for (const run of dailyRuns) {
    const key = `${run.year}-${String(run.month).padStart(2, '0')}`;
    if (!monthSummary[key]) monthSummary[key] = { members: new Set(), runs: 0, distance: 0 };
    monthSummary[key].members.add(run.name);
    monthSummary[key].runs++;
    monthSummary[key].distance = Math.round((monthSummary[key].distance + run.distance_km) * 100) / 100;
  }

  for (const key of Object.keys(monthSummary).sort()) {
    const s = monthSummary[key];
    console.log(`${key}: ${s.members.size}명 활동, ${s.runs}건, 총 ${s.distance}km`);
  }

  // 멤버별 요약
  console.log('\n============================');
  console.log('멤버별 전체 요약');
  console.log('============================');

  const memberSummary = {};
  for (const run of dailyRuns) {
    if (!memberSummary[run.name]) memberSummary[run.name] = { runs: 0, distance: 0, months: new Set() };
    memberSummary[run.name].runs++;
    memberSummary[run.name].distance = Math.round((memberSummary[run.name].distance + run.distance_km) * 100) / 100;
    memberSummary[run.name].months.add(`${run.year}-${String(run.month).padStart(2, '0')}`);
  }

  const sortedMembers = Object.entries(memberSummary).sort((a, b) => b[1].distance - a[1].distance);
  for (const [name, s] of sortedMembers) {
    console.log(`${name}: ${s.runs}회, ${s.distance}km, ${s.months.size}개월 활동`);
  }

  // 월별 목표 정보 추출 (각 월의 마지막 스냅샷 기준)
  const monthlyGoals = [];
  for (const [monthKey, snaps] of Object.entries(monthGroups)) {
    const [year, month] = monthKey.split('-').map(Number);
    const lastSnap = snaps[snaps.length - 1];
    for (const entry of lastSnap.entries) {
      if (entry.goal) {
        monthlyGoals.push({
          name: entry.name,
          year,
          month,
          goal_km: entry.goal,
          achieved_km: entry.achieved || 0,
        });
      }
    }
  }

  // JSON 저장
  const output = {
    dailyRuns,
    monthlyGoals,
    metadata: {
      parsedAt: new Date().toISOString(),
      totalRuns: dailyRuns.length,
      totalSnapshots: snapshots.length,
      months: Object.keys(monthGroups).sort(),
    }
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n저장 완료: ${OUTPUT_FILE}`);
}

main();
