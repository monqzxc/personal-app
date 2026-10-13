# Fitness and phone installation

**Current build: 0.2.4.** Profile photos add native photo selection and resizing, so rebuild once before using this source. Do not send the new code to a 0.2.3 installation through an OTA update. See [profile photos and the Quick Expense fix](profile-photo.md) for the current rebuild and phone checks.

## Use the feature

Open **More → Fitness**. Choose Walk or Run, then **Start**. The active workout shows elapsed time, estimated distance, average pace, and its route. **Pause** excludes rest time; **Resume** starts a separate route segment; **Finish & save** puts it in history. Only one workout can be active at a time.

**Log an activity manually** works on Android, iPhone, and web. Enter a name, date, duration in minutes, and distance in kilometres (zero is allowed). Saved activities can have notes, participants, and optional trip/task links. Open a trip's **Trip walks & runs** to start or log an activity already linked to that trip. An existing task also has a logging shortcut. Logging exercise does not automatically complete a task.

History supports search and walk/run filters. Weekly totals include completed activities from Monday through today. GPS measurements are read-only after saving; names, notes, and links remain editable. Manual measurements remain editable.

### Pokémon running partners

Choose **Run → Change Pokémon** before starting to pick any of the original 151 Pokémon by name or Pokédex number. Charmander is the initial suggestion; the most recently used partner is suggested when you return. You can also choose **Run without a Pokémon**. The chosen partner stays attached to that run through pause/resume, recovery, and finishing.

Every kilometre of GPS running with a partner earns **1,000 XP**. **Each new run starts fresh**, with zero XP and the selected Pokémon at level 1. Only distance recorded in that run advances its evolution. One level is earned per kilometre, capped at 100; XP continues beyond the level cap. Walks, manual logs, and runs without a partner do not award Pokémon XP. Pausing or reopening an unfinished run preserves its progress.

For a run starting with Charmander, milestones are **5 km → Charmeleon**, **10 km → Charizard**, **20 km → Mega Charizard X**, and **40 km → Gigantamax Charizard** within that run. These are running milestones, not the games' evolution requirements. Other paths use their remaining Generation 1 evolutions at 5 km and 10 km, with Mega at 20 km and Gigantamax at 40 km where supported. The card previews the actual path before starting. Branches use Vaporeon for Eevee and Mega X for Charizard/Mewtwo. Species without another supported evolution continue earning XP.

The active card shows the current form, XP, level, distance to the next evolution, and an evolution message when a milestone is crossed while Fitness is open. History keeps each run's final Pokémon form and earned XP. Progress is derived from the run's saved distance, so refreshing never awards XP twice and another run cannot change a completed run's result. JSON backups include the partner assignments; older records continue to work without a Pokémon.

