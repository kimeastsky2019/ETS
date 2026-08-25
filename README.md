# ETS

에너지기술서비스(주)의 사내 프로젝트 저장소입니다.

에너지진단 · ESCO · 신재생에너지 · 에너지 데이터 사업을 담당하는 회사의
웹 서비스와 솔루션 코드를 한 곳에서 관리합니다.

## 구성

| 디렉터리 | 내용 | 상태 |
| --- | --- | --- |
| [`Intro_web/`](Intro_web) | 회사 소개 웹사이트 (ets0404.com). React 클라이언트 + Hono 백엔드 pnpm 모노레포 | 운영 배포됨 |

로컬 `ETS/` 폴더에는 `LLMwiki`, `RAG-AI_Gov` 프로젝트도 있으나 아직 이 저장소에
올라와 있지 않습니다. 추가할 때는 같은 방식으로 최상위 디렉터리를 하나 더 만듭니다.

## Intro_web 요약

회사 소개 웹사이트입니다. 자세한 내용은 [Intro_web/README.md](Intro_web/README.md)를 보세요.

- **프론트엔드** — React 19 + Vite(rolldown) + Tailwind + shadcn/ui, `react-router` 기반 20개 라우트(공개 사이트 + 고객 계정 + 임직원 워크허브)
- **백엔드** — Hono, Better Auth, Drizzle ORM over libsql. `/api/*`로 마운트
- **레거시 자료** — 기존 사이트의 정적 HTML 36개를 `apps/client/public/legacy/`에 보존
- **배포** — Ubuntu VM `211.119.38.216` (`workweb`). nginx가 `/var/www/ets0404`를 서빙하고,
  백엔드는 `ets-intro` systemd 유닛으로 `127.0.0.1:9901`에서 실행되며 `/api/` 프록시로 연결됩니다.
  DB는 같은 VM의 `sqld`(libsql) 유닛이 `127.0.0.1:8080` 루프백 전용으로 제공합니다.

### 운영 현황

`ets0404.com`은 이 서버를 가리키며 HTTPS로 서비스 중입니다.

| 항목 | 값 |
| --- | --- |
| 서버 | `211.119.38.216` (Ubuntu 24.04, hostname `workweb`) |
| 도메인 | `ets0404.com`, `www` — 그 외 `work`, `rag`, `sllm` 서브도메인 |
| 인증서 | Let's Encrypt (위 5개 도메인 SAN), `certbot.timer`로 자동 갱신 |
| 백엔드 | `ets-intro.service` → `127.0.0.1:9901`, 설정은 `/etc/ets-intro.env` |
| DB | `sqld.service` → `127.0.0.1:8080`, 데이터 `/var/lib/sqld` |

같은 VM에서 `llmwiki`, `rag-api`, `rag-qdrant`, `ollama`도 함께 돌아갑니다.
Intro_web 작업 시 다른 유닛을 재시작하지 않도록 주의하세요.

### 소스 일원화

로컬 · 서버 · 깃이 같은 소스로 운영됩니다.

- 로컬 작업 복사본은 `~/ETS` (이 저장소의 클론). `~/Documents/Webpage/ETS`는 iCloud 동기화
  경로라 파일이 수시로 evict되므로 작업 경로로 쓰지 않습니다.
- 배포는 저장소의 스크립트로만 합니다.

```bash
cd ~/ETS/Intro_web
scripts/deploy.sh                 # 빌드 → 업로드 → 마이그레이션 → 재기동 → 검증
git add apps/server/dist && git commit -m "Rebuild server bundle" && git push
```

`apps/server/dist/`는 배포 방식 때문에 추적되므로, 배포 후 반드시 커밋해야
깃과 서버가 어긋나지 않습니다. 검증은 서버 번들 해시를 맞춰 보면 됩니다.

```bash
shasum -a 256 apps/server/dist/index.js
ssh -i <key> ubuntu@211.119.38.216 sha256sum /opt/ets-intro/apps/server/dist/index.js
```

마이그레이션은 `apps/server/scripts/migrate-db.mjs`가 `_migrations` 테이블을 보고
적용되지 않은 것만 실행합니다(의존성 없음, 재실행 안전).

## 저장소 규칙

- 서버 접속 키(`dhkim-key.pem`)와 같은 비밀 정보는 저장소에 넣지 않습니다. 로컬에만 보관합니다.
- 각 프로젝트는 자체 `.gitignore`를 가집니다. 빌드 산출물 중 `Intro_web/apps/server/dist/`만
  배포 방식 때문에 예외적으로 추적됩니다.
