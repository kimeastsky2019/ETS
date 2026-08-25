# ETS 통합 플랫폼 기획서

> **한 줄 정의**: 고객이 콘텐츠로 들어와 발코니 태양광을 신청하고, 그 신청을 임직원이 사내 지식(LLM Wiki)과 함께 처리하는 **하나의 계정·하나의 도메인** 플랫폼.

| 항목 | 내용 |
| --- | --- |
| 문서 버전 | v1.0 |
| 작성일 | 2026-08-22 |
| 통합 대상 | `Intro_web` (고객 사이트) · `LLMwiki` (사내 지식 기획) · `RAG-AI_Gov` (RAG 백엔드) |
| 통합 베이스 | `Intro_web` (React 19 + Hono + Better Auth + libsql) |

---

## 1. 기존 서비스 분석

### 1.1 `Intro_web` — 고객 소개 사이트

| 구분 | 내용 |
| --- | --- |
| 스택 | pnpm workspace · React 19 + Vite(rolldown) + Tailwind v4 · Hono + Better Auth + Drizzle/libsql |
| 화면 | 홈 / 회사소개 / 사업영역 / 사업실적 / 태양광 스토어 / 인사이트 / 문의 / 임직원 포털 |
| 자산 | 기존 홈페이지 40여 페이지를 `public/legacy/` 에 그대로 보존 |
| 인증 | Better Auth(이메일+비밀번호, username, bearer) + Google 3rd-party 게이트웨이 **이미 배선됨** |

**한계 (통합 전)**

- 태양광 "장바구니"와 문의 폼이 모두 `mailto:` 로 끝난다 → 접수 데이터가 남지 않는다.
- 블로그·쇼츠 6건이 소스코드에 하드코딩 → 운영자가 콘텐츠를 늘릴 수 없다.
- "임직원 포털"이 공개 URL(`/staff`)이고 실제로는 외부 링크 모음이다 → 권한 개념이 없다.
- 회원가입/로그인 화면(`/auth`)은 스캐폴드 예제 그대로, 서비스 동선에 연결되어 있지 않다.

### 1.2 `LLMwiki` — 사내 지식 인프라 기획

앱이 아니라 **기획서 + 온톨로지 자산**이다. (`vitech2026.ttl`, `vitech2026_ontology.json`, `kb-feature.patch`)

핵심 설계 원칙 5가지를 통합 플랫폼에 그대로 이식했다.

| # | 원칙 | 플랫폼 반영 |
| --- | --- | --- |
| P1 | 위키가 단일 진실 | `wiki_pages` 가 원본, 검색·AI 응답은 항상 여기서 파생 |
| P2 | 숫자는 LLM 이 생성하지 않는다 | AI 질의 system 프롬프트에서 계산 금지·원문 인용 강제 |
| P3 | 모든 문서는 데이터 컨트랙트를 갖는다 | `type / acl / status / sourceRef / version` 필수 필드 |
| P4 | Lint 는 주기 작업 | `/api/wiki/lint` — 끊어진 `[[링크]]`·요약 누락 검사 |
| P5 | ACL 이 모델 라우팅을 결정한다 | `acl='confidential'` 문서는 AI 컨텍스트에서 제외 |

### 1.3 `RAG-AI_Gov` — RAG/CrewAI 백엔드

React(HashRouter) + Python(FastAPI) + Supabase 조합의 **별도 제품**이다. 자체 JWT(bcrypt) 인증을 쓰기 때문에 Better Auth 세션과 계정 체계가 다르다.

**판단**: 이번 통합에서 코드로 흡수하지 않는다. 문서 파싱·벡터 검색이 필요해지는 Phase 2에서 **백엔드 서비스로만 호출**하는 것이 비용 대비 효과가 크다. 지금 단계의 위키는 문서 수가 적어 키워드 스코어링으로 충분하다.

---

## 2. 통합 전략

### 2.1 왜 `Intro_web` 을 베이스로 삼는가

세 자산 중 **인증·DB·파일저장·AI 브리지가 모두 배선된 유일한 풀스택**이며, 고객 유입 동선(콘텐츠 → 신청)이 이미 그 위에 있다. 임직원 기능을 여기에 얹는 편이, 고객 사이트를 다른 앱으로 옮기는 것보다 훨씬 적은 변경으로 끝난다.

