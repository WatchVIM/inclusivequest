# Inclusive Quest admin setup

## Status: preview integration, not a production handover

PR 6 adds the same-site `/admin`, Supabase Auth, server drafts, role-checked publication, revision history, private image uploads and public content/media endpoints. The existing site remains the fallback until the approved client project and this branch's Preview environment are connected and tested. No production merge or activation is included.

Approved client project: **Inclusive Quest**, `xkdmvbwkaaxjgasitbwv` (client-owned organization `oqfctuptaaveuoftfelq`). Never substitute the WatchVIM database. Approved website roles are Alma `info@inclusivequest.co` as publisher and Anthony `abawn@watchvim.us` as test editor. Supabase organization roles are separate from website roles.

Preview: https://inclusivequest-git-feat-admin-review-foundation-watch-vim-ott.vercel.app/admin

The preview requires authorized Vercel access. A successful deployment build does not establish that a recipient can open it. Do not disable deployment protection or create bearer sharing links to work around access.

## What is implemented

- Editable home heading/subtitle/body/image, About introduction, Mission/Vision/Values, founder bio/story/photo/alt text, testimonials, blog posts with three templates, YouTube episode titles/descriptions/links/images/categories/tags and video categories.
- Magic-link login for invited accounts; live membership checked on every operation. Editors save drafts; publishers additionally publish/unpublish. Public signup must be disabled in Auth.
- Persistent drafts, optimistic revision conflicts, operation-ID retry protection, immutable history and restore-to-draft. Draft previews render the actual website components.
- JPEG/PNG/WebP uploads up to **4,000,000 bytes**, with alternative text and file-signature checks. Private storage uses immutable paths. Only images referenced by currently published content are anonymously downloadable through `/api/media`.
- `/api/content` returns separate published snapshots only, using the publishable key without forwarding visitor/staff credentials. Full published snapshots are limited to **3,500,000 UTF-8 bytes** to stay below Vercel response limits.
- Watch, Explore and Podcasts use the same published episode model. Existing approved dual main/interpreter videos are preserved. Otherwise a validated YouTube URL provides a click-to-load privacy-enhanced player. Link validation cannot guarantee licensing, availability, captions or Sign Language interpretation; YouTube caption appearance cannot be forced.
- Fail-closed setup: missing/invalid/wrong-project configuration cannot enable save, publish or upload. Preview/dev can still offer the explicitly labelled temporary review workspace; production cannot open that review workspace.

Other hardcoded copy, sponsorship features, additional accessibility work and the captioned training recording are outside this implementation. The existing founder-photo reference has no file and still needs an approved image.

## Activation steps

1. Review `supabase/schema/cms.sql` and `supabase/README.md`. Apply only to the approved client project after its compatibility checks. Never apply `supabase/tests/bootstrap.sql` remotely. Keep `cms_private` out of exposed schemas and extra search paths. The SQL is transactional and does not initialize/publish content or create users on application.
2. A project Owner must configure Authentication → Sign In / Providers: turn **Allow new users to sign up OFF**; keep **Confirm email ON** and anonymous sign-ins OFF. Anthony's current Developer role cannot edit these settings.
3. Under Authentication → URL Configuration, use the exact preview URL above as Site URL and add the same `/admin` URL to Redirect URLs. Do not add wildcards or production callbacks for this review. Current localhost defaults must be replaced before invitations.
4. In the **Inclusive Quest Vercel project, Preview environment restricted to branch `feat/admin-review-foundation`**, securely enter the values in `.env.example`: `VITE_CMS_ENABLED=true`, the exact client Supabase URL, and its existing `sb_publishable_...` key. Do not put keys in chat, Git, screenshots or handover files. Do not use `sb_secret_...`, service-role or legacy JWT keys. Keep Production and other branches unconfigured. A new preview build is needed after build-time environment changes.
5. Once callback and protected-preview access work, send only the two approved Supabase invitations. The exact default invitation template/recipients must have been previewed and approved. Verify each Auth UUID, then insert the matching approved website role into `cms_members` via the trusted operator path. There is no client membership editor.
6. A publisher confirms **Import current website content** once. SQL accepts only the reviewed current baseline, imports it atomically and activates the published reader. All editing/uploads are blocked before this step. No imported draft JSON can become a publication.
7. Complete the real Auth, Storage, persistence and public-site acceptance checks below before describing the admin as ready for independent editing.

