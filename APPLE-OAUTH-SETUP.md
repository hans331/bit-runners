# Apple OAuth Setup

이 프로젝트의 Apple 로그인은 Supabase OAuth를 거쳐 앱 딥링크로 돌아오는 구조입니다.

## 현재 프로젝트 값

- Supabase project ref: `linkabdqhnzanmbmwyzp`
- Supabase URL: `https://linkabdqhnzanmbmwyzp.supabase.co`
- iOS bundle id: `com.routinist.app`
- 앱 딥링크: `routinist://auth/callback`

## Apple Developer 설정

Apple Developer Console에서 Sign in with Apple용 **Services ID**를 확인합니다.

Services ID의 Web Authentication Configuration에는 아래 값을 정확히 넣어야 합니다.

- Domains and Subdomains: `linkabdqhnzanmbmwyzp.supabase.co`
- Return URLs: `https://linkabdqhnzanmbmwyzp.supabase.co/auth/v1/callback`

주의: `routinist://auth/callback`은 Apple Return URL에 넣는 값이 아닙니다. 이 값은 Supabase 인증이 끝난 뒤 앱으로 돌아오기 위한 최종 redirect URL입니다.

## Supabase 설정

Supabase Dashboard > Authentication > Providers > Apple에서 아래를 확인합니다.

- Apple provider enabled
- Client ID: Apple **Services ID** 값
- Team ID: Apple Developer Team ID
- Key ID: Sign in with Apple key id
- Secret key: 위 Key ID에 해당하는 private key로 만든 값

Supabase Dashboard > Authentication > URL Configuration에는 아래 값을 허용합니다.

- Site URL: `routinist://auth/callback`
- Redirect URLs:
  - `routinist://auth/callback`
  - `http://localhost:3000/auth/callback`

주의: `routinist.kr`은 현재 Cafe24 쇼핑몰 도메인입니다. Next 앱의 `/login` 또는
`/auth/callback` 라우트가 없으므로 Supabase Redirect URLs에
`https://routinist.kr/auth/callback`을 넣으면 OAuth 완료 후 쇼핑몰로 이동합니다.
운영 웹 로그인을 추가하려면 Next 앱을 별도 웹 도메인에 배포한 뒤 그 callback URL만 추가하세요.

## 오류별 원인

`invalid_request` / `Invalid client id or web redirect url.`

- Apple Services ID가 Supabase Apple Provider의 Client ID와 다릅니다.
- Apple Services ID의 Return URL에 `https://linkabdqhnzanmbmwyzp.supabase.co/auth/v1/callback`이 없습니다.
- Return URL에 앱 딥링크 `routinist://auth/callback`을 넣었습니다.
- Supabase 프로젝트 ref가 다른 프로젝트의 callback URL로 등록되어 있습니다.

2026-04-28 작업 메모리 기준으로는 아래 값들이 이미 확인되었습니다.

- Apple Services ID: `kr.routinist.auth`
- Apple Services ID domain: `linkabdqhnzanmbmwyzp.supabase.co`
- Apple Services ID return URL: `https://linkabdqhnzanmbmwyzp.supabase.co/auth/v1/callback`
- Supabase Apple provider Client ID: `kr.routinist.auth`
- Apple authorize URL의 `client_id`: `kr.routinist.auth`
- Apple authorize URL의 `redirect_uri`: `https://linkabdqhnzanmbmwyzp.supabase.co/auth/v1/callback`

따라서 위 값이 그대로라면, 계정 선택/동의 화면까지 진입한 뒤의 오류는 Services ID 기본 설정이 아니라
Supabase Apple Secret/JWT 또는 TestFlight 빌드 반영 문제를 우선 의심합니다.

계정 선택 후 Apple 화면에서 "오류로 인해 요청을 완료할 수 없습니다"가 뜨는 경우:

- Supabase Apple Secret이 Services ID `kr.routinist.auth`를 subject/client id로 생성되지 않았습니다.
- Apple Secret의 Team ID, Key ID, private key가 Apple Developer의 Sign in with Apple key와 맞지 않습니다.
- Secret 만료 또는 재생성 후 Supabase에 반영되지 않았습니다.
- TestFlight에 올라간 앱이 아직 native SocialLogin 경로가 남아 있던 이전 빌드입니다.

Apple 동의 화면 후 앱으로 돌아오지 않음

- Supabase Redirect URLs에 `routinist://auth/callback`이 없습니다.
- iOS URL scheme에 `routinist`가 등록되지 않았습니다.
- 앱 빌드가 최신 `capacitor.config.ts`/iOS 설정을 반영하지 않았습니다.
- Supabase Redirect URLs에 Cafe24 쇼핑몰 도메인인 `https://routinist.kr/auth/callback`이
  남아 있거나 앱 코드가 딥링크 대신 해당 URL을 넘기고 있습니다.

## 로컬 확인

설정 변경 후 새 빌드를 만들기 전에 아래 명령으로 앱 번들을 동기화합니다.

```bash
npm run build:ios
```

그 다음 Xcode에서 archive 후 TestFlight에 다시 올립니다.