### 2.2 하나의 계정, 두 개의 공간

```
                    ┌──────────────── Better Auth (단일 계정 저장소) ────────────────┐
                    │  user.memberType = customer | staff     user.role = user | admin │
                    └───────────────┬───────────────────────────┬───────────────────┘
                                    │                           │
              ┌─────────────────────▼──────────┐   ┌────────────▼─────────────────────┐
              │  고객 공간  (SiteShell)         │   │  임직원 공간  (WorkShell)         │
              │  /  /media  /solar-store       │   │  /work        대시보드            │
              │  /login  /my  /solar-apply     │   │  /work/wiki   LLM Wiki + AI 질의  │
              │  이메일 · Google(SNS) 로그인    │   │  /work/requests 신청·문의 처리     │
              └────────────────┬───────────────┘   │  /admin       콘텐츠·계정 관리     │
                               │                   └────────────▲─────────────────────┘
                               │  신청 / 문의 데이터                │
                               └──────────────────────────────────┘
```

- **고객**은 이메일 또는 Google 로 가입한다(`memberType=customer`).
- **임직원**은 사번(`ets00`~`ets09`, `admin`)으로 로그인한다(`memberType=staff`). Better Auth 의 username 플러그인을 그대로 사용한다.
- 권한 판정은 서버가 DB 에서 다시 읽는다(`services/access.ts` → `staffRoute`). 클라이언트 값은 신뢰하지 않는다.

### 2.3 고객 · 직원이 만나는 지점

| 접점 | 고객 쪽 | 직원 쪽 |
| --- | --- | --- |
| 발코니 태양광 | `/solar-apply` 신청 → `/my` 진행 상황 추적 | `/work/requests` 상태 변경·담당 메모 |
| 문의 | `/contact` 접수(비회원 가능) | `/work/requests?tab=inquiry` 처리 |
| 콘텐츠 | `/media` 열람·좋아요 | `/admin` 발행·수정 |
| 지식 | (비공개) | `/work/wiki` 축적 → 상담 답변의 근거 |

고객의 신청 한 건이 직원 큐의 한 줄이 되고, 그 처리 결과가 다시 고객의 마이페이지에 보인다. **이 왕복이 통합의 실체**다.

---

## 3. 데이터 모델 (`migrations/004_platform.sql`)

| 테이블 | 역할 | 핵심 컬럼 |
| --- | --- | --- |
| `user` (확장) | 단일 계정 | `memberType`, `phone`, `department` |
| `posts` | 블로그·쇼츠 | `type(blog\|shorts)`, `status`, `viewCount`, `likeCount` |
| `post_likes` | 참여 지표 | `(postId, userId)` |
| `solar_applications` | 발코니 태양광 신청 | 설치 조건 + `status(received→closed)` + `staffMemo` |
| `inquiries` | 일반 문의 | `status(received/handling/done)` |
| `wiki_pages` | LLM Wiki 본문 + 데이터 컨트랙트 | `type`, `sector`, `acl`(4단계), `status`, `measurementBasis`, `confidence`, `numericVerified`, `validUntil`, `contentHash` |
| `wiki_revisions` | 변경 이력 | 본문이 바뀔 때만 append |
| `diagnoses` | 진단 프로젝트 원장 | 업종·규모·사용량 + 코드 계산값(`annualEnergyToe`, `energyIntensity`) |
| `diagnosis_measures` | ECM 적용 실적 | 투자비·절감액 + 계산된 `paybackYears`, `adopted` |
| `energy_factors` | 환산계수·단가 SSOT | `value`, `unit`, `source`, `validUntil`, `verified` |

---

## 4. API 표면

모든 응답은 스캐폴드 규약(`{ ok, data }` / `{ ok, error }`)을 따른다.

