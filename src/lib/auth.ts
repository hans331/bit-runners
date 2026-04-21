import { getSupabase } from './supabase';
import type { Profile } from '@/types';
import type { Provider, Session, User } from '@supabase/supabase-js';

// Capacitor 네이티브 앱 여부 확인
function isNativeApp(): boolean {
  return typeof window !== 'undefined' &&
    (window as any).Capacitor !== undefined;
}

// 진단 로그 기록 — /login?debug=1 에서 확인 가능
function logAuth(message: string) {
  if (typeof window === 'undefined') return;
  try {
    const prev = window.localStorage.getItem('routinist_auth_log') || '';
    const ts = new Date().toISOString().slice(11, 19);
    const next = `${prev}\n[${ts}] ${message}`.trim().split('\n').slice(-40).join('\n');
    window.localStorage.setItem('routinist_auth_log', next);
  } catch {}
}

// 소셜 로그인
export async function signInWithProvider(provider: Provider) {
  const supabase = getSupabase();

  const native = isNativeApp();
  const redirectTo = native
    ? 'routinist://auth/callback'
    : `${window.location.origin}/auth/callback`;

  logAuth(`signInWithProvider(${provider}) native=${native} redirectTo=${redirectTo}`);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: native,
    },
  });

  if (error) {
    logAuth(`signInWithOAuth error: ${error.message}`);
    throw error;
  }

  if (!data?.url) {
    // data.url 이 비었으면 흰 화면의 근본 원인. 사용자에게 에러 표시.
    logAuth(`signInWithOAuth returned empty url (provider=${provider})`);
    throw new Error('OAuth URL을 받지 못했어요. Supabase 설정(Site URL / Redirect URLs)을 확인해주세요.');
  }

  logAuth(`OAuth URL length=${data.url.length} starts=${data.url.slice(0, 80)}`);

  // 네이티브: Capacitor Browser 로 OAuth URL 열기
  if (native) {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: data.url, presentationStyle: 'fullscreen' });
      logAuth('Browser.open success');
    } catch (e) {
      logAuth(`Browser.open 실패: ${e instanceof Error ? e.message : e}`);
      // 폴백: 시스템 브라우저로
      window.location.href = data.url;
    }
  }

  return data;
}

// Capacitor 딥링크에서 세션 토큰 추출 및 설정
export async function handleOAuthCallback(url: string): Promise<Session | null> {
  const supabase = getSupabase();

  const hashPart = url.includes('#') ? url.split('#')[1] : '';
  const queryPart = url.includes('?') ? url.split('?')[1]?.split('#')[0] : '';

  const hashParams = new URLSearchParams(hashPart);
  const queryParams = new URLSearchParams(queryPart);

  const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
  const code = hashParams.get('code') || queryParams.get('code');
  const oauthError = queryParams.get('error') || hashParams.get('error');

  if (oauthError) {
    if (isNativeApp()) {
      try { const { Browser } = await import('@capacitor/browser'); await Browser.close(); } catch {}
    }
    const desc = queryParams.get('error_description') || hashParams.get('error_description') || '';
    throw new Error(`OAuth 프로바이더 에러: ${oauthError} ${desc}`);
  }

  // 세션 교환을 **먼저** 처리하고 Browser.close() 는 마지막에 호출 —
  // 첫 실행 시 Browser.close() 가 webview 포커스 전환을 일으켜 exchangeCodeForSession 타이밍에
  // 영향을 주는 케이스를 차단.
  let resolvedSession: Session | null = null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      if (isNativeApp()) {
        try { const { Browser } = await import('@capacitor/browser'); await Browser.close(); } catch {}
      }
      console.error('[Auth] exchangeCode 실패:', error.message);
      throw new Error(`exchangeCode 실패: ${error.message}`);
    }
    resolvedSession = data.session;
  } else if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      if (isNativeApp()) {
        try { const { Browser } = await import('@capacitor/browser'); await Browser.close(); } catch {}
      }
      console.error('[Auth] setSession 실패:', error.message);
      throw new Error(`setSession 실패: ${error.message}`);
    }
    resolvedSession = data.session;
  }

  // 세션이 실제로 storage 에 persist 되었는지 확인 (iOS WebKit localStorage 가 간혹 지연됨)
  if (resolvedSession) {
    for (let i = 0; i < 3; i++) {
      const { data: { session: verify } } = await supabase.auth.getSession();
      if (verify) { resolvedSession = verify; break; }
      await new Promise(r => setTimeout(r, 200));
    }
  } else {
    // 폴백: 이미 세션이 붙어 있는지 확인
    await new Promise(r => setTimeout(r, 800));
    const { data: { session } } = await supabase.auth.getSession();
    resolvedSession = session;
  }

  // 세션 확정 후 Browser.close() — 포커스 전환이 AuthProvider 의 상태 업데이트를 방해하지 않도록
  if (isNativeApp()) {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.close();
    } catch {}
  }

  if (!resolvedSession) {
    console.warn('[Auth] OAuth callback에서 토큰/코드를 찾을 수 없음:', url);
  }
  return resolvedSession;
}

// 이메일/비밀번호 회원가입
export async function signUpWithEmail(email: string, password: string, displayName?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: displayName ? { display_name: displayName } : undefined,
    },
  });
  if (error) throw error;
  return data;
}

// 이메일/비밀번호 로그인
export async function signInWithEmail(email: string, password: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// 비밀번호 재설정 메일
export async function sendPasswordResetEmail(email: string) {
  const supabase = getSupabase();
  const redirectTo = isNativeApp()
    ? 'routinist://auth/callback'
    : `${window.location.origin}/auth/callback`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

// 로그아웃
export async function signOut() {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// 현재 세션
export async function getSession(): Promise<Session | null> {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// 현재 유저
export async function getUser(): Promise<User | null> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// 프로필 조회
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data as Profile;
}

// 프로필 업데이트
export async function updateProfile(userId: string, updates: Partial<Pick<Profile, 'display_name' | 'avatar_url' | 'privacy_zone_lat' | 'privacy_zone_lng' | 'privacy_zone_radius_m'>>) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

// 아바타 업로드
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const supabase = getSupabase();
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(path);

  return publicUrl;
}