No paid services are required for preview setup. Supabase default email delivery is testing-only, limited to organization member addresses and currently two messages/hour; these two approved addresses are organization members. Invitations/sign-in may exhaust that allowance. Production delivery requires a separately approved reliable SMTP setup. Do not buy or provision one implicitly.

### Auth callback behavior

Normal sign-in uses PKCE and should be opened in the same browser that requested the link. Supabase admin invitation links use an implicit callback, which the installed SDK does not accept under a fixed PKCE client. The repository therefore selects implicit mode only for an invitation token callback; the SDK verifies the session and consumes/clears the fragment. The next page load returns to PKCE. A single invitation-opened client instance retains its mode until reload. No application code logs or exports tokens. Invalid/expired callbacks surface a sign-in error rather than being treated as success.

The SDK stores its session using its normal browser storage mechanism; this is authentication state, not a substitute for the server's membership checks/RLS. Draft fields and signed image preview URLs are kept only in memory. Signed previews expire after 300 seconds in the application; this is not an RLS-enforced maximum. Previously shared/downloaded copies cannot be recalled.

## Editor workflow

1. Sign in with the invited email. A project dashboard login alone does not grant website editing access.
2. Select a section, edit and **Save draft**. Save confirmation means server persistence; it does not publish. Resolve conflicts by preserving your changes and reloading the saved version.
3. For an image, write alternative text, upload a supported image, then save the draft to attach it. Removing an image from fields does not delete its stored object.
4. **Preview website** renders saved drafts. **View published website** excludes draft-only/unsaved changes. Reopen expired image previews to refresh their short-lived links.
5. A publisher reviews and confirms **Publish**. Reload the preview's public page to verify the published title/text/video/image. Publishing does not automatically refresh an already-open public tab.
6. **Unpublish** removes the published collection entry while preserving drafts/history. Required pages and founder content fall back to bundled defaults. **Revision history → Restore as draft** does not publish.
7. Sign out when finished. Unsaved fields are lost after sign-out/reload; session expiry hides fields and preserves them only in the same open tab until reauthentication.

### Preview and later production separation

During this review only the preview is connected. A deployment label is not database isolation: two deployments connected to the same project share published content. Before a separately approved production release, establish an isolated staging project or disconnect preview writes and revise the environment messaging/roles. Do not silently point a writable preview at the future production CMS.

## Verification

Run with Node 22:

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Automated tests cover the actual embedded PostgreSQL schema/RLS, membership/revocation, anonymous/editor/publisher restrictions, exact baseline initialization, validation, draft/published separation, concurrency checks, idempotency, revisions, private storage policies, API response budgets, repository transport and admin DOM flows. Browser fixtures cover authenticated desktop/mobile behavior but do not replace live Supabase acceptance.

### Required live acceptance

- Both named accounts independently accept invitations/sign in; uninvited/nonmember accounts fail closed. Exercise expired links and revoked membership.
- Editor save survives reload/sign-out; public content stays unchanged until publisher approval. Two simultaneous stale edits cannot silently overwrite each other.
- Publish an approved YouTube test entry, verify Watch/Explore/Podcasts title, description, categories/tags, captions/Sign Language availability; edit/unpublish and verify the public read excludes drafts.
- Upload real JPEG/PNG/WebP including a near-4 MB image. Verify anonymous draft download/sign/list denial, staff preview, published download, and denial after last-reference unpublish. Check oversized/SVG/false MIME/overwrite/delete rejection against the real Storage HTTP service.
- Verify anonymous direct RPC/table requests cannot read drafts/history/assets or mutate data; editors cannot grant membership or publish. Check API/private schema exposure and security advisors.
- Test protected Vercel `/admin` deep links, mobile, keyboard/focus, screen reader and actual video playback; record the accurately captioned handover after these pass.

Known QA constraints: local Chromium launch is blocked by Unix-socket permissions, and GitHub Actions previously failed before starting due to the account's billing lock. An authenticated Vercel preview session is still required. Neither a DOM pass nor a build pass is proof of end-to-end readiness.

### Vercel route compatibility

With `cleanUrls: true`, `/admin` and `/admin/` rewrite to `/index`, not `/index.html`. Vite's local fallback does not reproduce this deployment-specific behavior. API routes are separate Vercel Functions and must be verified on the deployed preview.
