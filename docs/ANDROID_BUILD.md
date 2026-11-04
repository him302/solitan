# Running on Android and producing an APK

Android-first, as specified. Three routes, cheapest first.

---

## 1. Expo Go — for demos (free, no build)

The fastest way to put Solitan in a salon owner's hands.

```bash
pnpm --filter @soliton/customer-mobile dev
```

Scan the QR code with [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent).

The phone must reach the API, so point it at your machine's LAN address rather than
localhost:

```bash
echo "EXPO_PUBLIC_API_BASE_URL=http://192.168.1.x:3000" >> apps/customer-mobile/.env
```

Find that address with `ipconfig` on Windows or `ifconfig` on macOS and Linux, and make
sure both devices are on the same network. Also confirm your firewall allows inbound 3000
— on Windows this is the usual reason a phone cannot connect.

**Caveat:** local notifications behave differently inside Expo Go than in a standalone
build. Test notification behaviour with a development build or an APK, not Expo Go.

---

## 2. Local APK build (free, no account)

Produces an installable APK without EAS or any cloud service. Needs Android Studio with
the SDK and a JDK.

```bash
pnpm --filter @soliton/customer-mobile exec expo prebuild --platform android
```

```bash
cd apps/customer-mobile/android && ./gradlew assembleRelease
```

The APK lands at
`apps/customer-mobile/android/app/build/outputs/apk/release/app-release.apk`.

Notes:

- `expo prebuild` generates the `android/` directory, which is **gitignored on purpose**
  (`/apps/*/android/`) — it is derived output, regenerated from `app.config.ts`.
- An unsigned release APK installs for testing but cannot go to Play. To sign it, generate
  a keystore and reference it from `android/app/build.gradle`. **Never commit a keystore**;
  `*.keystore` and `*.jks` are gitignored.
- Set the production API URL before building, or the APK will point at your laptop:

```bash
echo "EXPO_PUBLIC_API_BASE_URL=https://api.yourdomain.com" > apps/customer-mobile/.env.production
```

---

## 3. EAS Build (free tier, needs an Expo account)

`eas.json` is already present in `apps/customer-mobile`.

```bash
pnpm dlx eas-cli build --platform android --profile preview
```

**This is the one build route that is not fully zero-cost-safe.** EAS has a free tier with
a monthly build allowance, but it is a hosted service with usage limits and paid plans
beyond them. Route 2 has no such ceiling. Use EAS only if you want managed signing and
over-the-air updates, and check the current free allowance first.

---

## Before you ship a build

- [ ] `EXPO_PUBLIC_API_BASE_URL` points at the real API, not a LAN address
- [ ] The API has `JWT_SECRET` set — it refuses to start in production without one
- [ ] `NODE_ENV=production` on the API
- [ ] The database is **not** seeded with demo accounts (`admin@soliton.local` and the
      shared development password must not exist in a reachable environment)
- [ ] `CORS_ORIGINS` lists real origins instead of `*`
- [ ] Notification permission prompts have been tested on a real device
- [ ] You have walked the four journeys in [TESTING.md](TESTING.md) on hardware

---

## Troubleshooting

**Phone cannot reach the API.** Same network, LAN IP not localhost, firewall allows 3000.
Check from the phone's browser: `http://192.168.1.x:3000/api/v1/health`.

**Gradle build fails on a fresh prebuild.** Delete `apps/customer-mobile/android` and
prebuild again — it is derived output and safe to discard.

**Metro cannot resolve a workspace package.** Run `pnpm install` from the repository root;
the monorepo relies on workspace links that a filtered install can miss.

**App opens on a white screen.** Check the Metro logs. The usual cause is the API being
unreachable during session hydration — the opening animation runs concurrently with it, so
an unreachable API shows the brand and then stalls rather than erroring loudly.
