# Snackggies / Aggie Bites

A restaurant map for College Station built with Next.js App Router. The server routes run on Vercel's Node.js runtime; reviews, bookmarks, and TAMU email accounts use Supabase.

## Deploy on Vercel

1. Import `womanrepellant/snackggies` into Vercel with **Framework Preset: Next.js**, Root Directory at the repository root, Build Command `pnpm build`, and Node.js 22.x.
2. In Vercel Project Settings → Environment Variables, add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` for the Aggie Bites Supabase project. The project URL is `https://wygflxmthhozcsszbhmw.supabase.co`; copy its publishable key from Supabase Settings → API Keys. Never use a service-role key.
3. Add `TAMU_EMAIL_DELIVERY_READY=false` until the Supabase project's signup-confirmation email and redirect URL for your Vercel domain are configured and tested. Change it to `true` only after verification mail reaches a TAMU mailbox. Redeploy after updating variables.
4. Deploy. The map, menus, seafood theme, and catalog work immediately. The Top Recommended list stays empty until verified students submit reviews.

The database schema and row ownership policies are in `supabase/schema.sql`. They have been applied to the Aggie Bites Supabase project. A separate Supabase project needs the same schema before reviews and bookmarks work. Existing reviews from the ChatGPT Site's Cloudflare D1 database are **not automatically migrated**; Vercel starts with the Supabase tables.

## Local development

Use Node.js 22 and the pinned pnpm version:

```sh
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
# Fill in your Supabase URL and publishable key in .env.local
pnpm dev
```

Open the URL printed by Next.js, usually `http://localhost:3000`. `.env.local` is ignored by Git. Browse without Supabase variables if you only need to work on the catalog and map; review endpoints will report that the database is not configured. Run `pnpm check` for TypeScript checks and `pnpm build` for a production build.

## Reviews and source data

The catalog has 190 College Station locations, with source/menu links in `app/catalog.json` and `docs/catalog-provenance.json`. Aggie ratings are calculated only from reviews submitted here by verified `@tamu.edu` accounts. One account can edit one review per restaurant. Prices use the median spending reported by reviewers, relative to other reported prices. Unknown prices and unreviewed places are labeled honestly. Google Maps links are separate; no paid Google API key is needed for them.

Supabase RLS enforces account ownership. The Vercel server validates the confirmed email and exact TAMU domain before every protected write. A TAMU email address does not prove active enrollment. See `docs/tamu-auth-setup.md` for confirmation-email setup. Do not put private keys in the repository.
