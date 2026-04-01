'use client';

import { useState } from 'react';
import Link from 'next/link';
import { members, getTotalDistance, monthlyRecords } from '@/lib/data';
import type { MemberStatus } from '@/types';

export default function AdminPage() {
  const [filter, setFilter] = useState<'all' | 'active' | 'dormant'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [addedMembers, setAddedMembers] = useState<Array<{ name: string; location: string; date: string }>>([]);
  const [statusChanges, setStatusChanges] = useState<Record<string, MemberStatus>>({});
  const [successMsg, setSuccessMsg] = useState('');

  const allMembers = [...members].map(m => {
    const records = monthlyRecords.filter(r => r.member_id === m.id && r.achieved_km > 0);
    const lastActive = records.length > 0
      ? records.sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month))[0]
      : null;

    return {
      ...m,
      status: statusChanges[m.id] || m.status,
      totalDistance: getTotalDistance(m.id),
      activeMonths: records.length,
      lastActive: lastActive ? `${lastActive.year}.${lastActive.month}월` : '-',
    };
  });

  const filtered = allMembers.filter(m => {
    if (filter === 'active') return m.status === 'active';
    if (filter === 'dormant') return m.status === 'dormant';
    return true;
  });

  const activeCount = allMembers.filter(m => m.status === 'active').length;
  const dormantCount = allMembers.filter(m => m.status === 'dormant').length;

  const handleStatusToggle = (id: string, current: MemberStatus) => {
    const next = current === 'active' ? 'dormant' : 'active';
    setStatusChanges(prev => ({ ...prev, [id]: next }));
    setSuccessMsg(`상태 변경됨 (데모 모드 - Supabase 연동 시 저장됩니다)`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAddedMembers(prev => [...prev, { name: newName, location: newLocation, date: newDate }]);
    setShowAddForm(false);
    setNewName('');
    setNewLocation('');
    setSuccessMsg(`${newName} 회원이 등록되었습니다 (데모 모드)`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto px-3 md:px-6 py-4 md:py-6 space-y-5">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--accent)] transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
        대시보드
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--foreground)]">회원 관리</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[var(--accent)] hover:opacity-90 rounded-xl transition-all shadow-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          신규 등록
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-3 text-center">
          <p className="text-emerald-600 dark:text-emerald-400 font-medium text-sm">{successMsg}</p>
        </div>
      )}

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setFilter('all')}
          className={`card text-center !p-4 transition-all ${filter === 'all' ? '!border-[var(--accent)] ring-1 ring-[var(--accent)]' : ''}`}>
          <p className="text-2xl font-extrabold text-[var(--foreground)]">{allMembers.length + addedMembers.length}</p>
          <p className="text-[10px] text-[var(--muted)] mt-0.5">전체</p>
        </button>
        <button onClick={() => setFilter('active')}
          className={`card text-center !p-4 transition-all ${filter === 'active' ? '!border-emerald-500 ring-1 ring-emerald-500' : ''}`}>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{activeCount}</p>
          <p className="text-[10px] text-[var(--muted)] mt-0.5">활동</p>
        </button>
        <button onClick={() => setFilter('dormant')}
          className={`card text-center !p-4 transition-all ${filter === 'dormant' ? '!border-amber-500 ring-1 ring-amber-500' : ''}`}>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{dormantCount}</p>
          <p className="text-[10px] text-[var(--muted)] mt-0.5">휴면</p>
        </button>
      </div>

      {/* 신규 회원 등록 폼 */}
      {showAddForm && (
        <form onSubmit={handleAddMember} className="card space-y-3">
          <h3 className="text-sm font-bold text-[var(--foreground)]">신규 회원 등록</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1">이름 *</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} required placeholder="홍길동"
                className="w-full bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1">합류 장소</label>
              <input type="text" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="서울"
                className="w-full bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1">합류일</label>
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
              취소
            </button>
            <button type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-[var(--accent)] hover:opacity-90 rounded-xl transition-all">
              등록
            </button>
          </div>
        </form>
      )}

      {/* 새로 추가된 멤버 */}
      {addedMembers.length > 0 && (
        <div className="card !p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--card-border)]">
            <h3 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">방금 등록된 회원</h3>
          </div>
          {addedMembers.map((m, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-[var(--card-border)] last:border-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                {m.name[0]}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--foreground)]">{m.name}</p>
                <p className="text-[10px] text-[var(--muted)]">{m.location || '-'} · {m.date}</p>
              </div>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">NEW</span>
            </div>
          ))}
        </div>
      )}

      {/* 회원 목록 테이블 */}
      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--muted)] text-left border-b border-[var(--card-border)] bg-[var(--sidebar-bg)]">
                <th className="py-3 px-4 font-medium text-xs">번호</th>
                <th className="py-3 px-4 font-medium text-xs">이름</th>
                <th className="py-3 px-4 font-medium text-xs hidden sm:table-cell">합류</th>
                <th className="py-3 px-4 font-medium text-xs text-right">통산</th>
                <th className="py-3 px-4 font-medium text-xs text-center hidden sm:table-cell">활동 개월</th>
                <th className="py-3 px-4 font-medium text-xs text-center hidden md:table-cell">마지막 활동</th>
                <th className="py-3 px-4 font-medium text-xs text-center">상태</th>
                <th className="py-3 px-4 font-medium text-xs text-center">관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className={`border-b border-[var(--card-border)] last:border-0 transition-colors
                  ${m.status === 'dormant' ? 'opacity-60' : 'hover:bg-[var(--card-border)]/50'}`}>
                  <td className="py-3 px-4 text-[var(--muted)] font-mono text-xs">#{m.member_number}</td>
                  <td className="py-3 px-4">
                    <Link href={`/member/${encodeURIComponent(m.name)}`}
                      className="text-sm font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors">
                      {m.name}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-xs text-[var(--muted)] hidden sm:table-cell">
                    {m.join_location || '-'}
                    {m.join_date && <span className="block text-[10px]">{m.join_date}</span>}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs font-semibold text-[var(--foreground)]">
                    {m.totalDistance.toFixed(0)}km
                  </td>
                  <td className="py-3 px-4 text-center text-xs text-[var(--muted)] hidden sm:table-cell">
                    {m.activeMonths}개월
                  </td>
                  <td className="py-3 px-4 text-center text-xs text-[var(--muted)] hidden md:table-cell">
                    {m.lastActive}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      m.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>
                      {m.status === 'active' ? '활동' : '휴면'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleStatusToggle(m.id, m.status)}
                      className={`text-[10px] font-medium px-2.5 py-1 rounded-lg transition-colors ${
                        m.status === 'active'
                          ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                          : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                    >
                      {m.status === 'active' ? '휴면 처리' : '복귀'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-[var(--muted)] text-center">
        * 현재 데모 모드입니다. Supabase 연동 시 변경사항이 실시간 저장됩니다.
      </p>
    </div>
  );
}
