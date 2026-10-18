# CMS database and security contract

Status: local implementation, **unapplied review SQL** in `schema/cms.sql`. It has not changed a Supabase project. No credentials, users, memberships, buckets, project settings, deployed migrations or live content were created by this file's author. Supabase CLI was unavailable, so there is deliberately no fabricated timestamped migration.

## Activation gates

1. Obtain approval for the exact client-owned database/security changes, initial staff identities/roles, private image storage, and baseline public content import. Never use another project's credentials or database.
2. Review the SQL and run the local tests. When CLI access is available, generate a migration with `supabase migration new inclusive_quest_cms` and place the reviewed SQL in the **CLI-generated** file. Do not apply the test bootstrap to Supabase.
3. Confirm `cms_private` is absent from PostgREST exposed schemas and extra search path; keep only the intended API schema exposed. Check Storage supports `storage.allow_any_operation` before activation. The SQL intentionally fails instead of weakening this boundary if that helper is missing.
4. After approval, apply the reviewed migration to the approved target and run real HTTP negative tests below. The script is a one-time transaction; an existing schema/bucket/table makes it fail rather than silently modify existing security. Later changes need new reviewed migrations.
5. Provision approved Auth users and insert verified auth UUIDs into `cms_members` through the trusted operator path. No application membership-editing RPC exists. Never trust `user_metadata` or browser role flags. Configure approved Auth redirects/email delivery independently.
6. Use only a publishable API key with the actual user's JWT for staff requests. Public requests use the publishable key without a staff token. No service-role credential is used anywhere in this runtime contract.
7. Initialize only after explicit confirmation of the reviewed baseline. Verify public snapshots and media behavior before enabling the CMS-facing public endpoint or releasing the site.

## Tables and authority

- `cms_members`: verified auth UUID, `editor` or `publisher`. Authenticated users can read their own membership; no client can insert/update/delete membership.
- `content_drafts`: validated JSON, schema version 1, revision, database-generated actor/time. Members can read; only narrow mutation functions write.
- `content_published`: separate snapshots with no draft fields. Only deliberate publish/initialize writes them. Anonymous SELECT is permitted. The public RPC emits only `id`, `type`, `published`.
- `content_revisions`: append-only snapshots with action, actor/time and unique document/revision. Members can read. Update/delete are blocked by grants and an immutable trigger.
- `cms_assets`: registered completed uploads, verified against actual Storage object ID, owner and metadata. Members can read; only registration writes.
- Private state and idempotency receipts are not exposed. Every replay still checks current membership and publisher permission.

Every exposed RPC is `SECURITY INVOKER`. Minimal private mutation helpers are `SECURITY DEFINER` with an empty fixed search path, qualified relations, live membership checks and explicit EXECUTE grants. Authenticated roles need private-schema usage/limited helper execute for invoker wrappers; that does **not** mean the private schema may be exposed through PostgREST. No caller-controlled dynamic SQL or role-claim privilege escalation exists.

The complete public snapshot is limited to 3,500,000 UTF-8 bytes, including the `schemaVersion` and `documents` envelope. Publish and initialize check the actual attempted snapshot while holding the write lock. An over-budget mutation returns PT400 with instructions to shorten content or unpublish another document, and rolls back publication, draft revision, audit and idempotency changes together. The budget uses PostgreSQL JSONB text (including its whitespace), conservatively larger than compact HTTP JSON. Character counts cannot substitute for UTF-8 byte counts.

The small CMS serializes mutations with an advisory transaction lock. This makes the 250-document cap, revision checks, slug uniqueness, draft/snapshot update and audit write atomic. Membership rows are share-locked during mutations so revocation cannot race a checked mutation. A transaction either commits its document/history/idempotency result together or rolls back all of it.

## RPC interface

Names and parameter names are exact for `supabase.rpc(name, parameters)`.

