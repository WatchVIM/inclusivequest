# Sponsor placements and CMS build

## Status: code-only isolated preview; connected CMS and advertisements not activated

The source now implements authenticated sponsor administration through the existing CMS: private draft save, publisher-only publication/unpublication, revision history/restore, private image upload and website preview. Sponsor records are not added to the original initialization seed, so upgrading does not create or enable any campaigns.

The database schema and `supabase/review-migrations/sponsor-cms.sql` contain the corresponding server validation, permissions, published-only exposure and image access changes. The upgrade migration is prepared, **not applied** to a live project. The separate `feat/sponsor-cms-isolated-preview` branch is authorized for code-preview deployment only. Its CMS environment stays unconfigured because no accessible isolated test database has been established. No credentials, memberships, live content, production settings, outreach or advertiser activation are changed. A connected handover requires the separate release gates below.

In this disconnected preview, `/admin` explicitly reports that secure publishing is not connected and offers only temporary in-memory review. Uploads, server-saved drafts and live publishing are unavailable. Do not mistake the review workspace or the layout sandbox below for authenticated end-to-end acceptance.

Alma selected homepage and podcast episode-page placements with simple sponsor images and links. Exact positions and shared versus per-episode targeting still need approval. No advertiser assets, destination or campaign activation has been supplied or approved. Episode targeting starts **undecided** in the CMS; the implementation does not presume that shared targeting is approved.

## Authenticated sponsor workflow

After the reviewed migration and matching application are applied in an explicitly approved test environment:

1. Sign in at `/admin` using an existing invited editor or publisher account. Open **Sponsors**, then **+ Add sponsor**. The existing roles remain unchanged.
2. Choose **Sponsor placement**: Homepage or Podcast episode pages. A new record starts empty and off. Save it before uploading artwork.
3. Supply the approved sponsor name, destination HTTPS link and **Alternative text**. Use **Upload image** for JPEG, PNG or WebP artwork up to 4 MB. Uploads remain private while attached only to a draft. Save again to attach the image to the record.
4. For an episode placement, leave **Episode targeting** undecided until there is a decision. Choose **All published episodes (shared)** only after that scope is approved, or choose **One specific episode** and **Target episode**. A per-episode placement can activate only against a currently published episode.
5. **Enable when published** is a draft field, not a live switch. Saving an enabled or disabled draft does not alter the published site. Incomplete drafts may be saved, but unsafe values are rejected; an enabled publication requires complete, valid content and resolved targeting.
6. **Preview draft** displays the private saved content. An episode sponsor preview opens the episode layout, and a targeted sponsor opens its selected episode. **View published website** excludes draft-only changes. Previewing never publishes.
7. A publisher selects **Publish**, reviews the target-specific confirmation, then confirms. An editor can save and preview but cannot publish. Overlapping enabled published campaigns are rejected: one homepage campaign, either one shared episode campaign or non-overlapping per-episode campaigns.
8. To remove a live placement, clear **Enable when published**, save, then publish the off version, or select **Unpublish** and confirm. Drafts and revisions remain private. **Revision history** restores an earlier version as a new draft without changing what is live.
9. Disable or unpublish an enabled per-episode sponsor before unpublishing the episode it targets. The server rejects an operation that would leave an enabled sponsor pointing at an unpublished episode.

## Isolated layout sandbox remains separate

`/admin/sponsors` is the older tab-only layout sandbox, available in local development and approved preview builds. Its controls are gated off in a production build. It does not sign in, save remotely, upload files, or publish and is not the authenticated sponsor workspace.

- Choose Homepage or Podcast episode pages, use **Load local sample**, enable the review switch, and **Keep preview changes**.
- The repository-owned sample is explicitly labelled, links to example.com and starts off. The episode sandbox demonstrates a provisional shared placement only; this does not set or approve CMS targeting.
- **View homepage** and **View episode page** inspect the actual site layout. Switching placements cannot silently discard changed fields. Clearing one review placement leaves the other unchanged.
- Reloading clears all sample changes. Use public sample information only.

The homepage slot is below the feature strip. The episode slot is below the player and episode information, before the episode cards. No ad overlays the video, captions, Sign Language interpreter or player controls. There is no search/listing or in-video slot.

## Accessibility and safety

- Clear “Sponsored” disclosure, descriptive image alternatives, visible keyboard focus and new-tab notice.
- Responsive two-column cards stack on small screens. Artwork is contained, not cropped. Image-load failure retains the named link.
- Destination links require a full HTTPS host without credentials, explicit ports, whitespace, malformed percent escapes or executable protocols. Links use `sponsored noopener noreferrer`.
- Public model/API responses exclude drafts, off campaigns, unresolved targets and orphaned per-episode campaigns. Internal extra sponsor fields are not serialized. Duplicate or conflicting applicable campaigns render nothing rather than choosing an arbitrary advertiser.
- Draft/public separation and upload/revision flows reuse existing CMS authorization and concurrency controls. No new public editor, advertiser login or privilege is introduced.
- No carousel, tracking, ad networks, cookies, automatic rotation, scheduled campaigns, payment collection, or impression/click reporting.
- Site preview disables existing live newsletter/Tally submission behavior. Sponsor links still open their stated destination.

## Remaining release gates

1. Approve exact positions and shared/per-episode targeting. Supply approved advertiser name, artwork, image description, destination and activation decision.
2. Review the local migration, permissions, upgrade/backout procedure and tests. Obtain the required approval before any live project or deployment change.
3. Apply migration and application to an approved isolated connected preview. Verify real invite/sign-in, editor versus publisher permissions, draft saving, publication, unpublication, revocation, conflicts, revision restore, public API filtering and private/off/published image access.
4. Complete desktop/mobile browser, keyboard/screen-reader, visual and client acceptance checks. Local DOM tests and an in-process PostgreSQL fixture do not establish live backend or real-browser acceptance.
5. Obtain separate production release and sponsor activation approval. No campaign should be enabled merely because implementation exists. Deposit status is not established by this build.

## Verification

`npm test` runs baseline CMS tests plus sponsor model/API, authenticated DOM and local database tests. `npm run build` runs those checks and creates the bundle. Browser scenarios cover the isolated sandbox and authenticated sponsor flow, but must actually launch and pass in an allowed browser environment. A launch failure is a blocked browser check, not a pass. See `BUILD_REVIEW_STATUS.md` for the observed local verification and remaining gates.