| 엔드포인트 | 권한 | 설명 |
| --- | --- | --- |
| `GET /api/members/me` | 로그인 | 고객/직원 구분 포함 프로필 |
| `GET·POST /api/members/bootstrap` | 최초 1회 공개 → 이후 admin | ets00~ets09 + admin 계정과 초기 콘텐츠 생성 |
| `GET /api/members`, `PATCH /api/members/:id` | admin | 계정 목록·권한 변경 |
| `GET /api/posts`, `GET /api/posts/:slug` | 공개 | 발행 콘텐츠 |
| `POST /api/posts/:id/like` | 로그인 | 좋아요 토글 |
| `POST·PATCH·DELETE /api/posts` | admin | 콘텐츠 관리 |
| `POST /api/solar-applications` | 로그인 | 태양광 신청 |
| `GET /api/solar-applications/mine` | 로그인 | 내 신청 |
| `GET·PATCH /api/solar-applications` | 임직원 | 처리 큐 |
| `POST /api/inquiries` | 공개 | 문의 접수 |
| `GET·PATCH /api/inquiries` | 임직원 | 문의 큐 |
| `GET·POST·PATCH /api/wiki` | 임직원 | 위키 CRUD (본문 변경 시 리비전 자동, 검산 표시 해제) |
| `GET /api/wiki/taxonomy` | 임직원 | 업종 택소노미(닫힌 집합) + 필수지표 |
| `POST /api/wiki/classify` | 임직원 | 본문 어휘 기반 업종 규칙 분류 (LLM 미사용) |
| `GET /api/wiki/lint` | 임직원 | 9종 무결성 검사 (차단/경고 등급) |
| `GET·PATCH /api/wiki/factors` | 임직원 | 환산계수 SSOT 조회·확인 처리 |
| `POST /api/wiki/ask` | 임직원 | 위키 근거 기반 AI 질의 (기밀 제외, 미검산 수치 인용 금지) |
| `POST /api/wiki/recommend` | 임직원 | ECM 후보 추천 + 과거 회수기간 분포 (UC2) |
| `POST /api/wiki/report-draft` | 임직원 | 보고서 초안 생성, 미검증 값은 `[검토 필요]` (UC3) |
| `DELETE /api/wiki/:slug` | admin | 문서 삭제 |
| `GET·POST·PATCH /api/diagnoses` | 임직원 | 진단 건 원장 (수치는 코드 계산) |
| `POST /api/diagnoses/similar` | 임직원 | 유사 사례 검색 (UC1) |
| `GET /api/diagnoses/benchmark` | 임직원 | 업종별 원단위 분포·백분위 (UC4) |
| `POST /api/diagnoses/:code/measures` | 임직원 | ECM 적용 실적 등록, 회수기간 자동 산출 |

---

## 5. LLM Wiki v2 — 진단 실무화

직원들의 주 업무는 에너지 진단이다. v1 의 위키는 "문서를 적어두는 곳"이었고, 진단 실무에 필요한 세 가지가 없었다.

1. 숫자를 신뢰할 장치 — 절감량·회수기간이 틀리면 바로 사업 리스크다
2. 업종별로 **무엇이 빠졌는지** 판정할 기준
3. 과거 사례를 **조건으로** 꺼내는 경로

기획서의 데이터 컨트랙트·택소노미·3연산을 스키마와 코드로 옮겨 이 셋을 채웠다.

### 5.1 데이터 컨트랙트

| 필드 | 존재 이유 |
| --- | --- |
| `sector` | 업종을 모르면 필수지표도, 벤치마크 분모도 정할 수 없다 |
| `measurementBasis` | 실측/추정/설계값을 구분하지 않으면 벤치마크가 오염된다 — 진단 보고서의 가장 흔한 오독 지점 |
| `measurementPeriod` | 어느 기간의 값인지 없으면 시계열 비교가 불가능하다 |
| `confidence` | 인용 시 신뢰도를 함께 노출하기 위해 |
| `numericVerified` | **P2 의 집행 장치.** 검산을 통과하지 않은 수치는 AI 응답에 인용되지 않는다 |
| `acl` (4단계) | `confidential` 이상은 외부 모델 경로를 타지 못한다 (P5) |
| `validUntil` | 법규·계수는 개정된다. 만료 임박 시 Lint 가 경고한다 |
| `contentHash` | 본문 변경 감지. 본문이 바뀌면 검산 표시가 자동 해제된다 |
| `owner` / `sourceRef` / `ingestedBy` | 책임자·원문 스팬·변환 주체 추적 |

