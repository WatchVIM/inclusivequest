# Sponsor placement review

## Status: first working preview, not live advertising

This isolated feature branch adds a homepage sponsor slot and a shared podcast episode-page slot. Both start empty and off. The existing admin PR is the base, not modified by this branch. No Supabase schema, credentials, memberships, live content, or production settings were changed.

Alma selected the homepage and podcast episode page with simple sponsor images and links. A single shared episode slot is still a **provisional review assumption**, not a confirmed final targeting decision. The positions below also need approval. No advertiser assets, destination link, or campaign activation has been supplied or approved.

## Open and review

Open `/admin/sponsors` on this branch's Vercel Preview deployment, or under local Vite development. The content admin review gate also links to it. An authorized preview viewer may need Vercel access; do not disable protection to work around that.

1. Choose **Homepage** or **Podcast episode pages**.
2. Enter sponsor name, approved image URL/site asset path, destination HTTPS link and image description. **Load local sample** supplies a clearly marked, repository-owned placeholder and an example.com link. It remains off.
3. Select **Enabled in review preview**, then **Keep preview changes**. Use **View homepage** or **View episode page** to inspect the actual site components.
4. Turn the switch off and keep changes to hide that slot. The other slot remains independent.
5. Unkept field changes cannot be silently lost by switching placements. Keep or discard them first. **Clear review placement** removes only that tab's selected slot.
6. Reloading resets both slots. Nothing is saved remotely, uploaded, or published. Use public sample information only. There is no live sponsor administration yet.

The homepage slot is below the feature strip. The episode slot is below the player and episode information, before the episode cards. No ad overlays the video, captions, Sign Language interpreter or player controls. There is no slot on search/listing pages or inside videos.

## Accessibility and safety

- Clear “Sponsored” disclosure, descriptive image alternatives, visible keyboard focus and visible new-tab notice.
- Responsive two-column card stacks on small screens; artwork is contained, not cropped.
- Image-load failure retains the named destination link.
- No carousel, automatic rotation, animation, tracking, ad networks, cookies or payment collection.
- Invalid/executable/protocol-relative URLs fail closed. Destination links require HTTPS without credentials or custom ports and use sponsored/noopener/noreferrer attributes.
- Disabled, incomplete, invalid or duplicate slot data never renders. No blank ad container is left behind.
- Public website rendering has no live sponsor data source. The review context exists only in the preview page; the page's controls are gated off in a production build.
- Site review disables existing live newsletter/Tally submission behavior. Clicking a sponsor link still opens its stated destination.

## Remaining implementation and release gates

This is a functional layout/control review, not the promised authenticated sponsorship CMS handover. Before activating anything:

1. Confirm shared versus per-episode targeting and approve exact placement positions.
2. Supply approved advertiser name, real artwork, image description, destination URL and campaign activation decision.
3. Extend the existing client-owned CMS with reviewed sponsor draft/publication storage and server validation. Reuse the established editor/publisher split; do not create a separate public editor, advertiser login or new privileges implicitly. Keep unpublished/off sponsor data and draft media out of public responses.
4. Apply backend changes only after the required project/security approval. Connect authenticated editing only after live draft/publish, revocation, validation and image-access tests pass. This branch intentionally does not write an unsupported sponsor type to the current CMS.
5. Complete real desktop/mobile, keyboard/screen-reader and client acceptance tests, then give final operating instructions for the connected version.
6. Obtain separate production-release and activation approval. Deposit status is not established by this implementation.

Scheduled campaigns, auto-rotation, advertiser accounts, payments, impression/click reporting, ad networks and in-video advertising are outside this preview scope.

## Verification

`npm test` runs existing CMS tests and new sponsor model/DOM tests. `npm run build` runs those checks and produces a production-gated bundle. `npm run test:browser -- tests/browser/sponsors.spec.js` covers both configured desktop and mobile projects: two independent slots, reset/off behavior, no live write requests, URL errors/focus, layout overflow, scoped axe checks and the production gate. A browser-suite launch failure is not a pass; record it separately from DOM coverage.
