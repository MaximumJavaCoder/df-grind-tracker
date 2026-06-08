# Brew Library App Store Plan

Brew Library is intended to ship as downloadable iPhone and Android apps, not as a public web app.

## Current mobile architecture

- Capacitor wraps the existing Brew Library UI in native iOS and Android containers.
- The backend API supports accounts, user profiles, recipes, follows, ratings, and analytics events.
- The Apple, Google, and Facebook buttons currently create provider-aware prototype sessions. Production builds must replace those with real native OAuth/provider SDK flows.

## Build native projects

```bash
npm install
npm run mobile:add:ios
npm run mobile:add:android
npm run mobile:sync
```

Open native projects:

```bash
npm run mobile:ios
npm run mobile:android
```

iOS builds require macOS and Xcode. Android builds require Android Studio.

## Production requirements before store submission

1. **Native authentication**
   - Add Apple Sign In for iOS.
   - Add Google Sign-In for iOS and Android.
   - Add Facebook Login for iOS and Android.
   - Exchange native provider tokens with `POST /api/auth/social`.

2. **Backend hardening**
   - Replace the JSON-file prototype store with a production database.
   - Add real sessions/JWTs and request authorization.
   - Add privacy-safe analytics events and account deletion.

3. **Mobile app polish**
   - Configure native app icons, launch screens, and splash screens.
   - Add store-ready screenshots and descriptions.
   - Add push notifications for new recipes from followed users.
   - Test offline mode, sync conflict handling, and image uploads.

4. **Store compliance**
   - Add privacy policy and terms links.
   - Document collected data: account, location, equipment, recipes, follows, ratings, and analytics events.
   - Add account deletion/export flows.
   - Complete Apple App Privacy and Google Play Data Safety forms.

5. **Release checks**
   - iOS archive build from Xcode.
   - Android release build from Android Studio.
   - TestFlight internal testing.
   - Google Play internal testing.
