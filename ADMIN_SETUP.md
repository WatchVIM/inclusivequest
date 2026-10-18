# Inclusive Quest admin foundation

## Current status

This is a **reviewable foundation, not a live CMS handover**. No backend project, database, credentials, editor accounts, paid service or production deployment was created by this change. The existing public content remains the fallback.

- `/admin` is a separate lazy-loaded entry on the same website. Production displays a locked setup screen.
- Local development and Vercel Preview builds offer an explicitly labelled review workspace. It is public demo UI, **not authentication**. Do not enter private content.
- Draft changes live in memory for the current tab. They are **not** stored in localStorage, sent to a server, or published. Reloading loses them unless a draft JSON file is downloaded. Import restores a review file without creating a published snapshot.
- Editable: existing home heading/subtitle/body/featured image, About introduction, Mission/Vision/Values, founder bio/story/photo/alt text, testimonials, basic blog posts with three starting templates, YouTube episode metadata/image/alt text, categories and tags.
- Other existing page copy remains in `App.jsx` and `content.js`; this first pass does not claim to expose every field. Image upload, login, real draft saving, publishing, revisions and staff permissions remain unavailable.
- Draft preview renders the **actual website** through the same adapter used by public pages. Watch, Podcasts and Explore read the common episode model. Blog navigation appears when posts exist.
- Existing licensed episode/interpreter video pairs take priority. Otherwise a validated YouTube entry renders a click-to-load privacy-enhanced player and a direct YouTube link. Captions and Sign Language content must be verified on the supplied video; link validation cannot guarantee their presence or availability.

## Review workflow

1. Open the branch's preview URL at `/admin`, then choose **Open review workspace**.
2. Choose a content section, edit fields, and select **Keep draft in this tab**. This wording deliberately distinguishes temporary review state from real CMS persistence.
3. Choose **Preview website**. Navigate to Watch/Explore/Podcasts to check a YouTube draft, or Blog to check a new post. Close returns to the editor without changing the browser URL.
4. Choose **View published reference** to compare with the original content. This is the bundled reference snapshot, not a read from a live CMS.
5. **Download drafts** keeps a JSON review file. **Import draft file** restores one in a later session after confirmation. Downloaded files may contain anything you typed, so keep them private.
6. Publish and upload stay disabled. A review file never changes the public site.

## Recommended activation path: a new client-owned Supabase project

Use a dedicated Inclusive Quest organization/project, owned and billed by the client. The client is preparing the Free project; no paid subscription is required or authorized by this PR. Confirm region, staff identities and roles before implementation. Do not connect the WatchVIM production database.

Recommended server contract:

- `content_drafts`: authenticated authorized staff only. Store type, schema version, validated JSON, revision, actor and timestamps.
- `content_published`: separate published snapshots. Anonymous reads are allowed only for deliberately published rows; never put draft fields in publicly readable rows.
- `content_revisions`: immutable snapshots and server-generated audit actor/time/action. Restore creates a new draft, never silently changes published content.
- Trusted membership roles: editor can save drafts; publisher can publish/unpublish. Database grants and Row Level Security must enforce this server-side. Browser UI flags and editable user metadata are not authority.
- Atomic publication: authenticate, authorize, validate, check expected revision, record a revision, and replace the published snapshot in one transaction. Add CSRF protection where cookie sessions are used and check request origin.
- Images: private draft storage with file type/size limits and authorization. Release approved assets to public storage only during publication. Store descriptive alt text per placement; document decorative exceptions explicitly.
- Never put a secret/service-role key in a `VITE_` variable, source code, a review JSON file or chat. Use approved secure credentials/configuration. A project URL/publishable key alone does not enforce access; test RLS.
- Configure approved email delivery before real editor invitations, sign-in links and recovery. Supabase's default SMTP is for testing, not a general production mail service.

### Public reader boundary

`src/cms/public-reader.js` is backend-independent. Once the approved backend endpoint exists, `VITE_CMS_ENABLED=true` enables a same-origin GET to `/api/content`. Leave it unset until the endpoint is ready; it is not an admin authorization flag. No endpoint is implemented in this foundation.

The endpoint must return JSON:

```json
{
  "schemaVersion": 1,
  "documents": [
    { "id": "episode-example", "type": "episode", "published": {
      "title": "Show title", "episodeTitle": "Episode title", "description": "Description",
      "youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "category": "Podcast",
      "tags": ["accessibility"], "imageSrc": "", "imageAlt": ""
    }}
  ]
}
```

The example video ID is a test fixture, not approved site content. Responses containing a `draft` property, unknown schemas, invalid fields or duplicate IDs are rejected. Failed/HTML/invalid responses fall back to existing bundled content. Valid empty collections stay empty, while required site singleton copy uses its bundled fallback. Define cache invalidation and failed-endpoint monitoring during backend activation so a stale fallback is not mistaken for a successful publication.

`src/cms/admin-repository.js` intentionally rejects every mutation and returns no session. Replace this only with authenticated, authorized operations after the project and security setup are approved; do not “enable” persistence by switching these booleans.

## Verification

```sh
npm ci
npm run test
npm run build
npx playwright install chromium
npm run test:browser
```

Browser tests start a development review server and a separately built production server, and run desktop/mobile flows. On a machine with an existing Chromium binary, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its path. GitHub Actions also installs the browser dependencies and runs this suite. A sandbox-blocked local browser run is not a passing browser check.

Coverage includes URL/alt-text validation, draft isolation, review import/export, public snapshot parsing/fallback, fail-closed mutation methods, production editor gating, field-change cancellation, actual website previews, click-to-load YouTube, blog templates, and an automated admin accessibility scan. Real YouTube playback rights and availability are not exercised by the mocked player fixture.

## Acceptance checks before activation/handover

1. Client approves custom-site CMS architecture and final basic scope; sponsorship functionality remains excluded.
2. Approved client-owned project, editor/publisher identities, role/security setup, credentials and email delivery are connected.
3. Anonymous/non-staff cannot read drafts or write content; editors cannot promote themselves or publish. Test direct API requests, not only the UI.
4. A named editor signs in independently; draft survives sign-out/reload; published version stays unchanged until publish; concurrent edit conflict and expired session are handled.
5. Publish a licensed test YouTube episode. Verify title, description, categories/tags, video availability, captions and Sign Language content on desktop/mobile; edit and unpublish without leaking drafts.
6. Upload/replace an image and alt text; validate size/type and draft asset privacy; test revisions/restore and publication rollback.
7. Review remaining copy, founder photo and approved media; complete human keyboard/screen-reader checks and a captioned recorded walkthrough.
8. Approve merge and production release separately. This draft PR does not authorize either.

Official implementation references: [React/Vite quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs), [API keys](https://supabase.com/docs/guides/api/api-keys), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [role-based access](https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac), [Storage access](https://supabase.com/docs/guides/storage/buckets/fundamentals), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