| RPC | Parameters | Response |
| --- | --- | --- |
| `cms_session` | none | `null` for non-members, otherwise `{user:{id},role}` |
| `cms_list_documents` | none | `[{id,type,draft,published,revision,updatedAt}]` |
| `cms_get_revisions` | `p_id` | `[{id,action,createdAt,actor,data,revision}]`, newest first |
| `cms_public_snapshot` | none | `{schemaVersion:1,documents:[{id,type,published}]}` |
| `cms_save_draft` | `p_id,p_type,p_data,p_expected_revision,p_operation_id` | `{document,replayed}` |
| `cms_publish` | `p_id,p_expected_revision,p_operation_id` | `{document,replayed}` |
| `cms_unpublish` | `p_id,p_expected_revision,p_operation_id` | `{document,replayed}` |
| `cms_restore_revision` | `p_id,p_revision_id,p_expected_revision,p_operation_id` | `{document,replayed}` |
| `cms_register_asset` | `p_path` | `{path,imageSrc,contentType,sizeBytes}` |
| `cms_initialize` | `p_documents,p_operation_id` | `{documents,replayed}` |

`document` is the same record shape as the list. A new document uses expected revision 0 and becomes revision 1. Every successful save/publish/unpublish/restore increases the revision, including equivalent-data actions. Restore always makes a **new draft** and never alters the published snapshot. A revision must belong to that document.

Generate an operation UUID once per logical mutation; retain it with the exact payload on uncertain-network retries. Reusing it with a different action/payload fails. An exact replay returns the original result with `replayed:true` without repeating history or publication. Refresh records after replay if another person may have edited since the original result. Asset registration itself is idempotent for the same verified immutable object.

PostgREST maps custom SQLSTATE codes: `PT400` invalid data or duplicate section slug, `PT403` missing/insufficient live membership, `PT404` missing document/revision/upload, `PT409` stale revision, reused operation ID; `PT503` baseline initialization is required before public reads or mutations. Ordinary database permission errors can also surface as HTTP 401/403. Never turn failed reads into a claimed successful save/publish.

### Baseline initialization

The reviewed SQL contains the exact current canonical bundled seed snapshot. Pass `[{id,type,data}]` using `canonicalContent(type, seed.published)`; array order does not matter. Initialization is publisher-only, empty-only, all-or-nothing, and idempotent. It imports the already-public baseline into both drafts and published snapshots, with an `initialize` audit event for each document. It does not accept arbitrary imported draft files. Any baseline changes require renewed review and matching SQL.

The existing placeholder episode has no playable YouTube/interpreter media. Only exact baseline initialization preserves that existing public placeholder. A `baseline` flag on the published row permits structural validation during initialization; the next ordinary publication clears the flag and must meet the normal video requirement. The API never exposes this internal flag. Before baseline initialization, public reads and all content/asset mutation RPCs return PT503, and Storage INSERT is denied, so the website retains its bundled fallback. Mutation gating is checked under the same global transaction lock as initialization. Initialization is the only operation that activates the CMS; a first save/publish cannot accidentally activate a partial collection. After activation, an empty public collection intentionally remains empty.

## Authoritative data validation

SQL independently validates types, strict per-type field allowlists, required text, maximum lengths, tags, unique section slugs, IDs and schema version. Unknown fields are rejected, not silently stored. Client canonicalization removes legacy episode `id`/`poster`, retains optional `interpreter`, and converts accepted YouTube links to exactly `https://www.youtube.com/watch?v=` plus an 11-character ID. SQL rejects alternate hosts, noncanonical parameters and malformed IDs. Human review still determines licensing, availability, captions and Sign Language quality.

An image must be empty, one of the exact bundled paths, or `/api/media?path=USER_UUID/OBJECT_UUID.ext`, with raw slashes and lowercase UUIDs; allowed extensions are `jpg`, `png`, `webp`. Required alt text is validated per placement. New external image URLs, encoded path aliases, arbitrary local paths and uploaded SVGs are rejected. Allowed bundled paths are `/inclusive-quest-logo.png`, `/she-wears-the-pants.svg`, `/founder-photo.jpg`. The last is referenced by existing content but its file is absent; replace it with a licensed uploaded founder photo before handover. The repository-owned SVG is an explicit existing asset exception, not an upload allowance.

Managed images must be registered and still match the Storage object at save/restore/publish. Unpublish can still remove a snapshot whose media was removed by an operator. Paired main/interpreter video URLs must be safe HTTPS URLs (no credentials, whitespace, backslashes, arbitrary protocols or ports); captions also permit the existing `/sample-captions.vtt`. New video upload/provisioning is outside this image bucket.

