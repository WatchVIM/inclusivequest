# Inclusive Quest — CMS activation and captioned handover

**Status (18 October 2026): Preview integration in progress; production not activated.** The React/Vite production site is connected to GitHub and Vercel. A client-facing CMS is not currently configured, and the founder has not been issued a CMS login or a captioned tutorial recording. Do not tell the client that independent editing has been enabled until each acceptance check below passes.

## Ownership and setup needed

- Alma Beaty / Inclusive Quest must own or explicitly approve the chosen CMS account, workspace and billing. Do not host a separate client's editable content in the WatchVIM Supabase production database.
- The approved backend is the client-owned Inclusive Quest Supabase project. Alma owns the organization and is the approved website publisher; Anthony is the approved website test editor. Website roles and dashboard roles are separate.
- Configure draft/publish and revision history, with a staging preview and rollback plan.
- Model editable collections: Homepage hero and CTA copy, About text, Mission/Vision/Values, founder profile and portrait, team biographies/photos, testimonials, pages and metadata, podcasts/videos with captions and Sign Language video references, footer links/tagline, and the client-provided Tally form URLs.
- Use an image upload service under the client's control and record alternative text; add video hosting only after Alma selects YouTube or Vimeo or another approved provider.
- Secure edit/publish endpoints, avoid exposing CMS API secrets in public JavaScript, use minimum permissions, and enable account recovery/MFA where supported.

## Acceptance checks before communicating access

1. Alma signs in independently to a client-owned CMS in a private browser.
2. She edits Mission Statement, saves as draft, previews and publishes; confirm production updates.
3. She replaces founder photo, edits alternative text, and checks mobile layout.
4. She adds, edits, and removes a testimonial and a podcast/video record.
5. She can manage key site copy, logo use, contact links and Tally forms (with role restrictions as appropriate).
6. Verify revisions, recovery, audit log and preview/production rollback.
7. Confirm that editing works without a developer or GitHub commits.

## Captioned training video — script and shot plan

**Do not call this a recording or deliver it as completed until the CMS is running and actual screens have been captured.**

- 00:00–00:25 — Sign in to your Inclusive Quest CMS; verify you're in the correct workspace.
- 00:25–01:05 — Dashboard overview; difference between Draft, Preview and Publish.
- 01:05–01:50 — Open About, edit Mission, Vision and Values, save and preview.
- 01:50–02:35 — Replace the founder portrait; write descriptive alt text.
- 02:35–03:20 — Add, edit and remove a testimonial; confirm public listing.
- 03:20–04:20 — Add a podcast episode, media URL, captions and Sign Language interpretation track; check the player preview.
- 04:20–05:00 — Change Tally form links and verify they open; submit a test form.
- 05:00–05:35 — Publish and check mobile/desktop; restore a previous version if needed.
- 05:35–06:00 — Account access, support contacts and how to avoid unpublishing content.

**Accessibility deliverables:** an accurate SRT/VTT file reviewed against recorded speech, open or switchable captions throughout, clear on-screen focus indicators, generous reading pauses and a written step-by-step transcript.

## Current editorial workaround

Until the CMS is live, editors must request a reviewed GitHub content change (see CONTENT_EDITING.md). This is **not** the promised self-service experience. Do not assign Alma a GitHub-only workflow and describe it as a CMS.

## Pending items

- Founder photo from the client — the latest email does not contain a downloadable photo; request a fresh upload or approved direct asset link.
- The client's preferred CMS account/owner email and invitation/connection, plus approval of access roles.
- Approved hosting choice for videos, and real captions and Sign Language media.
- The client's final clarification/example for the placeholder interpreter-area artwork.
- The recorded, accurately captioned CMS walkthrough and successful independent editor acceptance test.

## 18 October 2026 integration update

The basic same-site admin now includes Supabase Auth integration, persistent draft/publication RPCs, private image upload, revision history and a shared public content/media reader in PR 6. The client-owned Supabase project and named website roles are approved. Owner-only Auth settings, secure preview configuration, invitations and real end-to-end acceptance still gate activation. See [ADMIN_SETUP.md](ADMIN_SETUP.md) for the current exact setup and verification checklist; its narrower implemented field list supersedes the earlier proposed collection list above. No captioned recording or independent client acceptance is complete. Production release remains separate.
