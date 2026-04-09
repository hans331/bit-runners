'use client';

interface HealthSyncButtonProps {
  memberId: string;
  onSyncComplete: () => void;
}

export default function HealthSyncButton({ }: HealthSyncButtonProps) {
  return (
    <div className="bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">자동 동기화</p>
          <p className="text-xs text-[var(--muted)] mt-1">
            BIT Runners 앱을 설치하면 Apple Health / Samsung Health에서 러닝 기록을 자동으로 가져올 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
