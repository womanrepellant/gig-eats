# Project status

Updated: 2026-10-25

## Current state

- User approved moving all application account, review, and saved-spot storage to Google Sheets.
- Runtime handlers now use the Google Sheets API and the configured service account variables: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, and `GOOGLE_SHEET_ID`.
- Existing account rows in `Sheet1!A:C` are preserved. Reviews and saved spots use `Reviews` and `Spots` tabs. Missing tabs are initialized with headers; unexpected existing headers are rejected without overwriting their data.
- Supabase route/data code, schema, environment references, and unused Supabase Auth endpoints have been removed from the Next.js runtime.
- Session cookies are HMAC-signed and HttpOnly; signature key uses `SESSION_SECRET` when set, otherwise `GOOGLE_PRIVATE_KEY`. Legacy unsigned cookies will require a new login.
- No production Google spreadsheet has been queried or changed from this session. Local credentials and a Vercel CLI/connector are absent; live spreadsheet operations and preview deployment remain unverified. The previous Supabase project was not modified. Existing Supabase reviews/bookmarks, if any, have not been migrated.
- Base commit: `ae2568d2`; the branch was rebased onto `origin/main` at `2cc99304`. Candidate implementation and follow-up commits are on branch `codex/google-sheets-storage`, pushed to origin; no PR or production merge was created.

## Latest UI change

- Commit `97ee132d` (`Add playful fish to monthly theme`) adds an inline vector pufferfish to the Monthly Themes hero and a coordinated, colored fish illustration to each featured restaurant card. The fish bob gently; `prefers-reduced-motion` disables the animation.
- Local browser preview showed the pufferfish and restaurant fish; DOM verification found 4 featured cards and 4 card illustrations.
- `pnpm check` and the production webpack build passed after this change.
- `pnpm test` now fails on a pre-existing catalog assertion (`scripts/check-catalog.mjs:7` expects every budget to be null; current rebased catalog includes a `$22` value). This is unrelated to the fish UI.
- ESLint on `app/discover.tsx` reports existing unused-variable and set-state-in-effect findings; the new fish component adds no reported lint finding.

## Pixel-art refinement

- User asked to make the Monthly Themes illustrations more Minecraft-like, then requested a front-facing puffer and simpler illustrations. The puffer now faces forward with symmetrical square eyes and fins; each featured-restaurant fish is reduced to a basic pixel silhouette with only a few color blocks.
- CSS enables pixelated rendering and the bob animation is restricted to a one-pixel vertical movement so the square edges remain crisp. Reduced-motion handling remains in place.
- Local preview visually confirmed the blocky puffer and fish on the featured cards. After this refinement, `pnpm check` passed and `pnpm exec next build --webpack` passed, including its TypeScript stage and static page generation. Local Node v26.12.1 emits the expected package engine warning because the project targets Node 22.x.
- `git diff --check` passed. Commit `119dd8c6` (`Simplify monthly theme fish illustrations`) was pushed to `origin/codex/google-sheets-storage`.

## Changes made

- Added shared Google Sheets client/configuration and safe tab initialization in `lib/google-sheets.ts`.
- Added sheet-backed review and spot reads, create/update/delete, mapping, and aggregation support in `lib/sheets-data.ts`.
- Converted `/api/state`, `/api/reviews`, and `/api/spots` to Google Sheets.
- Converted TAMU account login/registration to shared Google Sheets credentials, preserving `Sheet1` account rows.
- Signed the session cookie and made session reads verify its HMAC. Cross-origin writes are rejected.
- Removed Supabase data and obsolete Supabase Auth endpoints/configuration/schema.
- Replaced Supabase deployment instructions with spreadsheet setup in `README.md` and `docs/tamu-auth-setup.md`.
- Added `.env.example` with Google service account variables and optional session secret.
- Preserved the original deployment brief in `docs/PROJECT_HANDOFF.md`; appended this user's decision to supersede its Supabase data requirements.

## Decisions and limitations

- The Google service account is server-only. Do not add `NEXT_PUBLIC_` prefixes to its credentials.
- Account sheet `Sheet1` column layout remains email, bcrypt hash, created time. Existing data is not copied, cleared, or rewritten by this code.
- Account signup checks the `@tamu.edu` suffix only. The existing account flow does not verify mailbox ownership or active enrollment.
- Google Sheets does not provide row-level security or transactional unique constraints. API routes validate signed sessions and ownership; concurrent simultaneous first submissions by the same account for the same restaurant can race.
- Rotating the signing key invalidates sessions.
- Existing `Reviews` or `Spots` tabs with nonmatching headers are not modified. Back up and manually migrate those tabs before changing their headers.
- The app will lazily create `Reviews` and `Spots` tabs once the service account has editor access. This remote behavior cannot be verified without spreadsheet credentials.

## Validation and evidence

- Read installed Next.js 16 Route Handler documentation as required by repository `AGENTS.md`.
- `pnpm check`: passed after conversion (local Node v26.12.1 emits a package engine warning; Vercel is set to Node 22.x).
- `pnpm exec next build --webpack`: passed after conversion; Next compiled, ran its TypeScript stage, generated 10 static pages, and listed the remaining API routes.
- `pnpm test`: passed all 10 catalog/map checks.
- Targeted ESLint on changed auth/data/API files: passed with no warnings.
- Session-cookie unit smoke check: 3 assertions passed (normalization, valid signature, forged/unsigned rejection).
- `pnpm lint`: still fails with 13 errors and 9 warnings in existing unrelated UI/legal files.
- `git diff --cached --check`: passed before candidate commit.
- Candidate commits `990a181f` (implementation), `ace00c6f` (validation checkpoint), and `7d30ab8c` (cutover-data note) were pushed to `origin/codex/google-sheets-storage`.
- GitHub reported the pushed branch and offered a PR URL; Vercel preview status was not accessible from this session.
- Before this conversion, `pnpm run build` with Turbopack was blocked in the local sandbox while a CSS worker attempted a local port bind (`Operation not permitted`); an elevated retry had the same result. The reported Vercel export error itself was corrected in the earlier source edit, but that edit was superseded by this full backend conversion.
- Post-conversion TypeScript, production build, targeted lint, and catalog/map checks are complete; Google Sheets API calls were not run against a live spreadsheet.

## Remaining work

1. Add a testable mock transport or use an authorized test spreadsheet to validate tab initialization and CRUD without changing production account data.
2. Verify the configured service account can edit the intended spreadsheet and that its existing `Sheet1` has the expected account columns.
3. If the former Supabase project contains user data, export and map it before production cutover; the old project has been left untouched, but legacy reviews/bookmarks are not copied automatically.
4. Inspect the Vercel preview for the pushed branch and confirm its environment includes all three Google Sheets variables.
5. Run account/review edit-delete/bookmark checks against a test spreadsheet before production merge.
6. Repo-wide `pnpm lint` reports 13 existing errors in unrelated UI/legal files; changed runtime files pass targeted ESLint. Decide whether to address those existing lint failures before a strict lint gate.

## Next action

Complete live Google Sheets/Vercel validation before production cutover.
