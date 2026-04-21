# weekly-report 설치 가이드

GitHub 커밋 내역을 주간보고 포맷으로 자동 정리하는 CLI입니다.

## 설치

```bash
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-weekly-report.sh | bash
```

AI 스킬만 선택 설치:

```bash
# Claude Code만
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-weekly-report.sh | bash -s -- --claude

# Codex만
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-weekly-report.sh | bash -s -- --codex
```

## 사전 요구사항

- **gh CLI**: `brew install gh` 후 `gh auth login` 완료
- **jq**: `brew install jq`

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

## 출력 예시

```
[illunex/my-project]
- feat: 사용자 인증 기능 추가 ~4/21 100%
- fix: 로그인 버그 수정 ~4/22 100%

[illunex/design-system]
- chore: 버튼 컴포넌트 리팩터 ~4/23 100%
```

## 옵션

| 옵션 | 설명 | 기본값 |
| --- | --- | --- |
| `-w, --week <n>` | N주 전 (0=이번주, 1=지난주) | `0` |
| `--from <YYYY-MM-DD>` | 시작일 (포함) | ISO week 월요일 |
| `--to <YYYY-MM-DD>` | 종료일 (포함) | ISO week 일요일 |
| `--author <login>` | 대상 GitHub 로그인 | 인증된 사용자 |
| `-L, --limit <n>` | 최대 결과 수 | `200` |
| `--dry-run` | 날짜 범위와 실행 명령만 출력 | - |

## 동작 방식

- `gh search commits --author=<login> --committer-date=<from>..<to>` 로 커밋 조회
- merge 커밋(parent 2개 이상) 및 `Merge `·`Revert ` 로 시작하는 커밋 자동 제외
- 같은 레포·같은 subject의 커밋은 중복 제거
- 레포별로 그룹화, 커밋 날짜 오름차순 정렬
