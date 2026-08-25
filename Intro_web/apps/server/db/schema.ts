import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  role: text("role").default("user"),
  username: text("username").unique(),
  displayUsername: text("displayUsername"),
  // ETS 통합 플랫폼 확장 (migrations/004_platform.sql)
  memberType: text("memberType").notNull().default("customer"),
  phone: text("phone"),
  department: text("department")
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull()
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
});

export const todos = sqliteTable(
  "todos",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").notNull(),
    title: text("title").notNull(),
    done: integer("done", { mode: "boolean" }).notNull().default(false),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [index("idx_todos_userId").on(table.userId)]
);

export const storageFiles = sqliteTable(
  "storage_files",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId"),
    gatewayFileId: text("gatewayFileId"),
    fileName: text("fileName").notNull(),
    fileSuffix: text("fileSuffix").notNull(),
    contentType: text("contentType").notNull().default("application/octet-stream"),
    fileSize: integer("fileSize").notNull(),
    objectKey: text("objectKey").notNull(),
    path: text("path").notNull(),
    downloadUrl: text("downloadUrl").notNull(),
    status: text("status", { enum: ["pending", "uploaded", "failed", "deleted"] }).notNull().default("pending"),
    errorMessage: text("errorMessage"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    index("idx_storage_files_userId").on(table.userId),
    index("idx_storage_files_objectKey").on(table.objectKey),
    index("idx_storage_files_status").on(table.status)
  ]
);

export const aiBusinessScenes = sqliteTable(
  "ai_business_scenes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sceneKey: text("scene_key").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    definition: text("definition").notNull().default("{}"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [index("idx_ai_business_scenes_scene_key").on(table.sceneKey)]
);

export const posts = sqliteTable(
  "posts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    slug: text("slug").notNull().unique(),
    type: text("type", { enum: ["blog", "shorts"] }).notNull().default("blog"),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    body: text("body").notNull().default(""),
    tag: text("tag").notNull().default(""),
    coverImage: text("coverImage"),
    videoUrl: text("videoUrl"),
    duration: text("duration").notNull().default(""),
    status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
    authorId: text("authorId"),
    viewCount: integer("viewCount").notNull().default(0),
    likeCount: integer("likeCount").notNull().default(0),
    publishedAt: text("publishedAt"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [index("idx_posts_status").on(table.status), index("idx_posts_type").on(table.type)]
);

export const postLikes = sqliteTable("post_likes", {
  postId: text("postId").notNull(),
  userId: text("userId").notNull(),
  createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const solarApplications = sqliteTable(
  "solar_applications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").notNull(),
    applicantName: text("applicantName").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    postalCode: text("postalCode").notNull().default(""),
    address: text("address").notNull(),
    buildingType: text("buildingType").notNull().default("apartment"),
    balconyDirection: text("balconyDirection").notNull().default("south"),
    balconyWidth: text("balconyWidth").notNull().default(""),
    monthlyBill: integer("monthlyBill").notNull().default(0),
    packageId: text("packageId").notNull().default(""),
    packageName: text("packageName").notNull().default(""),
    quantity: integer("quantity").notNull().default(1),
    visitPreference: text("visitPreference").notNull().default(""),
    note: text("note").notNull().default(""),
    privacyAgreed: integer("privacyAgreed", { mode: "boolean" }).notNull().default(false),
    status: text("status", {
      enum: ["received", "reviewing", "surveying", "quoted", "closed"]
    })
      .notNull()
      .default("received"),
    assigneeId: text("assigneeId"),
    staffMemo: text("staffMemo").notNull().default(""),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    index("idx_solar_applications_userId").on(table.userId),
    index("idx_solar_applications_status").on(table.status)
  ]
);

export const inquiries = sqliteTable(
  "inquiries",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId"),
    type: text("type").notNull().default("기타"),
    name: text("name").notNull(),
    company: text("company").notNull().default(""),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull(),
    message: text("message").notNull(),
    status: text("status", { enum: ["received", "handling", "done"] }).notNull().default("received"),
    assigneeId: text("assigneeId"),
    staffMemo: text("staffMemo").notNull().default(""),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [index("idx_inquiries_status").on(table.status)]
);

export const wikiPages = sqliteTable(
  "wiki_pages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    slug: text("slug").notNull().unique(),
    // 기획서 4.1 엔티티 타입 (닫힌 집합)
    type: text("type", {
      enum: [
        "source",
        "facility",
        "equipment",
        "measure",
        "metric",
        "regulation",
        "vendor",
        "diagnosis",
        "concept"
      ]
    })
      .notNull()
      .default("concept"),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    body: text("body").notNull().default(""),
    tags: text("tags").notNull().default(""),
    // ACL 4단계 (기획서 4.2) — confidential 이상은 외부 모델 경로를 타지 못한다.
    acl: text("acl", { enum: ["public", "internal", "confidential", "restricted"] })
      .notNull()
      .default("internal"),
    status: text("status", { enum: ["draft", "reviewed", "deprecated"] }).notNull().default("draft"),
    sourceRef: text("sourceRef").notNull().default(""),
    ownerId: text("ownerId"),
    version: integer("version").notNull().default(1),
    // ── 데이터 컨트랙트 확장 (005_wiki_upgrade.sql) ──
    sector: text("sector").notNull().default("other"),
    measurementBasis: text("measurementBasis", {
      enum: ["measured", "estimated", "design", "documented"]
    })
      .notNull()
      .default("documented"),
    measurementPeriod: text("measurementPeriod").notNull().default(""),
    confidence: text("confidence", { enum: ["high", "medium", "low"] }).notNull().default("medium"),
    numericVerified: integer("numericVerified", { mode: "boolean" }).notNull().default(false),
    owner: text("owner").notNull().default(""),
    validUntil: text("validUntil").notNull().default(""),
    contentHash: text("contentHash").notNull().default(""),
    ingestedBy: text("ingestedBy").notNull().default("human"),
    ingestedAt: text("ingestedAt").notNull().default(""),
    pipelineVersion: text("pipelineVersion").notNull().default(""),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    index("idx_wiki_pages_type").on(table.type),
    index("idx_wiki_pages_status").on(table.status),
    index("idx_wiki_pages_sector").on(table.sector),
    index("idx_wiki_pages_acl").on(table.acl)
  ]
);

