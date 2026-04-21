---
name: create-company-frontend
description: Use when creating, scaffolding, bootstrapping, or generating a company-standard React/Vite or Next.js frontend boilerplate project with the latest official generator, pnpm, TypeScript, and the shared feature-based folder structure.
---

# create-company-frontend

회사 표준 프론트엔드 보일러플레이트를 생성할 때 사용합니다. 공식 generator로 최신 기본값을 먼저 만들고, 회사가 소유하는 구조와 설정만 덧씌웁니다.

## 사용 시점

- "Next 보일러플레이트 만들어줘"
- "React 프로젝트 회사 구조로 생성해줘"
- "프론트 프로젝트 스캐폴딩"
- "Vite/Next 최신 버전으로 초기 세팅"

## 원칙

- 패키지 매니저는 항상 `pnpm`만 사용합니다.
- Next/Vite의 최신 기본 설정은 공식 generator에 맡깁니다.
- 회사 표준 영역만 적용합니다: `src/screen`, `src/features`, `src/components`, `src/apis`, `src/hooks`, `src/store`, `src/types`, `src/utils`, `src/styles`.
- 생성된 설정 파일은 가능하면 병합하고, 불필요하게 오래된 설정으로 덮어쓰지 않습니다.
- 프로젝트 이름 또는 프레임워크가 불명확하면 생성 전에 사용자에게 확인합니다.
- 공식 generator 실행, CLI 설치, 의존성 설치, 검증처럼 네트워크 접근 또는 대량 파일 쓰기가 예상되는 명령은 샌드박스 실패를 기다리지 말고 처음부터 escalated 실행 승인을 요청합니다.

## 빠른 실행

CLI가 설치되어 있으면 다음처럼 실행합니다.

```bash
create-company-frontend --framework next --name my-app
create-company-frontend --framework react --name my-app
```

현재 디렉터리에 생성하지 않고 특정 부모 디렉터리에 생성하려면:

```bash
create-company-frontend --framework next --name my-app --directory ./apps
```

CLI가 없으면 사용자 동의를 받은 뒤 설치 스크립트를 실행합니다.

```bash
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-create-company-frontend.sh | bash
```

## 옵션

| 옵션 | 값 | 설명 |
| --- | --- | --- |
| `--framework` | `next`, `react` | 생성할 프레임워크 |
| `--name` | 프로젝트명 | 생성될 디렉터리명 |
| `--directory` | 경로 | 프로젝트를 생성할 부모 디렉터리. 기본값은 현재 디렉터리 |
| `--skip-install` | 없음 | 공식 generator 이후 회사 표준 패키지 추가를 건너뜀 |
| `--skip-verify` | 없음 | `pnpm lint`, `pnpm build` 검증을 건너뜀 |

## 생성 결과

공통 의존성:

- `axios`
- `@tanstack/react-query`
- `zustand`
- `zod`
- `clsx`
- `tailwind-merge`

React/Vite 프로젝트에는 `react-router-dom`도 추가합니다.

공통 구조:

```text
src/
├── app/
├── screen/home/homeScreen/
├── features/common/
├── components/layouts/
├── components/ui/
├── apis/
├── hooks/
├── lib/
├── store/
├── constants/
├── types/
├── utils/
└── styles/
```

## 작업 절차

1. 사용자 요청에서 `framework`와 `name`을 추론합니다.
2. 둘 중 하나라도 불명확하면 한 문장으로 확인합니다.
3. `create-company-frontend` 설치 여부를 확인합니다.
4. 설치, generator 실행, `pnpm install`, 패키지 추가, `pnpm lint`, `pnpm build`는 샌드박스에서 먼저 실패시켜 보지 말고 `sandbox_permissions: "require_escalated"`로 실행합니다.
5. 승인 요청 문구는 짧게 작성하고, 가능하면 반복 승인에 도움이 되는 좁은 `prefix_rule`을 제안합니다.
6. 스크립트 실행 후 결과 요약과 검증 결과를 사용자에게 알려줍니다.

## 권한 처리

- 이 스킬은 새 프로젝트 생성 과정에서 네트워크 다운로드와 다수의 파일 생성이 자주 발생하므로, 관련 명령은 선제적으로 권한 승인을 요청합니다.
- 예: `create-company-frontend ...`, `pnpm create ...`, `pnpm install`, `pnpm add ...`, `pnpm lint`, `pnpm build`.
- 사용자가 이미 "권한을 미리 풀고 진행해도 된다"는 취지로 요청한 경우에도 도구 정책상 승인 요청은 생략할 수 없으므로, 동일 명령을 샌드박스에서 실패시킨 뒤 재시도하지 말고 바로 escalated 승인 요청으로 진행합니다.
- 단순 조회 명령(`pwd`, `ls`, `rg`, `sed`, `git status` 등)은 기본 샌드박스에서 실행합니다.

## 실패 처리

- `pnpm`이 없으면 `corepack enable` 또는 `pnpm` 설치가 필요하다고 안내합니다.
- generator가 실패하면 출력된 오류를 기준으로 공식 generator 옵션 변경 여부를 확인합니다.
- 검증이 실패하면 생성된 프로젝트 안에서 실패한 명령과 원인을 먼저 확인합니다.
