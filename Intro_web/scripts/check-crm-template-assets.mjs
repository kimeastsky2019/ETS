import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const assetsRoot = resolve(root, ".skywork/business-template-assets/crm");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function requireFile(path) {
  assert.ok(existsSync(path), `expected ${path} to exist`);
  return readFileSync(path, "utf8");
}

const catalog = readJson(resolve(assetsRoot, "catalog.json"));
assert.equal(catalog.schemaVersion, 2);
assert.equal(catalog.id, "crm-website-preset-v1");
assert.equal(catalog.projectMode, "standard-self-host-website");
assert.equal(catalog.entryPath, "/");
assert.equal(catalog.agentGuide.templatePath, "AGENTS.crm.md");
assert.equal(catalog.agentGuide.generatedPath, "AGENTS.crm.md");
assert.equal(catalog.runtimeContractPath, "runtime-contract.json");
assert.equal(catalog.sourceRegistrySchemaPath, "source-registry.schema.json");
assert.equal(catalog.uiFoundation.version, 1);
assert.equal(catalog.uiFoundation.sourcePath, "ui-foundation");
assert.equal(catalog.uiFoundation.targetPath, "apps/client/src/crm/foundation");
assert.equal(catalog.uiFoundation.entryPath, "apps/client/src/crm/foundation/index.ts");
assert.equal(catalog.auth.defaultMode, "local-admin-v1");
assert.equal(catalog.auth.presetPath, "auth/local-admin-v1");
assert.equal(catalog.auth.contractPath, "auth/local-admin-v1/contract.json");
assert.equal(catalog.auth.overlayRoot, "auth/local-admin-v1/overlay");
assert.equal(catalog.validation.generatedInspectorPath, "scripts/inspect-crm-state.mjs");
assert.ok(catalog.materialization.deletePaths.includes("apps/server/migrations/000_auth.sql"));
assert.ok(catalog.materialization.deletePaths.includes("apps/server/migrations/002_storage_files.sql"));
assert.ok(!catalog.materialization.deletePaths.includes("apps/server/routes/storage.route.ts"));
assert.ok(!catalog.materialization.deletePaths.includes("apps/server/services/s3_storage.ts"));
assert.ok(catalog.materialization.deletePaths.includes("apps/server/routes/todos.route.ts"));
assert.doesNotMatch(JSON.stringify(catalog), /embedded|__skywork\/crm|business_crm_access/i);

for (const legacyPath of [
  "auth/embedded-auth-v1",
  "common",
  "shell"
]) assert.equal(existsSync(resolve(assetsRoot, legacyPath)), false, `legacy CRM asset must not exist: ${legacyPath}`);

