# TAMU account and Google Sheets setup

The app stores account records, restaurant reviews, and saved spots in one Google spreadsheet. The service account accesses it only from server routes.

1. In Google Cloud, enable the Google Sheets API for the service account's project.
2. Share the target spreadsheet with `GOOGLE_SERVICE_ACCOUNT_EMAIL` as an Editor. The account sheet is the existing `Sheet1` tab, with email, bcrypt password hash, and creation timestamp in columns A:C. Preserve current account rows.
3. Set `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, and `GOOGLE_SHEET_ID` in the runtime environment. `SESSION_SECRET` is optional; without it, the app derives the session signing key from `GOOGLE_PRIVATE_KEY`.
4. The app creates `Reviews` and `Spots` tabs on demand with headers. If either tab already exists with other columns, the app reports an error and leaves the data untouched; back it up and migrate its rows before changing the header.
5. Redeploy/restart after changing credentials. Rotating `SESSION_SECRET` or the Google private key invalidates existing signed sessions.

Registration accepts only addresses ending in `@tamu.edu`; it does not verify mailbox ownership or student status. The account sheet contains password hashes and must remain shared only with trusted administrators and the app service account. Do not expose it through public sharing or client-side code.

Google Sheets does not enforce row-level security or uniqueness. The server verifies an HMAC-signed HttpOnly `tamu_user` cookie on protected write routes and uses that account identity for reviews and saved spots. Existing plaintext `tamu_user` cookies are intentionally rejected after the signed-cookie migration, so users will need to sign in again.

The app stores reviews and saved spots in `Reviews` and `Spots` tabs. It initializes either missing tab automatically. Reviews can be edited and deleted by their signed-in account through the server API; bookmarks are keyed by normalized TAMU email. The service account should not be shared with spreadsheet viewers who do not need access to password hashes and private bookmarks.
