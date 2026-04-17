import { getSupabase } from './supabase';
import type { Profile } from '@/types';
import type { Provider, Session, User } from '@supabase/supabase-js';

// Capacitor 네이티브 앱 여부 확인
function isNativeApp(): boolean {
  return typeof window !== 'undefined' &&
    (window as any).Capacitor !== undefined;
}

// 소셜 로그인
export async function signInWithProvider(provider: Provider) {
  const supabase = getSupabase();

  const redirectTo = isNativeApp()
    ? 'routinist://auth/callback'
    : `${window.location.origin}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: isNativeApp(), // 네이티브에서는 직접 브라우저 열기
    },
  });

  if (error) throw error;

  // 네이티브 앱에서는 인앱 브라우저로 OAuth URL 열기
  // windowName: '_self' 는 Capacitor Browser 에서 의미가 불명확하고
  // 일부 환경에서 딥링크 복귀를 막아 무한 로딩의 원인이 됨 — 제거
  if (isNativeApp() && data.url) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: data.url, presentationStyle: 'fullscreen' });
  }

  return data;
}

// Capacitor 딥링크에서 세션 토큰 추출 및 설정
export async function handleOAuthCallback(url: string): Promise<Session | null> {
  const supabase = getSupabase();

  // URL에서 hash fragment 추출: ...#access_token=xxx&refresh_token=yyy
  const hashPart = url.includes('#') ? url.split('#')[1] : '';
  // query params도 확인 (일부 프로바이더는 ?로 보냄)
  const queryPart = url.includes('?') ? url.split('?')[1]?.split('#')[0] : '';

  const hashParams = new URLSearchParams(hashPart);
  const queryParams = new URLSearchParams(queryPart);

  const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');

  // 인앱 브라우저 닫기 (토큰 유무와 관계없이)
  if (isNativeApp()) {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.close();
    } catch {}
  }

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      console.error('[Auth] setSession 실패:', error.message);
      throw error;
    }
    return data.session;
  }

  // 토큰이 없으면 code 기반 교환 시도 (PKCE flow)
  const code = hashParams.get('code') || queryParams.get('code');
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[Auth] exchangeCode 실패:', error.message);
      throw error;
    }
    return data.session;
  }

  // 마지막 폴백: 기존 세션 확인 (리다이렉트 후 이미 세션이 설정됐을 수 있음)
  await new Promise(r => setTimeout(r, 1000));
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session;

  console.warn('[Auth] OAuth callback에서 토큰/코드를 찾을 수 없음:', url);
  return null;
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
