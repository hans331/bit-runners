import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

function isNativeApp(): boolean {
  return typeof window !== 'undefined' && (window as any).Capacitor !== undefined;
}

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase 환경변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.');
    }
    _supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // PKCE: `?code=`를 쓰는 보안 흐름. 네이티브 딥링크와도 호환.
        // 명시 고정해야 supabase-js 버전마다 바뀌는 기본값에 휘둘리지 않음.
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        // 네이티브에서 앱 URL(capacitor://localhost/...)은 OAuth 콜백이 아니므로 자동 파싱 비활성화.
        // 딥링크는 AuthProvider가 직접 handleOAuthCallback으로 처리.
        detectSessionInUrl: !isNativeApp(),
      },
    });
  }
  return _supabase;
}

export const supabase = typeof window !== 'undefined'
  ? (() => { try { return getSupabase(); } catch { return null as unknown as SupabaseClient; } })()
  : (null as unknown as SupabaseClient);
