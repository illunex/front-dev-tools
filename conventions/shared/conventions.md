# 회사 공통 개발 컨벤션

> 이 파일은 Claude Code · Codex · Cursor 세 툴이 공유하는 **단일 원본**입니다.
> 각 툴 전용 파일(`conventions/claude/CLAUDE.md`, `conventions/codex/AGENTS.md`, `conventions/cursor/company.mdc`)은
> 이 내용을 기반으로 도입부/포맷만 달리해 제공됩니다.
> 수정할 때는 이 파일을 먼저 편집하고 각 툴 파일에 동기화하세요.

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

## 3. 커밋 메시지

### 형식

```
type: 한국어 메시지
```

- 본문·푸터는 선택 사항.
- 메시지는 명령형 현재 시제("추가하다", "수정하다")보다 **명사형**("추가", "수정") 권장.
  - 예: `feat: 로그인 페이지 추가`
  - 예: `fix: 토큰 만료 시 자동 로그아웃 처리`
- **Breaking Change는 커밋 메시지에 표기하지 않고 PR 본문의 `## Breaking Changes` 섹션에 기재.**

### 허용 타입 (Conventional Commits)

| 타입       | 용도                                                |
| ---------- | --------------------------------------------------- |
| `feat`     | 새로운 기능 추가                                    |
| `fix`      | 버그 수정                                           |
| `docs`     | 문서만 변경                                         |
| `style`    | 코드 동작에 영향 없는 포맷 변경 (공백, 세미콜론 등) |
| `refactor` | 기능 추가·버그 수정 없는 코드 리팩터링              |
| `test`     | 테스트 추가·수정                                    |
| `build`    | 빌드 시스템·외부 의존성 변경 (webpack, pnpm 등)     |
| `ci`       | CI 설정 변경                                        |
| `chore`    | 빌드·CI 외의 기타 작업                              |

<!-- TODO: scope 사용 여부 (예: feat(auth): ...) -->

---

## 4. PR 규칙

### 제목

- 한국어, 현재 작업 내용을 간단히 요약한 제목만 작성. (type 접두사 제외)

### 본문 템플릿

```markdown
## 작업 내용

- TODO

## Breaking Changes

- 없음

## 기타

- TODO
```

- Breaking Change가 없으면 `## Breaking Changes` 섹션은 `- 없음`으로 남겨둡니다.
- Breaking Change가 있으면 **무엇이 바뀌는지**, **마이그레이션 방법**을 구체적으로 기술합니다.
  <!-- TODO: 리뷰어 지정 규칙 -->
  <!-- TODO: 레이블 사용 규칙 -->
  <!-- TODO: Draft PR 사용 기준 -->
  <!-- TODO: 스크린샷/영상 첨부 기준 -->
  <!-- TODO: PR 크기 가이드라인 (최대 diff 라인 수 등) -->

---

## 5. 브랜치 네이밍

```
<type>/<요약-영어-kebab-case>
```

| 접두사      | 사용 시점           |
| ----------- | ------------------- |
| `feature/`  | 신규 기능 개발      |
| `fix/`      | 일반 버그 수정      |
| `hotfix/`   | 긴급 프로덕션 패치  |
| `refactor/` | 리팩터링            |
| `chore/`    | 설정·의존성 등 기타 |
| `docs/`     | 문서 작업만         |

예: `feature/login-page`, `fix/token-refresh-bug`

<!-- TODO: 이슈 번호 포함 규칙 (예: feature/123-login-page) -->
<!-- TODO: 메인 브랜치명 (main vs master) -->
<!-- TODO: 릴리즈/핫픽스 브랜치 전략 -->

---

## 6. TypeScript 기본 원칙

- **`any` 지양.** 불가피할 경우 `// eslint-disable-next-line @typescript-eslint/no-explicit-any` + 한 줄 사유 주석.
- `tsconfig.json`에 `"strict": true` 전제.
- 타입 추론이 명확하면 타입 어노테이션 생략 가능. 공개 API(함수 반환 타입 등)는 명시.
- `as` 타입 단언보다 **타입 가드** 또는 **제네릭** 우선.
- `unknown`을 `any` 대신 활용하고, 사용 전 타입 검사 수행.
