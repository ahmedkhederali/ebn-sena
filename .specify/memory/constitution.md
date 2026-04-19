<!--
## Sync Impact Report

- **Version change**: (none) → 1.0.0 (initial ratification)
- **Modified principles**: N/A — first-time population of constitution template
- **Added sections**:
  - Core Principles (I–IX)
  - Technical Standards
  - Development Workflow
  - Compliance & Regulatory Requirements
  - Governance
- **Removed sections**: N/A
- **Templates requiring updates**:
  - ✅ `.specify/memory/constitution.md` — this file (written)
  - ⚠ `.specify/templates/plan-template.md` — Constitution Check gates should reference the nine principles defined here; update when next plan is generated
  - ⚠ `.specify/templates/spec-template.md` — FR examples should include RTL, security, and MOH/HIPAA requirement patterns; no immediate blocker
  - ⚠ `.specify/templates/tasks-template.md` — Polish phase should list RTL smoke-tests, security hardening, and audit-trail verification as first-class task types
- **Deferred TODOs**: None — all placeholders resolved
-->

# Ibn Sina Medical Center Constitution

## Core Principles

### I. Security First (NON-NEGOTIABLE)

All medical data MUST be treated as sensitive by default.
- Every API endpoint MUST enforce JWT-based authentication and role-based access control (RBAC) for the four defined roles: Patient, Doctor, Admin, Receptionist.
- Data at rest MUST be encrypted (AES-256 or equivalent); data in transit MUST use TLS 1.2+.
- No PHI (Protected Health Information) may be logged in plaintext; logs MUST be scrubbed of patient identifiers.
- SQL/NoSQL injection, XSS, CSRF, and OWASP Top 10 mitigations MUST be applied to every input boundary.
- Dependency audits (`npm audit`) MUST pass with zero high/critical vulnerabilities before any merge to `main`.
- Security review MUST be completed before any feature that touches authentication, authorization, or patient records is merged.

### II. RTL-First, Mobile-First

The primary audience communicates in Arabic; the layout model is RTL.
- All UI components MUST be designed and tested in RTL (Arabic) mode first; LTR (English) is a variant, not the default.
- CSS MUST use logical properties (`margin-inline-start`, `padding-inline-end`, etc.) over physical ones (`margin-left`) everywhere.
- Tailwind CSS MUST be configured with `dir="rtl"` as the document default; LTR support is opt-in per locale.
- Every screen MUST be fully functional and visually correct on a 375 px viewport (iPhone SE baseline) before desktop polish is applied.
- Font loading MUST include a suitable Arabic typeface (e.g., IBM Plex Arabic, Noto Kufi Arabic) with Latin fallback.

### III. Modular, Feature-First Architecture

The codebase MUST be organized by domain feature, not by technical layer.
- Each feature (e.g., `appointments`, `patients`, `pharmacy`) MUST be self-contained: its own routes, controllers, services, models, and frontend components live together.
- Cross-feature dependencies MUST go through defined service interfaces or shared `common/` utilities — never direct imports across feature boundaries.
- Backend modules MUST be independently loadable (no circular requires); frontend modules MUST not import from sibling features without an explicit public API barrel.
- New features MUST be introduced as a new module, not by expanding an existing one beyond its stated responsibility.

### IV. Typed TypeScript Everywhere (NON-NEGOTIABLE)

TypeScript strict mode is the only permitted configuration.
- `tsconfig.json` MUST have `"strict": true`, `"noImplicitAny": true`, `"exactOptionalPropertyTypes": true`.
- `any` is forbidden in production code; `unknown` with explicit narrowing is the approved escape hatch where truly necessary.
- All API request/response shapes MUST be declared as shared TypeScript types/interfaces in a `shared/types/` package consumed by both frontend and backend.
- Mongoose schemas MUST use `mongoose-type-safe` patterns or equivalent to propagate types to model instances.
- CI MUST run `tsc --noEmit` with zero errors on every pull request.

### V. API-First Design

The HTTP API is the contract; the UI and backend are both clients of it.
- Every endpoint MUST be specified in an OpenAPI 3.1 document (`docs/openapi.yaml`) before implementation begins.
- Breaking API changes MUST bump the API version (`/api/v2/…`) and maintain the previous version for at least one sprint cycle.
- All endpoints MUST return structured JSON with a consistent envelope: `{ success, data, error, meta }`.
- Pagination MUST follow cursor-based conventions for all list endpoints returning more than 20 items.
- Internal service calls (FE → BE) MUST use the typed client generated from the OpenAPI spec; no ad-hoc `fetch` strings.

### VI. Compliance by Design — MOH & HIPAA-Aligned

Regulatory requirements are architectural constraints, not afterthoughts.
- Every feature that stores, transmits, or displays patient data MUST document which MOH data-handling article and HIPAA safeguard category it satisfies in the feature spec.
- Audit logs MUST record: actor ID, role, action, target resource ID, timestamp (ISO 8601), and outcome for all create/update/delete operations on clinical data.
- Patient consent MUST be explicitly captured and stored before any data collection; no implied consent.
- Data residency MUST be within Saudi Arabia (KSA) unless a documented exception is approved by the project owner.
- Access-control matrices MUST be reviewed and signed off by the Admin role owner before each release.

### VII. Test-First for Critical Flows (NON-NEGOTIABLE for medical logic)

Any logic that affects patient safety, billing, or access control MUST follow strict TDD.
- Tests MUST be written and confirmed failing before implementation begins for: authentication flows, prescription handling, appointment scheduling, and role-permission checks.
- Integration tests MUST use a real MongoDB instance (in-memory via `mongodb-memory-server` is acceptable); mocking the database layer is forbidden for integration tests.
- E2E tests (Playwright) MUST cover the primary patient booking journey and the doctor patient-record view in both Arabic and English locales.
- Code coverage MUST not drop below 80 % on the backend `services/` layer.

