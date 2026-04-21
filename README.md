# front-dev-tools

프론트엔드 개발에 자주 쓰는 보조 스크립트와 설치 가이드를 모아둔 저장소입니다.

## Docs

- [sync-env 설치 가이드](./docs/sync-env.md)
- [conventions 설치 가이드](./docs/conventions.md)
- [create-company-frontend 설치 가이드](./docs/create-company-frontend.md)
- [weekly-report 설치 가이드](./docs/weekly-report.md)

## Tools

---

### `sync-env`

GitHub Actions environment variables를 로컬 `.env` 파일로 동기화하는 스크립트입니다.

```bash
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-sync-env.sh | bash
```

[`scripts/sync-env.sh`](./scripts/sync-env.sh) · [`install/install-sync-env.sh`](./install/install-sync-env.sh) · [`docs/sync-env.md`](./docs/sync-env.md)

---

### `create-company-frontend`

공식 generator 기반으로 회사 표준 React/Vite 또는 Next.js 보일러플레이트를 생성하는 CLI입니다.

```bash
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-create-company-frontend.sh | bash
```

[`scripts/create-company-frontend.mjs`](./scripts/create-company-frontend.mjs) · [`install/install-create-company-frontend.sh`](./install/install-create-company-frontend.sh) · [`skills/create-company-frontend`](./skills/create-company-frontend/SKILL.md) · [`docs/create-company-frontend.md`](./docs/create-company-frontend.md)

---

### `weekly-report`

이번 주(또는 특정 주) GitHub 커밋 내역을 주간보고 포맷으로 정리하는 CLI입니다.

```bash
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-weekly-report.sh | bash
```

[`scripts/weekly-report.sh`](./scripts/weekly-report.sh) · [`install/install-weekly-report.sh`](./install/install-weekly-report.sh) · [`skills/weekly-report`](./skills/weekly-report/SKILL.md) · [`docs/weekly-report.md`](./docs/weekly-report.md)

---

### `conventions`

Claude Code · Codex · Cursor에 회사 공통 개발 컨벤션을 설치합니다.

```bash
# 전체 설치
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-conventions.sh | bash -s -- --force

# claude만 설치
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-conventions.sh | bash -s -- --claude --force

# codex만 설치
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-conventions.sh | bash -s -- --codex --force

# cursor만 설치
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-conventions.sh | bash -s -- --cursor --force
```

[`conventions/`](./conventions/) · [`install/install-conventions.sh`](./install/install-conventions.sh) · [`docs/conventions.md`](./docs/conventions.md)

## Skills

AI 개발 도구에서 바로 사용할 수 있는 skill이 포함되어 있습니다.

- [`skills/sync-env`](./skills/sync-env/SKILL.md) — GitHub Actions 환경변수를 로컬 `.env` 파일로 동기화
- [`skills/create-company-frontend`](./skills/create-company-frontend/SKILL.md) — 공식 generator 기반 회사 표준 React/Next 보일러플레이트 생성
- [`skills/weekly-report`](./skills/weekly-report/SKILL.md) — GitHub 커밋 내역을 주간보고 포맷으로 정리

## Repository Structure

```text
.
├── conventions/
│   ├── claude/
│   │   ├── CLAUDE.md
│   │   └── skills/
│   │       ├── company-branch/
│   │       │   └── SKILL.md
│   │       ├── company-commit/
│   │       │   └── SKILL.md
│   │       ├── company-folder-structure/
│   │       │   └── SKILL.md
│   │       └── company-pr/
│   │           └── SKILL.md
│   ├── codex/
│   │   ├── AGENTS.md
│   │   └── skills/
│   │       ├── company-branch/
│   │       │   └── SKILL.md
│   │       ├── company-commit/
│   │       │   └── SKILL.md
│   │       ├── company-folder-structure/
│   │       │   └── SKILL.md
│   │       └── company-pr/
│   │           └── SKILL.md
│   ├── cursor/
│   │   └── company.mdc
│   └── shared/
│       ├── conventions.md
│       └── structure.md
├── docs/
│   ├── create-company-frontend.md
│   ├── conventions.md
│   ├── sync-env.md
│   └── weekly-report.md
├── install/
│   ├── install-create-company-frontend.sh
│   ├── install-conventions.sh
│   ├── install-sync-env.sh
│   └── install-weekly-report.sh
├── scripts/
│   ├── create-company-frontend.mjs
│   ├── sync-env.sh
│   └── weekly-report.sh
└── skills/
    ├── create-company-frontend/
    │   └── SKILL.md
    ├── sync-env/
    │   └── SKILL.md
    └── weekly-report/
        └── SKILL.md
```
