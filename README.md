# Snackggies / Aggie Bites

A College Station restaurant discovery app built with Next.js App Router. Google Sheets stores TAMU accounts, restaurant reviews, and saved spots. All spreadsheet access runs through server routes using a Google service account; credentials never go to the browser.

## Deploy on Vercel

1. Import `womanrepellant/snackggies` with **Framework Preset: Next.js**, Root Directory at the repository root, Build Command `pnpm build`, and Node.js 22.x.
2. Create or choose a Google Cloud service account and enable the Google Sheets API.
3. Create a Google spreadsheet and share it with `GOOGLE_SERVICE_ACCOUNT_EMAIL` as an **Editor**. Keep the existing `Sheet1` account tab; it stores email, bcrypt password hash, and creation time in columns A:C. Add the header row `email | password_hash | created_at` if starting fresh.
4. Add these Vercel environment variables for Production, Preview, and Development as needed:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `GOOGLE_SHEET_ID`
   - Optional `SESSION_SECRET` (if omitted, the Google private key signs TAMU sessions).
5. Deploy. On first read/write, the server creates `Reviews` and `Spots` tabs with the expected headers if they do not exist. Existing tabs with unexpected headers are preserved and produce a setup error rather than being overwritten.

Never put service account credentials in client-side variables (for example, `NEXT_PUBLIC_*`) or commit real values. Copy `.env.example` to `.env.local` for development.

## Google Sheets data layout

- `Sheet1`: `email`, `password_hash`, `created_at` in columns A:C. Existing rows from the current Google Sheets login remain in place.
- `Reviews`: `id`, `user_id`, `restaurant_id`, `author`, `rating`, `dish`, `body`, `spend`, `visited_at`, `updated_at`.
- `Spots`: `user_id`, `restaurant_id`, `status`.

The server creates missing `Reviews` and `Spots` tabs. The service account has access to the spreadsheet, so server route validation and signed HttpOnly sessions enforce account ownership. Google Sheets has no row-level security or transactional uniqueness constraint; simultaneous first-time writes for the same account/restaurant can race. Back up the spreadsheet before manual changes.

Account creation restricts the email suffix to `@tamu.edu`; it does not verify mailbox ownership or current enrollment. Do not describe an account as email-verified.

## Local development

Use Node.js 22 and the pinned pnpm version:

```sh
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
# Fill in the Google service account and spreadsheet values in .env.local
pnpm dev
```

Run `pnpm check` for TypeScript and `pnpm build` for a production build.

## Reviews and source data

The catalog has 190 College Station locations, with source/menu links in `app/catalog.json` and `docs/catalog-provenance.json`. Aggie ratings are calculated only from reviews submitted here. One account can edit one review per restaurant. Prices use the median spending reported by reviewers. Google Maps links remain separate from Aggie scores.
