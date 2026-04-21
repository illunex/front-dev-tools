---
name: company-pr
description: 회사 공통 PR 규칙(한국어 제목·작업 내용/Breaking Changes/기타 섹션 템플릿). PR 제목·본문 작성 시 사용. "PR 만들어", "gh pr create", "pull request", "PR 본문" 요청 시.
---

# PR 규칙

## 제목

- 한국어, 현재 작업 내용을 간단히 요약한 제목만 작성. (type 접두사 제외)

## 본문 템플릿

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
