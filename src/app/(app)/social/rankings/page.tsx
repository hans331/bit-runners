'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { fetchRegionalRankings } from '@/lib/social-data';
import { ArrowLeft, Trophy, MapPin, Globe, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { RegionalRanking } from '@/types';
import AppLogo from '@/components/AppLogo';

// 국가 목록 (대한민국 최상위, 나머지 해당 국가 언어)
const COUNTRIES = [
  { code: 'KR', name: '대한민국' },
  { code: 'US', name: 'United States' },
  { code: 'JP', name: '日本' },
  { code: 'CN', name: '中国' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Deutschland' },
  { code: 'FR', name: 'France' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'SG', name: 'Singapore' },
];

// 한국 시도
const KR_PROVINCES: Record<string, string[]> = {
  '서울특별시': ['강남구', '서초구', '마포구', '송파구', '강서구', '영등포구', '용산구', '성동구', '관악구', '동작구', '광진구', '종로구', '중구', '동대문구', '성북구', '강북구', '도봉구', '노원구', '은평구', '서대문구', '양천구', '구로구', '금천구', '중랑구'],
  '경기도': ['성남시', '수원시', '용인시', '고양시', '안양시', '부천시', '평택시', '화성시', '시흥시', '파주시', '김포시', '광명시', '하남시'],
  '부산광역시': ['해운대구', '수영구', '남구', '동래구', '부산진구', '사하구', '금정구', '연제구'],
  '인천광역시': ['연수구', '남동구', '부평구', '계양구', '미추홀구', '서구'],
  '대구광역시': ['수성구', '달서구', '중구', '동구', '북구'],
  '대전광역시': ['유성구', '서구', '중구', '동구'],
  '광주광역시': ['서구', '북구', '남구', '동구', '광산구'],
  '울산광역시': ['남구', '중구', '동구', '북구', '울주군'],
  '세종특별자치시': ['세종시'],
  '제주특별자치도': ['제주시', '서귀포시'],
};

type RankLevel = 'country' | 'province' | 'district';

export default function RankingsPage() {
  const { profile } = useAuth();
  const [rankings, setRankings] = useState<RegionalRanking[]>([]);
  const [year] = useState(new Date().getFullYear());
  const [month] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);

  // 3단 선택 상태
  const [selectedCountry, setSelectedCountry] = useState('KR');
  const [selectedProvince, setSelectedProvince] = useState(profile?.region_si || '서울특별시');
  const [selectedDistrict, setSelectedDistrict] = useState(profile?.region_gu || '강남구');
  const [rankLevel, setRankLevel] = useState<RankLevel>('district');

  const provinces = selectedCountry === 'KR' ? Object.keys(KR_PROVINCES) : [];
  const districts = selectedCountry === 'KR' && selectedProvince ? (KR_PROVINCES[selectedProvince] || []) : [];

  // 지역 변경 시 하위 선택 초기화
  const handleCountryChange = (code: string) => {
    setSelectedCountry(code);
    if (code !== 'KR') {
      setSelectedProvince('');
      setSelectedDistrict('');
      setRankLevel('country');
    } else {
      setSelectedProvince(provinces[0] || '서울특별시');
      setRankLevel('district');
    }
  };

  const handleProvinceChange = (province: string) => {
    setSelectedProvince(province);
    const dists = KR_PROVINCES[province] || [];
    setSelectedDistrict(dists[0] || '');
    setRankLevel('district');
  };

  // 실제 랭킹은 현재 구 단위 API만 있으므로 구 선택 시 로드
  const loadRankings = useCallback(async () => {
    if (!selectedDistrict && rankLevel === 'district') return;
    setLoading(true);
    try {
      const region = rankLevel === 'district' ? selectedDistrict : selectedProvince;
      const data = await fetchRegionalRankings(region, year, month);
      setRankings(data);
    } catch {} finally { setLoading(false); }
  }, [selectedDistrict, selectedProvince, rankLevel, year, month]);

  useEffect(() => { loadRankings(); }, [loadRankings]);

  const medalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}`;
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/social" className="text-[var(--muted)]"><ArrowLeft size={24} /></Link>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">지역 랭킹</h1>
      </div>

      <p className="text-xs text-[var(--muted)] text-center">{year}년 {month}월</p>

      {/* 1단: 국가 선택 */}
      <div>
        <div className="flex items-center gap-1 mb-2">
          <Globe size={14} className="text-[var(--accent)]" />
          <span className="text-sm font-semibold text-[var(--foreground)]">국가</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {COUNTRIES.map((c) => (
            <button
              key={c.code}
              onClick={() => handleCountryChange(c.code)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                selectedCountry === c.code
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--card)] text-[var(--muted)] border border-[var(--card-border)]'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* 2단: 시/도 선택 (한국만) */}
      {selectedCountry === 'KR' && provinces.length > 0 && (
        <div>
          <div className="flex items-center gap-1 mb-2">
            <MapPin size={14} className="text-green-500" />
            <span className="text-sm font-semibold text-[var(--foreground)]">시/도</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {provinces.map((p) => (
              <button
                key={p}
                onClick={() => handleProvinceChange(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  selectedProvince === p
                    ? 'bg-green-500 text-white'
                    : 'bg-[var(--card)] text-[var(--muted)] border border-[var(--card-border)]'
                }`}
              >
                {p.replace('특별시', '').replace('광역시', '').replace('특별자치시', '').replace('특별자치도', '')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3단: 구/군 선택 */}
      {selectedCountry === 'KR' && districts.length > 0 && (
        <div>
          <div className="flex items-center gap-1 mb-2">
            <MapPin size={14} className="text-orange-500" />
            <span className="text-sm font-semibold text-[var(--foreground)]">구/군</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {districts.map((d) => (
              <button
                key={d}
                onClick={() => { setSelectedDistrict(d); setRankLevel('district'); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  selectedDistrict === d
                    ? 'bg-orange-500 text-white'
                    : 'bg-[var(--card)] text-[var(--muted)] border border-[var(--card-border)]'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {!profile?.region_gu && (
        <p className="text-xs text-[var(--muted)]">
          <Link href="/profile/edit" className="text-[var(--accent)] underline">프로필</Link> 에서 지역을 설정하면 랭킹에 참여할 수 있습니다
        </p>
      )}

      {/* 랭킹 목록 */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
        </div>
      ) : rankings.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <p className="text-4xl">🏆</p>
          <p className="text-sm font-medium text-[var(--foreground)]">
            {selectedDistrict || selectedProvince}에 아직 기록이 없습니다
          </p>
          <p className="text-xs text-[var(--muted)]">첫 번째 러너가 되어보세요!</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {rankings.map((r) => (
            <Link
              key={r.user_id}
              href={`/profile/view?id=${r.user_id}`}
              className={`flex items-center gap-3 px-4 py-3 border-b border-[var(--card-border)] last:border-0 ${
                r.rank_in_gu <= 3 ? 'bg-[var(--accent)]/5' : ''
              }`}
            >
              <div className="w-8 text-center flex-shrink-0">
                <span className={`text-base font-bold ${r.rank_in_gu <= 3 ? 'text-lg' : 'text-[var(--muted)]'}`}>
                  {medalEmoji(r.rank_in_gu)}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[var(--card-border)] overflow-hidden flex-shrink-0">
                {r.avatar_url ? (
                  <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><AppLogo size={18} /></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--foreground)] truncate">{r.display_name}</p>
                <p className="text-xs text-[var(--muted)]">{r.run_count}회 러닝</p>
              </div>
              <p className="text-base font-bold text-[var(--accent)]">{Number(r.monthly_km).toFixed(1)} km</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
