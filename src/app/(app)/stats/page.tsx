'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// /stats 는 홈에 흡수되어 제거됨. 북마크/딥링크 호환을 위해 홈으로 리다이렉트.
export default function StatsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);
  return null;
}
