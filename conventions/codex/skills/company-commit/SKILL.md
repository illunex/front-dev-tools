---
name: company-commit
description: 회사 공통 커밋 메시지 규칙(Conventional Commits 한국어 명사형). 커밋 메시지를 작성·제안·수정할 때 사용. "commit", "커밋", "git commit", "커밋 메시지", "Co-Authored-By" 관련 요청 시.
---

# 커밋 메시지 규칙

## 형식

```
type: 한국어 메시지
```

- 본문·푸터는 선택 사항.
- 메시지는 명령형 현재 시제("추가하다", "수정하다")보다 **명사형**("추가", "수정") 권장.
  - 예: `feat: 로그인 페이지 추가`
  - 예: `fix: 토큰 만료 시 자동 로그아웃 처리`
- **Breaking Change는 커밋 메시지에 표기하지 않고 PR 본문의 `## Breaking Changes` 섹션에 기재.**

## 허용 타입 (Conventional Commits)

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
<!-- TODO: Breaking Change 표기 규칙 -->
<!-- TODO: 이슈/티켓 번호 연결 규칙 (푸터 Closes #123 등) -->
