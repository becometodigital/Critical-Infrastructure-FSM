# OpsGrid Cloud — Engineering Audit & Fix Report

Date: 2026-08-14

## What was fixed

### Critical security / tenant isolation
- Removed JWT resurrection behavior from middleware. Revoked/expired in-memory sessions can no longer be recreated from a valid bearer token signature alone.
- Added explicit production secret requirements for `JWT_SECRET` and `GATEPASS_SECRET`.
- Added response hardening headers and a JSON request-size limit.
- Restricted detailed health diagnostics to platform-global admins.
- Removed public invitation-code leakage from the demo-account endpoint.
- Tightened cross-tenant write operations so mutation targets must belong to the currently selected tenant scope.
- Fixed audit, gate-pass and FSR list APIs that were returning records from every allowed tenant rather than the active tenant.
- Fixed invitation creation so non-platform admins cannot generate invitations for another tenant or an unrelated role family.
- Added password complexity enforcement for newly created/reset passwords.
- Added password-reset request rate limiting and preserved the existing 3-attempt reset-code guard.
- Changed `TenantId` from a fixed union to a runtime string so newly registered SaaS tenants are actually representable.

### Authentication / session hygiene
- Stopped persisting bearer credentials in browser localStorage/sessionStorage.
- Removed local client-side fabricated demo sessions from the normal auth path.
- Normalized security-kiosk and auditor portal identifiers so the authenticated persona lands in the correct UI route.
- Removed dead API client methods for server endpoints that did not exist.

### Data integrity
- Mutation handlers in the React app no longer silently commit local state after an API mutation fails. Failed writes now stop instead of creating a false “successful” UI state.
- Preserved local data fallback only for read synchronization where appropriate.

### SaaS branding / product credibility
- Rebranded the application to **OpsGrid Cloud — Critical Infrastructure FSM**.
- Replaced the AI Studio starter title/metadata and generic README.
- Centralized brand identity in `src/config/brand.ts`.
- Replaced misleading claims such as live SBP compliance, AWS S3 WORM, BullMQ and PostgreSQL/PostGIS runtime guarantees with architecture/target wording where the uploaded implementation is still simulated.
- Updated the production footer and login/application identity to present a real SaaS product rather than an AI Studio prototype.

## Validation performed

- 33 TypeScript/TSX source files plus server/config files were transpile-checked with TypeScript 5.8.3.
- Result: **0 syntax diagnostics**.
- Static scan found **0 remaining high-risk compliance/infra marketing claims** matching the audited claim patterns.
- The dependency install/build could not be executed in this sandbox because the uploaded project has no npm lockfile and the environment could not complete the dependency download. This is an environment limitation, not a claim that the final runtime build passed.

## Remaining production blockers

The uploaded backend is still an in-memory prototype. It is not yet a real production SaaS data plane. The following need to be wired before launch:

1. PostgreSQL as the source of truth with real tenant-aware schema/migrations and DB-level RLS.
2. Redis for sessions, rate limits and distributed locks.
3. Queue infrastructure for outbox processing and SLA escalation jobs.
4. Object storage with immutable retention controls for evidence/FSR attachments.
5. Real email/SMS/Authenticator delivery for MFA, password reset and invitations.
6. Background workers and scheduled jobs instead of request-triggered in-memory processing.
7. Automated unit/integration/e2e tests and CI gates.
8. Production observability: structured logs, traces, metrics, error tracking and alerting.
9. Formal authorization matrix tests for every role/tenant/branch mutation endpoint.
10. Removal of seeded demo identities and real-looking sample PII from production data fixtures.

## Changed files

- `package.json`
- `index.html`
- `README.md`
- `.env.example`
- `src/config/brand.ts`
- `src/App.tsx`
- `src/components/Header.tsx`
- `src/components/SLA/SlaEscalationDashboard.tsx`
- `src/components/FieldExecution/FieldServiceReport.tsx`
- `src/components/Outbox/OutboxEventStream.tsx`
- `src/components/MobileSimulator/MobileTerminalModal.tsx`
- `src/components/Architecture/ArchitectureBlueprint.tsx`
- `src/components/Portals/AuditorPortal.tsx`
- `src/components/Portals/BankBranchPortal.tsx`
- `src/components/Portals/BankSecurityPortal.tsx`
- `src/components/Inventory/VanStockLedger.tsx`
- `src/components/CommandCenter/LiveDispatchMap.tsx`
- `src/components/Modals/NewTicketModal.tsx`
- `src/components/Assets/AssetTopologyTree.tsx`
- `src/components/Auth/AuthScreen.tsx`
- `src/components/Auth/AuthModal.tsx`
- `src/utils/AuthContext.tsx`
- `src/utils/apiClient.ts`
- `src/data/usersDatabase.ts`
- `src/types/fsm.ts`
- `server.ts`

