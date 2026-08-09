# KoboAds — setup

Your Firebase keys are already in `.env` (project `koboads-80673`). Here's everything
needed to get from this codebase to a fully working app.

## 1. Enable Email/Password sign-in
Firebase Console → **Build → Authentication → Sign-in method** → enable **Email/Password**.

## 2. Create the Firestore database
Firebase Console → **Build → Firestore Database → Create database** → start in
**production mode**, pick a region close to Nigeria (e.g. `europe-west1`).

## 3. Deploy security rules + indexes

```bash
npm install -g firebase-tools   # once
firebase login
firebase use koboads-80673
firebase deploy --only firestore:rules,firestore:indexes
```

## 4. Push notifications

Expo Go does not support remote push notifications for SDK 53 and later. To test push you need a custom development build or a standalone app build.

If you are wiring push notifications in production, configure the Android FCM credentials and iOS APNS keys through Expo or your native build config. The app already guards Expo Go at runtime and will not attempt remote push registration there.

Composite indexes take a few minutes to build after deploying.

## 4. Seed the reference collections (categories, locations, age ranges, config)

The app's Create Ad screen (targeting + budget steps) reads its options live from
Firestore instead of hardcoded values, so it needs to be seeded once:

1. Firebase Console → **Project settings → Service accounts → Generate new private key**.
2. Save the downloaded JSON as `scripts/serviceAccountKey.json` (already gitignored —
   never commit this file, it grants full admin access to your project).
3. Run:
   ```bash
   npm install
   npm run seed:firestore
   ```

This populates four collections: `categories`, `locations`, `ageRanges`, and
`appConfig/settings` (reach levels, cost-per-reach, reward-per-ad, daily limits).
It's safe to re-run — it upserts by slug instead of duplicating. If you skip this
step, the app just falls back to sensible local defaults, so nothing breaks either way.
To change pricing/limits later, either edit `scripts/seedFirestore.js` and re-run it,
or edit the `appConfig/settings` document directly in the Firebase Console.

## 5. Set up media uploads (cPanel hosting)

Ad images/videos upload to your cPanel hosting rather than Firebase Storage.

1. Upload `cpanel/upload.php` and the `cpanel/uploads/` folder to your cPanel hosting,
   e.g. `public_html/api/upload.php` and `public_html/api/uploads/` (via File Manager or FTP).
2. `chmod` the `uploads/` folder to `755` so PHP can write to it.
3. Open `upload.php` on the server and change `$UPLOAD_TOKEN` to a long random string.
4. In `.env`, set:
   ```
   EXPO_PUBLIC_CPANEL_UPLOAD_URL=https://yourdomain.com/api/upload.php
   EXPO_PUBLIC_CPANEL_UPLOAD_TOKEN=<the same long random string>
   ```
5. Restart Metro with `npx expo start -c` so the new env values are picked up.

The `uploads/` folder ships with a `.htaccess` that blocks PHP execution inside it
(defense in depth, since it only ever holds images/video). If your cPanel uses
LiteSpeed/nginx instead of Apache, that `.htaccess` won't apply — ask your host how
to disable script execution in that folder instead.

## 6. Deploying the web app as a SPA

This app is an SPA, so direct browser routes like `koboads.com.ng/login` must
rewrite to `index.html` on the static host.

- For cPanel: upload your exported web build to `public_html` and place the provided
  `.htaccess` file at the root of `public_html`.
- For Vercel: deploy the repo with `vercel.json` configured to rewrite non-file
  requests to `index.html`.

Build the web app locally with:

```bash
npm run build:web
```

Then deploy the contents of `web-build/` as your static site.

### Vercel notes

When deploying to Vercel, `npm run vercel-build` is used automatically as the
static build step and the SPA rewrite rules in `vercel.json` will keep internal
routes working.

### cPanel notes

The root `.htaccess` file rewrites any missing file or directory to `index.html`,
allowing deep links like `/login` or `/settings` to work correctly.

## Run it

```bash
npm install
npx expo start -c        # -c clears the Metro cache so .env changes are picked up
```

If you see `PluginError: Failed to resolve plugin for module "expo-splash-screen"`,
your local `node_modules` is out of date — delete it and reinstall:
```powershell
rmdir /s /q node_modules
del package-lock.json
npm install
```

## What's real vs. what still needs a decision

- **Auth, campaigns, wallet, earnings, referrals, ad distribution, media upload,
  targeting/budget config** — all live Firestore reads/writes or real HTTP uploads,
  no mock data anywhere.
- **Ad distribution engine** (`src/services/adEngine.ts`) runs client-side right
  after a campaign is created — queries eligible opted-in users, enforces the
  2-ads/day cap, avoids repeat delivery. Functional at small scale. For production
  scale/security, move this into a Cloud Function triggered on campaign creation.
- **Wallet top-up** currently credits the wallet directly (a real, persisted
  Firestore transaction) — no payment gateway wired up yet. Give me Paystack or
  Flutterwave keys when ready and I'll wire the top-up flow to their SDK instead.
- **Withdrawals** are recorded as `pending` — no payout automation, so pending
  withdrawals need a manual/admin process for now.
- **Media uploads** go to your cPanel hosting via `cpanel/upload.php`, protected by
  a shared-secret token. Fine for now; a stolen token lets someone upload files to
  that one folder, so rotate it if you ever suspect it's leaked.
- **Security rules** lock down reads/writes to each user's own data, but wallet/
  earnings fields are still writable by the signed-in client via `runTransaction`
  calls (see the comments in `firestore.rules`). Moving those into Cloud Functions
  with the Admin SDK is the right next step before this handles real money at scale.