export const wikiRevisions = sqliteTable(
  "wiki_revisions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pageId: text("pageId").notNull(),
    version: integer("version").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    note: text("note").notNull().default(""),
    editorId: text("editorId"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [index("idx_wiki_revisions_pageId").on(table.pageId)]
);

export const diagnoses = sqliteTable(
  "diagnoses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    code: text("code").notNull().unique(),
    facilityName: text("facilityName").notNull(),
    sector: text("sector").notNull().default("other"),
    region: text("region").notNull().default(""),
    auditYear: integer("auditYear").notNull().default(0),
    unitBasisValue: real("unitBasisValue").notNull().default(0),
    unitBasisNote: text("unitBasisNote").notNull().default(""),
    annualElectricityKwh: real("annualElectricityKwh").notNull().default(0),
    annualFuelToe: real("annualFuelToe").notNull().default(0),
    annualEnergyToe: real("annualEnergyToe").notNull().default(0),
    annualGhgTco2eq: real("annualGhgTco2eq").notNull().default(0),
    energyIntensity: real("energyIntensity").notNull().default(0),
    measurementBasis: text("measurementBasis", {
      enum: ["measured", "estimated", "design", "documented"]
    })
      .notNull()
      .default("documented"),
    measurementPeriod: text("measurementPeriod").notNull().default(""),
    acl: text("acl", { enum: ["public", "internal", "confidential", "restricted"] })
      .notNull()
      .default("confidential"),
    numericVerified: integer("numericVerified", { mode: "boolean" }).notNull().default(false),
    wikiSlug: text("wikiSlug").notNull().default(""),
    equipmentTags: text("equipmentTags").notNull().default(""),
    note: text("note").notNull().default(""),
    ownerId: text("ownerId"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [index("idx_diagnoses_sector").on(table.sector), index("idx_diagnoses_year").on(table.auditYear)]
);

export const diagnosisMeasures = sqliteTable(
  "diagnosis_measures",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    diagnosisId: text("diagnosisId").notNull(),
    measureSlug: text("measureSlug").notNull(),
    savingToe: real("savingToe").notNull().default(0),
    savingKwh: real("savingKwh").notNull().default(0),
    annualSavingKrw: real("annualSavingKrw").notNull().default(0),
    investmentKrw: real("investmentKrw").notNull().default(0),
    paybackYears: real("paybackYears").notNull().default(0),
    adopted: integer("adopted", { mode: "boolean" }).notNull().default(false),
    adoptionNote: text("adoptionNote").notNull().default(""),
    numericVerified: integer("numericVerified", { mode: "boolean" }).notNull().default(false),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    index("idx_diagnosis_measures_diagnosisId").on(table.diagnosisId),
    index("idx_diagnosis_measures_measureSlug").on(table.measureSlug)
  ]
);

export const energyFactors = sqliteTable("energy_factors", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
  category: text("category", { enum: ["toe", "ghg", "price"] }).notNull().default("toe"),
  value: real("value").notNull(),
  unit: text("unit").notNull(),
  source: text("source").notNull().default(""),
  validFrom: text("validFrom").notNull().default(""),
  validUntil: text("validUntil").notNull().default(""),
  verified: integer("verified", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP`)
});

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
export type StorageFile = typeof storageFiles.$inferSelect;
export type NewStorageFile = typeof storageFiles.$inferInsert;
export type AiBusinessScene = typeof aiBusinessScenes.$inferSelect;
export type NewAiBusinessScene = typeof aiBusinessScenes.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type SolarApplication = typeof solarApplications.$inferSelect;
export type NewSolarApplication = typeof solarApplications.$inferInsert;
export type Inquiry = typeof inquiries.$inferSelect;
export type NewInquiry = typeof inquiries.$inferInsert;
export type WikiPage = typeof wikiPages.$inferSelect;
export type NewWikiPage = typeof wikiPages.$inferInsert;
export type Diagnosis = typeof diagnoses.$inferSelect;
export type NewDiagnosis = typeof diagnoses.$inferInsert;
export type DiagnosisMeasure = typeof diagnosisMeasures.$inferSelect;
export type EnergyFactor = typeof energyFactors.$inferSelect;
