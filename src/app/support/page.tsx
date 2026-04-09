import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BIT Runners - 고객 지원',
  description: 'BIT Runners 앱 고객 지원 및 문의',
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold">BIT Runners</h1>
          <p className="text-[var(--muted)]">고객 지원 센터</p>
        </div>

        <div className="card space-y-4">
          <h2 className="text-xl font-bold">앱 소개</h2>
          <p className="text-[var(--muted)] leading-relaxed">
            BIT Runners는 러닝 클럽 멤버들의 러닝 기록을 관리하고,
            목표 달성을 추적하며, 함께 달리는 즐거움을 나누는 앱입니다.
            Apple HealthKit 및 Google Health Connect와 연동하여
            자동으로 러닝 데이터를 동기화합니다.
          </p>
        </div>

        <div className="card space-y-4">
          <h2 className="text-xl font-bold">문의하기</h2>
          <p className="text-[var(--muted)] leading-relaxed">
            앱 사용 중 문제가 발생하거나 문의사항이 있으시면 아래 이메일로 연락해 주세요.
            빠른 시일 내에 답변드리겠습니다.
          </p>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--accent)]/5 border border-[var(--accent)]/20">
            <span className="text-2xl">&#9993;</span>
            <div>
              <p className="text-sm text-[var(--muted)]">이메일</p>
              <a
                href="mailto:support@bitrunners.kr"
                className="text-[var(--accent)] font-semibold hover:underline"
              >
                support@bitrunners.kr
              </a>
            </div>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="text-xl font-bold">자주 묻는 질문</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">러닝 기록이 자동으로 동기화되지 않아요</h3>
              <p className="text-[var(--muted)] text-sm mt-1 leading-relaxed">
                앱 설정에서 건강 데이터 접근 권한이 허용되어 있는지 확인해 주세요.
                iOS의 경우 설정 &gt; 건강 &gt; 데이터 접근 및 기기에서 BIT Runners의 권한을 확인할 수 있습니다.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">목표는 어떻게 설정하나요?</h3>
              <p className="text-[var(--muted)] text-sm mt-1 leading-relaxed">
                앱 내 목표 설정 메뉴에서 월간 러닝 거리 목표를 설정할 수 있습니다.
                목표는 매월 초에 새로 설정하는 것을 권장합니다.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">회원 탈퇴는 어떻게 하나요?</h3>
              <p className="text-[var(--muted)] text-sm mt-1 leading-relaxed">
                회원 탈퇴 및 개인정보 삭제를 원하시면 support@bitrunners.kr로
                이메일을 보내주세요. 확인 후 처리해 드리겠습니다.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">앱에서 수집하는 데이터는 무엇인가요?</h3>
              <p className="text-[var(--muted)] text-sm mt-1 leading-relaxed">
                BIT Runners는 러닝 거리, 러닝 시간 등 건강 앱에서 제공하는 운동 데이터만 수집합니다.
                수집된 데이터는 러닝 기록 관리 목적으로만 사용되며, 제3자에게 제공되지 않습니다.
              </p>
            </div>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="text-xl font-bold">운영 정보</h2>
          <div className="text-[var(--muted)] text-sm space-y-1">
            <p>서비스명: BIT Runners</p>
            <p>운영: BIT Runners 러닝 클럽</p>
            <p>이메일: support@bitrunners.kr</p>
          </div>
        </div>

        <p className="text-center text-xs text-[var(--muted)]">
          &copy; {new Date().getFullYear()} BIT Runners. All rights reserved.
        </p>
      </div>
    </div>
  );
}
