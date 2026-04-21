---
name: company-folder-structure
description: 회사 공통 Next.js App Router + Feature based 폴더 구조. 새 컴포넌트·페이지·API·훅·상태 파일의 위치를 결정할 때 사용. "컴포넌트 어디에", "새 페이지 추가", "새 feature 만들어", "screen/features/components 어디에 둘지" 요청 시.
---

# 프로젝트 폴더 구조

> Next.js App Router + Feature based 패턴을 사용합니다.
> 새 기능을 추가할 때 아래 구조를 따르세요.

```text
src/
├── app/                        # Next.js App Router — 라우팅만 담당
│   ├── (contents)/             # 인증 후 접근 가능한 메인 페이지 라우트 그룹
│   ├── api/                    # Next.js Route Handler (서버 API 엔드포인트)
│   ├── auth/                   # 인증 관련 페이지 라우트
│   ├── dashboard/              # 대시보드 페이지 라우트
│   └── detail/[id]/            # 동적 라우트 페이지
│
├── screen/                     # 페이지 단위 화면 조합 컴포넌트
│   └── {feature}/              # 기능별 screen 디렉토리
│       └── {name}Screen/       # 하나의 화면 = index.tsx + style.ts
│
├── features/                   # 기능별 모듈 (비즈니스 로직의 핵심)
│   ├── common/                 # 여러 기능에서 공유하는 컴포넌트·로직
│   └── {feature}/
│       ├── api/                # API 호출 함수 (axios 기반 순수 함수)
│       ├── components/         # 해당 기능 전용 컴포넌트
│       ├── constants/          # 해당 기능 전용 상수
│       ├── queries/            # React Query hooks (useQuery, useMutation)
│       ├── store/              # Zustand 스토어
│       ├── types/              # 타입 정의
│       └── utils/              # 유틸 함수
│
├── components/                 # 기능과 무관한 공통 재사용 컴포넌트
│   ├── layouts/                # 레이아웃 컴포넌트 (헤더, 네비게이션 등)
│   └── ui/                     # UI 기본 컴포넌트 (버튼, 모달, 탭 등)
│
├── apis/                       # Axios 인스턴스 및 인터셉터 설정
├── hooks/                      # 전역 커스텀 훅
├── lib/                        # 외부 라이브러리 설정 (OAuth 등)
├── store/                      # 전역 Zustand 스토어
├── constants/                  # 전역 상수
├── types/                      # 전역 타입 정의
├── utils/                      # 전역 유틸 함수
└── styles/                     # 전역 스타일
```

## 레이어별 역할 요약

| 레이어        | 역할                                              | 의존 가능한 레이어               |
| ------------- | ------------------------------------------------- | -------------------------------- |
| `app/`        | 라우팅, 레이아웃 선언                             | screen, components, features     |
| `screen/`     | 페이지 조합 (screen = 여러 feature 컴포넌트 조합) | features, components             |
| `features/`   | 비즈니스 로직, API, 상태                          | apis, hooks, store, types, utils, components |
| `components/` | UI/레이아웃 기본 단위 (비즈니스 로직 없음)        | hooks, types, utils              |
| `apis/`       | HTTP 클라이언트 설정                              | —                                |
| `hooks/`      | 재사용 가능한 React 훅                            | —                                |
| `store/`      | 전역 상태                                         | types                            |

## 파일 작성 위치 판단 기준

- **특정 기능에서만 쓰는 컴포넌트** → `features/{feature}/components/`
- **여러 기능에서 쓰는 컴포넌트** → `features/common/components/` 또는 `components/ui/`
- **페이지 전체 레이아웃 조합** → `screen/{feature}/`
- **API 호출 함수** → `features/{feature}/api/`
- **React Query hooks** → `features/{feature}/queries/`
- **전역 상태** → `features/{feature}/store/` 또는 `store/`
<!-- TODO: 추가 규칙 보강 -->
