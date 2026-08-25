-- 005_wiki_upgrade.sql — LLM Wiki v2 (에너지진단 실무화)
--
-- 기획서 `[ETS_에너지진단_llmwiki.md` 의 데이터 컨트랙트(4.2), 업종 택소노미,
-- P2(숫자는 LLM 이 생성하지 않는다), P5(ACL 이 모델 라우팅을 결정한다)를 스키마로 옮긴다.

-- ── 1. 위키 데이터 컨트랙트 확장 ───────────────────────────────────────────
ALTER TABLE wiki_pages ADD COLUMN sector TEXT NOT NULL DEFAULT 'other';
ALTER TABLE wiki_pages ADD COLUMN measurementBasis TEXT NOT NULL DEFAULT 'documented';
ALTER TABLE wiki_pages ADD COLUMN measurementPeriod TEXT NOT NULL DEFAULT '';
ALTER TABLE wiki_pages ADD COLUMN confidence TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE wiki_pages ADD COLUMN numericVerified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE wiki_pages ADD COLUMN owner TEXT NOT NULL DEFAULT '';
ALTER TABLE wiki_pages ADD COLUMN validUntil TEXT NOT NULL DEFAULT '';
ALTER TABLE wiki_pages ADD COLUMN contentHash TEXT NOT NULL DEFAULT '';
ALTER TABLE wiki_pages ADD COLUMN ingestedBy TEXT NOT NULL DEFAULT 'human';
ALTER TABLE wiki_pages ADD COLUMN ingestedAt TEXT NOT NULL DEFAULT '';
ALTER TABLE wiki_pages ADD COLUMN pipelineVersion TEXT NOT NULL DEFAULT '';

-- status 를 기획서 값(draft | reviewed | deprecated)으로 통일한다.
UPDATE wiki_pages SET status = 'reviewed' WHERE status = 'published';
UPDATE wiki_pages SET status = 'draft'    WHERE status = 'review';

CREATE INDEX IF NOT EXISTS idx_wiki_pages_sector ON wiki_pages (sector);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_acl ON wiki_pages (acl);

-- ── 2. 진단 프로젝트 (type=diagnosis 의 정량 데이터) ───────────────────────
-- 유사사례 검색(UC1) · 원단위 벤치마크(UC4) 의 원장.
CREATE TABLE IF NOT EXISTS diagnoses (
  id                    TEXT PRIMARY KEY,
  code                  TEXT NOT NULL UNIQUE,          -- dgn-2025-11-hanbit
  facilityName          TEXT NOT NULL,
  sector                TEXT NOT NULL DEFAULT 'other',
  region                TEXT NOT NULL DEFAULT '',
  auditYear             INTEGER NOT NULL DEFAULT 0,
  unitBasisValue        REAL    NOT NULL DEFAULT 0,     -- 연면적/생산량/처리량 등 분모
  unitBasisNote         TEXT    NOT NULL DEFAULT '',
  annualElectricityKwh  REAL    NOT NULL DEFAULT 0,
  annualFuelToe         REAL    NOT NULL DEFAULT 0,
  annualEnergyToe       REAL    NOT NULL DEFAULT 0,     -- 코드 계산값 (P2)
  annualGhgTco2eq       REAL    NOT NULL DEFAULT 0,     -- 코드 계산값 (P2)
  energyIntensity       REAL    NOT NULL DEFAULT 0,     -- toe / unitBasisValue
  measurementBasis      TEXT    NOT NULL DEFAULT 'documented',
  measurementPeriod     TEXT    NOT NULL DEFAULT '',
  acl                   TEXT    NOT NULL DEFAULT 'confidential',
  numericVerified       INTEGER NOT NULL DEFAULT 0,
  wikiSlug              TEXT    NOT NULL DEFAULT '',    -- 연결된 위키 문서
  equipmentTags         TEXT    NOT NULL DEFAULT '',    -- 보일러, 냉동기 …
  note                  TEXT    NOT NULL DEFAULT '',
  ownerId               TEXT,
  createdAt             TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt             TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_diagnoses_sector ON diagnoses (sector);
CREATE INDEX IF NOT EXISTS idx_diagnoses_year ON diagnoses (auditYear);

-- ── 3. 진단 건에 적용한 ECM 실적 ──────────────────────────────────────────
-- ECM 카드(measure 위키)의 "적용 사례" 를 정량으로 받는 테이블.
-- 회수기간은 저장값이 아니라 calc 로 재산출해 검산한다.
CREATE TABLE IF NOT EXISTS diagnosis_measures (
  id                TEXT PRIMARY KEY,
  diagnosisId       TEXT NOT NULL,
  measureSlug       TEXT NOT NULL,                  -- wiki_pages.slug (type=measure)
  savingToe         REAL NOT NULL DEFAULT 0,
  savingKwh         REAL NOT NULL DEFAULT 0,
  annualSavingKrw   REAL NOT NULL DEFAULT 0,
  investmentKrw     REAL NOT NULL DEFAULT 0,
  paybackYears      REAL NOT NULL DEFAULT 0,        -- 코드 계산값
  adopted           INTEGER NOT NULL DEFAULT 0,
  adoptionNote      TEXT NOT NULL DEFAULT '',
  numericVerified   INTEGER NOT NULL DEFAULT 0,
  createdAt         TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_diagnosis_measures_diagnosisId ON diagnosis_measures (diagnosisId);
CREATE INDEX IF NOT EXISTS idx_diagnosis_measures_measureSlug ON diagnosis_measures (measureSlug);

-- ── 4. 환산계수·단가 SSOT (units.yaml 대응) ───────────────────────────────
-- P2 의 집행 장치. 모든 계산은 이 표의 값만 쓰고, 값의 출처와 유효기간을 남긴다.
CREATE TABLE IF NOT EXISTS energy_factors (
  code       TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'toe',        -- toe | ghg | price
  value      REAL NOT NULL,
  unit       TEXT NOT NULL,
  source     TEXT NOT NULL DEFAULT '',
  validFrom  TEXT NOT NULL DEFAULT '',
  validUntil TEXT NOT NULL DEFAULT '',
  verified   INTEGER NOT NULL DEFAULT 0,          -- 담당자가 고시 원문으로 확인했는가
  updatedAt  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
