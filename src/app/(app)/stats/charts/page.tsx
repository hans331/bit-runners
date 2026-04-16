'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ChartsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/stats'); }, [router]);
  return null;
}
