# DF Dial

DF Dial is a local-first coffee dial-in PWA for beans, brews, maintenance, reusable recipes, and community discovery.

## Run locally

```bash
npm start
```

The app and API are served from `http://localhost:8787` by default. Set `PORT` to use a different port.

## Mobile app packaging

This repo is configured for Capacitor so the same PWA can be packaged for iPhone and Android.

```bash
npm run mobile:prepare
npm run mobile:sync
npm run mobile:ios
npm run mobile:android
```

The `mobile:prepare` script generates a static `www/` bundle for Capacitor. Native projects can then be added and opened with the Capacitor CLI. Real Apple, Google, and Facebook sign-in should be implemented with native provider SDKs/plugins that exchange provider tokens with `POST /api/auth/social`.

## Recipe/community prototype

- Existing dialed-in brew profiles are promoted into a private recipe library.
- Recipes can be published, saved, copied to the current bean, and ranked against taste/roast preferences.
- Users can maintain a community profile with location and equipment details.
- Following is stored locally, synced to the backend, and used by the Following recipe tab.
- Users can rate public recipes and sync those ratings to the backend.
- Backend sync is optional. In the app, open **More**, set the Backend API URL, enable sync, and click **Sync Recipes Now**.

## API endpoints

- `GET /api/health`
- `POST /api/auth/social`
- `GET /api/users`
- `POST /api/users`
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

The prototype backend stores data in `df-dial-data.json` by default. This file is ignored by git.
