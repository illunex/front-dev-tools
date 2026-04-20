# front-dev-tools

프론트엔드 개발에 자주 쓰는 보조 스크립트와 설치 가이드를 모아둔 저장소입니다.

## Docs

- [sync-env 설치 가이드](./docs/sync-env.md)
- [conventions 설치 가이드](./docs/conventions.md)

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

### `conventions`

Claude Code · Codex · Cursor에 회사 공통 개발 컨벤션을 설치합니다.

설치:

```bash
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-conventions.sh | bash
```

- 템플릿: [`conventions/`](./conventions/)
- 설치 스크립트: [`install/install-conventions.sh`](./install/install-conventions.sh)
- 문서: [`docs/conventions.md`](./docs/conventions.md)

## Skills

Claude Code에서 바로 사용할 수 있는 skill이 포함되어 있습니다.

- [`skills/sync-env`](./skills/sync-env/SKILL.md) — GitHub Actions 환경변수를 로컬 `.env` 파일로 동기화

## Repository Structure

```text
.
├── conventions/
│   ├── claude/
│   │   └── CLAUDE.md
│   ├── codex/
│   │   └── AGENTS.md
│   ├── cursor/
│   │   └── company.mdc
│   └── shared/
│       └── conventions.md
├── docs/
│   ├── conventions.md
│   └── sync-env.md
├── install/
│   ├── install-conventions.sh
│   └── install-sync-env.sh
├── scripts/
│   └── sync-env.sh
└── skills/
    └── sync-env/
        └── SKILL.md
```