### 5.2 P2 집행 — 계산 엔진과 계수 SSOT

숫자는 LLM 이 만들지 않는다. toe 환산, 온실가스, 원단위, 회수기간은 전부
[`services/energy-calc.ts`](../apps/server/services/energy-calc.ts) 의 순수 함수가 계산한다.

계수는 코드에 박지 않고 `energy_factors` 테이블(SSOT)에서 읽는다. 기본값은 전부
`verified = false` 로 적재되며, **담당자가 고시 원문으로 확인하기 전까지 그 계수를 쓴 모든 계산은
미검증으로 내려가고 벤치마크·보고서에서 제외된다.** 확인은 업무 포털의 벤치마크 화면에서 처리한다.

```
연간 환산에너지(toe) = 전력사용량(kWh) × elec_toe + 연료(toe)
연간 온실가스(tCO2eq) = 전력사용량(MWh) × elec_ghg
에너지 원단위 = 환산에너지(toe) ÷ 업종별 분모
회수기간(년) = 투자비 ÷ 연간 절감액
```

### 5.3 업종 택소노미 — 닫힌 집합

업종을 자유 문자열로 두면 같은 보고서가 등록할 때마다 다른 라벨을 받고, 그 순간 업종별 필터와
벤치마크가 무의미해진다. 12개 업종을 코드에 고정했고, 각 업종은 `requiredMetrics`(필수지표),
`keyEquipment`, `unitBasis`(원단위 분모)를 갖는다.

폐기물처리·식품제조·화학·1차금속·섬유·펄프/종이·비금속광물·기계전자·건물·농업·수처리·기타.

필수지표가 있으니 **무엇이 빠졌는지를 결정론적으로 물을 수 있다.** 진단 상세 화면의
"커버리지 갭"이 여기서 나온다. 본문 어휘로 업종을 1차 분류하는 규칙 분류기도 함께 제공한다(LLM 미사용, 재현 가능).

### 5.4 Lint — 9종 검사

코드 레벨 검사이며 LLM 판단에 의존하지 않는다. `차단`은 서비스 인용을 막는 등급이다.

| 검사 | 분류 | 등급 |
| --- | --- | --- |
| 요약·출처·담당자 누락 | 스키마 | 경고 |
| 끊어진 `[[링크]]` | 링크 | 경고 |
| 고아 페이지 (참조 0) | 링크 | 경고 |
| **ACL 상속 위반** (낮은 등급이 높은 등급 참조) | 보안 | **차단** |
| **수치 검산 실패** (본문에 수치 주장이 있는데 미검산) | 도메인 | **차단** |
| 단위 혼용 (Gcal/kcal 에 toe 병기 없음) | 도메인 | 경고 |
| 법규 유효기간 만료 | 도메인 | **차단** |
| 법규 유효기간 임박 (60일) | 도메인 | 경고 |
| 업종 필수지표 누락 | 도메인 | 경고 |
| **미확인 환산계수** | 도메인 | **차단** |

수치 검산 규칙은 "값 + 단위"가 실제로 붙어 있을 때만 건다. `2015년 9월` 같은 연도 표기는
수치 주장으로 보지 않고, `회수기간 2.3년`·`1,200 kWh` 는 수치 주장으로 본다.

### 5.5 검색 — BM25 베이스라인

에너지진단에서 정확 표기 매칭은 선택이 아니다. 설비 모델명, 법규 조항 번호, 사업장명은
의미 유사도로 잡히지 않는다. BM25 를 제목·요약·태그 가중치와 함께 구현했고, 한국어 조사 문제는
어절 토큰에 2-gram 을 더해 해소했다. Dense 채널이 붙는 시점을 위해 RRF 융합 함수도 함께 두었다.

### 5.6 유스케이스 → 화면

| # | 유스케이스 | 화면 |
| --- | --- | --- |
| UC1 | 유사 사례 검색 | `/work/diagnosis` — 업종·규모·설비 조건 |
| UC2 | ECM 후보 추천 + 과거 회수기간 분포 | `/work/diagnosis/:code` |
| UC3 | 보고서 초안 생성 (미검증 값은 `[검토 필요]`) | `/work/diagnosis/:code` |
| UC4 | 원단위 벤치마크 + 백분위 | `/work/benchmark` |
| UC5 | 법규·계수 질의 | `/work/wiki` 질의 + `/work/benchmark` 계수 표 |

