'use client';

import { ThemeProvider } from './ThemeProvider';
import { AuthProvider } from './AuthProvider';
import ErrorBoundary from './ErrorBoundary';
import OfflineBanner from './OfflineBanner';

export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <OfflineBanner />
          {children}
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