## Private media contract

`cms-images` is a **private** bucket with server-side JPEG/PNG/WebP MIME restrictions and 4,000,000-byte maximum (below the [4.5 MB Vercel function response limit](https://vercel.com/docs/functions/limitations)). Staff upload to their own UID folder and a fresh object UUID, with `upsert:false`. Uploads may never overwrite, move or delete existing objects through the basic CMS. Restrictive policies prevent a future broad permissive Storage policy from granting those CMS actions accidentally.

Storage's upload authorization probe can lack completed metadata; INSERT authorization therefore checks live member, owner UID and immutable path. Bucket limits enforce upload type/size. `cms_register_asset` independently checks the completed object's owner, real metadata, size and MIME/extension correspondence before accepting it. Registration cannot inspect image bytes in SQL. The application/media boundary must verify image signatures, return the expected MIME with `X-Content-Type-Options: nosniff`, and avoid treating supplied metadata as proof of safe bytes.

Anonymous downloads require an **exact reference in a currently published snapshot** and an allowed download operation. No anonymous list, sign, copy, transform or S3 route is allowed. The same-origin `/api/media` endpoint must fetch with the publishable key alone, preserve this RLS boundary, and use no-store to avoid intentionally serving a formerly published asset from an application cache. Unpublishing/replacing the last reference removes new anonymous download access; already downloaded copies cannot be recalled.

Current staff may download draft images and request single-object signed previews. The UI uses 300-second links without persisting them in content/export files. These bearer URLs remain usable until expiration even after membership changes. **300 seconds is an application setting, not an RLS-enforced maximum**; do not describe it as a database TTL cap. Anonymous signing, bulk signing and object listing stay denied. Staff asset choices should come from `cms_assets`, not a Storage list call.

## Verification

Run `node --test tests/cms-database.test.mjs` with the `@electric-sql/pglite` development dependency installed. A local existing package can be selected by `CMS_PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js`.

The tests execute the actual schema in real embedded PostgreSQL and exercise role grants/RLS, anonymous/nonmember denial, role-metadata spoofing, baseline initialization, SQL validation, save/publication separation, optimistic conflicts, idempotent replay, history/restore, revocation, image registration, immutable storage and published-reference-only access. `supabase/tests/bootstrap.sql` supplies local-only Auth/Storage relation fixtures and operation markers. It must **never** be applied remotely.

These tests are not live Supabase acceptance. Before production, use real separately authenticated editor/publisher/nonmember sessions and the publishable key to test:

1. Anonymous direct table/RPC attacks cannot read drafts/history/assets or mutate anything; an editor cannot promote their role or publish/unpublish.
2. New users with forged editable metadata remain nonmembers. Revoking membership denies subsequent calls, including replay.
3. Two concurrent requests using the same expected revision produce one success and one conflict; exact same-operation retry is a replay with one audit entry.
4. Actual standard JPEG/PNG/WebP upload succeeds; SVG, false extension, oversized upload, overwrite and delete fail. Registration rejects missing/invalid completed metadata and another user's path.
5. An actual draft upload cannot be anonymously downloaded, listed or signed; after publish its exact path downloads; changing/unpublishing the last reference removes access. No service-role client participates.
6. Staff preview signing works for 300 seconds while anonymous signing/listing and disallowed routes fail. Verify currently deployed Storage operation names and helper support.
7. Supabase advisors report no unintended public data or mutable search path. Any advisory around authenticated execute on private definer helpers must be reviewed against the narrow RPC/membership design rather than blindly granting broader table writes.

### Official references checked during implementation

- [Database functions and privileges](https://supabase.com/docs/guides/database/functions)
- [Private RLS helper exposure](https://supabase.com/docs/guides/troubleshooting/do-i-need-to-expose-security-definer-functions-in-row-level-security-policies-iI0uOw)
- [Storage access control and operation-aware SELECT](https://supabase.com/docs/guides/storage/security/access-control)
- [Storage operation helper functions](https://supabase.com/docs/guides/storage/schema/helper-functions)
- [Official operation names](https://github.com/supabase/storage/blob/master/src/http/routes/operations.ts)
- [Official upload permission/metadata flow](https://github.com/supabase/storage/blob/master/src/storage/uploader.ts)
