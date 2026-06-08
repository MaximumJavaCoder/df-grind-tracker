# DF Dial

DF Dial is a local-first coffee dial-in PWA for beans, brews, maintenance, and reusable recipes.

## Run locally

```bash
npm start
```

The app and API are served from `http://localhost:8787` by default. Set `PORT` to use a different port.

## Recipe/community prototype

- Existing dialed-in brew profiles are promoted into a private recipe library.
- Recipes can be published, saved, copied to the current bean, and ranked against taste/roast preferences.
- Following is stored locally and used by the Following recipe tab.
- Backend sync is optional. In the app, open **More**, set the Backend API URL, enable sync, and click **Sync Recipes Now**.

## API endpoints

- `GET /api/health`
- `GET /api/recipes`
- `POST /api/recipes`
- `POST /api/recipes/bulk`
- `POST /api/events`
- `GET /api/events`

The prototype backend stores data in `df-dial-data.json` by default. This file is ignored by git.