Pixel artwork uses the supplied [Pokémon Showdown Generation 5 sprites](https://play.pokemonshowdown.com/sprites/gen5/). Images need an internet connection to load; if artwork fails, a placeholder appears and GPS/XP tracking still works. No new native module is required. Test sprite loading and an actual GPS run on the phone before relying on the feature.

## Install a standalone app

The current release is **0.2.4**, adding profile photos and a safer Quick Expense return flow. Build/install it once because photo selection and resizing need native support. It retains the JSON backup support introduced in 0.2.3 and manual App updates introduced in 0.2.2. See [JSON backups](data-backup.md) and [app updates](app-updates.md). The included Finance changes use database schema 6, so export a backup before installing over an older release. See [Finance capture and collections](finance-capture-and-collections.md).

MONAPp 0.2.1 introduces the purple theme, new display name, and original sleeping-ghost artwork on Home and the app icon. Install a new preview APK to update the phone's app label and icon; an over-the-air JavaScript update cannot replace native launcher branding. Keep the existing package (`com.suppm.daywell`), EAS project, and signing keystore when updating an existing installation. The original database key and notification identifiers are retained so the rename does not create a separate data store. The app-version runtime policy separates this release's updates from version 0.2.0. The illustration and generation prompt live in `assets/`.

The repository includes Expo configuration and EAS build profiles linked to the existing Expo project. It does **not** include a generated APK/IPA. A `preview` build installs as MONAPp and runs without your computer or Metro running. Cloud builds require internet and access to the Expo account; service limits depend on your account. iPhone signing also needs the appropriate Apple account. See [Expo build setup](https://docs.expo.dev/build/setup/) and [internal distribution](https://docs.expo.dev/build/internal-distribution/).

Use PowerShell with Node.js 24 LTS installed:

```powershell
cd E:\personal-app
npm.cmd ci
npx.cmd eas-cli@latest login
```

This workspace is already linked to the existing Expo project. For a rebuild, keep that project, the `com.suppm.daywell` identifiers, and the existing signing credentials. No `eas init` or configuration replacement is needed. If dependencies are already installed and you are logged in, go straight to the build command below.

The current source includes the updated dashboard and liquid purple navigation bar. TypeScript, all 122 tests, and Android/iOS/web bundle exports have passed. See the [mobile dashboard guide](mobile-dashboard.md) for the remaining phone checks. The current native runtime is 0.2.4 for profile photo support. Export a JSON backup before installing, since the included Finance changes migrate older data to schema 6.

### Android

```powershell
npx.cmd eas-cli@latest build --platform android --profile preview
```

Use the existing EAS-managed signing keystore for this app. Install the new APK over the existing installation; do not uninstall the app to update it. When the build finishes, open its installation link or scan its QR code on your Android phone. Download the **APK**, allow installation from that browser when Android asks, and install MONAPp. The supplied preview profile explicitly produces an APK. See [Expo's preview installation walkthrough](https://docs.expo.dev/tutorial/eas/internal-distribution-builds/).

### iPhone / iOS

An EAS internal iPhone build requires a **paid Apple Developer membership** and a registered device. After the Expo setup above:

```powershell
npx.cmd eas-cli@latest device:create
npx.cmd eas-cli@latest build --platform ios --profile preview
```

First open the device-registration URL/QR on the iPhone and finish registration; then run the build command. Follow EAS's Apple sign-in and signing prompts. Once the build completes, open its installation link in Safari on that registered iPhone. A newly added iPhone needs a new build or re-signing with an updated provisioning profile. These are Apple's ad hoc distribution requirements described in [Expo's internal distribution guide](https://docs.expo.dev/build/internal-distribution/).

If iOS requests Developer Mode, enable it under **Settings → Privacy & Security → Developer Mode**, restart, and confirm. See [Expo's Developer Mode instructions](https://docs.expo.dev/guides/ios-developer-mode/).

### Quick testing and development

For an initial test without building, install an SDK 57-compatible Expo Go and run:

```powershell
npx.cmd expo start --go
```

Keep the phone and computer on the same network and scan the QR code. In Fitness, turn **off** “Keep tracking with the screen locked.” Expo Go does not support this app's background tracking; use an installed build for that. See [Expo Location's background requirements](https://docs.expo.dev/versions/v57.0.0/sdk/location/).

For native development, build with `--profile development` instead of `preview`, install it, then run `npx.cmd expo start --dev-client`. Development builds use Metro while developing; preview builds embed the app. See [development builds](https://docs.expo.dev/develop/development-builds/introduction/).

Expo Go and standalone MONAPp have separate local storage. Existing records do not automatically move between them. Keep your app identifier and signing credentials consistent for updates; uninstalling or clearing app data can remove records.

## Maps

- **iPhone:** native Apple Maps; no Google Maps key needed.
- **Android without a key:** a local route outline with start/end markers. GPS distance, duration, and saved points still work.
- **Android street maps:** enable Maps SDK for Android in your Google Cloud project and create a restricted key. Restrict it to Android package `com.suppm.daywell` (or your chosen package), the build's signing SHA-1, and Maps SDK for Android. Retrieve the signing certificate details through EAS credentials. Add `GOOGLE_MAPS_ANDROID_API_KEY` to your EAS project's **preview** environment, then rebuild. Add it to **development** or **production** too if you build those profiles. Use a sensitive variable visible to build/config evaluation; this client key is embedded in the app, so restrictions are essential.
- **Web:** a local route outline.

The map plugin reads the Android key from `app.config.js`; native configuration changes require a new build. See [Expo's maps setup](https://docs.expo.dev/versions/v57.0.0/sdk/map-view/) and [EAS environment variables](https://docs.expo.dev/eas/environment-variables/manage/).

## Permissions, reliability, and privacy

The app requests location only when starting/resuming GPS tracking. Allow precise location. Screen-lock mode also needs **Always / Allow all the time** access and may open system settings. Android shows a tracking notification. Screen-only mode pauses when the app enters the background, including screen lock. Pause/finish stops location collection.

Avoid force-closing during a workout. Operating systems and battery-saving settings can stop background services. After an interrupted cold launch, MONAPp pauses at the last saved route point and lets you resume or finish; it does not count time while the app was killed. GPS and background behavior still need physical-device testing. Platform limitations are documented in [Expo Location](https://docs.expo.dev/versions/v57.0.0/sdk/location/).

Distance is an estimate. The filter rejects poor accuracy (over 35 metres), out-of-order points, small jitter, and implausible speeds over 12 m/s. Gaps over a minute and pauses start separate segments rather than drawing/counting a straight line across missing data. The route limit is 20,000 points per activity; reaching it pauses recording. Duration is capped at seven days. These defaults need calibration during real walks/runs.

Routes and records use the device's unencrypted local storage. Street-map providers receive requests for the area you view. GPS can work without mobile data, but map tiles may need internet; offline street maps are not guaranteed. Deleting a completed activity clears its route from the current database and leaves a normal deletion tombstone. Any older backup/copy is separate. No cloud sync is included. Settings → Data backup exports/imports JSON, including completed routes; keep a copy outside the app.

## Verification and device checklist

`npm.cmd run check` runs strict TypeScript and 122 tests, including Pokémon evolution thresholds, fresh progress each run, partner persistence and backup restore, fitness distance/filtering, pause/resume timing, interrupted recording, concurrent starts, failed writes, route deletion, manual logging, weekly totals, and fitness migration, plus schema-6 Finance migration and collection assignment. Web, Android, and iOS JavaScript exports pass. Native configuration includes location/background permissions. Exports are not signed APK/IPA builds or physical-device tests.

Before relying on the tracker:

1. Log a manual walk, link it to a trip/task, reload, edit it, and check history/weekly totals.
2. Walk a known outdoor route; compare distance and inspect the saved route and average pace.
3. Pause, move elsewhere, resume, and confirm paused time and the connecting distance are excluded.
4. Test screen-only background pausing and screen-lock recording on each phone you use.
5. Deny permission, retry through settings, and check the manual fallback.
6. Force-close/reopen during a test recording; confirm recovery retains saved points and starts paused.
7. Test poor GPS/offline conditions and Android maps with the actual signed build/key.

The dependency audit currently reports 31 findings (20 high, 11 moderate), largely inherited through the Expo/React Native toolchain. No forced incompatible SDK change was applied. Resolve compatible upstream updates and complete device checks before wider distribution.

## Implementation map

`features/fitness/tracking.ts` contains pure timing/distance logic; `repositories/fitnessRepository.ts` serializes recording changes through the shared database; `services/fitnessTracking.native.ts` owns permissions and the global background task. The web service disables live tracking. `FitnessScreen`, `ActivityDetails`, and platform-specific `RouteMap` files provide the UI. Schema 5 adds an empty `activities` collection while preserving existing records and backing up the prior document before migration.

The first-install welcome flow can also be previewed through **Settings > Welcome tour** after rebuilding. See [welcome tour](welcome-tour.md) for first-launch behavior; do not clear your data just to preview it.
