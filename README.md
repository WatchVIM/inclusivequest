# Inclusive Quest

**See Every Story. See Every Voice.**

This repository contains the Inclusive Quest accessible-podcasts website, built with React 18 and Vite 5 and deployed on Vercel.

## Pages

Home · About · Explore · Watch · Podcasts · For Platforms · For Podcasters · Sign In · Sign Up

Home offers two distinct calls to action: **Start Watching** opens Watch, while **Start Exploring** opens the browse-and-search Explore page.

**Work With Us:** the About page hosts switchable Tally forms, and the For Platforms / For Podcasters pages embed their respective forms with direct-open fallbacks. Platform submissions: https://tally.so/r/jeDMqQ; podcasters: https://tally.so/r/LD1G0j; interpreters: https://tally.so/r/OQ1Bj7; other collaborators: https://tally.so/r/J1KkQK. The dedicated investment page embeds https://tally.so/r/aONj6W. Form responses are managed in the client's Tally workspace, not this GitHub repository or the website's CMS.

Footer pages: Privacy, Accessibility, Terms of Service and Support.

The platform is currently in **prelaunch**. Media playback requires licensed podcast video, captions and interpreter footage. Sign-in and sign-up show launch information rather than creating accounts. The merchandise storefront is removed and cannot process purchases.

## Run and verify

```bash
npm install
npm run test
npm run build
npm run dev
```

All page copy, founder information, Mission/Vision/Values placeholder statements, podcast descriptions, statistics, five Tally submission URLs, testimonials and social-link data live in `src/content.js`. The app component and accessibility controls live in `src/App.jsx` and `src/revisions.css`. Replace the temporary show artwork in `public/she-wears-the-pants.svg` with approved licensed artwork before public promotion.

The site offers an accessibility panel with four text-size levels, strong contrast and focused-reading options, color-vision-friendly display colors, animation pausing, highlighted links, three caption palettes, and opt-in browser-native Read Aloud / Auto-Read. These require browser testing and do not replace human accessibility audits.

## Accessibility

ASL is mandatory in the playback design, with captions defaulting to enabled. The on-site floating accessibility panel provides display adjustments. It is **not** the AccessiBe third-party widget; the latter requires an approved client account/script configuration and separate validation. Accessibility requires real-user testing, keyboard/screen-reader audits, and captions + ASL source media. A widget alone does not prove compliance.

## Client handover requirements

Before final handover:
1. Obtain final founder photo, official IQ brand files, licensed episode media, team information, social URLs and approval to publish the supplied Tally forms.
2. Replace provisional legal page copy with client-counsel-approved policies.
3. Integrate an authenticated, client-owned CMS and train Alma Beaty on publishing, revisions and approvals.
4. Connect a persistent newsletter system with explicit consent, confirmed privacy terms and unsubscribing. The current newsletter action opens a contact email instead of storing signups.
5. Run mobile/desktop browser and accessibility checks, confirm working email/contact delivery and public URL access.
6. Send admin invite and handover instructions, and provide a tutorial recording after testing.

See `CONTENT_EDITING.md` for temporary source-content editing instructions and `CMS_HANDOVER.md` for the client-owned CMS activation criteria, full editor-access checklist and captioned tutorial plan. **Do not imply the CMS or tutorial is delivered yet.**

## Admin review foundation

The same-site `/admin` includes an authenticated CMS workspace with editor/publisher roles, server-saved drafts, private uploads, publishing and revision restore when the approved backend is configured. Without backend configuration it falls back to a clearly labelled, in-memory review workspace. Its draft preview uses the actual public website, including YouTube metadata, categories/tags and blog templates. Code completion is not live acceptance or production activation. See [ADMIN_SETUP.md](ADMIN_SETUP.md) for the exact editable scope, review steps, Supabase integration contract, tests and activation checklist. No production CMS has been activated by this change.

