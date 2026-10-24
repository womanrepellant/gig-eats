# Set up TAMU email accounts

The login screen accepts an `@tamu.edu` email and password. A new account must confirm the mailbox through Supabase Auth before the site will accept its session or reviews. The server checks the confirmed email and exact domain on every protected request. A TAMU address alone does not prove current enrollment.

1. Create or choose a Supabase project. In Authentication, enable Email and keep **Confirm email** enabled. Configure the project's Site URL and allowed redirect URL for the site you are hosting.
2. Set up a working SMTP sender or Send Email hook for signup confirmations. Supabase's default sender is limited and is not suitable for arbitrary student addresses. Test a signup with a TAMU inbox you control before opening registration.
3. For local development, copy `.dev.vars.example` to `.dev.vars`. Fill in `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from that project. Use only a publishable key, never a service-role/admin key.
4. Set `TAMU_EMAIL_DELIVERY_READY=true` only after confirmation mail works and redirect URLs are correct. Then restart `pnpm local`.

The server stores access/refresh tokens in Secure, HttpOnly, SameSite=Lax cookies. Supabase handles password storage. Reviews and bookmarks live in the local D1 database when running locally; the hosted Site uses a separate database. Write routes validate request origin and account identity, and D1 limits authentication attempts.

The older one-time-code endpoints remain in the code for existing deployments, but the current login screen uses the password endpoints. Supabase confirmation links use the Authentication project's email template and Site URL. When testing on `localhost`, a browser's handling of Secure cookies may differ from HTTPS production; use an HTTPS local tunnel for end-to-end auth tests if needed.
