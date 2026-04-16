# front-dev-tools

프론트엔드 개발에 자주 쓰는 보조 스크립트와 설치 가이드를 모아둔 저장소입니다.

## Docs

- [sync-env 설치 가이드](./docs/sync-env.md)

## Tools

### `sync-env`

GitHub Actions environment variables를 로컬 `.env` 파일로 동기화하는 스크립트입니다.

설치:

```bash
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-sync-env.sh | bash
```

- 스크립트: [`scripts/sync-env.sh`](./scripts/sync-env.sh)
- 설치 스크립트: [`install/install-sync-env.sh`](./install/install-sync-env.sh)
- 문서: [`docs/sync-env.md`](./docs/sync-env.md)

## Repository Structure

```text
.
├── docs/
│   └── sync-env.md
├── install/
│   └── install-sync-env.sh
└── scripts/
    └── sync-env.sh
```
