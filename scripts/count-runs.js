const fs = require('fs');
const path = require('path');

const INPUT_FILES = [
  'C:/Users/muzzi/Downloads/Kakaotalk_Chat_BIT Runners/Talk_2026.4.2 07_38-1.txt',
  'C:/Users/muzzi/Downloads/Kakaotalk_Chat_BIT Runners/Talk_2026.4.2 07_38-2.txt',
  'C:/Users/muzzi/Downloads/Kakaotalk_Chat_BIT Runners/Talk_2026.4.2 07_38-3.txt',
];

const MEMBERS = [
  '최철용','성차민','이승우','오민혁','이지영','강수남','최명훈',
  '김창옥','손승현','심성재','박현용','박영건','윤화식','정성원',
  '문신기','김연주','이상화','강도균','김태현','정영미','홍성조'
];

function extractName(text) {
  for (const name of MEMBERS) {
    if (text.includes(name)) return name;
  }
  return null;
}

let allLines = [];
for (const f of INPUT_FILES) allLines = allLines.concat(fs.readFileSync(f, 'utf-8').split(/\r?\n/));

const DATE_LINE = /^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/;
const MSG_DASHBOARD = /^\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.\s*(?:오전|오후)\s*\d+:\d+,\s*([^:]+)\s*:\s*.*?(\d+)월\s*Dashboard/;

const ENTRY_PATTERNS = [
  /^\d+\.\s*([^\s(]+)\s*\(.*?\)\s*[_]\s*([\d.]*)\s*(?::\s*([\d.]*))?/,
  /^\d+\.\s*([^\s\d]+)\s+([\d.]+)\s*:\s*([\d.]*)/,
  /^([^\s\d.]+)\s+([\d.]+)\s*:\s*([\d.]*)/,
];

let currentDate = null;

// 모든 스냅샷을 순서대로 수집
const allSnapshots = []; // {date, dashMonth, dashYear, poster, entries: {name: achieved}}

let i = 0;
while (i < allLines.length) {
  const line = allLines[i].trim();

  const dateMatch = line.match(DATE_LINE);
  if (dateMatch) {
    const y = parseInt(dateMatch[1]);
    const m = parseInt(dateMatch[2]);
    const d = parseInt(dateMatch[3]);
    currentDate = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    i++;
    continue;
  }

  if (line.includes('Dashboard') && currentDate) {
    const monthMatch = line.match(/(\d+)월\s*Dashboard/);
    if (!monthMatch) { i++; continue; }
    const dashMonth = parseInt(monthMatch[1]);

    // 포스터 추출
    const msgMatch = line.match(/^\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.\s*(?:오전|오후)\s*\d+:\d+,\s*([^:]+)\s*:/);
    const poster = msgMatch ? extractName(msgMatch[1]) : null;

    const entries = {};
    let j = i + 1;
    while (j < allLines.length && allLines[j].trim() === '') j++;

    while (j < allLines.length) {
      const entryLine = allLines[j].trim();
      if (entryLine === '') { j++; break; }
      if (entryLine.match(/^\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.\s*(?:오전|오후)/)) break;
      if (entryLine.match(DATE_LINE)) break;

      let matched = false;
      for (const pattern of ENTRY_PATTERNS) {
        const m = entryLine.match(pattern);
        if (m) {
          const name = extractName(m[1]);
          if (name) {
            const achieved = (m[3] !== undefined && m[3] !== '') ? parseFloat(m[3]) : null;
            if (achieved !== null && !isNaN(achieved)) {
              entries[name] = achieved;
            }
          }
          matched = true;
          break;
        }
      }

      if (!matched) {
        const simpleMatch = entryLine.match(/^\d+\.\s*([^\s(]+)/);
        if (simpleMatch) {
          // 목표/달성 없는 엔트리 - 무시
        }
      }

      j++;
    }

    if (Object.keys(entries).length > 0) {
      let dashYear = dashMonth >= 7 ? 2025 : 2026;
      allSnapshots.push({
        date: currentDate,
        dashMonth,
        dashYear,
        poster,
        entries,
      });
    }

    i = j;
    continue;
  }

  i++;
}

console.log(`총 ${allSnapshots.length}개 스냅샷 수집`);

// 월별 그룹
const monthGroups = {};
for (const snap of allSnapshots) {
  const key = `${snap.dashYear}-${String(snap.dashMonth).padStart(2,'0')}`;
  if (!monthGroups[key]) monthGroups[key] = [];
  monthGroups[key].push(snap);
}

// 각 월별로: 연속 스냅샷 비교해서 누가 뛰었는지 파악
// 스냅샷 N과 N-1을 비교 → 누적값이 증가한 멤버 = 그 날 뛴 사람
const dailyRuns = []; // {name, date, distance_km, year, month}

for (const [monthKey, snaps] of Object.entries(monthGroups)) {
  const [year, month] = monthKey.split('-').map(Number);

  // 멤버별 최대 누적값 추적 (감소 스냅샷 무시용)
  const maxAchieved = {};

  for (let s = 0; s < snaps.length; s++) {
    const snap = snaps[s];

    for (const [name, achieved] of Object.entries(snap.entries)) {
      const prev = maxAchieved[name];

      // 감소면 무시 (잘못된/오래된 스냅샷)
      if (prev !== undefined && achieved < prev) continue;

      if (prev !== undefined) {
        const diff = Math.round((achieved - prev) * 100) / 100;
        if (diff > 0 && diff <= 60) {
          dailyRuns.push({
            name,
            date: snap.date,
            distance_km: diff,
            year,
            month,
          });
        }
      } else if (achieved > 0 && achieved <= 60) {
        // 첫 등장
        dailyRuns.push({
          name,
          date: snap.date,
          distance_km: achieved,
          year,
          month,
        });
      }

      maxAchieved[name] = Math.max(achieved, prev || 0);
    }
  }
}

// 날짜순 정렬
dailyRuns.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));

