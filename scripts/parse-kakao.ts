/**
 * 카카오톡 대화 내보내기 파일에서 러닝 기록을 추출하는 스크립트
 *
 * 사용법:
 *   npx tsx scripts/parse-kakao.ts <카톡_내보내기.txt>
 *
 * 카카오톡 내보내기 형식 (PC):
 *   --------------- 2026년 3월 1일 토요일 ---------------
 *   [홍길동] [오전 7:30] 오늘 5.2km 달렸습니다
 *
 * 카카오톡 내보내기 형식 (모바일):
 *   2026년 3월 1일 토요일
 *   오전 7:30, 홍길동 : 오늘 5.2km 달렸습니다
 *
 * 추출 패턴:
 *   - "숫자.숫자km" 또는 "숫자km" 또는 "숫자.숫자 km"
 *   - "숫자.숫자킬로" 또는 "숫자킬로"
 */

import * as fs from 'fs';
import * as path from 'path';

interface RunRecord {
  date: string;       // YYYY-MM-DD
  name: string;
  distance_km: number;
  original_message: string;
}

// 멤버 이름 목록 (매칭용)
const MEMBERS = [
  '최철용', '성차민', '이승우', '오민혁', '이지영',
  '강수남', '최명훈', '김창옥', '손승현', '심성재',
  '박현용', '박영건', '윤화식', '정성원', '문신기',
  '김연주', '이상화', '강도균', '김태현',
];

// 거리 추출 패턴
const DISTANCE_PATTERNS = [
  /(\d+\.?\d*)\s*(?:km|KM|Km)/,          // 5.2km, 5km
  /(\d+\.?\d*)\s*(?:킬로|키로)/,            // 5.2킬로
  /(\d+\.?\d*)\s*(?:키로미터|킬로미터)/,       // 5킬로미터
];

// 날짜 패턴
const DATE_PATTERN_DIVIDER = /[-]+\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일.*[-]+/;  // PC 형식
const DATE_PATTERN_LINE = /^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/;                  // 모바일 형식

// 메시지 패턴
const MSG_PATTERN_PC = /^\[([^\]]+)\]\s*\[(?:오전|오후)\s*\d+:\d+\]\s*(.*)/;        // [이름] [시간] 메시지
const MSG_PATTERN_MOBILE = /^(?:오전|오후)\s*\d+:\d+,\s*([^:]+)\s*:\s*(.*)/;        // 시간, 이름 : 메시지

function parseKakaoChat(filePath: string): RunRecord[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const records: RunRecord[] = [];
  let currentDate = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 날짜 확인
    const dateDividerMatch = trimmed.match(DATE_PATTERN_DIVIDER);
    if (dateDividerMatch) {
      const [, year, month, day] = dateDividerMatch;
      currentDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      continue;
    }

    const dateLineMatch = trimmed.match(DATE_PATTERN_LINE);
    if (dateLineMatch) {
      const [, year, month, day] = dateLineMatch;
      currentDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      continue;
    }

    if (!currentDate) continue;

    // 메시지에서 이름과 내용 추출
    let name = '';
    let message = '';

    const pcMatch = trimmed.match(MSG_PATTERN_PC);
    if (pcMatch) {
      [, name, message] = pcMatch;
    } else {
      const mobileMatch = trimmed.match(MSG_PATTERN_MOBILE);
      if (mobileMatch) {
        [, name, message] = mobileMatch;
      }
    }

    if (!name || !message) continue;

    // 멤버 확인
    const memberName = MEMBERS.find(m => name.includes(m));
    if (!memberName) continue;

    // 거리 추출
    for (const pattern of DISTANCE_PATTERNS) {
      const distMatch = message.match(pattern);
      if (distMatch) {
        const distance = parseFloat(distMatch[1]);
        // 비현실적인 거리 필터링 (0.5km 미만 또는 100km 초과)
        if (distance >= 0.5 && distance <= 100) {
          records.push({
            date: currentDate,
            name: memberName,
            distance_km: distance,
            original_message: message.substring(0, 100),
          });
        }
        break;
      }
    }
  }

  return records;
}

function printResults(records: RunRecord[]) {
  console.log('\n========================================');
  console.log('  카카오톡 러닝 기록 파싱 결과');
  console.log('========================================\n');

  if (records.length === 0) {
    console.log('  추출된 기록이 없습니다.');
    console.log('  카카오톡 대화 내보내기 파일이 맞는지 확인해주세요.\n');
    return;
  }

  // 날짜순 정렬
  records.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));

  // 테이블 출력
  console.log('  날짜        | 이름     | 거리     | 원본 메시지');
  console.log('  -----------|---------|---------|---------------------------');
  for (const r of records) {
    console.log(
      `  ${r.date} | ${r.name.padEnd(6)} | ${r.distance_km.toFixed(2).padStart(6)}km | ${r.original_message.substring(0, 30)}`
    );
  }

  // 멤버별 요약
  console.log('\n\n  멤버별 3월 요약:');
  console.log('  -----------|---------|--------');
  console.log('  이름       | 총거리   | 횟수');
  console.log('  -----------|---------|--------');

  const memberSummary = new Map<string, { total: number; count: number }>();
  for (const r of records) {
    const existing = memberSummary.get(r.name) || { total: 0, count: 0 };
    existing.total += r.distance_km;
    existing.count += 1;
    memberSummary.set(r.name, existing);
  }

  const sorted = Array.from(memberSummary.entries()).sort((a, b) => b[1].total - a[1].total);
  for (const [name, stats] of sorted) {
    console.log(
      `  ${name.padEnd(6)} | ${stats.total.toFixed(1).padStart(6)}km | ${stats.count}회`
    );
  }

  console.log(`\n  총 ${records.length}건의 기록이 추출되었습니다.`);

  // JSON 출력 (DB 입력용)
  const outputPath = path.join(path.dirname(filePath), 'parsed-records.json');
  fs.writeFileSync(outputPath, JSON.stringify(records, null, 2));
  console.log(`  JSON 저장: ${outputPath}\n`);
}

// 실행
const filePath = process.argv[2];
if (!filePath) {
  console.log('\n사용법: npx tsx scripts/parse-kakao.ts <카카오톡_대화_내보내기.txt>\n');
  console.log('카카오톡에서 대화 내보내기 방법:');
  console.log('  1. 단체 채팅방 → 우측 상단 메뉴(≡)');
  console.log('  2. 설정(⚙) → 대화 내보내기');
  console.log('  3. txt 파일 저장\n');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`파일을 찾을 수 없습니다: ${filePath}`);
  process.exit(1);
}

const records = parseKakaoChat(filePath);
printResults(records);
