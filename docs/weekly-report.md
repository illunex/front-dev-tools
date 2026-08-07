# weekly-report 설치 가이드

GitHub 커밋 내역과 최근 merge된 내 PR의 포함 커밋을 주간보고 포맷으로 자동 정리하는 CLI입니다.

## 설치

```bash
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-weekly-report.sh | bash
```

AI 스킬만 선택 설치:

```bash
# Claude Code만
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-weekly-report.sh | bash -s -- --claude

# Cursor만
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-weekly-report.sh | bash -s -- --cursor

# Codex만
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-weekly-report.sh | bash -s -- --codex
```

## 사전 요구사항

- **Bash 실행 환경**
  - macOS/Linux: 기본 터미널 또는 Bash
  - Windows: Git Bash 또는 WSL 권장
- **gh CLI**: 설치 후 `gh auth login` 완료
  - macOS: `brew install gh`
  - Windows: `winget install GitHub.cli` 또는 [cli.github.com](https://cli.github.com)
- **jq**
  - macOS: `brew install jq`
  - Windows: `winget install jqlang.jq` 또는 [jq 다운로드](https://jqlang.github.io/jq/download/)

> Windows에서는 PowerShell 단독 실행이 아니라 Git Bash/WSL처럼 Bash 스크립트를 실행할 수 있는 환경에서 사용하세요.

## 사용법

```bash
# 이번 주 (기본)
weekly-report

# 지난주
weekly-report --week 1

# 특정 날짜 범위
weekly-report --from 2026-04-13 --to 2026-04-19

# 다른 사용자
weekly-report --author octocat

# 날짜 범위 확인만 (실제 API 호출 없음)
weekly-report --dry-run
```

전주에 작성한 차주 계획을 함께 제공하면 해당 계획의 모든 항목을 금주 보고의 기준 목록으로 사용하고 금주 커밋·PR을 연결해 진행률을 갱신합니다. 금주 커밋이 없는 계획 항목도 누락하지 않습니다. 이월 항목이 `100%`가 되면 `~M/D`는 전주 예상 종료일이 아니라 마지막 관련 직접 커밋일 또는 PR 병합일을 실제 완료일로 표시합니다. 미완료 이월 항목은 기존 예상 종료일을 유지하고, 계획에 없던 신규 작업은 마지막 작업일을 표시합니다. 저장소별로 `100%` 완료 항목을 먼저 배치하고 `100%` 미만 항목은 맨 아래로 이동합니다. 완료·미완료 그룹 내부는 각각 `~M/D` 날짜 오름차순으로 정렬하며, 날짜가 같으면 전주 계획 순서와 신규 작업 수집 순서를 유지합니다.

## 출력 예시

```
[illunex/my-project]
- feat: 사용자 인증 기능 추가 ~4/21 100%
- fix: 로그인 버그 수정 ~4/22 100%

[illunex/design-system]
- chore: 버튼 컴포넌트 리팩터 ~4/23 100%
```

완료 근거가 부족하거나 진행 중인 항목은 AI가 완성도를 추정해 10% 단위의 `100%` 미만 진행률로 표시하며, 미착수 항목은 `0%`로 표시합니다. 전주 계획 항목은 전주 진행률에서 시작해 금주 근거로 확인된 변화만 반영합니다. 스킬 실행일이 기존 예상 종료일보다 앞이면 진행률이 낮거나 `0%`여도 기존 종료일을 유지하고 새 종료일·미착수 사유·변동 사유를 모두 묻지 않습니다. 실행일이 예상 종료일과 같거나 지난 항목에만 새 예상 종료일을 요청하고 미착수 사유와 진행률 정체·감소 사유 조건을 적용합니다. 입력한 사유는 `결제 내역 화면 개발(API 대기중)`처럼 항목명 뒤 괄호에 반영합니다. 질문은 Claude Code·Cursor·Codex에서 동일하게 사용할 수 있는 번호형 일반 텍스트 형식을 사용합니다.

## 옵션

| 옵션 | 설명 | 기본값 |
| --- | --- | --- |
| `-w, --week <n>` | N주 전 (0=이번주, 1=지난주) | `0` |
| `--from <YYYY-MM-DD>` | 시작일 (포함) | ISO week 월요일 |
| `--to <YYYY-MM-DD>` | 종료일 (포함) | ISO week 일요일 |
| `--author <login>` | 대상 GitHub 로그인 | 인증된 사용자 |
| `-L, --limit <n>` | 직접 커밋과 merge된 PR 조회별 최대 결과 수 | `200` |
| `--dry-run` | 날짜 범위와 실행 명령만 출력 | - |

## 동작 방식

- `gh search commits --author=<login> --committer-date=<from>..<to>` 로 직접 커밋 조회
- `gh search prs --author=<login> --merged --merged-at=<from>..<to>` 로 기간 내 merge된 내 PR 조회
- PR별 `gh pr view --json commits,mergedAt` 결과에서 포함 커밋을 추가 반영
- merge 커밋(parent 2개 이상) 및 `Merge `·`Revert ` 로 시작하는 커밋 자동 제외
- 같은 레포·같은 subject의 커밋은 중복 제거
- 직접 커밋은 커밋 날짜, PR 포함 커밋은 PR merge 날짜로 표시
- 레포별로 그룹화, 날짜 오름차순 정렬
