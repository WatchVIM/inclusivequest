# Inclusive Quest completion review — October 28, 2026

## Changes prepared for review (not a live launch)

- The interpretation mark now defaults to Alma's original **Two Golden Hands Forming Circles copy.png** at the homepage player, interpretation feature and Watch placeholder. The IQ brand logo is unchanged. An explicitly configured interpreter image still takes precedence.
- Source: Alma's October 17 email, Gmail message `1a14c132672bc779`. The exact supplied PNG was visually inspected, not recreated or inferred from an emoji. Stored as `public/interpreter-gold-hands.png`; SHA-256 `84af76d62846298d2bd092a275dbf7ee42d9e036acc2aea08bdfd9e6d9ebdea3`.
- Blog draft/published preview now opens the selected article rather than the homepage. A draft-only article's published preview opens the blog listing; it does not show private draft content.
- Added a photo-replacement regression covering upload, save, reload, private article preview, unchanged published photo, cancellation and explicitly confirmed publication.
- Added coverage for the original hand mark at all three placements and retained custom-image overrides.

## Verified locally

- Node 22.23.4: **158 tests passed, zero failed or skipped** via `npm run build` (which runs the complete serial test suite).
- Vite production build passed. The original logo and hand artwork are included in the output.
- Existing isolated coverage includes editor/publisher denial, failed saves/uploads/publication, repeated requests, expired sessions, revision conflicts/restore, private media handling, sponsor draft targeting, publication and unpublication, plus embedded PostgreSQL schema and role tests.
- DOM repository fixtures and embedded PostgreSQL tests do **not** establish real Supabase Auth, Storage, mail delivery or live client persistence.
- Real-browser suite attempted with installed Chromium; browser launch failed before assertions because its process-singleton socket was denied (`Operation not permitted`). No desktop/mobile rendering, audio or accessibility browser pass is claimed.

## Still gated

- Current Supabase connector project listing does not expose Inclusive Quest. Do not use WatchVIM's unrelated database for testing. A client-authorized isolated IQ test backend and editor/publisher sessions are needed for connected acceptance.
- Vercel access previously returned permission denied. No access workaround, migration, membership grant, credential installation, live client-content change, sponsor activation, merge, production deployment or domain/DNS change was performed.
- Preserve Alma's domain-switch hold. Final live signoff and a completion walkthrough depend on connected QA and her preview review; a written workflow can be supplied now.

## Walkthrough acceptance sequence (isolated backend only)

1. Publisher and editor each sign in; an unapproved account must fail closed.
2. Edit a test page, save, reload and sign in again; verify saved content persists. Retry and cancel deliberately; no duplicate writes or discarded unsaved fields.
3. Open a test blog post. Add image alt text, upload an image, save and reload. Confirm private preview shows the replacement while the published snapshot retains its old photo.
4. As publisher, cancel publication, then explicitly publish. Reload public article and confirm the new photo/text. Unpublish and restore a revision; verify the intended public/private separation.
5. As editor, verify publish/unpublish are unavailable and backend calls are rejected.
6. Create an off sponsor draft, upload artwork, select shared episode targeting and preview. Publish only an approved isolated test creative; verify all test episode placements and unpublish. Never activate a real sponsor as a test.
7. Test failed upload/save, session expiry, revision conflict, keyboard/mobile and screen-reader interaction. Preserve useful field changes and show truthful errors.
8. Only after those pass, offer Alma the captioned written/live walkthrough and collect final preview/launch timing approval.
