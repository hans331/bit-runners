@AGENTS.md

# 응답 규칙
- URL을 출력할 때 바로 뒤에 한글을 붙이지 말 것. 반드시 한 칸 띄워야 링크가 정상 작동함.
  - ❌ `http://example.com으로 접속`
  - ✅ `http://example.com 으로 접속`

# iOS App Store 재심사 (2026-04-09)

## 상황
iOS 1.0 심사 거절됨. 코드는 이미 수정 완료 (commit c4ce5c7, push 됨).

## 거절 사유 및 해결
1. **2.5.1**: HealthKit UI 미표시 → Apple Health 연동 UI 추가 완료
2. **2.1(a)**: 동기화 버튼 에러 → health-sync.ts 복구 (window.Capacitor 동적 감지)
3. **2.3.3**: 스크린샷에 HealthKit 화면 없음 → 재빌드 후 스크린샷 추가 필요

## Mac에서 할 일
1. `git pull && npm install && npm run build:ios`
2. Xcode → Archive → App Store Connect 업로드
3. App Store Connect에서 **Apple Health 동기화 버튼이 보이는 러닝 기록 화면** 스크린샷 추가
4. 재심사 제출
