# Security follow-up — 19 October 2026

The environment example is sanitized in this PR. Rotate the vendor credentials and any deployed shared session secret separately. Session token verification now enforces the existing 30-day cookie lifetime and rejects malformed/future-issued tokens. Additional findings remain: webhook input is unsigned and can trigger queue work; middleware imports a Node crypto module through the auth module and needs a production edge-runtime review. Do not deploy dependency major upgrades or webhook auth changes without coordinated integration testing.

The new baseline scans the current checked-out tree, not historical commits. Do not interpret a green check as proof that historical credentials were revoked. No production deployment or provider credential test was performed.

Repository rulesets, required PR checks, secret scanning/push protection, Dependabot alerts, account 2FA, and token/SSH-key hygiene require verification in GitHub settings. These settings were not mutated by this PR. Apply required checks only after their first verified successful run, so existing deployments are not unexpectedly blocked.
