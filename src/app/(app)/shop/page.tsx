'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { fetchProducts, addToCart } from '@/lib/shop-data';
import { ArrowLeft, ShoppingCart, Coins } from 'lucide-react';
import Link from 'next/link';
import type { Product } from '@/types';

export default function ShopPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedId, setAddedId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts().then(setProducts).finally(() => setLoading(false));
  }, []);

  const handleAddToCart = async (product: Product) => {
    if (!user) return;
    await addToCart(user.id, product.id);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile" className="text-[var(--muted)]"><ArrowLeft size={24} /></Link>
        <h1 className="text-lg font-bold text-[var(--foreground)] flex-1">쇼핑</h1>
        <Link href="/shop/cart" className="relative text-[var(--foreground)]">
          <ShoppingCart size={22} />
        </Link>
        <Link href="/shop/orders" className="text-xs text-[var(--accent)] font-semibold">주문내역</Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingCart size={48} className="mx-auto mb-4 text-[var(--muted)]" />
          <p className="text-sm text-[var(--muted)]">아직 등록된 상품이 없습니다</p>
          <p className="text-xs text-[var(--muted)] mt-1">곧 Routinist 러닝 용품이 입고됩니다!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {products.map((product) => (
            <div key={product.id} className="card overflow-hidden">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square bg-[var(--card-border)] flex items-center justify-center">
                  <ShoppingCart size={32} className="text-[var(--muted)]" />
                </div>
              )}
              <div className="p-3">
                <p className="text-sm font-semibold text-[var(--foreground)] truncate">{product.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm font-bold text-[var(--foreground)]">{product.price_krw.toLocaleString()}원</p>
                  {product.mileage_price && (
                    <p className="text-xs text-[var(--accent)] flex items-center gap-0.5">
                      <Coins size={12} />{product.mileage_price.toLocaleString()}P
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleAddToCart(product)}
                  className={`w-full mt-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                    addedId === product.id
                      ? 'bg-green-500 text-white'
                      : 'bg-[var(--accent)] text-white'
                  }`}
                >
                  {addedId === product.id ? '담았습니다!' : '장바구니 담기'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
