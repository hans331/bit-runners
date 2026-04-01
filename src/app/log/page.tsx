'use client';

import { useState } from 'react';
import Link from 'next/link';
import { members } from '@/lib/data';

export default function LogPage() {
  const [selectedMember, setSelectedMember] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [memo, setMemo] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [recentLogs, setRecentLogs] = useState<Array<{
    name: string; date: string; distance: string; duration: string; memo: string;
  }>>([]);

  const sortedMembers = [...members].sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !distance) return;

    const member = members.find(m => m.id === selectedMember);
    const newLog = {
      name: member?.name || '',
      date,
      distance,
      duration,
      memo,
    };

    setRecentLogs(prev => [newLog, ...prev]);
    setSubmitted(true);
    setDistance('');
    setDuration('');
    setMemo('');

    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <Link href="/" className="text-sm text-slate-400 hover:text-blue-400 transition-colors">
        ← 대시보드
      </Link>

      <div className="text-center">
        <h1 className="text-xl font-bold text-white">러닝 기록 입력</h1>
        <p className="text-sm text-slate-400 mt-1">달린 후 바로 입력하세요!</p>
      </div>

      {submitted && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
          <p className="text-emerald-400 font-medium">기록이 저장되었습니다! 🎉</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 space-y-4">
        {/* 이름 선택 */}
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">이름 *</label>
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            required
            className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">선택하세요</option>
            {sortedMembers.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* 날짜 */}
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">날짜 *</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 거리 */}
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">거리 (km) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="예: 5.23"
            required
            className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 시간 (선택) */}
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">시간 (분) <span className="text-slate-500">선택</span></label>
          <input
            type="number"
            min="0"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="예: 32"
            className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 메모 (선택) */}
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">메모 <span className="text-slate-500">선택</span></label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="예: 한강 야간 러닝"
            className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3.5 rounded-lg transition-colors text-base"
        >
          기록 저장
        </button>
      </form>

      {/* 최근 입력 기록 */}
      {recentLogs.length > 0 && (
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">이번 세션 입력 기록</h3>
          <div className="space-y-2">
            {recentLogs.map((log, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                <div>
                  <span className="text-sm text-white">{log.name}</span>
                  <span className="text-xs text-slate-500 ml-2">{log.date}</span>
                </div>
                <span className="text-sm font-mono text-blue-400">{log.distance}km</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 안내 */}
      <div className="text-center text-xs text-slate-600 space-y-1">
        <p>* Supabase 연동 시 실시간 대시보드 반영</p>
        <p>* 현재는 데모 모드입니다</p>
      </div>
    </div>
  );
}