// 이제 핵심: 같은 날 같은 멤버의 건수 = 실제 뛴 횟수
// (한 사람이 하루에 2번 뛰면 Dashboard를 2번 업데이트하므로 2건)
console.log('\n=== 월별 러닝 횟수 (연속 스냅샷 비교 방식) ===');

const monthRunCounts = {};
for (const r of dailyRuns) {
  const mKey = `${r.year}-${String(r.month).padStart(2,'0')}`;
  if (!monthRunCounts[mKey]) monthRunCounts[mKey] = {};
  if (!monthRunCounts[mKey][r.name]) monthRunCounts[mKey][r.name] = { count: 0, dates: new Set(), total: 0 };
  monthRunCounts[mKey][r.name].count++;
  monthRunCounts[mKey][r.name].dates.add(r.date);
  monthRunCounts[mKey][r.name].total = Math.round((monthRunCounts[mKey][r.name].total + r.distance_km) * 100) / 100;
}

// 3월 상세
console.log('\n--- 2026-03 러닝 횟수 ---');
console.log('이름     | 횟수 | 일수 | 총거리');
const mar = monthRunCounts['2026-03'];
if (mar) {
  const sorted = Object.entries(mar).sort((a,b) => b[1].count - a[1].count);
  for (const [name, data] of sorted) {
    console.log(`${name.padEnd(6)} | ${String(data.count).padStart(4)} | ${String(data.dates.size).padStart(4)} | ${data.total}km`);
  }
}

// 전월 비교 (최철용)
console.log('\n--- 최철용 월별 ---');
for (const mKey of Object.keys(monthRunCounts).sort()) {
  const d = monthRunCounts[mKey]['최철용'];
  if (d) console.log(`${mKey}: ${d.count}회, ${d.dates.size}일, ${d.total}km`);
}

// Set을 배열로 변환해서 저장
const serializable = {};
for (const [mKey, members] of Object.entries(monthRunCounts)) {
  serializable[mKey] = {};
  for (const [name, data] of Object.entries(members)) {
    serializable[mKey][name] = { count: data.count, days: data.dates.size, dates: [...data.dates].sort(), total: data.total };
  }
}
fs.writeFileSync(path.join(__dirname, 'run-counts.json'), JSON.stringify(serializable, null, 2));
console.log('\n저장: scripts/run-counts.json');
