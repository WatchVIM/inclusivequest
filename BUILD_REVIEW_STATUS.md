# Inclusive Quest build review

This work is prepared for the separate `feat/sponsor-cms-isolated-preview` review branch, based on sponsor commit `858a30a92850581b934e49936722479ed3b5121a`. The authorized deployment is a code-only preview with the CMS environment deliberately unconfigured. It does not activate the live website, apply a database migration, invite users, or publish advertisements.

## Isolated preview boundary, October 21, 2026

- Vercel's existing CMS variables are restricted to `feat/admin-review-foundation`; do not copy them into this branch. A separate deployment label is not database isolation.
- No accessible isolated Inclusive Quest database was established. The connected account could not list development branches for the client project. Do not substitute the WatchVIM database or apply this migration to Alma's shared CMS.
- `/admin` therefore remains an explicitly labelled in-memory review workspace. Actual authentication, uploads, persistence and publishing are disabled, not simulated as successful live operations.
- Connected QA requires an approved isolated database, separately approved schema/Auth/security configuration and authorized test identities. Preserve the current client content and the user's outstanding manual-login session.
- Fresh Node 22.23.3 verification on October 21 passed the build and all 120 local tests. Hosted acceptance and browser automation remain separate requirements.

## Admin readiness

The authenticated editor already supports server-saved drafts, private uploads, publisher-only publishing and unpublishing, and revision restore. Initial content import and live acceptance tests are distinct requirements. An accepted invitation alone does not prove the admin is ready for handover.

Browser fixtures simulate authentication and persistence. They do not send email, authenticate to Supabase, or prove production Storage behavior. The new upload/revision scenario uses a mock file and repository deliberately; actual MIME validation and Storage acceptance must still be tested against a separately authorized test environment.

## Sponsor release gates

Sponsor storage and publication changes must be reviewed and applied separately. Keep all slots off until artwork, advertiser destination, placement, and activation are approved. Do not infer approval of shared episode targeting. A preview build is not production deployment approval.

Before release:
- Apply the reviewed migration only with authorization to the intended project.
- Verify existing membership roles remain unchanged and nonmembers cannot read drafts or write.
- Sign in as editor, save sponsor content, reload, and confirm persistence without public changes.
- Sign in as publisher, confirm an approved publication, and verify public rendering and media access.
- Exercise unpublish, disabled sponsors, revocation, stale revisions, and restore-as-draft.
- Confirm per-episode targeting and overlapping placement validation against actual episode content.
- Complete desktop/mobile, keyboard, screen-reader, and client acceptance checks.
- Confirm production isolation and obtain separate release/advertisement activation approval.

## Current verification limits

The original runtime was Node 24; the final local verification uses Node 22.23.3 to match the CI major version. The baseline 90 tests and Vite build passed locally on October 20, 2026. Final changed-code results are recorded below.

Local Chromium launch failed before any browser assertion because the execution environment denied Unix-socket creation. A sandbox escalation failed during environment initialization. Browser tests are prepared, not passed. No attempt has been made to bypass the denied Supabase connector access.

## Final local results, October 20, 2026

- Node 22.23.3: `npm run build` passed, including 120 tests passed, zero failed, zero skipped, then Vite production bundle passed.
- PostgreSQL coverage includes 32 fresh-schema/upgrade/security tests through PGlite, not a live Supabase project.
- Playwright discovers 28 desktop/mobile cases. Launch is blocked as described above; none are claimed as browser passes.
- `git diff --check` passed.
- No remote push, pull request, deployment, live migration, membership change, email, sponsor publication or activation was performed.
