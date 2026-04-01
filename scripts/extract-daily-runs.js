const fs = require('fs');
const path = require('path');

const INPUT_FILE = 'C:/Users/muzzi/OneDrive/바탕 화면/KakaoTalk_20260401_1906_23_708_group.txt';
const OUTPUT_FILE = path.join(__dirname, 'daily-runs.json');

// Member name mapping from KakaoTalk display names to actual names
const MEMBER_NAMES = [
  '최철용', '성차민', '이승우', '오민혁', '이지영', '강수남', '최명훈',
  '김창옥', '손승현', '심성재', '박현용', '박영건', '윤화식', '정성원',
  '문신기', '김연주', '이상화', '강도균', '김태현', '정영미', '홍성조'
];

function extractName(displayName) {
  // Display names like [최철용], [성차민 대표님 지토. 딸 성나율], etc.
  for (const name of MEMBER_NAMES) {
    if (displayName.includes(name)) return name;
  }
  // Special cases
  if (displayName.includes('이승우')) return '이승우';
  return null;
}

function parseDashboardMonth(dashboardTitle) {
  // "IT Runners 9월 Dashboard" or "BIT Runners 10월 Dashboard"
  const m = dashboardTitle.match(/(\d+)월\s*Dashboard/);
  return m ? parseInt(m[1]) : null;
}

