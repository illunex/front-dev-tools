# __CCM_APP_NAME__

Expo(React Native) 웹뷰 앱이다. 실제 화면은 웹이 그리고, 앱은 웹뷰 컨테이너와 네이티브 연결을 맡는다. 네이티브 연결은 외부 앱 실행, 인앱 브라우저, 스플래시, 스토어 배포다.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## 명령

pnpm만 쓴다(`pnpm-lock.yaml`). npm·yarn·bun 명령과 그 lockfile을 만들지 않는다.

```bash
pnpm expo install <package>   # 의존성 추가는 항상 이것으로 한다. SDK와 맞는 버전을 고른다
pnpm ios / pnpm android       # 개발 빌드 설치·실행(expo run)
pnpm start                    # 개발 서버
pnpm lint
pnpm typecheck
pnpm test                     # jest(src, app.config)
pnpm test:scripts             # node:test(릴리즈 스크립트)
pnpm exec eas <command>       # EAS CLI는 devDependency로 고정돼 있다
```

작업을 끝냈다고 말하기 전에 lint, typecheck, test, test:scripts를 모두 실행한다.

## 폴더 구조: FSD

폴더 구조는 FSD(Feature-Sliced Design)를 따른다. 이 섹션이 회사 공통 folder-structure 규칙보다 우선한다.

### 레이어

`processes` 레이어는 사용하지 않는다. Expo Router를 쓰지 않으므로 `src/app`이 FSD app 레이어다. 진입 순서는 루트 `index.ts` → `src/app`이다.

| 레이어 | 역할 |
| ------ | ---- |
| `app/` | Provider, 전역 설정, 앱 초기화(네이티브 스플래시 자동 숨김 방지 등) |
| `views/` | 화면 단위 조합(FSD의 pages 레이어). 지금은 `views/webview` 하나 |
| `widgets/` | 독립적인 큰 UI 블록(스플래시 오버레이, 풀 화면 오버레이 등) |
| `features/` | 2개 이상 slice가 공유하는 인터랙션·로직. 처음에는 없다 |
| `entities/` | 백엔드 API 연결 레이어. 앱이 직접 API를 호출할 때만 만든다. 처음에는 없다 |
| `shared/` | 도메인 무관 공용 코드. `config`(웹 URL·색상), `lib`(외부 앱 URL·인앱 브라우저·브리지·URL 유틸) |

### 의존 규칙

- import는 **위 → 아래 단방향만 허용**한다: `app → views → widgets → features → entities → shared`
- 같은 레이어의 다른 slice를 import하지 않는다.
- slice 간 참조는 각 slice의 public API(`index.ts`)로만 한다. 다른 slice의 내부 파일을 직접 import하지 않는다.
- slice 내부 segment는 `ui/`, `model/`, `api/`, `lib/`, `config/`를 쓴다.
- `@/*` 별칭은 `src/*`를 가리킨다.

### 배치 기준

- **views**: 화면 조합과 그 화면에서만 쓰는 상태·로직(`model/`)을 둔다. 예: 백버튼, 새 창 분기, 스플래시 상태.
- **widgets**: 독립적인 큰 UI 블록이다. 같은 레이어 slice 간 import가 금지되므로 위젯끼리 조합할 때는 views에서 콜백·상태로 잇는다.
- **features**: 2개 이상의 slice가 같은 로직·컴포넌트를 공유할 때만 만든다.
- 한 slice 안에서만 쓰는 단순 상태(`useState` 한 줄 등)는 따로 분리하지 않고 그 slice에 둔다. slice만 늘리는 과분해를 하지 않는다.

## Expo Router를 쓰지 않는 이유

웹뷰 한 화면짜리 앱이라 라우터가 할 일이 없다. 라우터는 첫 렌더 직후 네이티브 스플래시를 내려 웹이 뜰 때까지 빈 화면이 보이게 했고, react-native-screens·@react-navigation 의존성도 끌어온다.

네이티브 화면(설정, 오프라인 안내 등)이 필요해질 때 도입한다. 이때 Expo Router가 `src/app`을 라우트 폴더로 쓰면 FSD app 레이어와 겹친다. 라우트 폴더는 루트 `app/`에 두고, 라우트 파일은 `src/views`의 화면을 가져와 연결만 하도록 정리한다.

