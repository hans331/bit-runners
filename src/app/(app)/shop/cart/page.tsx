'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { fetchCart, updateCartQuantity, removeFromCart } from '@/lib/shop-data';
import { fetchMileageBalance } from '@/lib/mileage-data';
import { ArrowLeft, Minus, Plus, Trash2, Coins } from 'lucide-react';
import Link from 'next/link';
import type { CartItem, Product } from '@/types';

export default function CartPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<(CartItem & { product: Product })[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetchCart(user.id),
      fetchMileageBalance(user.id),
    ]).then(([cartItems, mileage]) => {
      setItems(cartItems);
      setBalance(mileage);
    }).finally(() => setLoading(false));
  }, [user]);

  const totalKrw = items.reduce((sum, i) => sum + i.product.price_krw * i.quantity, 0);

  const handleQuantity = async (item: CartItem & { product: Product }, delta: number) => {
    const newQty = item.quantity + delta;
    await updateCartQuantity(item.id, newQty);
    if (newQty <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } else {
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, quantity: newQty } : i));
    }
  };

  const handleRemove = async (itemId: string) => {
    await removeFromCart(itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/shop" className="text-[var(--muted)]"><ArrowLeft size={24} /></Link>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">장바구니</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-xs text-[var(--muted)]">장바구니가 비어있습니다</p>
          <Link href="/shop" className="text-sm text-[var(--accent)] font-semibold mt-2 inline-block">쇼핑하러 가기</Link>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            {items.map((item) => (
              <div key={item.id} className="card p-4 flex gap-3">
                <div className="w-16 h-16 rounded-xl bg-[var(--card-border)] overflow-hidden flex-shrink-0">
                  {item.product.image_url ? (
                    <img src={item.product.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--muted)]">📦</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)] truncate">{item.product.name}</p>
                  <p className="text-base font-bold text-[var(--foreground)] mt-1">{(item.product.price_krw * item.quantity).toLocaleString()}원</p>
                  <div className="flex items-center gap-3 mt-2">
                    <button onClick={() => handleQuantity(item, -1)} className="w-7 h-7 rounded-lg bg-[var(--card-border)] flex items-center justify-center"><Minus size={14} /></button>
                    <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                    <button onClick={() => handleQuantity(item, 1)} className="w-7 h-7 rounded-lg bg-[var(--card-border)] flex items-center justify-center"><Plus size={14} /></button>
                    <button onClick={() => handleRemove(item.id)} className="ml-auto text-[var(--muted)]"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 결제 요약 */}
          <div className="card p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted)]">상품 금액</span>
              <span className="text-[var(--foreground)] font-semibold">{totalKrw.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted)] flex items-center gap-1"><Coins size={14} />보유 마일리지</span>
              <span className="text-[var(--accent)] font-semibold">{balance.toLocaleString()}P</span>
            </div>
            <div className="border-t border-[var(--card-border)] pt-3 flex justify-between">
              <span className="text-base font-bold text-[var(--foreground)]">결제 금액</span>
              <span className="text-base font-bold text-[var(--accent)]">{totalKrw.toLocaleString()}원</span>
            </div>
          </div>

          <button className="w-full mt-4 py-3.5 rounded-xl bg-[var(--accent)] text-white font-semibold text-base">
            결제하기
          </button>
          <p className="text-center text-xs text-[var(--muted)] mt-2">결제 기능은 PG 연동 후 활성화됩니다</p>
        </>
      )}
    </div>
  );
}