## 6. 운영 가이드

### 6.1 최초 세팅

1. `apps/server/migrations/004_platform.sql` 적용 (플랫폼 마이그레이션 도구).
2. `/work/login` 접속 → **"임직원 계정 생성"** 버튼 1회 실행.
   - `ets00`~`ets09`(직원 10명) + `admin` 계정 11개 생성
   - 블로그·쇼츠 6건, 위키 예시 3건 초기 데이터 생성
3. 각 직원이 로그인 후 비밀번호를 변경한다.

### 6.2 계정 규칙

| 계정 | 로그인 ID | 이메일 | 권한 |
| --- | --- | --- | --- |
| 직원 10명 | `ets00` ~ `ets09` | `ets00@ets.co.kr` … | 임직원 |
| 관리자 | `admin` | `admin@ets.co.kr` | 임직원 + admin |

초기 비밀번호는 서버 환경변수 `STAFF_DEFAULT_PASSWORD` / `STAFF_ADMIN_PASSWORD` 로 주입한다. **운영 배포 전 반드시 주입해서 기본값을 덮어쓴다.** 메일 도메인은 `STAFF_EMAIL_DOMAIN` 으로 바꿀 수 있다.

### 6.3 콘텐츠 운영 (유입 설계)

`/admin` → 콘텐츠 탭에서 블로그 글과 쇼츠를 등록한다.

- **쇼츠**: `videoUrl` 에 임베드 주소를 넣으면 상세 화면이 9:16 세로 플레이어로 바뀐다.
- 모든 콘텐츠 상세 하단에 **발코니 태양광 신청 CTA** 가 고정으로 붙는다 → 콘텐츠에서 신청까지 한 단계.
- 조회수·좋아요가 집계되므로 어떤 주제가 신청으로 이어지는지 판단할 수 있다.

---

## 7. 이번 통합에서 구현한 것

- [x] 단일 계정 체계(고객/직원/관리자)와 서버측 권한 게이트
- [x] 고객 간편 회원가입·로그인 (이메일 + Google SNS)
- [x] 발코니 태양광 신청폼 → DB 저장 → 마이페이지 진행 추적
- [x] 문의 폼 `mailto:` → DB 접수 전환
- [x] 블로그·쇼츠 DB 화 + 상세 페이지 + 좋아요 + 관리자 발행 화면
- [x] 임직원 업무 공간(WorkShell): 대시보드·문서검색·신청/문의 처리 큐
- [x] LLM Wiki v1: 문서 CRUD, 리비전, `[[링크]]`, lint, ACL 기반 AI 질의
- [x] **LLM Wiki v2 (진단 실무화)**: 데이터 컨트랙트 11개 필드, 업종 택소노미 12종,
      수치 계산 엔진(P2), 계수 SSOT, Lint 9종, BM25 검색, 진단 원장,
      유사사례(UC1)·ECM 추천(UC2)·보고서 초안(UC3)·벤치마크(UC4)
- [x] 기존 `/staff` 공개 포털 → 권한이 있는 `/work` 로 이관, `public/legacy/` 아카이브 유지

## 8. 다음 단계 (권장 순서)

| Phase | 내용 | 이유 |
| --- | --- | --- |
| 2-1 | 진단보고서 PDF 업로드 → 파싱 → 위키 초안 생성 | 위키에 문서가 쌓여야 AI 질의가 의미를 갖는다 |
| 2-2 | Dense 검색 채널 추가 후 BM25 와 RRF 융합 (문서 100건 이상 시) | 현재는 BM25 단일 채널. 베이스라인은 이미 구현됨 |
| 2-3 | 카카오·네이버 로그인 추가 | 국내 고객 전환율에 가장 크게 작용 |
| 3-1 | 신청 상태 변경 시 고객 알림(메일/알림톡) | 지금은 고객이 마이페이지를 직접 열어야 한다 |
| 3-2 | 콘텐츠→신청 전환 퍼널 대시보드 | 어떤 콘텐츠가 매출로 이어지는지 측정 |