const guide = requireFile(resolve(assetsRoot, catalog.agentGuide.templatePath));
for (const required of [
  "Required Execution Order",
  ".skywork/web-apps.json",
  "source-registry.json",
  "source-registry.schema.json",
  "Source Capabilities",
  "source-registry schema v2",
  "CRM services own operator-side authorization",
  "CRM route -> CRM service -> typed adapter -> shared Website database",
  "requiredRelations",
  "select one customer",
  "unpublish is not archive",
  "draft-only precondition",
  "SKU-level inventory",
  "runtime-reference/publish-contract.md",
  "Non-matching sources do not read or install the publish-chain package",
  "sourceWebsiteId",
  "crm_",
  "For images managed in CRM and displayed by a source Website, use the existing `/api/storage` API",
  "CRM migrations must not create or alter `storage_files`",
  "first successfully registered account becomes the administrator",
  "CRM Information Architecture",
  "CRM Functional Requirements",
  "visible primary navigation for its business modules",
  "selected scenario's visual language",
  "those requirements take precedence over the selected scenario reference",
  "compact operator-console composition",
  "source Website selector",
  "Filter, Refresh, Create, and pagination",
  "Do not render Notifications, Help Centre",
  "CRM inspector `ready` means the generated project has the required structural contract",
  "It does not certify CRM workflows, RBAC behavior, mutations, source invariants, or browser interactions",
  "record its ID in `.skywork/crm/selection.json`",
  "ui-reference/CrmScenarioReference.tsx",
  "At handoff, report the selected scenario"
]) assert.match(guide, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
assert.doesNotMatch(guide, /schemaFingerprint|bindingFingerprint|validatedSourceHash|sourceHashMatches/);
assert.match(guide, /Do not use schema fingerprints or stale hashes/i);
assert.doesNotMatch(guide, /website skill/i);

for (const foundationFile of [
  "index.ts", "types.ts", "status-colors.ts", "CrmAppShell.tsx", "CrmSidebar.tsx",
  "CrmMobileNavigation.tsx", "CrmToolbar.tsx", "CrmMetricGrid.tsx", "CrmTrendChart.tsx",
  "CrmStatusChart.tsx", "CrmDataTable.tsx", "CrmPagination.tsx"
]) requireFile(resolve(assetsRoot, catalog.uiFoundation.sourcePath, foundationFile));

const sharedReference = requireFile(resolve(assetsRoot, "ui-reference/CrmScenarioReference.tsx"));
assert.match(sharedReference, /from "\.\.\/ui-foundation"/);
assert.match(sharedReference, /CrmAppShell/);
assert.match(sharedReference, /CrmToolbar/);

const runtime = readJson(resolve(assetsRoot, catalog.runtimeContractPath));
assert.equal(runtime.schemaVersion, 2);
assert.equal(runtime.id, "crm-runtime-contract-v2");
assert.equal(runtime.paths.workspaceManifest, ".skywork/web-apps.json");
assert.equal(runtime.paths.sourceRegistry, "apps/server/crm/source-registry.json");
assert.equal(runtime.paths.sourceRegistrySchema, ".skywork/crm/templates/source-registry.schema.json");
assert.equal(runtime.paths.adapterPattern, "apps/server/crm/adapters/<websiteId>.ts");
assert.equal(Object.hasOwn(runtime.paths, "validationResult"), false);
assert.equal(Object.hasOwn(runtime, "validation"), false);
assert.deepEqual(runtime.identity.supportStatuses, ["supported", "unsupported"]);
assert.equal(runtime.identity.querySourceIdField, "sourceWebsiteId");
assert.equal(runtime.identity.querySourceNameField, "sourceName");
assert.equal(runtime.ownership.crmTablePrefix, "crm_");

const sourceRegistrySchema = readJson(resolve(assetsRoot, catalog.sourceRegistrySchemaPath));
assert.equal(sourceRegistrySchema.$id, "https://skywork.ai/schemas/crm/source-registry-v2.json");
assert.equal(sourceRegistrySchema.additionalProperties, false);
assert.match(sourceRegistrySchema.description, /allowlist for generated CRM UI actions and server operations/i);
assert.deepEqual(sourceRegistrySchema.required, ["schemaVersion", "sources"]);
assert.equal(sourceRegistrySchema.$defs.source.additionalProperties, false);
assert.equal(sourceRegistrySchema.$defs.entity.additionalProperties, false);
assert.equal(sourceRegistrySchema.$defs.relationship.additionalProperties, false);
assert.equal(sourceRegistrySchema.$defs.operation.additionalProperties, false);
assert.match(sourceRegistrySchema.$defs.operation.description, /CRM-executable capability/i);
assert.deepEqual(sourceRegistrySchema.$defs.operation.required, ["id", "kind", "adapterMethod"]);
assert.ok(sourceRegistrySchema.$defs.operation.properties.kind.enum.includes("transition"));
assert.ok(sourceRegistrySchema.$defs.operation.properties.kind.enum.includes("reserve"));
assert.ok(sourceRegistrySchema.examples[0].sources.some((source) => source.supportStatus === "supported"));
assert.ok(sourceRegistrySchema.examples[0].sources.some((source) => source.supportStatus === "unsupported"));

const physicalCommerceRoot = resolve(assetsRoot, "scenarios/physical-commerce-v1");
const physicalCommerceContract = readJson(resolve(physicalCommerceRoot, "contract.json"));
assert.deepEqual(physicalCommerceContract.operatorCapabilities.products, ["list", "read", "create", "update", "publish", "unpublish", "archive"]);
assert.deepEqual(physicalCommerceContract.operatorCapabilities.customers, ["list", "read", "create", "update", "archive"]);
assert.deepEqual(physicalCommerceContract.operatorCapabilities.orders, ["list", "read", "create", "update_status", "mark_paid", "mark_shipped", "mark_delivered", "cancel", "delete_draft"]);
assert.deepEqual(physicalCommerceContract.operatorCapabilities.inventory, ["list", "adjust", "reserve", "release"]);
assert.deepEqual(physicalCommerceContract.optionalOperatorCapabilities.skus, ["list", "read", "create", "update", "archive"]);
assert.ok(physicalCommerceContract.relationshipRequirements.some((relationship) => relationship.entity === "orders" && relationship.targetEntity === "customers" && relationship.required));
assert.match(physicalCommerceContract.operationSemantics.products, /(?:unpublish.*not.*archive|archive.*not.*unpublish)/i);
assert.match(physicalCommerceContract.operationSemantics.orders, /linked to one customer.*draft/i);
assert.match(physicalCommerceContract.operationSemantics.customers, /Archive customers/i);
assert.match(physicalCommerceContract.operationSemantics.inventory, /SKU/i);
const physicalCommerceFixture = readJson(resolve(physicalCommerceRoot, "ui-reference/fixture.json"));
for (const site of physicalCommerceFixture.sites) {
  const orderTab = site.tabs.find((tab) => tab.id === "orders");
  assert.ok(orderTab.actions.includes("Delete draft order"));
  const productTab = site.tabs.find((tab) => tab.id === "products");
  assert.ok(productTab.actions.includes("Publish product"));
  assert.ok(productTab.actions.includes("Unpublish product"));
}

const digitalCommerceRoot = resolve(assetsRoot, "scenarios/digital-commerce-v1");
const digitalCommerceContract = readJson(resolve(digitalCommerceRoot, "contract.json"));
assert.deepEqual(digitalCommerceContract.operatorCapabilities.products, ["list", "create", "update", "publish", "unpublish", "archive"]);
assert.ok(digitalCommerceContract.requiredScenarioChecks.includes("publish-chain-contract"));
assert.ok(digitalCommerceContract.invariantTopics.some((topic) => /publish contract/i.test(topic)));
assert.equal(digitalCommerceContract.runtimeReference.version, 1);
assert.deepEqual(digitalCommerceContract.runtimeReference.assets, [
  "runtime-reference/publish-contract.md",
  "runtime-reference/slugify.ts",
  "runtime-reference/publish-chain.test.template.ts"
]);
assert.match(digitalCommerceContract.runtimeReference.note, /report the degradation/i);
assert.match(digitalCommerceContract.runtimeReference.note, /slug or image field alone/i);
assert.match(digitalCommerceContract.runtimeReference.note, /unpublish transition back to a legal publish from-state/i);
const publishContractReference = requireFile(resolve(digitalCommerceRoot, "runtime-reference/publish-contract.md"));
for (const required of [
  "source registry remains authoritative",
  "SLUG_CONFLICT",
  "CRM never creates a token",
  "both uploads persist",
  "product-revision CAS",
  "no active cover row exists",
  "Consumer visibility depends only on the published lifecycle state",
  "optional `unpublish` harness"
]) assert.match(publishContractReference, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
const slugifyAsset = requireFile(resolve(digitalCommerceRoot, "runtime-reference/slugify.ts"));
assert.match(slugifyAsset, /export function slugify/);
assert.match(slugifyAsset, /SLUG_TEST_VECTORS/);
assert.ok(slugifyAsset.includes('"/test2"'), "slugify vectors must keep the incident case /test2");
assert.ok(slugifyAsset.includes("^[a-z0-9]+(?:-[a-z0-9]+)*$"), "slugify must keep the canonical SLUG_PATTERN");
const publishChainTemplate = requireFile(resolve(digitalCommerceRoot, "runtime-reference/publish-chain.test.template.ts"));
assert.match(publishChainTemplate, /__CRM_CONTRACT_HARNESS_MODULE__/);
assert.match(publishChainTemplate, /__CRM_CONTRACT_SLUGIFY_MODULE__/);
assert.match(publishChainTemplate, /NO_RENDERABLE_COVER/);
assert.match(publishChainTemplate, /SLUG_CONFLICT/);
assert.match(publishChainTemplate, /INVALID_STATE/);
assert.match(publishChainTemplate, /attemptPublishCas/);
assert.match(publishChainTemplate, /revision/);
assert.match(publishChainTemplate, /exactly one cover/i);
assert.ok(publishChainTemplate.includes("data:image/png"), "grammar reject vectors must cover data: URIs");
assert.ok(publishChainTemplate.includes('"https:///x"'), "grammar reject vectors must cover degenerate URLs (empty host)");
assert.match(publishChainTemplate, /new URL\(/);
assert.match(publishChainTemplate, /sellableSkuCount/);
assert.match(publishChainTemplate, /legalPublishFromStates/);
assert.match(publishChainTemplate, /forceSlug/);
assert.match(publishChainTemplate, /forceHeroImage/);
assert.match(publishChainTemplate, /createProductWithHeroImage/);
assert.match(publishChainTemplate, /knownSeedToken\?/);
assert.match(publishChainTemplate, /SLUG_INVALID/);
assert.ok(publishChainTemplate.includes("addSku?("), "addSku must stay optional for product-only sources");
assert.match(publishChainTemplate, /hasSkuSupport/);
assert.ok(publishChainTemplate.includes("unpublish?("), "unpublish harness must stay optional");
assert.match(publishChainTemplate, /hasUnpublishRepublishLoop/);
assert.doesNotMatch(publishChainTemplate, /rawQuery|pragma_index_list|sqlite_master/);
assert.match(publishChainTemplate, /no browser, server, network, or fixed port/i);
assert.match(digitalCommerceContract.runtimeReference.note, /product-only source/i);

const authRoot = resolve(assetsRoot, catalog.auth.presetPath);
const authContract = readJson(resolve(assetsRoot, catalog.auth.contractPath));
assert.equal(authContract.accessMode, "local-admin-v1");
assert.equal(authContract.bootstrap.publicBetterAuthSignup, "blocked");
assert.equal(authContract.bootstrap.productionSeedAdmin, false);
assert.equal(authContract.administration.lastActiveAdminProtection, true);
assert.equal(authContract.administration.deactivationRevokesSessions, true);
for (const required of [
  "concurrent-bootstrap-single-admin",
  "direct-public-signup-closed",
  "admin-create-user",
  "last-active-admin-protected",
  "deactivation-revokes-sessions"
]) assert.ok(authContract.validation.requiredChecks.includes(required));

const overlayRoot = resolve(authRoot, "overlay");
const requiredOverlayFiles = [
  "apps/server/_core/auth.ts",
  "apps/server/_core/create-app.ts",
  "apps/server/db/crm-auth-schema.ts",
  "apps/server/middlewares/with-session.ts",
  "apps/server/migrations/000_crm_auth.sql",
  "apps/server/migrations/010_crm_support.sql",
  "apps/server/services/crm-auth/bootstrap.ts",
  "apps/server/services/crm-auth/admin-users.ts",
  "apps/server/routes/crm-auth.route.ts",
  "apps/server/routes/crm-users.route.ts",
  "apps/client/src/pages/auth/Index.tsx",
  "apps/client/src/pages/settings/Users.tsx",
  "apps/server/__tests__/crm-local-admin.test.ts",
  "scripts/check-agents-contract.mjs"
];
for (const path of requiredOverlayFiles) requireFile(resolve(overlayRoot, path));
assert.equal(existsSync(resolve(overlayRoot, "AGENTS.crm.md")), false);
const overlayGuideChecker = requireFile(resolve(overlayRoot, "scripts/check-agents-contract.mjs"));
for (const required of [
  "unique `webApps[]` entry whose `type` is `crm`",
  "first successful `/auth` bootstrap registration",
  "record its ID in `.skywork/crm/selection.json`",
  "ui-reference/CrmScenarioReference.tsx",
  "At handoff, report the selected scenario"
]) assert.match(overlayGuideChecker, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

const authSchema = requireFile(resolve(overlayRoot, "apps/server/db/crm-auth-schema.ts"));
for (const table of authContract.tables) assert.match(authSchema, new RegExp(`[\"]${table}[\"]`));
const createApp = requireFile(resolve(overlayRoot, "apps/server/_core/create-app.ts"));
assert.match(createApp, /REGISTRATION_CLOSED/);
assert.match(createApp, /\/api\/auth\/sign-up\/email/);
const bootstrap = requireFile(resolve(overlayRoot, "apps/server/services/crm-auth/bootstrap.ts"));
assert.match(bootstrap, /WHERE singleton_key = 1 AND state = 'open'/);
assert.doesNotMatch(bootstrap, /COUNT\s*\(\s*(?:\*|user)/i);
assert.match(bootstrap, /claim_token/);
const adminUsers = requireFile(resolve(overlayRoot, "apps/server/services/crm-auth/admin-users.ts"));
assert.match(adminUsers, /LAST_ADMIN_REQUIRED/);
assert.match(adminUsers, /DELETE FROM crm_session/);
assert.match(adminUsers, /crm_audit_log/);

for (const name of ["000_crm_auth.sql", "010_crm_support.sql"]) {
  const sql = requireFile(resolve(overlayRoot, "apps/server/migrations", name));
  const objects = [...sql.matchAll(/\b(?:CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|ALTER\s+TABLE|DROP\s+TABLE(?:\s+IF\s+EXISTS)?)\s+([A-Za-z_][A-Za-z0-9_]*)/gi)].map((match) => match[1]);
  assert.ok(objects.length > 0);
  for (const object of objects) assert.match(object, /^crm_/);
}

assert.deepEqual(catalog.scenarios.map((scenario) => scenario.id), [
  "physical-commerce-v1",
  "digital-commerce-v1",
  "offline-reservation-v1"
]);
assert.match(sharedReference, /resolveSiteTab/);
const foundationText = [
  "CrmToolbar.tsx", "CrmPagination.tsx", "CrmMobileNavigation.tsx", "CrmTrendChart.tsx", "CrmStatusChart.tsx"
].map((file) => requireFile(resolve(assetsRoot, catalog.uiFoundation.sourcePath, file))).join("\n");
for (const required of [
  'aria-label="Website"', "Refresh view", "Filter", "Rows per page", "PaginationPrevious", "PaginationNext",
  "CRM mobile sections", "Revenue trend", "Business status distribution"
]) assert.match(foundationText, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
const toolbarText = requireFile(resolve(assetsRoot, catalog.uiFoundation.sourcePath, "CrmToolbar.tsx"));
assert.match(toolbarText, /onFilter \? \(/);
assert.match(toolbarText, /onClick=\{onFilter\}/);
const trendChartText = requireFile(resolve(assetsRoot, catalog.uiFoundation.sourcePath, "CrmTrendChart.tsx"));
assert.match(trendChartText, /hasPoints/);
assert.match(trendChartText, /No trend data/);
assert.match(trendChartText, /points\.length === 1/);
assert.doesNotMatch(sharedReference, /Notifications|Help Centre/);
assert.doesNotMatch(sharedReference, /<header[\s\S]*?\bCreate\b[\s\S]*?<\/header>/);
assert.doesNotMatch(sharedReference, /<header/);
assert.doesNotMatch(sharedReference, /onFilter=\{\(\) => undefined\}/);
assert.doesNotMatch(sharedReference, /fixture\.title/);
assert.doesNotMatch(sharedReference, /Switch between connected websites and operate the products, customers, orders, and inventory owned by each site\./);
assert.doesNotMatch(sharedReference, /Workspace · \{site\.label\}/);

for (const scenario of catalog.scenarios) {
  const scenarioRoot = resolve(assetsRoot, scenario.path);
  assert.equal(scenario.contractPath, "contract.json");
  const contract = readJson(resolve(scenarioRoot, scenario.contractPath));
  const fixture = readJson(resolve(scenarioRoot, "ui-reference/fixture.json"));
  const wrapper = requireFile(resolve(scenarioRoot, "ui-reference/CrmScenarioReference.tsx"));
  const profile = readJson(resolve(scenarioRoot, "ui-profile.json"));
  assert.equal(contract.templateId, scenario.id);
  assert.equal(contract.schemaVersion, 1);
  assert.equal(contract.kind, "crm-scenario-reference");
  assert.match(contract.purpose, /never a storage schema or business-rule authority/i);
  assert.ok(contract.referenceEntities.length >= 5);
  assert.ok(Object.keys(contract.operatorCapabilities).length >= 4);
  assert.ok(contract.invariantTopics.length >= 2);
  assert.ok(contract.requiredScenarioChecks.length >= 2);
  assert.equal(fixture.templateId, scenario.id);
  assert.equal(profile.schemaVersion, 1);
  assert.ok(profile.moduleOrder.includes("overview"));
  assert.ok(profile.moduleOrder.includes(profile.overviewStatusResource));
  assert.equal(profile.statusResourcePriority[0], profile.overviewStatusResource);
  assert.ok(profile.componentSlots.includes("shell") && profile.componentSlots.includes("toolbar") && profile.componentSlots.includes("status"));
  assert.equal(fixture.sites[0]?.id, "all");
  assert.ok(fixture.sites.length >= 4);
  for (const site of fixture.sites) {
    assert.ok(site.id && site.label);
    assert.ok(Array.isArray(site.tabs) && site.tabs.some((tab) => tab.id === "overview"));
    if (site.id !== "all") assert.ok(site.metrics?.length > 0);
  }
  assert.match(wrapper, /CrmScenarioReference/);
  const expectedScenarioEntries = ["contract.json", "ui-profile.json", "ui-reference"];
  if (contract.runtimeReference) {
    expectedScenarioEntries.push("runtime-reference");
    for (const asset of contract.runtimeReference.assets) requireFile(resolve(scenarioRoot, asset));
  }
  assert.deepEqual(
    readdirSync(scenarioRoot).filter((name) => !name.startsWith(".")).sort(),
    expectedScenarioEntries.sort()
  );
}

const contractJsonPaths = [
  "catalog.json",
  catalog.runtimeContractPath,
  catalog.auth.contractPath,
  ...catalog.scenarios.map((scenario) => `${scenario.path}/${scenario.contractPath}`)
];
assert.equal(contractJsonPaths.length, 6);
for (const path of contractJsonPaths) assert.doesNotMatch(requireFile(resolve(assetsRoot, path)), /\"rules\"\s*:/);
assert.equal(existsSync(resolve(assetsRoot, "validation/validation-result-contract.json")), false);

const inspector = requireFile(resolve(assetsRoot, catalog.validation.inspectorPath));
const inspectorTest = requireFile(resolve(assetsRoot, catalog.validation.inspectorTestPath));
assert.match(inspector, /runtime-contract\.json/);
assert.doesNotMatch(inspector, /sourceBindings|source-bindings/);
assert.match(inspector, /sourceRegistry/);
assert.doesNotMatch(inspector, /validationResult|validation\.json|validateLocalResult|needs_review/);
assert.doesNotMatch(inspector, /fingerprint/i);
assert.match(inspectorTest, /missingRuntimeContract/);

const lintSource = requireFile(resolve(root, "scripts/lint.mjs"));
assert.match(lintSource, /crm\/validation\/inspect-crm-state\.test\.mjs/);
assert.equal(readdirSync(resolve(assetsRoot, "scenarios")).filter((name) => !name.startsWith(".")).length, 3);

console.log("[check-crm-template-assets] OK");
