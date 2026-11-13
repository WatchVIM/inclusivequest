# Admin password login and secure setup

This review branch adds full-email-as-username password login and secure completion of existing-account invitation/recovery links. It does not send emails, create accounts, generate temporary passwords, change roles or apply database changes.

## Account access
The existing two-confirmed-email CMS rule remains authoritative: info@inclusivequest.co is the publisher and abawn@watchvim.us is the editor. Auth getUser and live cms_session membership are checked. Roles are never inferred from user-editable metadata.

## Secure password setup
1. Verify this branch's preview deployment is ready and /admin shows the new login form.
2. Use a separately approved owner-initiated secure invitation/recovery flow for an existing account. Do not email plaintext passwords or ask users to share passwords.
3. Target the exact allowlisted callback:
   https://inclusivequest-git-feat-alma-refinements-r-832aff-watch-vim-ott.vercel.app/admin
   The configured SiteURL was still an older preview when checked November 11, 2026. Do not rely on that default.
4. Each owner opens their link, chooses and confirms a unique password, and signs in again after completion. The form requires 12–128 characters and preserves password whitespace.
5. Verify each account's existing role and that failed/expired links cannot open the private workspace.

Owner-generated implicit invite/recovery callbacks work in the recipient's browser without the operator's PKCE verifier. Valid same-browser PKCE recovery callbacks are supported too; a missing verifier fails closed. Do not initiate PKCE on one browser and send its link to a different browser.

The SDK consumes callback credentials and the URL is cleaned. Verified invite/recovery AMR routes the user to password setup, including after a reload. Such sessions cannot load the workspace through this application's repository until setup finishes and the user signs in afresh. Passwords are not logged or custom-stored. Admin responses use no-referrer and no-store.

Only an explicit form submission invokes updateUser({password}). Successful setup signs out the local session. If the password was saved but signout cannot be confirmed, the interface says so, blocks repeat updates and requires signout before login.

## Operational checks
No self-service reset-email send control is included. Credential-action and complete-email-preview approvals remain prerequisites to initiating setup messages. At the November 11 check, custom SMTP was not configured and the default two-emails/hour limit remained; confirm current delivery eligibility and capacity before sending. SMTP or Auth settings changes are separate actions.

The branch's automated tests cover password transport, callback validation, setup gating, repeated submissions, session changes, invalid/expired links, partial success and recovery races with mocked Auth and DOM fixtures. Local production build passed before publication. CI should use the project's Node 22.x. Browser and real-account acceptance remain required; the local environment could not launch Chromium because of a socket restriction.

## Password-only enforcement boundary
The two-email database guard does not disable Supabase OTP, magic-link, invitation or recovery APIs, and local UI controls are not backend enforcement. Strict password-only CMS authorization still requires separately reviewed server-side signed-AMR enforcement and refresh/recovery tests while preserving a narrowly authorized setup path. No such database/Auth change is made by this code release.
