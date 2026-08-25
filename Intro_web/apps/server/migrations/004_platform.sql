-- 004_platform.sql — ETS 통합 플랫폼 (고객 + 임직원)
-- 고객: 콘텐츠(블로그/쇼츠) 열람, 발코니 태양광 신청, 문의
-- 임직원: LLM Wiki, 신청/문의 처리 큐
-- Better Auth `user` 테이블에 회원 구분(memberType)과 연락처를 확장한다.
-- role(user|admin)은 Better Auth 소유이므로 그대로 두고, 고객/직원 구분만 추가한다.

ALTER TABLE user ADD COLUMN memberType TEXT NOT NULL DEFAULT 'customer';
ALTER TABLE user ADD COLUMN phone TEXT;
ALTER TABLE user ADD COLUMN department TEXT;

CREATE INDEX IF NOT EXISTS idx_user_memberType ON user (memberType);

-- ── 콘텐츠 허브 (블로그 / 쇼츠) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id           TEXT    PRIMARY KEY,
  slug         TEXT    NOT NULL UNIQUE,
  type         TEXT    NOT NULL DEFAULT 'blog',      -- blog | shorts
  title        TEXT    NOT NULL,
  summary      TEXT    NOT NULL DEFAULT '',
  body         TEXT    NOT NULL DEFAULT '',          -- markdown
  tag          TEXT    NOT NULL DEFAULT '',
  coverImage   TEXT,
  videoUrl     TEXT,
  duration     TEXT    NOT NULL DEFAULT '',
  status       TEXT    NOT NULL DEFAULT 'draft',     -- draft | published
  authorId     TEXT,
  viewCount    INTEGER NOT NULL DEFAULT 0,
  likeCount    INTEGER NOT NULL DEFAULT 0,
  publishedAt  TEXT,
  createdAt    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_posts_status ON posts (status);
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts (type);

CREATE TABLE IF NOT EXISTS post_likes (
  postId    TEXT NOT NULL,
  userId    TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (postId, userId)
);

-- ── 발코니 태양광 신청 ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS solar_applications (
  id               TEXT    PRIMARY KEY,
  userId           TEXT    NOT NULL,
  applicantName    TEXT    NOT NULL,
  phone            TEXT    NOT NULL,
  email            TEXT    NOT NULL,
  postalCode       TEXT    NOT NULL DEFAULT '',
  address          TEXT    NOT NULL,
  buildingType     TEXT    NOT NULL DEFAULT 'apartment',
  balconyDirection TEXT    NOT NULL DEFAULT 'south',
  balconyWidth     TEXT    NOT NULL DEFAULT '',
  monthlyBill      INTEGER NOT NULL DEFAULT 0,
  packageId        TEXT    NOT NULL DEFAULT '',
  packageName      TEXT    NOT NULL DEFAULT '',
  quantity         INTEGER NOT NULL DEFAULT 1,
  visitPreference  TEXT    NOT NULL DEFAULT '',
  note             TEXT    NOT NULL DEFAULT '',
  privacyAgreed    INTEGER NOT NULL DEFAULT 0,
  status           TEXT    NOT NULL DEFAULT 'received', -- received | reviewing | surveying | quoted | closed
  assigneeId       TEXT,
  staffMemo        TEXT    NOT NULL DEFAULT '',
  createdAt        TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt        TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_solar_applications_userId ON solar_applications (userId);
CREATE INDEX IF NOT EXISTS idx_solar_applications_status ON solar_applications (status);

-- ── 일반 문의 ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inquiries (
  id         TEXT PRIMARY KEY,
  userId     TEXT,
  type       TEXT NOT NULL DEFAULT '기타',
  name       TEXT NOT NULL,
  company    TEXT NOT NULL DEFAULT '',
  phone      TEXT NOT NULL DEFAULT '',
  email      TEXT NOT NULL,
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'received',        -- received | handling | done
  assigneeId TEXT,
  staffMemo  TEXT NOT NULL DEFAULT '',
  createdAt  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries (status);

-- ── LLM Wiki (임직원 지식 베이스) ─────────────────────────────────────────
-- 기획서(LLMwiki)의 데이터 컨트랙트를 관계형으로 최소 구현한 형태.
-- acl='confidential' 문서는 외부 LLM 라우팅에서 제외한다(P5).
CREATE TABLE IF NOT EXISTS wiki_pages (
  id        TEXT    PRIMARY KEY,
  slug      TEXT    NOT NULL UNIQUE,
  type      TEXT    NOT NULL DEFAULT 'concept',   -- source|facility|equipment|measure|concept|regulation
  title     TEXT    NOT NULL,
  summary   TEXT    NOT NULL DEFAULT '',
  body      TEXT    NOT NULL DEFAULT '',          -- markdown ([[wikilink]] 지원)
  tags      TEXT    NOT NULL DEFAULT '',
  acl       TEXT    NOT NULL DEFAULT 'internal',  -- internal | confidential
  status    TEXT    NOT NULL DEFAULT 'draft',     -- draft | review | published
  sourceRef TEXT    NOT NULL DEFAULT '',
  ownerId   TEXT,
  version   INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wiki_pages_type ON wiki_pages (type);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_status ON wiki_pages (status);

CREATE TABLE IF NOT EXISTS wiki_revisions (
  id        TEXT    PRIMARY KEY,
  pageId    TEXT    NOT NULL,
  version   INTEGER NOT NULL,
  title     TEXT    NOT NULL,
  body      TEXT    NOT NULL,
  note      TEXT    NOT NULL DEFAULT '',
  editorId  TEXT,
  createdAt TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wiki_revisions_pageId ON wiki_revisions (pageId);
