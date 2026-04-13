export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10 text-[var(--foreground)]">
      <h1 className="text-2xl font-bold mb-2">Routinist 개인정보처리방침</h1>
      <p className="text-sm text-[var(--muted)] mb-8">시행일: 2026년 4월 13일</p>

      <section className="space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold mb-2">1. 수집하는 정보</h2>
          <p>• 계정 정보: 이메일, 닉네임, 프로필 사진</p>
          <p>• 러닝 기록: 거리, 시간, 날짜, GPS 경로 데이터</p>
          <p>• 건강 데이터: Apple Health / Health Connect를 통한 운동 데이터 (사용자 동의 시에만)</p>
          <p>• 위치 정보: GPS 트래킹 시 실시간 위치, 지역 랭킹을 위한 거주 지역(구)</p>
          <p>• 소셜 정보: 팔로우 관계, 클럽 가입 정보, 댓글, 쪽지 내용</p>
          <p>• 거래 정보: 마일리지 적립/사용 내역, 쇼핑 주문 내역, 배송 정보</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">2. 정보의 사용 목적</h2>
          <p>• 러닝 기록 관리 및 통계 제공</p>
          <p>• 지역별 랭킹 및 클럽 리더보드 제공</p>
          <p>• 지도 위 러닝 경로 및 히트맵 표시</p>
          <p>• 사용자 간 소셜 기능 (팔로우, 댓글, 응원, 쪽지)</p>
          <p>• 마일리지 적립 및 쇼핑 서비스 제공</p>
          <p>• 서비스 개선 및 개인화</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">3. 정보의 공유</h2>
          <p>• 공개 프로필: 닉네임, 프로필 사진, 통산 기록은 다른 사용자에게 공개될 수 있습니다</p>
          <p>• 클럽 멤버에게 러닝 거리 및 순위가 공유됩니다</p>
          <p>• 활동별 공개 범위를 설정할 수 있습니다 (전체공개/팔로워/클럽/비공개)</p>
          <p>• 쪽지는 발신자와 수신자만 확인할 수 있습니다</p>
          <p>• 제3자에게 개인정보를 판매하거나 제공하지 않습니다</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">4. 건강 데이터</h2>
          <p>• Apple Health / Health Connect를 통해 읽는 데이터: 운동 세션, 이동 거리</p>
          <p>• 건강 데이터는 러닝 기록 동기화 목적으로만 사용됩니다</p>
          <p>• 건강 데이터는 제3자와 공유되지 않습니다</p>
          <p>• 사용자가 언제든지 접근 권한을 철회할 수 있습니다</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">5. 위치 정보</h2>
          <p>• GPS 트래킹 시 실시간 위치 정보를 수집합니다</p>
          <p>• 위치 데이터는 러닝 경로 기록 및 지도 표시에 사용됩니다</p>
          <p>• 프라이버시 존을 설정하여 자택 근처 경로를 숨길 수 있습니다</p>
          <p>• 위치 정보 수집은 앱 설정에서 비활성화할 수 있습니다</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">6. 마일리지 및 결제</h2>
          <p>• 마일리지는 러닝 거리에 따라 자동 적립됩니다 (1km = 10P)</p>
          <p>• 마일리지 거래 내역은 투명하게 기록되며 사용자가 조회할 수 있습니다</p>
          <p>• 결제 정보는 PG사(결제대행사)를 통해 안전하게 처리되며, 카드 정보는 당사 서버에 저장되지 않습니다</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">7. 사용자 차단 및 신고</h2>
          <p>• 원치 않는 사용자를 차단하여 쪽지 및 팔로우를 제한할 수 있습니다</p>
          <p>• 부적절한 콘텐츠나 행위를 신고할 수 있습니다</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">8. 데이터 보관 및 삭제</h2>
          <p>• 데이터는 Supabase 클라우드에 암호화되어 안전하게 저장됩니다</p>
          <p>• 사용자 요청 시 30일 이내에 모든 데이터를 삭제합니다</p>
          <p>• 계정 삭제 시 러닝 기록, 프로필, 쪽지 등 모든 데이터가 삭제됩니다</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">9. 연락처</h2>
          <p>• 개인정보 관련 문의: hans@openhan.kr</p>
          <p>• 운영사: OPENHAN</p>
        </div>
      </section>
    </div>
  );
}
