# Brew Library

Brew Library is a mobile-first coffee recipe app for iPhone and Android. It tracks beans, brews, maintenance, reusable recipes, community discovery, follows, and recipe ratings.

## Run locally

```bash
npm start
```

The app and API are served from `http://localhost:8787` by default. Set `PORT` to use a different port.

## iPhone and Android app target

This repo is configured for Capacitor so Brew Library can ship as downloadable native apps through the Apple App Store and Google Play Store. The current UI is implemented with web technologies inside a native shell; production App Store work should focus on native sign-in plugins, push notifications, store assets, privacy disclosures, and native project hardening.

```bash
npm run mobile:prepare
npm run mobile:add:ios
npm run mobile:add:android
npm run mobile:sync
npm run mobile:ios
npm run mobile:android
```

The `mobile:prepare` script generates a static `www/` bundle for Capacitor. `mobile:add:ios` and `mobile:add:android` create the native projects. Real Apple, Google, and Facebook sign-in should be implemented with native provider SDKs/plugins that exchange provider tokens with `POST /api/auth/social`.

See [APP_STORE.md](APP_STORE.md) for the mobile release checklist.

## Recipe/community prototype

- Existing dialed-in brew profiles are promoted into a private recipe library.
- Recipes can be published, saved, copied to the current bean, and ranked against taste/roast preferences.
- Users can maintain a community profile with location and equipment details.
- Following is stored locally, synced to the backend, and used by the Following recipe tab.
- Users can rate public recipes and sync those ratings to the backend.
- Backend sync is optional. In the app, open **More**, set the Backend API URL, enable sync, and click **Sync Recipes Now**.

## Equipment database and admin tools

The backend bootstraps espresso machine manufacturers, models, and aliases from `data/equipment-seed.json` when the database has no equipment records. After that initial import, the JSON database is the source of truth and equipment edits should happen through the backend/admin tools.

Admin UI:

```text
http://localhost:8787/admin.html
```

One-time seed import command:

```bash
npm run seed:machines -- /path/to/home_espresso_machines.seed.json
```

## API endpoints

- `GET /api/health`
- `POST /api/auth/social`
- `GET /api/users`
- `POST /api/users`
- `GET /api/equipment/autocomplete`
- `GET /api/equipment/manufacturers`
- `GET /api/equipment/models`
- `GET /api/equipment/aliases`
- `POST /api/equipment/suggestions`
- `GET /api/admin/equipment/suggestions`
- `POST /api/admin/equipment/actions`
- `GET /api/recipes`
- `POST /api/recipes`
- `POST /api/recipes/bulk`
- `GET /api/follows`
- `POST /api/follows`
- `POST /api/unfollow`
- `GET /api/ratings`
- `POST /api/ratings`
- `POST /api/events`
- `GET /api/events`

The prototype backend stores data in `brew-library-data.json` by default. This file is ignored by git.