function main() {
  const content = fs.readFileSync(INPUT_FILE, 'utf-8');
  const lines = content.split(/\r?\n/);

  let currentDate = null; // e.g., "2025-09-20"
  let currentYear = null;
  let currentMonth = null;
  let currentDay = null;

  // Collect all dashboard snapshots in order
  // Each snapshot: { date, dashboardMonth, dashboardYear, poster, entries: [{name, goal, achieved}] }
  const snapshots = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Date line: "--------------- 2025년 9월 20일 토요일 ---------------"
    const dateMatch = line.match(/^-+\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (dateMatch) {
      currentYear = parseInt(dateMatch[1]);
      currentMonth = parseInt(dateMatch[2]);
      currentDay = parseInt(dateMatch[3]);
      currentDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
      i++;
      continue;
    }

    // Dashboard line: "[name] [time] (IT|BIT) Runners X월 Dashboard"
    const dashMatch = line.match(/^\[([^\]]+)\]\s*\[[^\]]+\]\s*(.*(I?T|BIT)\s*Runners\s*(\d+)월\s*Dashboard)/);
    if (dashMatch) {
      const poster = dashMatch[1];
      const dashMonth = parseInt(dashMatch[4]);

      // Determine the year for this dashboard month
      // The chat spans June 2025 to April 2026
      // Months 9-12 are 2025, months 1-4 are 2026
      let dashYear;
      if (dashMonth >= 7) {
        dashYear = 2025;
      } else {
        dashYear = 2026;
      }

      // Now parse the dashboard entries (next lines until we hit a non-entry line)
      const entries = [];
      let j = i + 1;

      // Skip blank line after dashboard title
      if (j < lines.length && lines[j].trim() === '') j++;

      while (j < lines.length) {
        const entryLine = lines[j].trim();
        if (entryLine === '') { j++; break; }

        // Check if this looks like a message line (starts with [) or date line
        if (entryLine.startsWith('[') || entryLine.startsWith('---')) break;

        // Parse entry formats:
        // "오민혁 200 : 98.36"
        // "1. 최철용 200 : 10.09"
        // "강도균150 : 96"  (no space between name and goal)
        // "12. 최명훈60:"  (no spaces)
        // "이승우 120 : 9.86 (18.14)"  (with parenthetical)
        // "이승우 120"  (no colon, no achieved)
        // "이승우"  (just name)
        // "7. 김연주 " (just number and name)
        // "8. 문신기" (just number and name)

        // Remove leading number + dot if present
        let cleaned = entryLine.replace(/^\d+\.\s*/, '');

        // Try to match a known member name at the start
        let memberName = null;
        let rest = '';
        for (const name of MEMBER_NAMES) {
          if (cleaned.startsWith(name)) {
            memberName = name;
            rest = cleaned.substring(name.length);
            break;
          }
        }

        if (memberName) {
          // Parse rest: could be "200 : 98.36", "150 : 96", " 200 : ", "60:", " ", "", " 100 : 0", etc.
          let goal = null;
          let achieved = null;

          // Remove parenthetical values like (18.14)
          rest = rest.replace(/\([^)]*\)/, '').trim();

          if (rest.includes(':')) {
            const parts = rest.split(':');
            const beforeColon = parts[0].trim();
            const afterColon = parts.slice(1).join(':').trim();

            if (beforeColon) {
              const goalMatch = beforeColon.match(/([\d.]+)/);
              if (goalMatch) goal = parseFloat(goalMatch[1]);
            }

            if (afterColon) {
              const achMatch = afterColon.match(/([\d.]+)/);
              if (achMatch) achieved = parseFloat(achMatch[1]);
            } else {
              achieved = 0;
            }
          } else {
            // No colon - might have goal number or nothing
            const goalMatch = rest.match(/([\d.]+)/);
            if (goalMatch) goal = parseFloat(goalMatch[1]);
            achieved = null; // unknown
          }

          entries.push({ name: memberName, goal, achieved });
        }

        j++;
      }

      if (entries.length > 0) {
        snapshots.push({
          date: currentDate,
          year: currentYear,
          month: currentMonth,
          day: currentDay,
          dashboardMonth: dashMonth,
          dashboardYear: dashYear,
          poster: extractName(poster) || poster,
          entries
        });
      }

      i = j;
      continue;
    }

    i++;
  }

  console.log(`Found ${snapshots.length} dashboard snapshots`);

  // Group snapshots by dashboard month+year (the tracking period)
  const monthGroups = {};
  for (const snap of snapshots) {
    const key = `${snap.dashboardYear}-${String(snap.dashboardMonth).padStart(2, '0')}`;
    if (!monthGroups[key]) monthGroups[key] = [];
    monthGroups[key].push(snap);
  }

  console.log(`\nDashboard months found: ${Object.keys(monthGroups).sort().join(', ')}`);

  // For each month, track each member's achieved distance over time
  // When it increases, that's a run
  const dailyRuns = [];

  for (const [monthKey, snaps] of Object.entries(monthGroups)) {
    const [year, month] = monthKey.split('-').map(Number);

    // Track last known achieved distance for each member within this month
    const lastAchieved = {};

    // Process snapshots in order (they're already in chronological order from file)
    for (const snap of snaps) {
      for (const entry of snap.entries) {
        if (entry.achieved === null || entry.achieved === undefined) continue;

        const prev = lastAchieved[entry.name];
        if (prev !== undefined && prev !== null) {
          const diff = Math.round((entry.achieved - prev) * 100) / 100;
          if (diff > 0) {
            dailyRuns.push({
              name: entry.name,
              date: snap.date,
              distance_km: diff,
              year: year,
              month: month
            });
          }
        } else if (entry.achieved > 0) {
          // First entry with a positive value - this IS a run (or accumulated runs before first dashboard)
          dailyRuns.push({
            name: entry.name,
            date: snap.date,
            distance_km: entry.achieved,
            year: year,
            month: month
          });
        }
        lastAchieved[entry.name] = entry.achieved;
      }
    }
  }

  // Sort by date, then name
  dailyRuns.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.name.localeCompare(b.name);
  });

  console.log(`\nTotal run entries: ${dailyRuns.length}`);

  // Save JSON
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(dailyRuns, null, 2), 'utf-8');
  console.log(`\nSaved to: ${OUTPUT_FILE}`);

  // Summary: per member per month
  console.log('\n============================');
  console.log('MONTHLY SUMMARY PER MEMBER');
  console.log('============================');

  const summary = {};
  const monthTotals = {};

  for (const run of dailyRuns) {
    const mKey = `${run.year}-${String(run.month).padStart(2, '0')}`;
    if (!summary[run.name]) summary[run.name] = {};
    if (!summary[run.name][mKey]) summary[run.name][mKey] = { runs: 0, distance: 0 };
    summary[run.name][mKey].runs++;
    summary[run.name][mKey].distance = Math.round((summary[run.name][mKey].distance + run.distance_km) * 100) / 100;

    if (!monthTotals[mKey]) monthTotals[mKey] = { runs: 0, distance: 0, members: new Set() };
    monthTotals[mKey].runs++;
    monthTotals[mKey].distance = Math.round((monthTotals[mKey].distance + run.distance_km) * 100) / 100;
    monthTotals[mKey].members.add(run.name);
  }

  const months = Object.keys(monthTotals).sort();
  const memberNames = Object.keys(summary).sort();

  for (const name of memberNames) {
    console.log(`\n${name}:`);
    for (const m of months) {
      if (summary[name][m]) {
        console.log(`  ${m}: ${summary[name][m].runs} runs, ${summary[name][m].distance} km`);
      }
    }
  }

  console.log('\n============================');
  console.log('MONTHLY TOTALS');
  console.log('============================');
  for (const m of months) {
    const t = monthTotals[m];
    console.log(`${m}: ${t.members.size} active members, ${t.runs} run entries, ${t.distance} km total`);
  }

  // Find join dates for 강도균 and 김태현
  console.log('\n============================');
  console.log('JOIN DATE ANALYSIS');
  console.log('============================');

  // Scan file for first message from each
  const targetMembers = ['강도균', '김태현'];
  for (const target of targetMembers) {
    let firstDashboardDate = null;
    let firstMessageDate = null;

    // Check dashboards
    for (const snap of snapshots) {
      for (const entry of snap.entries) {
        if (entry.name === target && !firstDashboardDate) {
          firstDashboardDate = snap.date;
        }
      }
    }

    // Check messages
    let scanDate = null;
    for (let li = 0; li < lines.length; li++) {
      const dMatch = lines[li].match(/^-+\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
      if (dMatch) {
        scanDate = `${dMatch[1]}-${String(parseInt(dMatch[2])).padStart(2, '0')}-${String(parseInt(dMatch[3])).padStart(2, '0')}`;
      }
      const msgMatch = lines[li].match(/^\[([^\]]+)\]\s*\[/);
      if (msgMatch && extractName(msgMatch[1]) === target) {
        firstMessageDate = scanDate;
        break;
      }
    }

    console.log(`${target}:`);
    console.log(`  First appeared in dashboard: ${firstDashboardDate || 'N/A'}`);
    console.log(`  First message in chat: ${firstMessageDate || 'N/A'}`);
  }
}

main();
