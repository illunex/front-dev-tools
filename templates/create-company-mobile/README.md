# __CCM_APP_NAME__

회사 표준 Expo 웹뷰 앱입니다(`create-company-mobile`로 생성).

## 개발 환경

- Node 22 이상, pnpm
- `expo-dev-client` 기반이라 Expo Go가 아니라 **개발 빌드**로 실행합니다. HTTP 예외·스플래시·scheme 같은 네이티브 설정은 개발 빌드에서만 실제와 같게 확인할 수 있습니다.

```bash
pnpm install
pnpm ios       # iOS 시뮬레이터에 개발 빌드 설치·실행(Xcode 필요)
pnpm android   # Android 에뮬레이터·기기에 개발 빌드 설치·실행
pnpm start     # 개발 빌드가 이미 설치돼 있으면 개발 서버만 실행
```

로컬에서 사용할 웹 URL은 `.env.development`(개발)와 `.env.production`(운영)에 있습니다. 파일이 없으면 `.env.example`을 복사하거나 `pnpm exec eas env:pull`로 받으세요. 두 파일은 커밋하지 않습니다.

## 규칙·릴리즈

폴더 구조(FSD), 코드 규칙, 릴리즈 절차는 [AGENTS.md](./AGENTS.md)에 있습니다.
