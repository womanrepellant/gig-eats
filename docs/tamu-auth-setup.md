# Connect TAMU email sign-in

The app now uses email one-time passwords through Supabase Auth. It does not use ChatGPT identity, and it never accepts an email address alone as proof of sign-in.

## Required provider setup

Use a dedicated Supabase project, or explicitly select an existing project for this application. Enable Email authentication and keep email confirmation enabled. Configure a production SMTP sender or Send Email hook. Supabase's default email sender can send only to the project's team addresses; it cannot deliver codes to arbitrary TAMU students.

Configure both signup-confirmation and magic-link email templates to include the six-digit code:

```html
<h2>Your Aggie Bites sign-in code</h2>
<p>Enter this code in Aggie Bites: <strong>{{ .Token }}</strong></p>
<p>If you didn't request this, ignore this email.</p>
```

Set Email OTP expiry to 600 seconds and OTP length to 6. Set the Site URL to the published Aggie Bites URL. Do not enable email auto-confirm, which would defeat mailbox verification. Use a verified sending domain with your email provider.

## Site runtime configuration

Set these using Sites' environment settings, then deploy the existing saved source version:

- `SUPABASE_URL`: the project's `https://PROJECT_REF.supabase.co` URL.
- `SUPABASE_PUBLISHABLE_KEY`: a publishable API key. The legacy `SUPABASE_ANON_KEY` name is also supported. Do not use a service-role or secret admin key.
- `TAMU_EMAIL_DELIVERY_READY`: set to `true` only after SMTP/send hook, both code templates, code length, and delivery have been configured and verified.

Never paste private provider credentials into chat or put them in source. SMTP credentials belong in Supabase's auth configuration, not the browser bundle.

## Access and sessions

The site must allow public browsing so visitors can reach the TAMU login form without a ChatGPT account. The app then protects saved spots and all review writes using verified TAMU sessions. Every protected request validates its access token with Supabase's `/auth/v1/user`; provider email confirmation and an exact `tamu.edu` domain are required. `student@tamu.edu.evil.test` is rejected.

The server sets `__Host-` cookies with Secure, HttpOnly, SameSite=Lax, and Path=/. It never returns access or refresh tokens to client JavaScript. Access tokens can be refreshed through the same-origin session endpoint; the refresh cookie expires after 7 days. One-time codes and provider tokens are not logged or stored in D1. Same-origin checks protect write routes. Hashed counters in D1 limit send/verify attempts by account and source IP.

Prior ChatGPT-linked bookmarks/reviews are not silently reassigned to a different identity. Their owner IDs remain intact in the database. A future migration must explicitly prove account ownership before linking them to a TAMU identity.

## Verification

Build the app and run `node scripts/check-app.mjs`. The suite uses an isolated mock Supabase service and isolated D1 database. It makes no real email sends. Finish the provider setup with a real TAMU inbox owned by a consenting tester, then verify code delivery, expired/incorrect codes, session refresh, save/review ownership, and logout.

## Dedicated project

Aggie Bites uses project `wygflxmthhozcsszbhmw`, created in the organization selected by the owner. Its API URL and publishable key are already configured in the Site runtime. Email templates and SMTP/send-hook setup must be completed before enabling live delivery.
