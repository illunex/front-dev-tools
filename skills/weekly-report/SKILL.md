---
name: weekly-report
description: Use when the user asks to summarize weekly work, generate a weekly report, or organize commits. Korean triggers: "주간보고 정리해줘", "이번주 커밋 정리해줘", "주간 작업 내역 뽑아줘", "weekly report", "지난주 작업 정리", "이번주 뭐 했는지".
---

# weekly-report

이번 주(또는 특정 주)에 GitHub에 커밋한 내역을 주간보고 포맷으로 정리합니다.

## 사용 시점

다음과 같은 요청이 왔을 때 이 skill을 사용합니다:

- "주간보고 정리해줘" / "주간 작업 내역 뽑아줘"
- "이번주 커밋 정리해줘" / "이번주에 뭐 했는지 보여줘"
- "지난주 작업 내역" / "저번주 커밋 요약"
- "weekly report" / "weekly summary"

## 출력 포맷

```
[owner/repo]
- 커밋 subject ~M/D 100%
- 커밋 subject ~M/D 100%

[owner/repo2]
- 커밋 subject ~M/D 100%
```

- 기간 기본값: 요청 시점을 포함하는 ISO 주(월~일)
- `100%`는 항상 리터럴 고정
- merge / revert 커밋은 자동 제외
- 같은 repo 내 동일 subject는 중복 제거

## Prerequisites

1. **Bash 실행 환경** — macOS/Linux 터미널 또는 Windows Git Bash/WSL
2. **GitHub CLI(`gh`) 설치** — macOS는 `brew install gh`, Windows는 `winget install GitHub.cli` 또는 [cli.github.com](https://cli.github.com)
3. **gh 인증** — `gh auth login` 완료
4. **jq 설치** — macOS는 `brew install jq`, Windows는 `winget install jqlang.jq` 또는 [jq 다운로드](https://jqlang.github.io/jq/download/)

## Step 1: weekly-report CLI 설치 확인

```bash
command -v weekly-report
```

CLI가 없으면 **사용자에게 다음 설치 명령을 제안하고 동의를 받은 뒤 실행**합니다:

```bash
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-weekly-report.sh | bash
```

설치 경로는 기본적으로 `~/.local/bin/weekly-report`입니다. 설치 후 `~/.local/bin`이 `PATH`에 없다면 셸 프로필에 아래 줄을 추가해야 합니다:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

## Step 2: 인자 추론

사용자 요청에서 다음 인자를 추론합니다:

| 인자 | 추론 방법 | 기본값 |
| --- | --- | --- |
| `--week <n>` | "지난주" → `1`, "이번주" → `0` | `0` |
| `--from`, `--to` | 특정 날짜를 명시한 경우 사용 | 자동 계산(ISO week) |
| `--author <login>` | 다른 사람의 내역 요청 시 지정 | 인증된 사용자 |
| `--limit <n>` | 커밋이 많을 것으로 예상될 때 조정 | `200` |

## Step 3: 실행

```bash
# 이번 주 (기본)
weekly-report

# 지난주
weekly-report --week 1

# 특정 날짜 범위
weekly-report --from 2026-04-13 --to 2026-04-19

# 다른 사용자
weekly-report --author octocat
```

## Step 4: 주간보고용 문장으로 재구성

CLI 출력을 그대로 사용자에게 보여주지 말고, **각 항목을 주간보고용 한국어 문장으로 재작성**한 뒤 출력합니다.

재작성 규칙:

- `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:` 등 conventional commit 접두사 제거
- 개발자 은어·내부 변수명은 업무 용어로 변환 (예: "null check 추가" → "안정성 개선")
- 한 레포 안에서 같은 기능에 속하는 커밋 여러 개는 하나의 항목으로 묶어 표현
- 문체: **명사형 완료** (예: "~기능 개발", "~버그 수정", "~개선")
- 날짜는 가장 마지막 관련 커밋 날짜 사용, `100%` 고정 유지

재구성 예시:

```
원본:
[illunex/my-project]
- feat: 사용자 인증 기능 추가 ~4/21 100%
- fix: 로그인 시 null 포인터 예외 처리 ~4/22 100%
- fix: 토큰 만료 후 리다이렉트 누락 수정 ~4/22 100%

재구성:
[illunex/my-project]
- 사용자 인증 기능 개발 ~4/21 100%
- 로그인 안정성 개선 ~4/22 100%
```

레포 이름(`[owner/repo]`)과 날짜·`100%` 포맷은 그대로 유지합니다.

## Failure Handling

| 오류 메시지 | 조치 |
| --- | --- |
| `GitHub CLI (gh) is required` | macOS는 `brew install gh`, Windows는 `winget install GitHub.cli` 또는 공식 설치 파일로 설치 후 재시도 |
| `jq is required` | macOS는 `brew install jq`, Windows는 `winget install jqlang.jq` 또는 공식 설치 파일로 설치 후 재시도 |
| `GitHub CLI is not authenticated` | `gh auth login` 실행 후 재시도 |
| `해당 기간 커밋 없음` | 날짜 범위 확인. `--week 1`로 지난주 시도 |
| `[경고] 결과가 N건 상한에 도달했습니다` | `--limit` 값을 올리거나 `--from`/`--to`로 범위를 좁힘 |
