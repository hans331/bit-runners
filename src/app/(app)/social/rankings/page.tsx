'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { fetchRegionalRankings } from '@/lib/social-data';
import { ArrowLeft, Trophy, MapPin } from 'lucide-react';
import Link from 'next/link';
import type { RegionalRanking } from '@/types';

const POPULAR_REGIONS = [
  '강남구', '서초구', '마포구', '송파구', '강서구',
  '영등포구', '용산구', '성동구', '관악구', '동작구',
];

export default function RankingsPage() {
  const { profile } = useAuth();
  const [rankings, setRankings] = useState<RegionalRanking[]>([]);
  const [selectedRegion, setSelectedRegion] = useState(profile?.region_gu || '강남구');
  const [year] = useState(new Date().getFullYear());
  const [month] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);

  const loadRankings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchRegionalRankings(selectedRegion, year, month);
      setRankings(data);
    } catch {} finally { setLoading(false); }
  }, [selectedRegion, year, month]);

  useEffect(() => { loadRankings(); }, [loadRankings]);

  const medalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}`;
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/social" className="text-[var(--muted)]"><ArrowLeft size={24} /></Link>
        <h1 className="text-lg font-bold text-[var(--foreground)]">지역 랭킹</h1>
      </div>

      {/* 기간 */}
      <div className="text-center mb-4">
        <p className="text-sm text-[var(--muted)]">{year}년 {month}월</p>
      </div>

      {/* 지역 선택 */}
      <div className="mb-4">
        <div className="flex items-center gap-1 mb-2">
          <MapPin size={14} className="text-[var(--accent)]" />
          <span className="text-sm font-semibold text-[var(--foreground)]">지역 선택</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {POPULAR_REGIONS.map((region) => (
            <button
              key={region}
              onClick={() => setSelectedRegion(region)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                selectedRegion === region
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--card)] text-[var(--muted)] border border-[var(--card-border)]'
              }`}
            >
              {region}
            </button>
          ))}
        </div>
        {!profile?.region_gu && (
          <p className="text-sm text-[var(--muted)] mt-2">
            <Link href="/profile/edit" className="text-[var(--accent)] underline">프로필</Link> 에서 지역을 설정하면 랭킹에 참여할 수 있습니다
          </p>
        )}
      </div>

      {/* 랭킹 목록 */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
        </div>
      ) : rankings.length === 0 ? (
        <div className="text-center py-12">
          <Trophy size={48} className="mx-auto mb-4 text-[var(--muted)]" />
          <p className="text-sm text-[var(--muted)]">{selectedRegion}에 아직 기록이 없습니다</p>
          <p className="text-sm text-[var(--muted)] mt-1">첫 번째 러너가 되어보세요!</p>
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
                <span className={`text-sm font-bold ${r.rank_in_gu <= 3 ? 'text-lg' : 'text-[var(--muted)]'}`}>
                  {medalEmoji(r.rank_in_gu)}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[var(--card-border)] overflow-hidden flex-shrink-0">
                {r.avatar_url ? (
                  <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm">🏃🏻</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--foreground)] truncate">{r.display_name}</p>
                <p className="text-sm text-[var(--muted)]">{r.run_count}회 러닝</p>
              </div>
              <p className="text-sm font-bold text-[var(--accent)]">{Number(r.monthly_km).toFixed(1)} km</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
