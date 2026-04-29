# iOS 빌드 가이드 (Mac에서 실행)

## 사전 준비
- Xcode 설치 (Mac App Store)
- Apple Developer 계정 (연 $99)
- CocoaPods 설치: `sudo gem install cocoapods`

## 빌드 순서

```bash
# 1. 프로젝트 클론 또는 복사
cd /path/to/bit-runners

# 2. 의존성 설치
npm install

# 3. iOS 플랫폼 추가
npx cap add ios

# 4. 빌드 + iOS 동기화
npm run build:ios

# 5. CocoaPods 설치
cd ios/App
pod install
cd ../..

# 6. Xcode에서 프로젝트 열기
npm run open:ios
```

## Xcode에서 할 일
1. 좌측에서 **App** 프로젝트 선택
2. **Signing & Capabilities** 탭 → Apple Developer 계정 연결
3. **Bundle Identifier**: `com.routinist.app`
4. iPhone 연결 후 Run (▶)

## Apple 로그인 설정

Apple Developer의 **Services ID**와 Supabase Apple Provider 설정이 맞지 않으면 Apple OAuth 화면에서
`invalid_request` / `Invalid client id or web redirect url.` 오류가 발생합니다.

자세한 설정값은 [APPLE-OAUTH-SETUP.md](./APPLE-OAUTH-SETUP.md)를 확인하세요.

## HealthKit 설정 (Xcode에서)
1. **Signing & Capabilities** → **+ Capability** → **HealthKit** 추가
2. **Info.plist**에 추가:
   - `NSHealthShareUsageDescription`: "러닝 거리를 자동으로 기록하기 위해 건강 데이터에 접근합니다."

## TestFlight 배포
1. **Product → Archive**
2. **Distribute App → App Store Connect**
3. TestFlight에서 15명 회원 초대
