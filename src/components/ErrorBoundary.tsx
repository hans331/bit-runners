'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] p-6 text-center">
          <p className="text-4xl mb-4">😵</p>
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">앗, 문제가 발생했어요</h2>
          <p className="text-sm text-[var(--muted)] mb-6 max-w-xs">
            일시적인 오류입니다. 앱을 다시 시작해주세요.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = '/dashboard';
            }}
            className="px-6 py-3 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm"
          >
            홈으로 돌아가기
          </button>
          {this.state.error && (
            <p className="text-xs text-[var(--muted)] mt-4 max-w-xs break-all">
              {this.state.error.message}
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
