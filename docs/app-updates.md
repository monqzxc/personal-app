# MONAPp app updates

**Current build: 0.2.4.** Profile photos add native photo selection and resizing, so rebuild once before using this source. Do not send the new code to a 0.2.3 installation through an OTA update. See [profile photos and the Quick Expense fix](profile-photo.md) for the current rebuild and phone checks.

Open **More → Settings & integrations → App updates**. Save any preference changes first.

1. **Check for updates** contacts the configured update service without downloading the code/assets.
2. **Download update** downloads a compatible update. Progress is shown when the native updater reports it. If the network or storage fails, the screen shows an error and you can retry while continuing to use the installed app.
3. **Restart to apply** asks for confirmation. Finish any active or paused workout and wait for saving to complete first. Choosing Later leaves the update ready for the next full app launch; it does not cancel the downloaded update.

The screen also handles recovery directives that restore the bundled release. It never resets the local database. A successful check with no result means there is no compatible update for this installation; it does not prove that no newer APK exists. There is no installer-release feed configured.

## Install this release once

Version **0.2.2** introduced this setting and **0.2.4** retains it. The app sets `expo.updates.checkAutomatically` to `NEVER`, so normal checks/downloads happen through these buttons. This is a native build setting. An older installed build keeps its original automatic-download behavior until you replace it; the screen explains that when detected. The native setting and APIs are documented in [Expo Updates](https://docs.expo.dev/versions/v57.0.0/sdk/updates/).

```powershell
cd E:\personal-app
npm.cmd run check
npx.cmd eas-cli@latest build --platform android --profile preview
```

Install the resulting APK over the existing app with the same package/signing key. Do not uninstall to update. For iPhone use `--platform ios` and follow [phone installation](fitness-and-installation.md). These controls require a preview/release installation; Expo Go, Metro development sessions, and web show an explanatory message instead.

## Publish later compatible changes

The current release is **0.2.4** because profile photos add native image selection and resizing. Install that build first. After testing a compatible JavaScript, styling, or asset change for the installed 0.2.4 runtime:

```powershell
npm.cmd run check
npx.cmd eas-cli@latest update --channel preview --environment preview --platform android --message "Describe the change"
```

On the phone, check, download, and restart. Use `--platform ios` for a compatible iPhone update, or `--platform all` only when both platforms have been checked. This project uses the `appVersion` runtime policy: keep version **0.2.4** for compatible updates targeting the 0.2.4 install. The profile photo feature cannot be delivered to a 0.2.3 installation through an update. The JSON backup feature cannot be delivered to a 0.2.2 installation through an update. A new native dependency, permission, native setting, launcher icon/name, or SDK change needs a new build and an appropriately incremented app version. Never send code requiring new native functionality to the old runtime. See [runtime compatibility](https://docs.expo.dev/eas-update/runtime-versions/).

The included Finance changes (quick expenses, Collections, two-way debts, and participants) add no native dependency of their own. The complete current app uses runtime 0.2.4 for profile photos. They migrate local data to schema 6; export JSON before applying them. Older bundled/update code cannot open schema 6, so restoring an older code release alone is not a data downgrade. Keep the original pre-update backup. These Finance changes have not been published. See [Finance capture and collections](finance-capture-and-collections.md).

SDK 57 supports patches between published updates when available. Existing assets can be reused, but downloads may still include a full code bundle. No download-size guarantee or byte estimate is shown. See [bundle diffing](https://docs.expo.dev/eas-update/bundle-diffing/).

Finance, Travel, Fitness, and other core features remain installed together and work offline. Downloadable content packs are deferred until there is actual optional content to host; hiding a feature would not remove its installed code.

## Verification

The 97-test suite includes checks for available/recovery/rejected updates, downloads that become unavailable, blocked restarts during a workout/save, save state changing during the database read, and storage/reload failures. Strict TypeScript and web/Android/iOS JavaScript exports also pass.

For a real device check, install a preview build, publish a compatible test update, and confirm the current screen stays unchanged until Download and restart/full relaunch. Also check no-update and offline errors, interrupted downloads, Later, re-entering this screen with a pending update, and active/paused-workout restart protection. Update delivery and the native restart still need that device test; no update was published as part of this implementation.

The implementation uses the installed `expo-updates` hook for native state and caching, the existing shared confirmation dialog, and the existing fitness repository for restart protection. The update controls themselves added no dependency, server, or database migration; the later Finance changes use the schema-6 migration described above.
