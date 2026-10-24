# Snackggies / Aggie Bites

A map-centered restaurant explorer around Texas A&M, using React, TypeScript, Vinext, Cloudflare Workers, D1, and Supabase Auth.

## Experience

Map, Top Recommended, Monthly Themes, and Login/Your Reviews are the main destinations. The default view is an interactive map with a compact, searchable restaurant list. Markers open the restaurant panel directly. Dense groups open a list of individually selectable venues and can be zoomed into. The map supports pointer dragging, scroll zoom, keyboard panning, zoom controls, and fit-to-spots. All matching venues stay on the map even when the sidebar list is paginated.

## Catalog and menus

The catalog contains 190 unique College Station restaurant, café, and dessert locations from Visit College Station's public directories, checked October 24, 2026. Two duplicate records were merged, and one entry with coordinates outside Texas was excluded. Original restaurant IDs are preserved so existing bookmarks and reviews stay attached.

There are 148 direct menu links. Locations without a direct menu use their official website or directory/contact fallback, clearly labeled. Menu links open externally so restaurant-hosted menus remain accessible. No menu availability, price, or opening hours are guaranteed. Only factual business data and links are imported; source reviews, ratings, descriptions, and photos are not copied. See `docs/catalog-provenance.json` and each venue's source link.

## Genuine reviews

Ratings come only from user-submitted reviews saved in D1, with an exact verified TAMU mailbox required for writes. Every account has one editable review per location and can delete its own review. Review text is paginated; full review counts and rating/median-spend aggregates cover all records rather than only the current page. Bookmarks are private to the account. Public records exclude private account IDs and emails. Existing Google Maps reviews are linked separately, with no imported scores or copied reviews mixed into the community rating. No sample ratings or invented meal prices are displayed.

## TAMU email authentication

Visitors browse without signing in. Supabase email and password authentication establishes the session after mailbox verification. The server validates provider tokens, email confirmation, and the exact `tamu.edu` domain. Access/refresh tokens stay in Secure, HttpOnly, SameSite=Lax cookies and are not returned to client JavaScript. Write routes check request origin; D1 throttles sign-up and login attempts. A successful mailbox verification does not prove current enrollment.

Configure your Supabase URL and publishable key as runtime values; no live credentials or admin key are included in source. Live email delivery remains gated by `TAMU_EMAIL_DELIVERY_READY` until email templates and a production sender are configured. See `docs/tamu-auth-setup.md`.

## Checks

After the Sites build:

```sh
node node_modules/typescript/bin/tsc --noEmit
node scripts/check-app.mjs
node scripts/check-catalog.mjs
```

Request tests use a built Worker, mock authentication service, and isolated D1 records. They never send real email or change hosted reviews. Migrations in `drizzle/` are append-only and schema-only.

## Run locally

Use Node.js 22.13+ and the pinned pnpm version. After downloading and unzipping this repository, open a terminal **in the folder containing `package.json`**:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm local
```

The first local start may ask whether to apply three database migrations; answer **yes**. Open the URL printed by the server, normally [http://localhost:5173](http://localhost:5173) or `http://127.0.0.1:5173`. Press Ctrl+C to stop it. The local D1 database persists in `.wrangler/state`; later runs of `pnpm local` apply only new migrations. These commands do not deploy anything or use a paid Cloudflare database.

Map browsing, restaurant details, menus, the seafood theme, and filters work without credentials. The repository intentionally contains no working Supabase secrets. New TAMU account creation and posting reviews require a Supabase project with confirmed email delivery. The live Site's accounts/reviews are **not copied** to your local D1 database. If you set up authentication, copy `.dev.vars.example` to `.dev.vars`, fill in your own Supabase URL and **publishable** key, and follow [the TAMU auth setup](docs/tamu-auth-setup.md). Leave `TAMU_EMAIL_DELIVERY_READY=false` until real email confirmation has been tested. Never put a service-role key in `.dev.vars`.

For a production-like local Worker instead of the hot-reloading dev server, run `pnpm build`, then `pnpm start`. To let another device on your network reach the dev server, use `pnpm dev --host 0.0.0.0` after `pnpm local` has initialized the database; use your machine's local IP and allow the port in your firewall. Avoid exposing a development server directly to the public internet.

```sh
pnpm check
pnpm build
pnpm test
```

`pnpm check` validates TypeScript, `pnpm build` builds the Worker, and `pnpm test` runs isolated request/catalog checks. A Cloudflare deployment needs a real D1 database ID in `wrangler.jsonc`, remote migrations, and runtime environment values. The placeholder ID is for local development only. Local changes do not update the published ChatGPT Site or GitHub automatically.

## Google Maps reviews

Each restaurant links to its Google Maps listing through a free Maps URL. Google review text and ratings are not fetched, scraped, embedded, stored, or mixed into Aggie scores. No Google Cloud project, billing account, or Places API key is needed for these links. The on-site community review system remains separate and requires verified TAMU email delivery.


## Editing with Gemini or another coding assistant

Unzip the project, open its root folder (the one containing `package.json`) in your editor and give Gemini access to that folder. Ask it to change source files in `app/` and keep the map, menu links, and separate Aggie/Google reviews intact. Run `pnpm check`, `pnpm build`, and `pnpm test` before sharing a change. A ZIP is a snapshot: send a new ZIP or push a Git branch and open a pull request so others can see edits.

This repository is separate from the published ChatGPT Site. Running locally or editing the ZIP will not change that URL. A maintainer must apply/review the changes in the Site source and publish a new Site version, or establish a separate Cloudflare deployment workflow for this repository. Never put Supabase or Google keys into a commit or chat prompt.
