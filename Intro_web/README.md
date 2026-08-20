# 에너지기술서비스(주) 소개 웹

회사 소개 웹사이트(ets0404.com)입니다. 에너지진단 · ESCO · 신재생에너지 ·
데이터 사업 안내와 발코니 태양광 판매 페이지를 제공합니다.

- 회사: 에너지기술서비스(주)
- 주소: 서울특별시 금천구 가산디지털1로 1, 더루벤스밸리 1108호
- 전화: 02-3667-0404 / 이메일: ets0404@naver.com

스캐폴드(`coding-agent-web-template`) 위에 만들어졌기 때문에 소개 사이트가 쓰지 않는
인증·DB·스토리지 기능이 백엔드에 함께 들어 있습니다. 아래 문서는 실제로 코드에 있는
것을 그대로 기술합니다.

## 페이지 구성

`apps/client/src/App.tsx`의 라우팅:

| 경로 | 화면 |
| --- | --- |
| `/` | 홈 |
| `/company` | 회사 소개 |
| `/business` | 사업 안내 |
| `/performance` | 사업 실적 |
| `/staff` | 조직·인력 |
| `/solar-store` | 발코니 태양광 스토어 |
| `/media` | 미디어·자료 |
| `/contact` | 문의 |
| 그 외 | Not Found |

페이지 본문은 `apps/client/src/pages/site/Pages.tsx`에 모여 있고, 공통 레이아웃은
`apps/client/src/components/site/SiteShell.tsx`입니다.

### 레거시 정적 페이지

기존 사이트의 HTML 36개를 `apps/client/public/legacy/`에 그대로 보존하고 있습니다
(기업소개, CEO 인사말, 연혁, 조직도, 사업면허, 에너지 진단, ESCO, 신재생에너지,
태양광, 기계설비 성능점검, 스마트제조, 데이터바우처, 디지털 트윈, 연도별 실적 등).
`/media` 페이지의 자료 검색이 이 파일들을 가리킵니다. `public/`은 빌드 시 그대로
복사되므로 `dist/legacy/`에도 동일한 사본이 생깁니다.

## 구조

```txt
apps/client      React 19 + Vite(rolldown-vite) + Tailwind + shadcn/ui
apps/server      Hono 백엔드, Better Auth, Drizzle ORM over libsql
packages/shared  응답 헬퍼 공유 코드
scripts          lint / build / 계약 검사 스크립트
```

## 로컬 개발

```bash
pnpm install
cd apps/client
pnpm dev
```

`http://localhost:3100/` 으로 접속합니다. Vite 개발 서버가 같은 오리진의 `/api/*`에
Hono 백엔드를 마운트하고, history 라우트도 함께 처리합니다.

> **주의 — 소스가 iCloud에서 내려오지 않습니다.**
> 로컬 작업 폴더(`~/Documents/Webpage/ETS/Intro_web`)의 소스 78개가 iCloud
> 플레이스홀더(`.App.tsx.icloud` 등) 상태이고 `brctl download`로 복구되지 않습니다.
> 이 저장소의 트리는 완전하므로, 로컬에서 빌드하려면 저장소를 clone해서 쓰세요.

## 빌드

```bash
cd apps/client && pnpm build          # 프론트엔드 → apps/client/dist
cd apps/server && pnpm build          # 백엔드(FC 이벤트 어댑터 엔트리)
cd apps/server && SERVER_BUILD_TARGET=web pnpm build   # 장기 실행 web 엔트리 (Docker용)
```

백엔드 빌드 결과는 `apps/server/dist/index.js` 하나로 번들됩니다. Node 내장 모듈만
사용하므로 런타임에 `node_modules`가 필요 없고, 그래서 이 파일만 예외적으로
저장소에 추적됩니다(`.gitignore` 하단 참고 — 이 예외를 지우면 배포가 깨집니다).

### 검사

