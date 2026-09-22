# weekly-report 설치 가이드

GitHub 커밋 내역과 최근 merge된 내 PR의 포함 커밋을 수집해, **프로젝트 → 큰 업무 → 중간 업무 → 상세 업무** 3단계 주간보고로 정리하는 CLI + AI 스킬입니다.

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

# 변경 파일 조회 생략 (빠르지만 분류 정확도가 떨어짐)
weekly-report --no-files

# 날짜 범위 확인만 (실제 API 호출 없음)
weekly-report --dry-run
```

## CLI 출력: 수집 결과

CLI는 최종 보고서가 아니라 **수집 결과**를 출력합니다. AI 스킬이 이 결과를 계층형 주간보고로 재구성합니다.

```
# weekly-report 수집 결과 (2026-09-14 ~ 2026-09-20 / octocat)

[Stock Link] (illunex/stock-link-mobile)
- feat: 종목 상세 차트 영역 퍼블리싱 ~9/10
  영역: stock/detail
  신호: 퍼블리싱
  파일: src/pages/stock/detail/Chart.module.scss, src/pages/stock/detail/Chart.tsx
```

| 줄 | 의미 |
| --- | --- |
| `[타이틀] (owner/repo)` | HTML head 타이틀과 원본 레포. 타이틀이 프로젝트명이 됨 |
| `- subject ~M/D` | 커밋 subject와 작업일(직접 커밋은 커밋일, PR 포함 커밋은 merge일) |
| `영역:` | 라우트·feature 경로에서 뽑은 화면 영역. 중간 업무 묶음 단위 |
| `신호:` | 변경 경로에서 뽑은 작업 성격. 큰 업무 분류 근거 |
| `파일:` | 변경 파일 경로. 상세 업무 판단 근거 |

### 프로젝트명 조회 순서

레포 이름이 아니라 HTML head 타이틀을 프로젝트명으로 씁니다.

1. `index.html` → `public/index.html` → `src/index.html`의 `<title>`
2. `src/app/layout.tsx` 등 Next.js 메타데이터의 `title`
3. `package.json`의 `name`
4. 위 조회가 모두 실패하면 레포 이름

조회 결과는 `~/.cache/weekly-report/project-titles.tsv`에 캐시됩니다. 타이틀이 바뀌었으면 `--refresh-titles`로 재조회하세요.

## 최종 주간보고 포맷

AI 스킬이 수집 결과를 아래 형태로 재구성합니다. 진행률은 **세 단계 모든 줄에**, 날짜는 **큰 업무 줄에만** 붙습니다.

```
[Stock Link]
- 퍼블리싱 ~9/9 100%
  ◦ 종목 상세 페이지 100%
    : 차트 영역 마크업 및 스타일 적용 100%
    : 반응형 레이아웃 대응 100%
- API 연결 ~9/10 50%
  ◦ 종목 상세 페이지 50%
    : 시세 조회 연동 및 응답 처리 100%
    : 로딩·에러 상태 처리 0%
```

- 진행률은 상세 → 중간 → 큰 순서로 올라가며, 상위 값은 하위 평균의 **10% 단위 내림**입니다.
- `100%`는 보수적으로 줍니다. 반복 수정이 이어졌거나, 타 레포 반영·검증이 남았거나, 완료 범위를 단정할 수 없으면 `90%` 이하로 잡습니다.
- 문구·라벨 수정, 오타 교정, 포맷팅 같은 사소한 변경은 업무 범위에 넣지 않습니다.
- `100%` 미만인 상세·중간 업무의 남은 범위는 `[차주 주간보고]` 항목으로 내려갑니다.
- 보고 뒤에 `[연계 항목]`(레포를 넘나드는 연결·선행 관계)과 `[이슈사항]`(반복 수정, 운영 장애, 취약점, 대기 요인)이 붙습니다.

큰 업무는 아래 **고정 어휘 7종**만 사용합니다. 같은 프로젝트를 여러 명이 각자 작성해도 표기가 충돌하지 않도록, 새 어휘를 만들지 않고 가장 가까운 항목으로 흡수합니다.

`퍼블리싱` · `API 연결` · `기능개발` · `버그 수정` · `리팩토링/구조 개선` · `배포/환경 설정` · `변경 반영`

`API 연결`은 **신규 연동**(새 엔드포인트를 처음 연결하는 작업)일 때만 씁니다. 이미 연결된 API의 응답 예외 처리·요청 파라미터 정리·로딩/에러 상태 보강처럼 기존 연동에 딸린 작업은 `기능개발`로 합치고, 상세 업무를 `OO API 연결 및 OO 기능 구현`처럼 한 문장으로 표현합니다.

중간 업무는 `<화면 타이틀> 페이지` 형식이며, 묶음 단위는 CLI가 계산한 `영역:` 값입니다. 상세 업무는 커밋 한 줄을 그대로 옮기지 않고 같은 성격의 커밋을 묶어 중간 단위 작업으로 적습니다.

## 여러 사람의 완료 목록을 직접 받은 경우

팀 전체를 취합할 때는 CLI 대신, 각자 이미 날짜·진행률까지 정리한 평면 목록을 붙여넣기도 합니다.

```text
이름
[프로젝트명]
- 항목 설명 ~M/D nn%

