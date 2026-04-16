# sync-env

GitHub Actions environment variables를 로컬 `.env` 파일로 동기화합니다.

## 설치

```bash
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-sync-env.sh | bash
```

기본 설치 경로는 `~/.local/bin/sync-env`입니다.

## 사용법

```bash
sync-env --repo owner/repo
```

자주 쓰는 예시:

```bash
sync-env --repo owner/repo --env development
sync-env --repo owner/repo --env production --output .env.production
```

`--repo`를 생략하면 현재 git remote `origin`에서 저장소를 추론합니다.