### VIII. Accessibility & Internationalization (i18n)

The platform MUST be usable by patients with varying digital literacy and accessibility needs.
- All interactive elements MUST meet WCAG 2.1 AA contrast ratios and have descriptive ARIA labels in both Arabic and English.
- i18n MUST be implemented from day one using `react-i18next`; hard-coded Arabic or English strings in component files are forbidden.
- Translation keys MUST be namespaced by feature (`appointments.bookButton`, not `button1`).
- Date, time, and number formatting MUST respect locale: Hijri calendar display alongside Gregorian where clinically relevant, SAR currency symbol for billing.
- Screen-reader testing MUST be performed with NVDA (Windows) or VoiceOver (iOS) on every new UI module before it is marked complete.

### IX. Observability & Auditability

The system MUST provide enough signal to diagnose issues and prove compliance.
- Structured JSON logging (via `winston` on the backend) MUST be used at all times; `console.log` in production code is forbidden.
- Every HTTP request MUST emit a trace ID (`X-Request-Id`) that is propagated through all downstream calls and included in log entries.
- Health-check endpoints (`GET /api/health`, `GET /api/health/db`) MUST exist and be monitored.
- Performance budgets: API p95 response time MUST remain under 500 ms for read operations and under 1 000 ms for write operations under normal load.
- Alert thresholds MUST be configured for error rate > 1 % and p95 latency > 800 ms.

## Technical Standards

### Stack (locked — deviations require Governance approval)

| Layer | Technology | Version |
|---|---|---|
| Frontend framework | React | 18.x |
| Frontend language | TypeScript | 5.x |
| Frontend build | Vite | 5.x |
| Frontend styling | Tailwind CSS | 3.x |
| Backend runtime | Node.js | 20 LTS |
| Backend framework | Express | 4.x |
| Backend language | TypeScript | 5.x |
| Database | MongoDB | 7.x |
| ODM | Mongoose | 8.x |
| Auth | JWT (RS256) + refresh tokens | — |
| Testing — unit/integration | Vitest (FE) + Jest (BE) | — |
| Testing — E2E | Playwright | — |
| Linting | ESLint + Prettier | — |
| API contract | OpenAPI 3.1 | — |

### Directory Layout (canonical)

```
ibn-sina/
├── frontend/               # React + Vite application
│   ├── src/
│   │   ├── features/       # One folder per domain feature
│   │   ├── shared/         # Shared components, hooks, utils
│   │   ├── i18n/           # Translation files (ar.json, en.json)
│   │   └── assets/
│   └── tests/
├── backend/                # Express + TypeScript API
│   ├── src/
│   │   ├── features/       # One folder per domain feature
│   │   ├── shared/         # Middleware, utils, error handlers
│   │   └── config/
│   └── tests/
├── shared/
│   └── types/              # Shared TypeScript types (consumed by both)
├── docs/
│   └── openapi.yaml        # API contract (source of truth)
└── specs/                  # Speckit feature specs
```

## Development Workflow

1. **Spec first** — run `/speckit.specify` before writing any code.
2. **API contract** — update `docs/openapi.yaml` and get review before implementation.
3. **TDD for critical paths** — write failing tests, get approval, then implement.
4. **Feature branch** — one branch per feature (`###-feature-name`), rebased on `main`.
5. **PR checklist** — TypeScript passes, tests green, RTL smoke-test done, security checklist signed.
6. **Code review** — minimum one peer review + one security-aware review for any patient-data-touching change.
7. **Staging gate** — all E2E tests MUST pass on staging (Arabic locale) before promoting to production.
8. **Compliance sign-off** — MOH/HIPAA impact assessed for every feature touching clinical data.

## Compliance & Regulatory Requirements

- **MOH (Ministry of Health, Saudi Arabia)**: All data-handling practices MUST conform to the Saudi Health Data Governance Policy and the National Health Information Center (NHIC) standards.
- **HIPAA-aligned**: While HIPAA is a US standard, the project adopts its safeguard framework (Administrative, Physical, Technical) as a quality baseline for patient data protection.
- **Data Residency**: Patient data MUST reside on servers physically located in Saudi Arabia (KSA).
- **Breach Response**: A documented incident-response procedure MUST exist before any production launch; the Admin role owner is the designated incident coordinator.
- **Retention Policy**: Patient records MUST be retained for a minimum of 10 years per MOH guidelines; deletion requires explicit Admin authorization and audit trail.

## Governance

- This constitution supersedes all other development guidelines, style guides, and informal agreements for the Ibn Sina Medical Center project.
- **Amendments** require: (1) a written proposal documenting the change and rationale, (2) approval by the project owner and at least one senior developer, (3) a migration plan for any code already in flight that the amendment affects, and (4) a version bump per the semantic versioning policy below.
- **Versioning policy**: MAJOR — removal or redefinition of a principle; MINOR — new principle or section; PATCH — clarification, wording, or typo fix.
- **Compliance review**: Constitution compliance MUST be verified in every PR description via a checklist; reviewers MUST reject PRs that document a violation without a documented justification.
- **Complexity justification**: Any deviation from modular boundaries, any use of `any`, any skipped test, or any unencrypted data path MUST be justified in the PR with a Complexity Tracking entry.
- For runtime development guidance and command references, see `.github/agents/` and `.specify/extensions/`.

**Version**: 1.0.0 | **Ratified**: 2026-04-18 | **Last Amended**: 2026-04-18
