# Security remediation — 19 October 2026

The previously committed example contained populated Apollo, ReachInbox and Reoon credentials and a shared session secret. Values are intentionally omitted here. Treat them as compromised even if their current validity is unknown.

## Required operator actions

1. In Apollo, ReachInbox and Reoon, create replacement credentials with minimum permissions. Update the actual deployment secret store, restart affected workers and verify normal operations, then revoke the exposed credentials. If misuse is suspected, revoke immediately and coordinate the resulting service interruption.
2. Generate a fresh SESSION_SECRET and update the deployment. This invalidates existing sessions; sign in again. Do not copy an example secret.
3. Review provider usage, billing, campaign activity and access logs for unexpected activity. Do not test the exposed credentials.
4. Keep local .env files and Google service-account JSON outside Git. Enable GitHub secret scanning and push protection where available.

This patch removes populated secrets from the current example only after merge. It does not revoke credentials or erase existing Git history, forks, caches or existing PR diffs. No history rewrite is included.
