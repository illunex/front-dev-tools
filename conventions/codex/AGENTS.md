# 회사 공통 개발 컨벤션 (Codex)

> 이 파일은 `~/.codex/AGENTS.md`에 설치되어 Codex의 모든 세션에 자동으로 로드됩니다.
> 원본은 `conventions/shared/conventions.md`입니다. 수정 후 세 툴 파일에 동기화하세요.
> 커밋·PR·브랜치·폴더 구조 규칙은 `conventions/codex/skills/` 하위 skill 파일로 분리되어 있습니다.

---

## Codex 전용 지침

- **모든 응답·계획·질문·요약은 한국어**로 작성. 계획 모드(plan mode)에서도 동일.
- 터미널 명령 실행 시 패키지 매니저는 반드시 `pnpm` 사용.
- 파일 생성·수정 전 기존 코드 패턴 확인 후 일관성 유지.
- 불필요한 리팩터링·추상화 금지. 요청 범위에만 집중.
- 커밋 메시지 제안 시 `company-commit` skill 참조.

---

## 1. 답변 언어

- 모든 설명, 제안, 질문, 에러 해석, 코드 주석 권고는 **한국어**로.
- 코드 내 식별자(변수명·함수명·타입명)는 영어 유지.
<!-- TODO: 영어 문서 인용 방식, 외래어 표기 원칙 등 추가 -->

---

## 2. 패키지 매니저

- **`pnpm` 고정.** `npm`/`yarn` 사용 금지.
- 의존성 설치: `pnpm install`
- 스크립트 실행: `pnpm <script>`
- 새 패키지 추가: `pnpm add <pkg>` / 개발 의존성: `pnpm add -D <pkg>`
- lockfile은 `pnpm-lock.yaml`만 커밋. `package-lock.json`·`yarn.lock` 생성 금지.
<!-- TODO: pnpm 버전 고정 정책, engines 필드 필수 여부 -->

---

## 3. TypeScript 기본 원칙

- **`any` 지양.** 불가피할 경우 `// eslint-disable-next-line @typescript-eslint/no-explicit-any` + 한 줄 사유 주석.
- `tsconfig.json`에 `"strict": true` 전제.
- 타입 추론이 명확하면 타입 어노테이션 생략 가능. 공개 API(함수 반환 타입 등)는 명시.
- `as` 타입 단언보다 **타입 가드** 또는 **제네릭** 우선.
- `unknown`을 `any` 대신 활용하고, 사용 전 타입 검사 수행.
<!-- TODO: 에러 처리 패턴 (unknown catch 등) -->
<!-- TODO: Nullable/Optional 정책 (null vs undefined) -->
<!-- TODO: 유틸리티 타입 활용 규칙 -->

---

## 작업별 참조 Skill

아래 작업을 수행할 때 해당 skill을 참조합니다.

| 작업 | Skill |
| ---- | ----- |
| 커밋 메시지 작성·제안 | `company-commit` |
| 브랜치 생성·네이밍 | `company-branch` |
| PR 제목·본문 작성 | `company-pr` |
| 새 파일·컴포넌트 위치 결정 | `company-folder-structure` |
