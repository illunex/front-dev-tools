---
name: create-company-mobile
description: Use when creating, scaffolding, or bootstrapping a company-standard Expo (React Native) webview mobile app with pnpm, FSD folders, EAS release pipeline, and the shared webview core (external app URLs, in-app browser, splash overlay). Korean triggers - "모바일 웹뷰 앱 만들어줘", "웹뷰 앱 생성", "Expo 웹뷰 프로젝트", "앱 보일러플레이트", "모바일 템플릿으로 시작".
---

# create-company-mobile

회사 표준 Expo 웹뷰 앱을 새로 만들 때 사용합니다. 공식 생성기(`create-expo-app`)로 검증된 SDK 버전의 프로젝트를 만든 뒤 다음을 덧씌웁니다.

- 회사 구조(FSD)
- 웹뷰 코어: 외부 앱 URL 처리, 인앱 브라우저, 스플래시 오버레이, 웹·앱 브리지
- 개발 빌드 전용 HTTP 예외
- EAS 릴리즈 파이프라인
- AGENTS.md

## 사용 시점

- "모바일 웹뷰 앱 만들어줘"
- "Expo 웹뷰 프로젝트 생성해줘"
- "앱 보일러플레이트로 시작하자"

기존 프로젝트에 코어를 이식하는 용도는 아닙니다. 새 프로젝트를 만들 때만 씁니다.

## 입력값 수집

생성 전에 아래 값을 모두 확보합니다. 요청에 없는 값만 한 번에 모아 묻습니다.

| 입력 | CLI 옵션 | 비고 |
| --- | --- | --- |
| 앱 이름(표시명) | `--name` | 영문이 아닌 문자(한글 등)가 섞이면 영문 slug도 함께 묻습니다(`--slug`, 디렉터리명·scheme, 영문 소문자로 시작) |
| 번들 ID | `--bundle-id` | iOS·Android에 같은 값. 예: `com.illunex.sample` |
| 개발 웹 URL | `--dev-url` | http·https 모두 가능. http면 개발 빌드에만 iOS 예외가 들어갑니다 |
| 운영 웹 URL | `--prod-url` | https 도메인만 가능(IP·localhost 불가) |
| 배경색 | `--background` | `#RRGGBB`. 네이티브 스플래시·오버레이·safe area 여백에 씁니다 |
| iPad 지원 | `--tablet` | 서비스마다 다르므로 매번 묻습니다 |

iPad 지원을 묻기 전에, 켜면 App Store 심사 때 iPad 스크린샷이 필요하고 웹 화면을 iPad 폭에서 확인해야 한다는 점을 한 줄로 먼저 알립니다. 답이 없으면 끈 상태(`--tablet` 생략)로 둡니다.

## 빠른 실행

```bash
create-company-mobile \
  --name "Sample App" \
  --bundle-id com.illunex.sample \
  --dev-url http://192.168.0.10:3000 \
  --prod-url https://example.com \
  --background "#0B1220" \
  [--slug sample-app] [--tablet] [--directory ./apps]
```

CLI가 없으면 사용자 동의를 받은 뒤 설치 스크립트를 실행합니다.

```bash
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-create-company-mobile.sh | bash
```

## 생성 결과

- 패키지 매니저는 pnpm만 씁니다. npm·npx·`package-lock.json`이 생기면 안 됩니다.
- iOS·Android 모두 CNG입니다(`ios/`·`android/` gitignore). Expo Router는 쓰지 않습니다.
- 폴더는 FSD(`src/app`, `src/views/webview`, `src/widgets/splash-overlay`, `src/shared/config`, `src/shared/lib/*`)입니다.
- Expo 프로젝트 소유자(`owner`)는 회사 조직 `illunex`로 들어갑니다.
- `.env*`는 gitignore되고 `.env.example`만 커밋 대상입니다. 클라우드 빌드의 웹 URL은 EAS 환경 변수에서 읽습니다.
- 생성 뒤에는 typecheck, lint, test, 릴리즈 스크립트 테스트로 자동 검증합니다.

## 생성 후 안내

CLI가 마지막에 출력한 체크리스트(8개, iPad 지원을 켰다면 9개)를 사용자에게 그대로 전달합니다. 사람이 해야 하는 일이라 skill이 대신 실행하지 않습니다. 체크리스트에는 다음이 들어 있습니다.

- git remote 연결
- `illunex` 조직 권한 확인과 `eas init`
- 스토어 앱 등록
- EAS 환경 변수 등록
- 원격 빌드 번호 초기화
- 첫 Android `--build-only` 릴리즈
- 이미지 교체

특히 아래 두 가지를 강조합니다.
- `.env` 파일은 커밋하지 않습니다.
- preview·production 빌드의 운영 URL은 EAS 환경 변수에 등록해야 릴리즈 가드를 통과합니다.

## 권한 처리

- 생성기 실행, 의존성 설치, 검증처럼 네트워크와 대량 파일 쓰기가 필요한 명령은 샌드박스에서 실패시켜 보지 않습니다. 처음부터 권한 승인을 요청합니다.
- 해당 명령: `create-company-mobile ...`, `pnpm create expo-app`, `pnpm install`, `pnpm expo install`, `pnpm add`
- 단순 조회 명령(`ls`, `git status` 등)은 기본 샌드박스에서 실행합니다.

## 실패 처리

- **`pnpm` 없음:** `corepack enable` 또는 pnpm 설치를 안내합니다.
- **`ERR_PNPM_IGNORED_BUILDS`:** 새 의존성의 빌드 스크립트 승인 여부가 정해지지 않은 경우입니다. `pnpm-workspace.yaml` `allowBuilds`에 true/false를 정하고, CLI의 `DISALLOWED_BUILDS` 갱신이 필요하다고 알립니다.
- **minimumReleaseAge로 설치 거절:** 막 나온 패키지가 거절된 경우입니다. `minimumReleaseAgeExclude`에 추가하거나 잠시 후 재시도하도록 안내합니다.
- **새 SDK 알림:** "SDK N이 나와 있지만 템플릿은 M 기준" 안내는 정상 동작입니다. 템플릿 갱신은 `docs/create-company-mobile.md`의 SDK 갱신 절차를 따릅니다.
- **검증 실패:** 생성된 프로젝트 안에서 실패한 명령(`pnpm typecheck` 등)과 원인을 먼저 확인합니다.
- **생성 도중 실패:** 폴더가 일부만 만들어지면 같은 이름으로 다시 실행할 수 없습니다. CLI가 출력한 대로 원인을 해결하고 폴더를 지운 뒤 다시 실행합니다.
