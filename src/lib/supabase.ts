import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase 환경변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.');
    }
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
}

// 기존 코드 호환용
export const supabase = typeof window !== 'undefined'
  ? (() => { try { return getSupabase(); } catch { return null as unknown as SupabaseClient; } })()
  : (null as unknown as SupabaseClient);