```bash
pnpm --filter server exec tsc -p tsconfig.json --noEmit
pnpm --filter server build
pnpm --filter client exec tsc -p tsconfig.app.json --noEmit
pnpm --filter client build
```

루트에서 `pnpm lint`, `pnpm test`, `pnpm check:contract`도 쓸 수 있습니다.

## 배포

Ubuntu 26.04 VM `211.119.38.148` (`ssh ubuntu@`, 키는 로컬 `ETS/dhkim-key.pem` — 저장소에 없음).

| 구성 요소 | 위치 |
| --- | --- |
| 정적 프론트엔드 | nginx가 `/var/www/ets0404` 서빙 |
| 백엔드 | `/opt/ets-server`, `ets-server` systemd 유닛, `127.0.0.1:9901` |
| 연결 | nginx `/api/` 프록시 |

소스 변경 없이 다시 배포할 때는 `apps/client/dist`와 `apps/server/dist`만 올리면 됩니다.

저장소의 `apps/client/nginx.conf`는 **컨테이너 이미지용**(8080 포트) 설정입니다.
운영 서버의 nginx 설정은 서버의 `/etc/nginx`에 따로 있습니다.

### HTTPS (준비만 되어 있음)

```bash
sudo ets-enable-https      # 인증서 발급 + HTTPS 서빙 (HTTP는 계속 동작)
sudo ets-enforce-https --yes   # 리다이렉트 + HSTS — 아래 조건 충족 후에만
```

`ets-enforce-https`는 **외부 망에서 443 접속이 확인된 뒤에만** 실행하세요. 현재
인바운드 443이 제공업체에서 차단되어 있고 `ets0404.com` DNS도 아직 AWS의 구 사이트를
가리킵니다. 서버에서 자기 공인 IP로 포트를 확인하면 헤어핀 때문에 항상 열린 것처럼
보이므로 신뢰할 수 없습니다. 조건 충족 전에 리다이렉트를 켜면 사이트가 접속 불가가 됩니다.

## 백엔드 API

`apps/server/routes/<name>.route.ts` 파일이 빌드 시 자동 탐색되어 `/api/<name>`에
마운트됩니다(`apps/server/_core/route-registry.ts`). 라우트를 추가하려면 파일만
넣으면 되고 별도 배선은 필요 없습니다.

```txt
/api/ai
/api/auth-config
/api/email-verification
/api/health
/api/me
/api/storage
/api/third-party-google-auth
/api/todos
/api/auth/*        (Better Auth)
```

`/api/todos`는 스캐폴드의 데모 CRUD이며 소개 사이트에서 쓰지 않습니다
(`apps/server/migrations/001_init.sql`의 `todos` 테이블).

프론트엔드에서는 공유 래퍼를 씁니다:

```ts
import { apiFetch } from "@/lib/api";
```

`apiFetch()`는 Better Auth 베어러 토큰을 자동으로 붙이고, 2xx가 아닌 응답에 토스트를 띄웁니다.

### 인증

Better Auth가 `/api/auth/*`를 처리합니다. 지원 방식은 아이디+비밀번호, 이메일+비밀번호,
Google 환경변수가 있을 때의 Google 로그인, API 호출용 베어러 토큰입니다. 인증 데이터는
Drizzle 어댑터를 통해 skybase-db에 저장되며, 필요한 테이블은 앱 런타임이 아니라 에이전트
DB 툴링이 만듭니다.

## 런타임 환경변수

프론트엔드 환경변수는 공개되므로 반드시 `VITE_` 접두사를 씁니다.
백엔드 DB 환경변수는 skybase-controller가 현재 `session_id`에 맞춰 주입합니다.
로컬 `.env`는 개발·디버깅용입니다.