## 네이티브 폴더(CNG)

`ios/`·`android/`는 생성물이다(gitignore). 직접 만들거나 고치지 않는다. 네이티브 설정은 `app.json`, `app.config.ts`, config plugin으로만 한다. 네이티브 모듈을 추가하면 개발 빌드를 다시 만든다.

## 웹·앱 브리지

- **웹 → 앱:** `window.ReactNativeWebView.postMessage(JSON.stringify({ action: "..." }))`로 보낸다.
- **앱이 받는 메시지:** `src/shared/lib/bridge/message.ts`의 `BridgeMessage` 유니온과 `BRIDGE_ACTIONS`에 있는 것만 받는다.
  - 새 메시지를 추가할 때는 이 두 곳을 함께 고치고, `WebViewScreen`의 `handleMessage`에서 처리하고, 웹 쪽 action 이름과 맞춘다.
  - `any`나 문자열 분기로 받지 않는다.
- **앱 → 웹:** 문서를 로드하기 전에 `window.__NATIVE_APP__ = { version, platform }`를 주입한다. UA에 버전을 붙이면 구글 OAuth가 웹뷰를 차단할 수 있어서 JS 주입을 쓴다.
- **현재 메시지:** `FIRST_PAINT` 하나다. 웹 첫 화면이 표시되면 주입 스크립트가 자동으로 보내고, 앱은 스플래시를 내린다.

## 코어 모듈이 막고 있는 문제

아래 코드를 바꾸기 전에, 그 코드가 막고 있는 문제가 다시 생기지 않는지 확인한다.

- **`originWhitelist={['*']}` + `onShouldStartLoadWithRequest`**(`views/webview`): 범위를 좁히면 "카카오톡으로 로그인" 같은 앱 실행 URL을 라이브러리가 조용히 버려 버튼이 무반응이 된다.
- **외부 앱 URL**(`shared/lib/external-app-url`): Android intent URL을 직접 풀어 앱을 실행한다. 실패하면 fallback URL, 그다음 Play 스토어 순으로 연다. canOpenURL을 거치지 않으므로 쿼리 스킴을 등록하지 않아도 동작한다.
- **새 창**(`decideOpenWindowTarget`)
  - 우리 웹이 연 외부 링크는 인앱 브라우저로 연다.
  - 외부 결제·인증 페이지가 연 창은 흐름이 끊기지 않게 웹뷰에서 연다.
  - 우리 웹 페이지는 쿠키가 있는 웹뷰에서 연다.
  - Android는 `setSupportMultipleWindows`가 있어야 이 분기로 들어온다.
- **스플래시**(`app`, `widgets/splash-overlay`): 네이티브 스플래시가 먼저 내려가면 웹이 뜰 때까지 빈 화면이 보인다. 그래서 자동 숨김을 막고, 웹 첫 화면(`FIRST_PAINT`)이나 로드 완료까지 같은 모양의 오버레이로 덮는다(최대 15초).
- **외부 페이지 배경:** 우리 origin이 아닌 페이지는 라이트 모드에서 흰 배경을 깐다. 배경을 칠하지 않는 인증 화면의 글자가 어두운 앱 배경에 묻히던 문제 때문이다.
- **HTTP 예외**(`app.config.ts`)
  - 개발 웹 URL이 http면 development 빌드(EAS development 프로필과 로컬 빌드)에서만 그 호스트의 iOS ATS 예외를 넣는다.
  - preview·production에는 절대 넣지 않는다.
  - Android 개발 빌드는 기본으로 cleartext를 허용한다.
- **쿠키**(`sharedCookiesEnabled`): HttpOnly 로그인 쿠키가 앱 종료 후에도 남도록 시스템 쿠키 저장소와 공유한다.
- **배경색:** `src/shared/config/app.ts`의 `APP_BACKGROUND_COLOR`와 `app.json` `expo-splash-screen`의 backgroundColor는 같은 값이어야 한다. 다르면 스플래시가 넘어갈 때 색이 튄다.

## env 관리

