# OpsGrid Cloud — Critical Infrastructure FSM

OpsGrid Cloud is a production-oriented multi-tenant field service management platform for mission-critical infrastructure: power systems, UPS, battery banks, facilities, field teams, service contracts and compliance workflows.

## Product capabilities

- Multi-tenant organization and branch isolation
- Role-based access control and scoped tenant switching
- Dispatch, technician execution, SLA timers and escalations
- Asset topology, battery lifecycle and telemetry workflows
- Gate-pass verification and security kiosk workflows
- Digital FSR submission, verification and audit history
- Transactional outbox-style event processing
- Responsive enterprise web console

## Local development

Requirements: Node.js 20+

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000`.

## Production configuration

Set `NODE_ENV=production`, `JWT_SECRET`, `GATEPASS_SECRET`, and any external service credentials before deployment. Demo fixtures and demo account discovery are disabled unless `ENABLE_DEMO_MODE=true` and never enabled in production.

> The current server uses in-memory state for the uploaded prototype. Before production launch, replace these stores with PostgreSQL/Redis/object storage and run migrations.