| Env | 필수 | 출처 | 용도 |
| --- | --- | --- | --- |
| `SKYBASE_DB_ENDPOINT` | DB API 사용 시 | skybase-controller | 세션의 sqld/libsql 엔드포인트 (예: `http://10.59.118.218:8080`) |
| `SKYBASE_DB_TOKEN` / `SKYBASE_DB_AUTH_TOKEN` | DB API 사용 시 | skybase-controller | libsql rw 토큰. `Authorization: Bearer <token>`로 전송 |
| `SKYBASE_DB_NAMESPACE` | DB API 사용 시 | skybase-controller | libsql 요청의 `x-namespace` 테넌트 네임스페이스 |
| `BETTER_AUTH_SECRET` | 운영 권장 | 배포 설정 / 개발 시 `.env` | Better Auth 서명 시크릿 |
| `BETTER_AUTH_URL` | 예 | 배포 설정 / 개발 시 `.env` | 공개 인증 베이스 URL (예: `http://localhost:3100/api/auth`) |
| `ALLOWED_ORIGINS` | 예 | 배포 설정 / 개발 시 `.env` | 쉼표로 구분한 CORS 오리진 |
| `GOOGLE_CLIENT_ID` | 선택 | OAuth 설정 | `GOOGLE_CLIENT_SECRET`와 함께 있으면 Google 로그인 활성화 |
| `GOOGLE_CLIENT_SECRET` | 선택 | OAuth 설정 | `GOOGLE_CLIENT_ID`와 함께 있으면 Google 로그인 활성화 |

`SKYBASE_DB_TOKEN` / `SKYBASE_DB_AUTH_TOKEN`은 Better Auth 세션 토큰이나 사용자 토큰,
skybase-controller의 `X-Auth-Token`이 **아닙니다.** 이 백엔드 런타임에 주입되는 libsql
데이터베이스 토큰입니다. 코드가 두 이름을 `env.SKYBASE_DB_TOKEN`으로 정규화하며, 둘 다
있으면 `SKYBASE_DB_AUTH_TOKEN`이 우선합니다.

로컬 개발용 루트 `.env` 예시:

```env
SKYBASE_DB_ENDPOINT=http://127.0.0.1:8080
SKYBASE_DB_AUTH_TOKEN=...
SKYBASE_DB_NAMESPACE=local
BETTER_AUTH_SECRET=replace-with-a-local-secret
BETTER_AUTH_URL=http://localhost:3100/api/auth
ALLOWED_ORIGINS=http://localhost:3100
```

Vite가 `3101` 같은 대체 포트로 뜨면 `BETTER_AUTH_URL`과 `ALLOWED_ORIGINS`도 그 포트로 맞추세요.

`BETTER_AUTH_SECRET`이 없어도 기동은 되지만 템플릿 기본값으로 폴백합니다. 실제 사용자
인증을 쓰기 전에 안정적인 무작위 값을 설정하세요. `SKYBASE_DB_ENDPOINT` / 토큰 /
`SKYBASE_DB_NAMESPACE`가 없어도 `/api/health`는 응답하지만, DB를 쓰는 API와
`/api/auth/*`는 `DATABASE_UNCONFIGURED`를 반환합니다.

앱 런타임은 DB 인스턴스 생성, 테이블 생성, 마이그레이션 실행, 시드를 하지 않습니다.
DB 프로비저닝과 배포 환경변수 주입은 controller가, Drizzle 스키마 설정과 마이그레이션은
에이전트 툴링의 `setup_database` 단계가 담당합니다.

## Docker

web 엔트리를 먼저 빌드한 뒤 이미지를 만듭니다.

```bash
cd apps/server
SERVER_BUILD_TARGET=web pnpm build
cd ../..
docker build -t ets-intro-web-api .
```

이미지는 기존 빌드 산출물 `apps/server/dist/index.js`를 복사해 실행하며,
루트 `package.json`의 start 스크립트로 `npm start`를 지원합니다. 로컬 컨테이너
디버깅용 환경변수는 저장소에 커밋하지 말고 컨테이너 툴링으로 주입하세요.
