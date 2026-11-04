# 프로젝트 폴더 구조

> 새 프로젝트와 이미 FSD를 쓰는 프로젝트는 FSD를 따릅니다.
> 다른 구조로 운영 중인 기존 프로젝트는 그 구조를 유지합니다.

## 구조 판별

파일 위치를 정하거나 옮기기 전에 위에서부터 확인해 처음 맞는 규칙을 적용한다.

| 순서 | 프로젝트 상태                                                | 적용할 규칙                 |
| ---- | ------------------------------------------------------------ | --------------------------- |
| 1    | 프로젝트 루트의 `AGENTS.md`·`CLAUDE.md`에 폴더 규칙이 있다   | 프로젝트 규칙               |
| 2    | `src/shared`와 함께 `src/views`, `src/widgets`, `src/entities` 중 하나가 있다 | 「FSD」                     |
| 3    | `src/screen`이나 `src/features/{feature}/components`가 있다  | 「기존 Feature based」      |
| 4    | 앱 코드가 이미 있지만 위 구조가 아니다                       | 현재 구조와 주변 파일 관례  |
| 5    | 새 프로젝트이거나 라우트·설정 파일 외에 앱 코드가 없다       | 「FSD」                     |

모노레포나 `apps/*`, `client/`처럼 앱이 하위 폴더에 있으면 그 앱 폴더를 기준으로 판별한다.
기존 프로젝트를 다른 구조로 옮기는 작업은 사용자가 요청할 때만 한다.

## FSD

Next.js App Router는 프로젝트 루트 `app/`에 두고 라우팅만 맡긴다. FSD 레이어는 전부 `src/` 아래에 둔다.
루트에 `app/`이 있으면 Next.js가 `src/app`을 라우터로 인식하지 않아서, `src/app`을 FSD app 레이어로 쓸 수 있다.
React/Vite는 이 충돌이 없으므로 루트 `app/` 없이 `src/`만 쓴다. 라우트는 `src/app/routes/`에 선언하고 `src/views`의 화면을 연결한다.

```text
app/                            # Next.js App Router — 라우팅만 담당
├── layout.tsx                  # 루트 레이아웃 (src/app의 Provider 연결)
├── page.tsx                    # src/views의 화면을 가져와 연결만 한다
├── {route}/page.tsx            # 라우트별 페이지
└── api/                        # Next.js Route Handler (서버 API 엔드포인트)

src/
├── app/                        # FSD app 레이어
│   ├── providers/              # 전역 Provider
│   └── routes/                 # 라우트 설정 (React/Vite만, Next.js는 루트 app/)
│
├── views/                      # 화면 조합 (FSD의 pages 레이어)
│   └── {page}/
│       ├── ui/                 # 화면 컴포넌트
│       ├── model/              # 화면 전용 상태·훅
│       └── index.ts            # public API
│
├── widgets/                    # 독립적인 큰 UI 블록 (헤더, 섹션, 바텀시트 등)
│   └── {widget}/
│
├── features/                   # 2개 이상 slice가 공유하는 인터랙션·로직
│   └── {feature}/
│
├── entities/                   # 백엔드 API 연결 레이어
│   └── {domain}/
│       ├── api/                # API 호출 함수, React Query hooks
│       ├── model/              # 도메인 타입, Zustand 스토어
│       └── index.ts            # public API
│
└── shared/                     # 도메인과 무관한 공용 코드
    ├── api/                    # Axios 인스턴스 및 인터셉터 설정
    ├── config/                 # 전역 상수, 환경 설정
    ├── hooks/                  # 전역 커스텀 훅
    ├── lib/                    # 유틸 함수, 외부 라이브러리 설정
    ├── model/                  # 도메인과 무관한 전역 상태
    ├── styles/                 # 전역 스타일
    └── ui/                     # UI 기본 컴포넌트 (버튼, 모달, 탭 등)
```

### 레이어별 역할 요약

| 레이어        | 역할                                                  | 의존 가능한 레이어                  |
| ------------- | ----------------------------------------------------- | ----------------------------------- |
| 루트 `app/`   | 라우팅, 레이아웃 선언 (Next.js만 해당)                | `src/` 아래 모든 레이어             |
| `src/app/`    | Provider, 라우트 설정(React/Vite), 전역 설정, 앱 초기화 | views, widgets, features, entities, shared |
| `views/`      | 화면 조합, 화면 전용 상태                             | widgets, features, entities, shared |
| `widgets/`    | 독립적인 큰 UI 블록                                   | features, entities, shared          |
| `features/`   | 2개 이상 slice가 공유하는 로직·컴포넌트               | entities, shared                    |
| `entities/`   | API 호출, React Query hooks, 도메인 타입·스토어       | shared                              |
| `shared/`     | 도메인과 무관한 공용 코드                             | —                                   |

