import { getSupabase } from './supabase';
import type { Product, CartItem, Order, OrderItem } from '@/types';

// =============================================
// 상품
// =============================================

export async function fetchProducts(category?: string): Promise<Product[]> {
  const supabase = getSupabase();
  let query = supabase.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false });
  if (category) query = query.eq('category', category);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Product[];
}

export async function fetchProduct(productId: string): Promise<Product | null> {
  const supabase = getSupabase();
  const { data } = await supabase.from('products').select('*').eq('id', productId).maybeSingle();
  return data as Product | null;
}

// =============================================
// 장바구니
// =============================================

export async function fetchCart(userId: string): Promise<(CartItem & { product: Product })[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('cart_items')
    .select('*, products(*)')
    .eq('user_id', userId)
    .order('created_at');
  if (error) throw error;
  return (data || []).map((d) => ({
    ...d,
    product: d.products as unknown as Product,
  })) as (CartItem & { product: Product })[];
}

export async function addToCart(userId: string, productId: string, quantity = 1): Promise<void> {
  const supabase = getSupabase();
  // upsert: 이미 있으면 수량 증가
  const { data: existing } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();

  if (existing) {
    await supabase.from('cart_items').update({ quantity: existing.quantity + quantity }).eq('id', existing.id);
  } else {
    await supabase.from('cart_items').insert({ user_id: userId, product_id: productId, quantity });
  }
}

export async function updateCartQuantity(cartItemId: string, quantity: number): Promise<void> {
  const supabase = getSupabase();
  if (quantity <= 0) {
    await supabase.from('cart_items').delete().eq('id', cartItemId);
  } else {
    await supabase.from('cart_items').update({ quantity }).eq('id', cartItemId);
  }
}

export async function removeFromCart(cartItemId: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.from('cart_items').delete().eq('id', cartItemId);
}

export async function clearCart(userId: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.from('cart_items').delete().eq('user_id', userId);
}

// =============================================
// 주문
// =============================================

export async function createOrder(
  userId: string,
  items: { product: Product; quantity: number }[],
  mileageUsed: number,
  shipping: { name: string; phone: string; address: string; memo?: string },
): Promise<Order> {
  const supabase = getSupabase();
  const totalKrw = items.reduce((sum, i) => sum + i.product.price_krw * i.quantity, 0);
  const payableKrw = totalKrw - mileageUsed;

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      total_krw: totalKrw,
      mileage_used: mileageUsed,
      payment_method: mileageUsed >= totalKrw ? 'mileage' : payableKrw > 0 ? 'mixed' : 'mileage',
      shipping_name: shipping.name,
      shipping_phone: shipping.phone,
      shipping_address: shipping.address,
      shipping_memo: shipping.memo || null,
      status: mileageUsed >= totalKrw ? 'paid' : 'pending',
    })
    .select()
    .single();
  if (error) throw error;

  // 주문 항목 생성
  const orderItems = items.map((i) => ({
    order_id: order.id,
    product_id: i.product.id,
    product_name: i.product.name,
    quantity: i.quantity,
    unit_price_krw: i.product.price_krw,
  }));
  await supabase.from('order_items').insert(orderItems);

  // 마일리지 차감
  if (mileageUsed > 0) {
    await supabase.rpc('spend_mileage', { p_user_id: userId, p_amount: mileageUsed, p_order_id: order.id });
  }

  // 장바구니 비우기
  await clearCart(userId);

  return order as Order;
}

export async function fetchOrders(userId: string): Promise<Order[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Order[];
}

export async function fetchOrderItems(orderId: string): Promise<OrderItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);
  if (error) throw error;
  return (data || []) as OrderItem[];
}

export function orderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: '결제 대기',
    paid: '결제 완료',
    shipping: '배송 중',
    delivered: '배송 완료',
    cancelled: '취소됨',
    refunded: '환불됨',
  };
  return labels[status] || status;
}
