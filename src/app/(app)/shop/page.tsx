'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { fetchProducts, addToCart } from '@/lib/shop-data';
import { fetchMileageBalance } from '@/lib/mileage-data';
import { ArrowLeft, ShoppingCart, Coins } from 'lucide-react';
import Link from 'next/link';
import type { Product } from '@/types';

const CATEGORIES = ['전체', '의류', '장비', '굿즈'];

export default function ShopPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [category, setCategory] = useState('전체');
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    fetchProducts().then(setProducts).finally(() => setLoading(false));
    if (user) fetchMileageBalance(user.id).then(setBalance);
  }, [user]);

  const handleAddToCart = async (product: Product) => {
    if (!user) return;
    await addToCart(user.id, product.id);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  const filtered = category === '전체' ? products : products.filter(p => p.category === category);

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/profile" className="text-[var(--muted)]"><ArrowLeft size={24} /></Link>
        <h1 className="text-lg font-bold text-[var(--foreground)] flex-1">쇼핑</h1>
        <Link href="/shop/cart" className="relative text-[var(--foreground)]">
          <ShoppingCart size={22} />
        </Link>
        <Link href="/shop/orders" className="text-sm text-[var(--accent)] font-semibold">주문내역</Link>
      </div>

      {/* 마일리지 배너 */}
      <div className="card p-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins size={18} className="text-[var(--accent)]" />
          <span className="text-sm text-[var(--foreground)]">보유 마일리지</span>
        </div>
        <Link href="/mileage" className="text-base font-bold text-[var(--accent)]">{balance.toLocaleString()}P</Link>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              category === cat
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--card)] text-[var(--muted)] border border-[var(--card-border)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingCart size={48} className="mx-auto mb-4 text-[var(--muted)]" />
          <p className="text-xs text-[var(--muted)]">이 카테고리에 상품이 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((product) => (
            <div key={product.id} className="card overflow-hidden">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square bg-gradient-to-br from-[var(--accent)]/5 to-[var(--accent)]/10 flex items-center justify-center">
                  <span className="text-4xl">
                    {product.category === '의류' ? '👕' : product.category === '장비' ? '🎒' : '🎁'}
                  </span>
                </div>
              )}
              <div className="p-3">
                <p className="text-sm font-semibold text-[var(--foreground)] truncate">{product.name}</p>
                {product.description && (
                  <p className="text-xs text-[var(--muted)] truncate mt-0.5">{product.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <p className="text-base font-bold text-[var(--foreground)]">{product.price_krw.toLocaleString()}원</p>
                </div>
                {product.mileage_price && (
                  <p className="text-sm text-[var(--accent)] flex items-center gap-0.5 mt-0.5">
                    <Coins size={11} />{product.mileage_price.toLocaleString()}P로도 구매 가능
                  </p>
                )}
                <button
                  onClick={() => handleAddToCart(product)}
                  disabled={product.stock <= 0}
                  className={`w-full mt-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                    addedId === product.id
                      ? 'bg-green-500 text-white'
                      : product.stock <= 0
                        ? 'bg-[var(--card-border)] text-[var(--muted)]'
                        : 'bg-[var(--accent)] text-white'
                  }`}
                >
                  {addedId === product.id ? '담았습니다!' : product.stock <= 0 ? '품절' : '장바구니 담기'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
