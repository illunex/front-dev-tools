---
name: company-branch
description: 회사 공통 브랜치 네이밍 규칙(feature/, fix/, hotfix/, refactor/, chore/, docs/ + kebab-case). 브랜치 생성·체크아웃·네이밍 요청 시 사용. "branch 만들어", "checkout -b", "브랜치 이름" 같은 요청 시.
---

# 브랜치 네이밍 규칙

## 형식

```
<type>/<요약-영어-kebab-case>
```

| 접두사 | 사용 시점 |
| --- | --- |
| `feature/` | 신규 기능 개발 |
| `fix/` | 일반 버그 수정 |
| `hotfix/` | 긴급 프로덕션 패치 |
| `refactor/` | 리팩터링 |
| `chore/` | 설정·의존성 등 기타 |
| `docs/` | 문서 작업만 |

예: `feature/login-page`, `fix/token-refresh-bug`

<!-- TODO: 이슈 번호 포함 규칙 (예: feature/123-login-page) -->
<!-- TODO: 메인 브랜치명 (main vs master) -->
<!-- TODO: 릴리즈/핫픽스 브랜치 전략 -->
