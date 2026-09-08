# LLM Wiki 는 별도 저장소에 있습니다

**https://github.com/kimeastsky2019/llmwiki.git**

이 저장소(ETS)에 있던 `LLMWiki/` 사본은 2026-09-08 에 제거했습니다.
같은 코드가 두 곳에서 각각 커밋되면서 어느 쪽이 최신인지 알 수 없게 되었고,
실제로 한쪽에만 있는 작업이 양방향으로 생겼기 때문입니다.

## 역할 구분

| 저장소 | 담당 |
| --- | --- |
| `llmwiki.git` | LLM Wiki **코드** — 백엔드(`llmwiki/`), 프런트(`web/`), 배포 스크립트 |
| `ETS.git` (여기) | 회사 산출물과 다른 서비스 — `planning/`, `Intro_web/`, `RAG-AI_Gov/` |

`planning/`(AI거버넌스 컨설팅 산출물 44건)은 llmwiki.git 이 `.gitignore` 로
제외하는 자료라 이 저장소 루트로 옮겨 두었습니다.

## 받는 법

```bash
git clone https://github.com/kimeastsky2019/llmwiki.git
```

## 브랜치 현황 (2026-09-08 기준)

정리가 필요한 상태입니다. 병합 전 확인하세요.

| 브랜치 | main 대비 | 마지막 작업 | 비고 |
| --- | --- | --- | --- |
| `main` | — | 2026-08-16 | 정체됨. 아래 작업들이 반영돼 있지 않다 |
| `feature/nanogrid-portal` | +38 | 2026-09-07 | 가장 활발. 인증·역할(`auth.py`·`roles.ts`·`Login.tsx`), 컴플라이언스 모듈, GPU 서버 배포 세트 |
| `sport` | +15 | 2026-09-08 | 설계 문서(데이터 거버넌스·진단 사이클 기획) |
| `feat/grok-upload-provider-switch` | +10 | 2026-08-18 | AI 위험등급 산정, sLM 조언자 |
| `feat/onprem-llm-wiki-integration` | +1 | 2026-08-30 | 진단 위키·RAG 연동, 체크리스트 API |

**`main` 을 기준으로 삼지 마세요** — 네 갈래의 작업이 아직 각자 브랜치에 있습니다.

## 배포

서버 `/opt/llmwiki` (work.ets0404.com) 는 git 체크아웃이 아니라 rsync 배포본입니다.
절차는 llmwiki.git 의 `deploy/README.md` 를 참고하세요.
