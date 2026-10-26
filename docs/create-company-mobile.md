# create-company-mobile 설치 가이드

`create-company-mobile`은 회사 표준 Expo 웹뷰 앱을 만드는 CLI입니다. 공식 생성기(`create-expo-app`)로 검증된 SDK의 프로젝트를 먼저 만든 뒤 다음을 덧씌웁니다.

- FSD 폴더 구조
- 웹뷰 코어
- 개발 빌드 전용 HTTP 예외
- EAS 릴리즈 파이프라인
- AGENTS.md

## 설치

```bash
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-create-company-mobile.sh | bash
```

CLI가 여러 템플릿 파일을 함께 쓰기 때문에, 설치 스크립트는 레포 tarball을 받아 CLI와 템플릿을 같은 구조로 풉니다.

기본 설치 결과:

- CLI·템플릿: `~/.local/share/create-company-mobile/{scripts,templates}`
- 실행 명령: `~/.local/bin/create-company-mobile`
- Claude Code skill: `~/.claude/skills/create-company-mobile/SKILL.md`
- Codex skill: `~/.codex/skills/create-company-mobile/SKILL.md`

설치 범위 지정(`bash -s --` 뒤에 붙임):

| 옵션 | 설치 범위 |
| --- | --- |
| `--claude` | Claude Code skill만 |
| `--codex` | Codex skill만 |
| `--no-skills` | CLI만 |
| `--source-dir <path>` | GitHub 대신 로컬 front-dev-tools 체크아웃에서 설치 |

```bash
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-create-company-mobile.sh | bash -s -- --codex
```

## 사용

```bash
create-company-mobile \
  --name "Sample App" \
  --bundle-id com.illunex.sample \
  --dev-url http://192.168.0.10:3000 \
  --prod-url https://example.com \
  --background "#0B1220"
```

| 옵션 | 설명 |
| --- | --- |
| `--name` | 앱 표시명(필수) |
| `--slug` | 디렉터리명·slug·scheme. 기본은 앱 이름을 kebab-case로 바꾼 값. 앱 이름에 영문이 아닌 문자(한글 등)가 섞이면 필수. 영문 소문자로 시작 |
| `--bundle-id` | iOS bundleIdentifier·Android package에 같이 쓰는 값(필수, Android 패키지 규칙) |
| `--dev-url` | 개발 웹 URL(필수). http면 개발 빌드에만 iOS ATS 예외가 들어감 |
| `--prod-url` | 운영 웹 URL(필수). https 도메인만 허용(IP·localhost 불가) |
| `--background` | 배경색 `#RRGGBB`(필수). 상태바 글자색은 흰색·검정 중 대비가 큰 쪽으로 자동 결정 |
| `--tablet` | iPad 지원. 켜면 App Store 심사에 iPad 스크린샷 필요 |
| `--directory` | 프로젝트를 만들 부모 디렉터리. 기본은 현재 디렉터리 |
| `--skip-install` | 회사 표준 의존성 추가 설치를 건너뜀 |
| `--skip-verify` | typecheck·lint·test 검증을 건너뜀 |
| `--templates-only` | 이미 만든 프로젝트에 템플릿만 다시 적용(템플릿 유지보수용) |

## 생성 결과

```
index.ts                           registerRootComponent → src/app
app.json / app.config.ts           앱 설정 / 개발 빌드 전용 HTTP 예외
eas.json, .eas/workflows/release.yml
scripts/                           release·check-release·set-version + 테스트
src/app/                           App, Provider, 스플래시 자동 숨김 방지
src/views/webview/                 웹뷰 화면, 백버튼·새 창 분기·스플래시 상태
src/widgets/splash-overlay/        스플래시 오버레이
src/shared/config/                 웹 URL(env)·배경색·상태바 스타일
src/shared/lib/                    web-url, external-app-url, in-app-browser, bridge
AGENTS.md / CLAUDE.md / README.md  규칙·릴리즈 절차(CLAUDE.md는 @AGENTS.md)
.env.example                       키 목록(.env*는 gitignore)
```

- 패키지 매니저는 pnpm, iOS·Android는 CNG이고 Expo Router는 쓰지 않습니다. Expo `owner`는 `illunex`입니다.
- pnpm 11이 의존성 빌드 스크립트 승인을 요구하므로 `pnpm-workspace.yaml` `allowBuilds`에 회사 표준 의존성이 끌어오는 패키지를 `false`로 넣습니다.

## 생성 후 체크리스트

CLI가 마지막에 출력하는 내용과 같습니다. 사람이 해야 하는 일입니다.

1. git remote를 연결하고 첫 커밋을 push합니다. 릴리즈 가드가 `origin/main`을 확인합니다.
2. Expo `illunex` 조직 멤버 권한을 확인한 뒤 `pnpm exec eas login` → `pnpm exec eas init`을 실행합니다.
3. App Store Connect에 앱을 만들고 `eas.json`의 `ascAppId`를 채운 뒤 API Key를 등록합니다.
4. Play Console에 앱을 만들고 서비스 계정 키를 등록합니다.
5. EAS 환경 변수 `EXPO_PUBLIC_WEBVIEW_URL`을 등록합니다. development에는 개발 URL, preview·production에는 운영 URL을 넣습니다.
6. 원격 빌드 번호를 초기화합니다(`pnpm exec eas build:version:set`). 새 앱은 첫 빌드가 1이 되게 넣습니다.
7. 첫 Android 릴리즈만 `pnpm release android --build-only`로 빌드하고, AAB를 Play Console에 직접 업로드합니다.
8. 스플래시·아이콘 이미지를 브랜드 이미지로 교체합니다.
9. (`--tablet`인 경우) iPad 스크린샷을 준비하고 iPad 폭에서 웹 화면을 확인합니다.

## SDK 갱신 절차

템플릿은 `scripts/create-company-mobile.mjs`의 `VERIFIED_EXPO_SDK` 하나에 고정돼 있습니다. 더 새 SDK가 나오면 CLI는 알림만 출력하고 고정된 SDK로 생성합니다. 템플릿을 새 SDK로 올리려면 다음 순서를 따릅니다.

1. `VERIFIED_EXPO_SDK`를 새 major로 바꿉니다.
2. 샘플 프로젝트를 생성합니다. 이때 검증 4종(`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:scripts`)이 함께 실행됩니다.
3. 코어 API를 새 SDK 문서(`https://docs.expo.dev/versions/v<major>.0.0/`)로 다시 확인합니다. 대상은 expo-splash-screen, expo-web-browser, react-native-webview의 새 창·메시지 이벤트, app config 로더입니다.
4. 설치가 `ERR_PNPM_IGNORED_BUILDS`로 멈추면 CLI의 `DISALLOWED_BUILDS`를 갱신합니다.
5. 템플릿을 고칠 때는 샘플에 `--templates-only`로 다시 적용하며 확인합니다.
6. `node --test tests/create-company-mobile.test.mjs`, `node --test "templates/create-company-mobile/scripts/__tests__/*.test.js"`, `bash tests/install-create-company-mobile.test.sh`를 통과시킵니다.
