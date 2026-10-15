# Inclusive Quest

**See Every Story. See Every Voice.**

This repository contains the Inclusive Quest accessible-podcasts website, built with React 18 and Vite 5 and deployed on Vercel.

## Pages

Home · About · Explore · Watch · Podcasts · For Platforms · For Podcasters · Sign In · Sign Up

Footer pages: Privacy, Accessibility, Terms of Service and Support.

The platform is currently in **prelaunch**. Media playback requires licensed podcast video, captions and interpreter footage. Sign-in and sign-up show launch information rather than creating accounts. The merchandise storefront is removed and cannot process purchases.

## Run and verify

```bash
npm install
npm run test
npm run build
npm run dev
```

All page copy, founder information, podcast descriptions, statistics, testimonials and social-link data live in `src/content.js`. The app component and accessibility controls live in `src/App.jsx` and `src/revisions.css`. Replace the temporary show artwork in `public/she-wears-the-pants.svg` with approved licensed artwork before public promotion.

## Accessibility

ASL is mandatory in the playback design, with captions defaulting to enabled. The on-site floating accessibility panel provides display adjustments. It is **not** the AccessiBe third-party widget; the latter requires an approved client account/script configuration and separate validation. Accessibility requires real-user testing, keyboard/screen-reader audits, and captions + ASL source media. A widget alone does not prove compliance.

## Client handover requirements

Before final handover:
1. Obtain final founder photo, official IQ brand files, licensed episode media, team information, social URLs and approved platform/podcaster forms.
2. Replace provisional legal page copy with client-counsel-approved policies.
3. Integrate an authenticated, client-owned CMS and train Alma Beaty on publishing, revisions and approvals.
4. Connect a persistent newsletter system with explicit consent, confirmed privacy terms and unsubscribing. The current newsletter action opens a contact email instead of storing signups.
5. Run mobile/desktop browser and accessibility checks, confirm working email/contact delivery and public URL access.
6. Send admin invite and handover instructions, and provide a tutorial recording after testing.

See `CONTENT_EDITING.md` for temporary source-content editing instructions.
