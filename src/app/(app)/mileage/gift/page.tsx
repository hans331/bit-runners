'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { fetchMileageBalance, giftMileage } from '@/lib/mileage-data';
import { searchUsers } from '@/lib/social-data';
import { ArrowLeft, Search, Gift } from 'lucide-react';
import Link from 'next/link';
import type { Profile } from '@/types';

export default function GiftMileagePage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) fetchMileageBalance(user.id).then(setBalance);
  }, [user]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) { setSearchResults([]); return; }
    const results = await searchUsers(query);
    setSearchResults(results.filter((u) => u.id !== user?.id));
  };

  const handleGift = async () => {
    if (!user || !selectedUser || !amount) return;
    const pts = parseInt(amount);
    if (isNaN(pts) || pts <= 0) { setMessage('올바른 금액을 입력하세요'); return; }
    if (pts > balance) { setMessage('마일리지가 부족합니다'); return; }

    setSending(true);
    setMessage('');
    try {
      await giftMileage(user.id, selectedUser.id, pts);
      setBalance((b) => b - pts);
      setMessage(`${selectedUser.display_name}님에게 ${pts.toLocaleString()}P를 선물했습니다!`);
      setSelectedUser(null);
      setAmount('');
      setSearchQuery('');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '선물에 실패했습니다');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/mileage" className="text-[var(--muted)]"><ArrowLeft size={24} /></Link>
        <h1 className="text-2xl font-extrabold text-[var(--foreground)]">마일리지 선물</h1>
      </div>

      {/* 잔액 */}
      <div className="card p-4 mb-4 text-center">
        <p className="text-xs text-[var(--muted)]">보유 마일리지</p>
        <p className="text-2xl font-bold text-[var(--foreground)]">{balance.toLocaleString()}P</p>
      </div>

      {/* 받을 사람 선택 */}
      {!selectedUser ? (
        <div className="space-y-3 mb-4">
          <label className="block text-sm font-medium text-[var(--foreground)]">받는 사람</label>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="닉네임으로 검색"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--card-border)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="card divide-y divide-[var(--card-border)]">
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => { setSelectedUser(u); setSearchResults([]); setSearchQuery(''); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--card-border)]/30"
                >
                  <div className="w-8 h-8 rounded-full bg-[var(--card-border)] overflow-hidden flex-shrink-0">
                    {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm">🏃🏻</div>}
                  </div>
                  <span className="text-sm font-medium text-[var(--foreground)]">{u.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="card p-4 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--card-border)] overflow-hidden flex-shrink-0">
            {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">🏃🏻</div>}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--foreground)]">{selectedUser.display_name}</p>
            <p className="text-xs text-[var(--muted)]">받는 사람</p>
          </div>
          <button onClick={() => setSelectedUser(null)} className="text-sm text-[var(--accent)]">변경</button>
        </div>
      )}

      {/* 금액 입력 */}
      <div className="space-y-3 mb-6">
        <label className="block text-sm font-medium text-[var(--foreground)]">선물할 마일리지</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          min={1}
          max={balance}
          className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--card-border)] text-[var(--foreground)] text-2xl font-extrabold text-center focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
        <div className="flex gap-2 justify-center">
          {[100, 500, 1000].map((v) => (
            <button key={v} onClick={() => setAmount(String(v))} className="px-4 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--card-border)] text-sm font-semibold text-[var(--foreground)]">
              {v.toLocaleString()}P
            </button>
          ))}
          <button onClick={() => setAmount(String(balance))} className="px-4 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--card-border)] text-sm font-semibold text-[var(--accent)]">
            전액
          </button>
        </div>
      </div>

      {/* 선물 버튼 */}
      <button
        onClick={handleGift}
        disabled={!selectedUser || !amount || sending}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[var(--accent)] text-white font-semibold text-base disabled:opacity-50"
      >
        <Gift size={20} /> {sending ? '전송 중...' : '선물하기'}
      </button>

      {message && (
        <p className={`text-center text-sm mt-3 ${message.includes('실패') || message.includes('부족') || message.includes('올바른') ? 'text-red-500' : 'text-green-500'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
