# Security follow-up — 20 October 2026

The populated example credentials were removed on the default branch by PR #2. This follow-up pairs Google API/icon updates with current Vitest/Vite tooling, pins nested PostCSS to the already-tested 8.5.30, and fixes Edge middleware verification using Web Crypto. Server-issued cookie format and the 30-day lifetime are preserved; both verifiers share the same strict format and clock-skew checks.

Local validation: 21 tests, typecheck, lint, frozen pnpm installation and full Next production compilation pass. Existing server-signed cookies are accepted by Edge middleware; malformed, expired, future and tampered cookies are rejected. The Node-only crypto import is absent from the middleware bundle. Generated CSS content hashes remain unchanged after the PostCSS patch. Hosted CI additionally builds the application and avoids duplicate push/PR builds.

Credential rotation remains mandatory for Apollo, ReachInbox, Reoon, and any deployed example SESSION_SECRET. Hosting and worker consumers are not yet identified. Replace credentials in every actual consumer, verify normal operation with replacements, then revoke old credentials. Never test exposed credentials. SESSION_SECRET rotation signs users out.

No real database, Redis, vendor API, campaign launch or email-delivery integration was exercised. Prisma client/CLI, BullMQ/Redis and Zod major migrations need their own compatibility and integration review before release. The ReachInbox webhook still needs provider-compatible sender validation. Remaining dependency advisories are documented in the account audit report. No deployment settings or Git history were changed by this PR.