### 의존 규칙

- import는 **위에서 아래로만** 한다: `app → views → widgets → features → entities → shared`
- 같은 레이어의 다른 slice를 import하지 않는다. 필요하면 위 레이어에서 조합하거나 아래 레이어로 내린다.
- slice 간 참조는 각 slice의 public API(`index.ts`)로만 한다. 다른 slice의 내부 파일을 직접 import하지 않는다.
- slice 안의 segment는 `ui/`, `model/`, `api/`, `lib/`, `config/`를 쓴다. `shared/`는 slice 없이 segment를 바로 둔다.
- `processes` 레이어는 쓰지 않는다.
- slice 이름은 kebab-case로 짓는다.

### 파일 작성 위치 판단 기준

- **한 화면에서만 쓰는 컴포넌트·상태** → `views/{page}/ui/`, `views/{page}/model/`
- **독립적인 큰 UI 블록** → `widgets/{widget}/ui/`
- **2개 이상 slice가 공유하는 로직·컴포넌트** → `features/{feature}/`
- **API 호출 함수·React Query hooks** → `entities/{domain}/api/`
- **도메인 타입·스토어** → `entities/{domain}/model/`
- **도메인과 무관한 UI 기본 컴포넌트** → `shared/ui/`
- **도메인과 무관한 유틸·훅·상수** → `shared/lib/`, `shared/hooks/`, `shared/config/`

### 배치 시 주의점

- **views에 컴포넌트를 쌓지 않는다.** 화면이 커지면 widgets·features로 나누고, views는 불러와 조합만 한다.
- **위젯끼리는 views에서 잇는다.** 같은 레이어 import가 금지되므로 트리거와 패널 같은 조합은 views에서 콜백·상태로 연결한다.
- **slice를 과하게 나누지 않는다.** 한 slice 안에서만 쓰는 단순 상태(`useState` 한 줄 등)는 그 slice에 둔다.
- **컴포넌트는 `ui/{Component}/index.tsx`로 만든다.** 필요하면 `type.ts`·`style.ts`를 함께 둔다. 이미 `ui/{component}.tsx` 단일 파일 관례를 쓰는 프로젝트는 그 관례를 따른다.
- **서버 전용 모듈은 `index.server.ts`로 내보낸다.** `index.ts`에 섞으면 클라이언트 컴포넌트가 slice를 import할 때 서버 코드가 번들에 들어가 빌드가 깨질 수 있다.
- **`proxy.ts`는 루트 `app/`과 나란히 둔다.** Next.js 프로젝트에서 라우터가 루트에 있기 때문이다.

## 기존 Feature based

「구조 판별」에서 이 규칙으로 정해진 기존 프로젝트에만 적용한다. 새 프로젝트에는 쓰지 않는다.

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

### 레이어별 역할 요약

| 레이어        | 역할                                              | 의존 가능한 레이어                           |
| ------------- | ------------------------------------------------- | -------------------------------------------- |
| `app/`        | 라우팅, 레이아웃 선언                             | screen, components, features                 |
| `screen/`     | 페이지 조합 (screen = 여러 feature 컴포넌트 조합) | features, components                         |
| `features/`   | 비즈니스 로직, API, 상태                          | apis, hooks, store, types, utils, components |
| `components/` | UI/레이아웃 기본 단위 (비즈니스 로직 없음)        | hooks, types, utils                          |
| `apis/`       | HTTP 클라이언트 설정                              | —                                            |
| `hooks/`      | 재사용 가능한 React 훅                            | —                                            |
| `store/`      | 전역 상태                                         | types                                        |

### 파일 작성 위치 판단 기준

- **특정 기능에서만 쓰는 컴포넌트** → `features/{feature}/components/`
- **여러 기능에서 쓰는 컴포넌트** → `features/common/components/` 또는 `components/ui/`
- **페이지 전체 레이아웃 조합** → `screen/{feature}/`
- **API 호출 함수** → `features/{feature}/api/`
- **React Query hooks** → `features/{feature}/queries/`
- **전역 상태** → `features/{feature}/store/` 또는 `store/`
<!-- TODO: 추가 규칙 보강 -->
