---
name: sync-env
description: GitHub Actions environment variables를 로컬 .env 파일로 동기화합니다. 사용자가 "env 싱크", "환경변수 가져와", "sync env", ".env.development 받아와", "프로덕션 변수 동기화", "GitHub Actions 변수 받아줘" 같은 요청을 했을 때 사용합니다. sync-env CLI를 호출하며 gh 인증과 GitHub Actions environment 접근 권한이 필요합니다.
---

# sync-env

GitHub Actions environment variables를 로컬 `.env` 파일로 동기화합니다.

## When to Use

다음과 같은 요청이 왔을 때 이 skill을 사용합니다:

- "env 싱크해줘" / "환경변수 동기화해줘"
- "프로덕션 변수 받아줘" / ".env.production 갱신해줘"
- "sync env" / "sync env for production"
- "GitHub Actions 변수 가져와"
- "development 환경 변수 로컬에 받아줘"

## Prerequisites

1. **GitHub CLI(`gh`) 설치** — `brew install gh` 또는 [cli.github.com](https://cli.github.com)
2. **gh 인증** — `gh auth login` 완료
3. **GitHub Actions environment 접근 권한** — 대상 repo의 environment 변수를 읽을 수 있는 권한

## Step 1: sync-env CLI 설치 확인

```bash
command -v sync-env
```

CLI가 없으면 **사용자에게 다음 설치 명령을 제안하고 동의를 받은 뒤 실행**합니다:

```bash
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-sync-env.sh | bash
```

설치 경로는 기본적으로 `~/.local/bin/sync-env`입니다. 설치 후 `~/.local/bin`이 `PATH`에 없다면 셸 프로필에 아래 줄을 추가해야 합니다:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

## Step 2: 인자 추론

사용자 요청에서 다음 인자를 추론합니다:

| 인자       | 추론 방법                                                       | 기본값                                                             |
| ---------- | --------------------------------------------------------------- | ------------------------------------------------------------------ |
| `--env`    | 발화에서 환경 이름 추출 (development / staging / production 등) | `development`                                                      |
| `--output` | 사용자가 명시한 경우에만 지정                                   | 생략 → CLI가 `.env.<env>`로 자동 결정                              |
| `--repo`   | 사용자가 명시한 경우에만 지정                                   | 생략 → CLI가 `git remote origin`에서 추론 (HTTPS / SSH 둘 다 지원) |

`--env`가 불분명한 경우 사용자에게 확인합니다.

## Step 3: 실행

```bash
# development → .env.development (기본)
sync-env --env developmet --output .env.development

# production → .env.production
sync-env --env production

# staging + 명시적 출력 경로
sync-env --env staging --output .env.local

# repo 직접 지정
sync-env --repo your-org/your-repo --env production
```

## Failure Handling

CLI가 출력하는 오류별 안내:

| 오류 메시지                                         | 조치                                                                        |
| --------------------------------------------------- | --------------------------------------------------------------------------- |
| `GitHub CLI (gh) is required`                       | `brew install gh` 실행 후 재시도                                            |
| `GitHub CLI is not authenticated`                   | `gh auth login` 실행 후 재시도                                              |
| `No GitHub Actions variables found`                 | environment 이름이 정확한지, 해당 environment에 변수가 등록되어 있는지 확인 |
| `Failed to infer repository from git remote origin` | `--repo <owner/repo>` 옵션을 명시적으로 지정                                |

## Notes

- 출력 파일은 자동으로 `chmod 600`으로 설정됩니다 (CLI가 처리).
- `gh variable list`는 GitHub Actions **Variables**만 가져옵니다. **Secrets**는 API로 값을 노출하지 않으므로 동기화 불가합니다.
