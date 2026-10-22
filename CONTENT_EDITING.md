# Inclusive Quest — temporary content editing instructions

Inclusive Quest is **not yet connected to a production CMS**. Until one is configured, approved source updates must be reviewed, tested and published through GitHub/Vercel.

**Content source:** `src/content.js`

- `BRAND`: name, two taglines (including footer), original logo, support and contact email
- `ABOUT.paragraphs`: About introduction
- `FOUNDER`: Alma Beaty name, title, biography, story and headshot
- `TEAM.members`: confirmed team member records
- `TITLES`: podcast metadata and licensed audio/ASL/caption sources
- `FEATURES`: capability cards
- `PODCASTER_CHECKLIST`: submission requirements
- `WORK_WITH_US_FORMS`: platform, podcaster, interpreter, other collaborator Tally URLs and iframe URLs (client-owned forms)
- `INVEST_FORM`: investment inquiry Tally URL and embed URL
- `MISSION_VISION_VALUES`: Mission, Vision and Values placeholders to edit later
- `STATS`: client-requested figures; verify factual sources before investor use
- `TESTIMONIALS`: testimonials and attributions approved for public display
- `SOCIAL_LINKS`: `{ label: 'Instagram', url: 'https://...' }` entries once supplied

**Photos:** `FOUNDER.photoSrc` currently points to `/founder-photo.jpg`. Upload the approved portrait as `public/founder-photo.jpg`. Until then, the website displays a placeholder. Each team member can specify their own `photoSrc`.

**Review and release:** edit on a feature branch, run `npm run test` and `npm run build`, obtain content approval, merge to `main`, and verify the Vercel production alias in a signed-out browser. Never treat a successful preview as public release.

**Forms and submissions:** the About page displays a four-choice switcher (Platform, Podcaster, Interpreter, Other); the Invest page displays the fifth form. The matching navigation pages show their respective forms. Responses are submitted to the client's Tally account, so the client must verify publishing, notifications, access to responses, consent/privacy settings, and that each form can be submitted successfully. The site does not store these responses locally.

**Pending CMS handover:** choose client-owned CMS hosting, authentication, roles, editor training, backups and media workflow. The client should be able to edit pages and media without editing code after this integration.

**External accessibility service:** add the specific AccessiBe embed only after Alma authorizes/provisions the account; use the official script for her account, not a guessed ID. Keep native accessibility and ASL features regardless.

**Client CMS and captioned tutorial:** not active. See `CMS_HANDOVER.md` for verified prerequisites, client-owned admin account, acceptance tests and tutorial outline. Do not promise independent no-code editing until those steps are completed.

**Admin review foundation:** `/admin` is available for in-memory content review only on development/preview builds, with an actual-site draft preview and downloadable/importable draft files. Production editing and publishing remain disabled. See [ADMIN_SETUP.md](ADMIN_SETUP.md). The public video sections now share an adapter for published YouTube episodes and category/tag data; the backend endpoint is not connected yet.
