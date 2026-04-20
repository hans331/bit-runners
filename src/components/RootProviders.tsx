'use client';

import { ThemeProvider } from './ThemeProvider';
import { AuthProvider } from './AuthProvider';
import ErrorBoundary from './ErrorBoundary';
import OfflineBanner from './OfflineBanner';
import { I18nProvider } from '@/lib/i18n';

export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <OfflineBanner />
            {children}
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
