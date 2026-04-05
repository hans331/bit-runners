import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bitrunners.app',
  appName: 'BIT Runners',
  webDir: 'out',
  server: {
    // Capacitor에서 외부 URL 로드 허용 (Supabase 등)
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      backgroundColor: '#ffffff',
    },
  },
};

export default config;
