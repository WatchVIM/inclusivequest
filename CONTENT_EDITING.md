# Inclusive Quest — temporary content editing instructions

Inclusive Quest is **not yet connected to a production CMS**. Until one is configured, approved source updates must be reviewed, tested and published through GitHub/Vercel.

**Content source:** `src/content.js`

- `BRAND`: name, tagline, support and contact email
- `ABOUT.paragraphs`: About introduction
- `FOUNDER`: Alma Beaty name, title, biography, story and headshot
- `TEAM.members`: confirmed team member records
- `TITLES`: podcast metadata and licensed audio/ASL/caption sources
- `FEATURES`: capability cards
- `PODCASTER_CHECKLIST`: submission requirements
- `WORK_WITH_US_FORMS`: platform and podcaster Tally URLs and iframe URLs (client-owned forms)
- `STATS`: client-requested figures; verify factual sources before investor use
- `TESTIMONIALS`: testimonials and attributions approved for public display
- `SOCIAL_LINKS`: `{ label: 'Instagram', url: 'https://...' }` entries once supplied

**Photos:** `FOUNDER.photoSrc` currently points to `/founder-photo.jpg`. Upload the approved portrait as `public/founder-photo.jpg`. Until then, the website displays a placeholder. Each team member can specify their own `photoSrc`.

**Review and release:** edit on a feature branch, run `npm run test` and `npm run build`, obtain content approval, merge to `main`, and verify the Vercel production alias in a signed-out browser. Never treat a successful preview as public release.

**Forms and submissions:** the About page displays a switcher between Platform and Podcaster Tally forms. The matching navigation pages show their respective forms. Responses are submitted to the client's Tally account, so the client must verify publishing, notifications, access to responses, consent/privacy settings, and that each form can be submitted successfully. The site does not store these responses locally.

**Pending CMS handover:** choose client-owned CMS hosting, authentication, roles, editor training, backups and media workflow. The client should be able to edit pages and media without editing code after this integration.

**External accessibility service:** add the specific AccessiBe embed only after Alma authorizes/provisions the account; use the official script for her account, not a guessed ID. Keep native accessibility and ASL features regardless.