다른 이름
[프로젝트명]
- 항목 설명 ~M/D nn%
```

이 경우 CLI 실행·수집 단계를 건너뛰고 붙여넣은 텍스트를 그대로 수집 결과로 취급합니다.

- 날짜·진행률은 사용자가 이미 확정한 값을 그대로 씁니다. 완료로 명시된 항목을 임의로 낮추지 않습니다.
- 큰 업무 분류는 CLI `신호:` 대신 항목 문구 자체의 키워드로 판단합니다.
- 같은 프로젝트를 여러 사람이 각자 적어도 **사람별로 별도 행·블록을 유지**합니다. 표로 출력할 때 이 구분이 그대로 "담당자" 열이 됩니다.

## HTML 표 산출물

팀 취합본을 사내 페이지에 올릴 때는 텍스트 대신 HTML 표로 만듭니다. 템플릿은 `skills/weekly-report/assets/report-table-template.html`이며, `PERIOD`·`<h1>`·`DATA`·`PROJECT_ORDER`와 하단 노트만 바꿔 씁니다.

- 열 구성은 `프로젝트명 · 담당자 · 금주 업무 · 차주 업무 · 이슈사항`이고, **행 병합은 프로젝트명 기준**입니다. 한 프로젝트를 여러 명이 맡으면 담당자 행이 그 안에 쌓입니다.
- 이슈사항 열은 계층 없이 문장 불릿으로만 적습니다. 운영 장애·반복 수정·보안 경고·임시 대응·외부 대기 요인 등 Step 12 기준에 해당하는 것만 넣고, 금주·차주 업무 내용을 그대로 되풀이하지 않습니다. 없으면 `확인된 이슈 없음`.
- 진행률 강조는 계층이 깊어질수록 약해집니다. 대분류는 **뱃지**, 중분류는 **굵은 글씨**, 소분류는 일반 글씨입니다. 색(완료 초록 / 미완료 주황)은 세 단계 모두 같습니다.
- 날짜는 `~9/18`(완료일·예상 종료일), `상시 진행`(프로젝트 종료까지 이어지는 업무), `종료일 미정`(사용자가 미정이라고 확인한 항목) 세 가지로 표기합니다.
- `<table>` 안쪽은 전부 **인라인 스타일**이라 표만 복사해 다른 도메인에 붙여도 그대로 보입니다. 가상요소를 쓰지 않으므로 `◦`·`:` 마커도 함께 복사됩니다.
- 인라인 스타일에는 `font-family`를 넣지 않습니다. 따옴표가 든 폰트명이 `style=""` 속성의 큰따옴표와 충돌해 그 뒤 스타일이 전부 깨지기 때문입니다.
- 표 아래에 `일정 미확정 항목` · `미완료 판단 근거` · `표기 정리 기준` 세 노트를 붙입니다.

## 전주 계획 연계

전주에 작성한 차주 계획을 함께 제공하면 해당 계획의 모든 항목을 금주 보고의 기준 목록으로 사용하고 금주 커밋·PR을 연결해 진행률을 갱신합니다. 금주 커밋이 없는 계획 항목도 누락하지 않습니다.

- 전주 계획이 구 포맷(`- 업무명 ~M/D nn%`)이면 업무명을 가장 가까운 큰 업무에 배정하고, 원래 업무명은 중간·상세 업무로 내립니다.
- 이월 항목이 `100%`가 되면 `~M/D`는 전주 예상 종료일이 아니라 마지막 관련 커밋일 또는 PR 병합일을 실제 완료일로 표시합니다.
- 미완료 이월 항목은 기존 예상 종료일을 유지하고, 계획에 없던 신규 작업은 마지막 작업일을 표시합니다.
- 프로젝트별로 `100%` 완료 항목을 먼저 배치하고 `100%` 미만 항목은 맨 아래로 이동합니다. 그룹 내부는 `~M/D` 오름차순, 날짜가 같으면 고정 어휘 순서를 따릅니다.

완료 근거가 부족하거나 진행 중인 항목은 AI가 완성도를 추정해 10% 단위의 `100%` 미만 진행률로 표시하며, 미착수 항목은 `0%`로 표시합니다. 스킬 실행일이 기존 예상 종료일보다 앞이면 진행률이 낮거나 `0%`여도 기존 종료일을 유지하고 새 종료일·미착수 사유·변동 사유를 모두 묻지 않습니다. 실행일이 예상 종료일과 같거나 지난 항목에만 새 예상 종료일을 요청하고 미착수 사유와 진행률 정체·감소 사유 조건을 적용합니다. 입력한 사유는 `기능개발(API 대기중)`처럼 항목명 뒤 괄호에 반영합니다. 질문은 Claude Code·Cursor·Codex에서 동일하게 사용할 수 있는 번호형 일반 텍스트 형식을 사용합니다.

## 옵션

| 옵션 | 설명 | 기본값 |
| --- | --- | --- |
| `-w, --week <n>` | N주 전 (0=이번주, 1=지난주) | `0` |
| `--from <YYYY-MM-DD>` | 시작일 (포함) | ISO week 월요일 |
| `--to <YYYY-MM-DD>` | 종료일 (포함) | ISO week 일요일 |
| `--author <login>` | 대상 GitHub 로그인 | 인증된 사용자 |
| `-L, --limit <n>` | 직접 커밋과 merge된 PR 조회별 최대 결과 수 | `200` |
| `--no-files` | 커밋별 변경 파일 조회 생략 | 조회함 |
| `--files-cap <n>` | 항목당 출력할 파일 경로 최대 개수. 초과하면 경로를 디렉터리로 접음 | `8` |
| `--refresh-titles` | 캐시된 프로젝트 타이틀을 무시하고 재조회 | - |
| `--dry-run` | 날짜 범위와 실행 명령만 출력 | - |

## 동작 방식

- `gh search commits --author=<login> --committer-date=<from>..<to>` 로 직접 커밋 조회
- `gh search prs --author=<login> --merged --merged-at=<from>..<to>` 로 기간 내 merge된 내 PR 조회
- PR별 `gh pr view --json commits,mergedAt` 결과에서 포함 커밋을 추가 반영
- 레포별로 `gh api repos/<repo>/contents/...` 로 HTML head 타이틀 조회 후 캐시
- 커밋별로 `gh api repos/<repo>/commits/<sha>` 로 변경 파일 조회 (`--no-files`로 생략 가능, 커밋 1건당 API 1회). 파일이 상한을 넘으면 디렉터리로 접어 출력
- merge 커밋(parent 2개 이상) 및 `Merge `·`Revert ` 로 시작하는 커밋 자동 제외
- 같은 레포·같은 subject의 커밋은 중복 제거하고 변경 파일은 합침
- 프로젝트 타이틀 오름차순으로 그룹화, 그룹 내부는 날짜 오름차순 정렬

### 조회 범위 한계

`gh search commits`/`gh search prs`는 로컬 git이 아니라 **GitHub 원격 서버**를 대상으로 검색하므로, push하지 않은 로컬 커밋은 절대 집계되지 않습니다. 여기에 더해 두 조회 방식 각각의 범위 제한이 있습니다.

- `gh search commits`는 레포의 **default 브랜치**에 있는 커밋만 검색합니다.
- `gh search prs --merged`는 그 기간에 **merge된 PR**의 포함 커밋만 잡습니다.
- 따라서 **push는 했지만 default 브랜치도 아니고 merge된 PR도 없는 feature 브랜치 커밋**(예: 리뷰 대기 중인 PR)은 두 경로 어디에도 잡히지 않아 보고에서 누락됩니다. 이런 작업이 있으면 사용자에게 별도로 확인이 필요합니다.
