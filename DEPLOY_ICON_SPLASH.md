# Custom app icon + splash screen — ready to deploy

## What's in this zip

- `android/` — the full native Android project (was missing from the repo before;
  it was only ever generated on the fly inside GitHub Actions). It now has your
  Orbit logo baked in as:
  - Launcher icon (all densities + Android 8+ adaptive icon)
  - Native splash screen (all densities, portrait + landscape)
- `resources/` — refreshed master icon/splash source images.

## Why you were seeing a blank screen

Your repo already had the branding pipeline (`scripts/install-branding.py`) and a
correct splash theme (`Theme.SplashScreen`, Android 12+ compatible) — but the
`android/` folder itself was never committed, so unless the GitHub Action ran
fully clean, the icon/splash steps had nothing to copy into. Committing a real
`android/` folder with the assets already in place removes that gap and gives
you a stable, versioned baseline instead of relying on it being rebuilt from
scratch every push.

Your splash is also already set up the right way for a fast, flicker-free start:
- `launchAutoHide: true` with `launchShowDuration: 1800` (splash shown up to 1.8s)
- JS in `orbit-native.js` calls `SplashScreen.hide()` as soon as the page's DOM is
  ready — so on a fast device the splash disappears the moment content is
  actually painted, not on a blind timer.

## How to deploy

1. Unzip this into the root of `OrbitBillsForPhoneCapacitor` (locally or by
   uploading through the GitHub web UI), overwriting/adding the `android/` and
   `resources/` folders.
2. Commit and push to `main`.
3. GitHub Actions → **Build APK** will run automatically (or trigger it manually
   from the Actions tab) and produce `app-debug.apk` with your icon + splash.

No further changes needed — `app-config.json`, `capacitor.config.ts`, and the
build workflow are untouched and already correct.
