# Inclusive Quest completion and launch acceptance

Updated October 22, 2026. This checklist separates merged code from client approval and verified live operation.

## Completed code consolidation

- Admin foundation PR #6, mobile-footer PR #7 and sponsor foundation PR #8 merged into main. The footer resolution preserved the complete admin/sponsor code, passed all 120 tests and built successfully. Latest consolidated main commit: `c0b25788b2b03b5c74387fe49526296b1f604f42`.
- Main commit `ab38f81cfd95a836229bb9b0275bee541a39ee6c` built successfully at https://inclusivequest-mqzirq8xt-watch-vim-ott.vercel.app. Its home, admin and sponsor-admin routes return HTTP 200.
- The deployment-order race was corrected after explicit user approval on October 22. All three existing Vercel website aliases were mapped to full merged deployment `dpl_EmTGiLtV3HvEMgEZkdLm7RgPBz5n`, then advanced to the successfully built footer-inclusive deployment `dpl_DCiqxKqHY3VP5eaSnq5ZF5b2hb5i` at https://inclusivequest-95hn5s1y5-watch-vim-ott.vercel.app. Prior deployment `dpl_7coLFJMqmbDQ5pRLB6DW4hAwst3o` remains available for rollback. No custom domain/DNS or CMS settings changed.
- All 120 local tests passed with Node 22, including embedded PostgreSQL role, draft, media and migration tests. Tests now run serially to avoid parallel database-worker resource contention.
- Public home and admin routes return HTTP 200. Unconfigured public content API returns HTTP 503 rather than exposing draft data.
- No database migration, role/access configuration, sponsor activation, domain/DNS change or client-content publication was performed.

These results do not establish real Supabase Auth/Storage acceptance or desktop/mobile browser acceptance. Local Chromium startup is blocked by the execution environment's Unix-socket restriction. Previously observed GitHub Actions billing lock also prevents relying on CI as a browser pass.

## Remaining work, in order

1. Review the separate website-refinement branch and its test results. Keep client content changes out of the current connected admin preview while editing continues.
2. Obtain authorized access to an isolated client-owned test backend. Review schema changes and permissions before applying them. Do not use WatchVIM's database or Alma's shared content as a test fixture.
3. Test editor and publisher roles against that backend: login, save and reload, image upload and private preview, public publication and unpublication, conflict handling, revision restoration, sign-out and expired-session behavior. Confirm a stranger cannot read private content or media.
4. Run desktop/mobile browser, keyboard, text-to-speech and contrast checks. Verify controls across Home, About, Explore, Watch, Blog and an article. Verify speech on a real supported browser; DOM mocks alone do not establish audio playback.
5. Complete the included basic blog using Alma's first draft when received. Do not fabricate a date, article or additional author. Optional custom layouts, rich-text enhancements, expanded taxonomy or separately editable publication logo require a scoped change order if outside the agreed template.
6. Verify sponsor persistence, private artwork, publish/unpublish and homepage/episode targeting in isolation. Keep live placements off until Alma approves exact creative, destination, target and activation.
7. Collect outstanding assets and choices: original gold-hand artwork, exact Ashley show/episode and art, Conversations Over 50 permission, blog draft, final copy and launch date, waitlist route, sponsor creative/targets and the report for the claimed 350ms interaction delay.
8. Present one final preview for Alma's approval. Obtain launch timing before connecting the paid domain. Preserve Microsoft 365 DNS records; prepare HTTPS/redirect, form/auth and rollback checks.
9. Provide the captioned admin walkthrough, content workflow, ownership/access inventory, support boundaries and recovery instructions. Confirm Alma can perform the intended tasks herself before declaring handover complete.

## Commercial and approval boundaries

- The original $700 website scope includes the agreed basic blog/templates, standard CMS editing and corrections to included functionality.
- The separate $500 addition covers sponsorship management, not basic admin access.
- True additions require a written scope and price approval before billable work begins, at the stated $25/hour change-order rate or a separately agreed flat fee.
- Do not apply review SQL, expand access, change DNS, activate ads or publish client content simply because code has merged.
- Do not reimport Alma's content: she already logged in and imported it on October 20.

## Refinement package boundaries

The separate refinement review adds independent interpreter-art controls, optional interpreter/founder labels, episode host and coming-soon fields, basic blog date/author, requested copy/layout and keyboard/speech fixes. It contains no original gold-hand asset and does not change the global IQ logo. Existing client records are preserved; seed changes are not a bulk migration of her imported content.

New CMS fields require `supabase/review-migrations/refinements-cms.sql` after the sponsor review migration on an authorized isolated backend. Do not point the new code at the existing connected CMS before testing the reviewed upgrade. The upgrade deliberately does not reinitialize content or grant memberships/permissions.

The waitlist still opens a clearly labelled email draft; an inline saved-registration form is not yet connected. The pending route must be agreed before implementation. Optional custom blog enhancements are not included in this package. Actual speech playback, browser rendering, full gradient/color-blind acceptance, and the reported interaction delay still require the corresponding browser measurements.

## Local refinement verification

All 156 serial Node 22 tests passed with no failures or skips, followed by a successful Vite production build. These include 58 DOM tests and isolated database/model checks. Coming-soon publication rejects playback and caption URLs while allowing private drafts to retain them; rejection preserves the existing published snapshot. The admin clear-links control affects only unsaved draft fields. These results do not substitute for real-browser audio or connected backend acceptance.
