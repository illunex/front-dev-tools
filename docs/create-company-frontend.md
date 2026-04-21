# create-company-frontend 설치 가이드

`create-company-frontend`는 공식 generator를 먼저 실행한 뒤 회사 표준 폴더 구조와 기본 프론트엔드 설정을 적용하는 보일러플레이트 생성 CLI입니다.

## 설치

```bash
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-create-company-frontend.sh | bash
```

기본 설치 결과:

- CLI: `~/.local/bin/create-company-frontend`
- Claude Code skill: `~/.claude/skills/create-company-frontend/SKILL.md`
- Codex skill: `~/.codex/skills/create-company-frontend/SKILL.md`

Codex skill만 설치:

```bash
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-create-company-frontend.sh | bash -s -- --codex
```

Claude Code skill만 설치:

```bash
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-create-company-frontend.sh | bash -s -- --claude
```

CLI만 설치:

```bash
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-create-company-frontend.sh | bash -s -- --no-skills
```

## 사용

Next.js App Router 프로젝트:

```bash
create-company-frontend --framework next --name my-app
```

React/Vite 프로젝트:

```bash
create-company-frontend --framework react --name my-app
```

부모 디렉터리 지정:

```bash
create-company-frontend --framework next --name my-app --directory ./apps
```

## 생성 방식

- Next.js: `pnpm dlx create-next-app@latest`
- React/Vite: `pnpm create vite@latest`
- 패키지 매니저: `pnpm`
- 생성 후 회사 표준 폴더 구조와 기본 Provider/API 파일을 적용합니다.

## 주요 옵션

| 옵션 | 설명 |
| --- | --- |
| `--framework next` | Next.js App Router 프로젝트 생성 |
| `--framework react` | React/Vite 프로젝트 생성 |
| `--name <project>` | 프로젝트 디렉터리명 |
| `--directory <path>` | 프로젝트를 생성할 부모 디렉터리 |
| `--skip-install` | 회사 표준 의존성 추가 생략 |
| `--skip-verify` | `pnpm lint`, `pnpm build` 검증 생략 |
