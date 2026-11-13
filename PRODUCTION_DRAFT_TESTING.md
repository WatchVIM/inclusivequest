# Production admin draft testing

Keep the public site on the bundled content from reviewed source `f66925ad9962e4789320c7842095b0ebe4bb8d60`. The Admin footer link is the only intended public-facing change. The existing CMS snapshot is different from that public baseline: the old home subtitle, an extra testimonial and a missing episode Coming Soon flag must stay out of the public site during draft testing. Do not reseed, re-import or republish any content.

## Gate settings

| Planned mode | `VITE_CMS_ENABLED` | `CMS_PUBLIC_READS_ENABLED` | Result |
| --- | --- | --- | --- |
| Disconnected | false/unset | false/unset | Public bundled site; production admin remains locked. |
| Draft testing | true | false/unset | Existing authorized CMS sign-in and private drafts. Public bundled site; website content and managed-media endpoints return 503 without querying Supabase. |
| Separate public release | true | true | Website can read published CMS records and media. Requires content parity review, authorization and intentional release. |

The credentials must remain scoped to the approved client project and use its publishable key. Vercel must have the same release flag at build and function runtime; a missing or incorrect value is off. A new build is required for a flag change. Locally, export the release flag explicitly for Vite. In either mode the website APIs retain anonymous access and existing validation. Staff use authenticated signed URLs to preview private media.

## Draft testing release checks

1. Verify the active deployment source, branch and rollback target. Do not deploy from the older default branch. Preserve production project settings, CSS, routing, public files and bundled content except for the footer and signed-in admin changes in this review.
2. Require a separately reviewed and approved Supabase publication hold before enabling connected draft testing. The website flag and disabled UI controls do not revoke publisher RPC permissions. This release does not change existing direct Supabase read or Storage policies. Only content already classified as published in the database is publicly readable there, subject to existing policy filters; private drafts remain protected by the existing membership policies.
3. Verify the exact candidate remains static with the flag off. Compare the public homepage, testimonials, Watch episode status, interpreter/poster images, navigation and the public content/media responses. Confirm that the two website API routes return 503 without an upstream call. Do not move the production alias if any corrected content or asset differs.
4. Check signed-out `/admin`, then have Alma use her existing membership to test a private draft and signed image preview. No publish/unpublish/setup controls should be present. The preview may show a CMS draft or CMS snapshot that differs from the current website. Verify no published content was changed.
5. For an eventually authorized public cutover, review the entire CMS snapshot and media against the approved baseline first. Enable the web gate and lift the backend hold only as approved, recording the exact rollback target and checks. The act of signing in or saving drafts never requires lifting either gate.
