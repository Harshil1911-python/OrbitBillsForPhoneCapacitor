# Custom app icon + splash screen (v2 — your uploaded logo)

## What's in this zip

- `android/` — full native Android project with your new logo baked in as the
  launcher icon (all densities + adaptive icon) and splash screen (all
  densities, portrait + landscape).
- `resources/` — updated master icon/splash source images.
- `app-config.json` — `brandColor` changed from navy (`#0b3d91`) to white
  (`#ffffff`), and `statusBarStyle` changed from `LIGHT` to `DARK`.

## Why brandColor changed

Your uploaded logo is navy + silver. The app was previously using a navy
splash/status-bar background (`#0b3d91`) tuned for the old white-and-blue
logo. With the new navy logo, a navy background made it nearly invisible —
the navy shape blended into the navy background. Switching to a white
background makes the logo pop, and the status bar text/icons were switched
to dark so they stay visible against white.

## What else was fixed

The previous zip only updated the plain `drawable-*` splash images. Android
also has orientation-specific splash folders (`drawable-land-*`,
`drawable-port-*`) that were still holding old, stale images from initial
project setup — a device that used those specific configs would show
outdated art. Both are now regenerated from your new logo.

## How to deploy

1. Unzip into the root of `OrbitBillsForPhoneCapacitor`, overwriting the
   `android/`, `resources/` folders and `app-config.json`.
2. Commit and push to `main`.
3. Let **Build APK** run in GitHub Actions.
4. **Uninstall the old app from your device before installing the new APK** —
   Android caches launcher icons per package, and a plain reinstall over an
   existing app sometimes won't refresh the icon.