- `.env*`는 커밋하지 않는다(gitignore). 키 목록은 `.env.example`에 있다.
- **로컬:** `.env.development`(개발 URL, `pnpm start`와 개발 빌드가 사용), `.env.production`(운영 URL).
- **클라우드 빌드:** EAS 환경 변수가 원본이다. `eas.json` 각 프로필이 environment를 지정한다.
  - development: 개발 URL
  - preview·production: 운영 URL
  - preview를 개발 서버용으로 쓰지 않는다. QA는 development 빌드로 한다.
- **새 키 추가:** `.env.example`과 EAS 각 환경을 함께 갱신한다. 로컬로 값을 받으려면 `pnpm exec eas env:pull`을 쓴다.
- 회사 sync-env(GitHub Actions 환경 변수)는 EAS 빌드가 보지 못하므로 쓰지 않는다.

## 릴리즈

스토어 테스트 트랙(TestFlight / Play 내부 테스트)까지는 EAS Workflows가 올린다. 심사 제출과 프로덕션 출시는 스토어 콘솔에서 사람이 한다.

### 순서

```
1. pnpm set-version x.y.z           # app.json version 수정(CNG라 네이티브 버전은 여기서 생성됨)
2. 커밋 후 main에 push
3. pnpm release [all|ios|android]   # 생략하면 all
4. TestFlight·Play 내부 테스트 설치본으로 실기기 확인
5. App Store Connect에서 심사 제출 / Play Console에서 프로덕션 승격
```

`pnpm release`는 실행 전에 아래를 검사한다. 하나라도 어긋나면 업로드하지 않고 멈춘다. `eas workflow:run`이 로컬 폴더를 통째로 업로드하기 때문이다.

- main 브랜치인지, 커밋하지 않은 변경이나 추적하지 않는 파일이 없는지, `origin/main`과 같은 커밋인지
- EAS production 환경 변수의 운영 웹 URL이 https 도메인인지(IP·localhost 금지)
- `eas.json` submit 설정(iOS `ascAppId`, Android `track`)이 채워져 있는지
- EAS 원격 빌드 번호가 초기화돼 있는지

빌드 번호(Android versionCode, iOS build number)는 EAS가 원격으로 관리하고 빌드마다 자동으로 올린다. 직접 고치지 않는다.

### 최초 1회 준비

1. git remote를 연결하고 첫 커밋을 push한다.
2. Expo `illunex` 조직 멤버 권한을 확인한 뒤 `pnpm exec eas login` → `pnpm exec eas init`을 실행한다.
3. App Store Connect에 앱을 만든다. `eas.json`에 `ascAppId`를 채우고 API Key를 등록한다(`pnpm exec eas credentials -p ios`).
4. Play Console에 앱을 만들고 서비스 계정 키를 등록한다(`pnpm exec eas credentials -p android`).
5. EAS 환경 변수 `EXPO_PUBLIC_WEBVIEW_URL`을 development·preview·production에 등록한다.
6. 원격 빌드 번호를 초기화한다(`pnpm exec eas build:version:set -p ios|android`). 새 앱은 첫 빌드가 1이 되게 넣는다.
7. 첫 Android 릴리즈만 `pnpm release android --build-only`로 실행한다. EAS에서 받은 AAB를 Play Console 내부 테스트에 직접 업로드한다(Google Play는 첫 업로드를 API로 받지 않는다). 이후에는 `pnpm release`를 쓴다.
8. 스플래시·아이콘 이미지를 브랜드 이미지로 교체한다.

키 파일(.jks, .p8, 서비스 계정 JSON)은 레포에 두지 않고 EAS credentials에만 저장한다.

### 규칙

- 스토어용 빌드는 `pnpm release`로만 낸다. `eas workflow:run`이나 `eas build --profile production`을 직접 실행하면 가드를 건너뛴다.
- Xcode Archive로 직접 업로드하지 않는다. 원격 빌드 번호와 충돌한다.
- iOS와 Android는 같은 버전 번호를 쓴다. 한 플랫폼이 이미 그 버전으로 나갔다면, 다른 플랫폼을 배포할 때는 버전을 새로 올린다.
- development·preview 프로필 빌드는 `pnpm exec eas build --profile <프로필>`로 직접 실행해도 된다.
