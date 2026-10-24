# Snackggies / Aggie Bites

A map-centered restaurant explorer around Texas A&M, using React, TypeScript, Vinext, Cloudflare Workers, D1, and Supabase Auth.

## Experience

Explore and Saved are the only main destinations. The default view is an interactive map with a compact, searchable restaurant list. Markers open the restaurant panel directly. Dense groups open a list of individually selectable venues and can be zoomed into. The map supports pointer dragging, scroll zoom, keyboard panning, zoom controls, and fit-to-spots. All matching venues stay on the map even when the sidebar list is paginated.

## Catalog and menus

The catalog contains 190 unique College Station restaurant, café, and dessert locations from Visit College Station's public directories, checked October 24, 2026. Two duplicate records were merged, and one entry with coordinates outside Texas was excluded. Original restaurant IDs are preserved so existing bookmarks and reviews stay attached.

There are 148 direct menu links. Locations without a direct menu use their official website or directory/contact fallback, clearly labeled. Menu links open externally so restaurant-hosted menus remain accessible. No menu availability, price, or opening hours are guaranteed. Only factual business data and links are imported; source reviews, ratings, descriptions, and photos are not copied. See `docs/catalog-provenance.json` and each venue's source link.

## Genuine reviews

Ratings come only from user-submitted reviews saved in D1, with an exact verified TAMU mailbox required for writes. Every account has one editable review per location and can delete its own review. Review text is paginated; full review counts and rating/median-spend aggregates cover all records rather than only the current page. Bookmarks are private to the account. Public records exclude private account IDs and emails. Existing Google Maps reviews are linked separately, with no imported scores or copied reviews mixed into the community rating. No sample ratings or invented meal prices are displayed.

## TAMU email authentication

Visitors browse without signing in. Supabase email OTP establishes the session. The server validates provider tokens, email confirmation, and the exact `tamu.edu` domain. Access/refresh tokens stay in Secure, HttpOnly, SameSite=Lax cookies and are not returned to client JavaScript. Write routes check request origin; D1 throttles send/verify attempts. A successful mailbox verification does not prove current enrollment.

Configure your Supabase URL and publishable key as runtime values; no live credentials or admin key are included in source. Live email delivery remains gated by `TAMU_EMAIL_DELIVERY_READY` until email templates and a production sender are configured. See `docs/tamu-auth-setup.md`.

## Checks

After the Sites build:

```sh
node node_modules/typescript/bin/tsc --noEmit
node scripts/check-app.mjs
node scripts/check-catalog.mjs
```

Request tests use a built Worker, mock authentication service, and isolated D1 records. They never send real email or change hosted reviews. Migrations in `drizzle/` are append-only and schema-only.

## Run this repository

This integration replaces the unused create-next-app starter with the published app. It retains React and App Router conventions, using Vinext/Vite and Cloudflare Workers for execution. It is not a stock Next.js/Vercel deployment: the review API requires a Cloudflare D1 binding named `DB`.

Use Node.js 22.13+ and the pnpm version pinned in `package.json`:

```sh
corepack enable
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
pnpm build
pnpm exec wrangler d1 migrations apply DB --local --config wrangler.jsonc
pnpm dev
```

The committed `wrangler.jsonc` supplies the local D1 binding and migration directory. Replace its placeholder database ID with your actual database ID before deploying. The development URL is printed by the dev server (normally port 5173).

Set the two Supabase values in `.dev.vars`, configure email templates and SMTP as described in `docs/tamu-auth-setup.md`, and leave `TAMU_EMAIL_DELIVERY_READY=false` until delivery is verified. Browsing, map markers, catalog, and menus work while authentication is unconfigured. Secure session cookies require HTTPS for a complete sign-in test.

```sh
pnpm build
pnpm check
pnpm test
```

Cloudflare deployment requires creating a D1 database, supplying its real ID and the `drizzle` migration directory in your Worker configuration, applying those migrations, setting the Supabase runtime values, and deploying the generated Worker and client assets. `.openai/hosting.json` intentionally contains no live Sites project ID. Importing this repository does not migrate the existing hosted database or change the live Site.
