'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { fetchOrders, orderStatusLabel } from '@/lib/shop-data';
import { ArrowLeft, Package } from 'lucide-react';
import Link from 'next/link';
import type { Order } from '@/types';

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchOrders(user.id).then(setOrders).finally(() => setLoading(false));
  }, [user]);

  const statusColor = (status: string) => {
    if (status === 'delivered') return 'text-green-500 bg-green-50 dark:bg-green-500/10';
    if (status === 'shipping') return 'text-blue-500 bg-blue-50 dark:bg-blue-500/10';
    if (status === 'cancelled' || status === 'refunded') return 'text-red-500 bg-red-50 dark:bg-red-500/10';
    return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-500/10';
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/shop" className="text-[var(--muted)]"><ArrowLeft size={24} /></Link>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">주문 내역</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <Package size={48} className="mx-auto mb-4 text-[var(--muted)]" />
          <p className="text-xs text-[var(--muted)]">주문 내역이 없습니다</p>
          <Link href="/shop" className="text-sm text-[var(--accent)] font-semibold mt-2 inline-block">쇼핑하러 가기</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[var(--muted)]">
                  {new Date(order.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
                <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${statusColor(order.status)}`}>
                  {orderStatusLabel(order.status)}
                </span>
              </div>
              <div className="flex justify-between">
                <p className="text-base font-bold text-[var(--foreground)]">{order.total_krw.toLocaleString()}원</p>
                {order.mileage_used > 0 && (
                  <p className="text-sm text-[var(--accent)]">-{order.mileage_used.toLocaleString()}P 사용</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
