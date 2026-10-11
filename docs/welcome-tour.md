# MONAPp welcome tour

Fresh installs show a four-screen purple introduction before opening the app:

1. **Your life. At your pace.** The existing sleeping MONAP mascot welcomes you.
2. **Less rush. More room.** An example day introduces tasks and schedules.
3. **Small spends. Bigger plans.** Example expenses lead into a weekend Collection.
4. **Move a little. Rest a little.** An example walk introduces fitness and local storage.

Swipe horizontally or use Next, Back, or the page dots. Each page scrolls vertically when the screen is short or text is enlarged. Skip and Get started both finish the introduction. Reduced Motion turns off animated button-driven page transitions. No permissions, account, or network connection are required for the tour. The example cards do not create any records.

## Existing installations and replay

An existing saved database, even an empty one, skips first-launch onboarding. Open **Settings > Welcome tour** to preview all screens without resetting data or changing the first-launch preference. Close or Back to app returns to Settings.

Do not uninstall or clear app data just to test the intro: that can erase local records. Use Settings replay on your current phone, and a separate clean installation/device when testing first launch.

## Persistence and failures

`monapp.onboarding` is a small device-local preference outside the main database and JSON backups. On first evaluation, a fresh installation saves `pending` before other startup work can create a database. Closing the app mid-tour starts the tour again on the next launch. Skip or Get started saves `complete` before entering the app. A write failure keeps the tour open with a retryable error. Storage read failures use the app's existing startup error and retry UI; saved records are never reset.

Returning from the background preserves the current in-memory page. A cold restart of an unfinished tour starts on page one. Importing a JSON backup does not re-enable a completed tour. Operating-system restoration of the whole app's storage can restore the completed preference too.

## Build and phone checks

This change adds no dependencies or permissions and keeps app/runtime **0.2.4**, database schema **6**. It is included in your next normal rebuild. Existing 0.2.4 builds could receive it through a later compatible update; no update has been published here. Older builds still need the native profile-photo support documented in [profile photos](profile-photo.md).

Check on a phone:

- A fresh install shows the intro before Home. Finish or Skip, reopen, and confirm it stays dismissed.
- Force-close mid-tour, reopen, and confirm the intro returns. Resume from background and check the current page stays selected.
- Upgrade an installation with records: it should open the app directly and retain the records.
- Use Settings > Welcome tour; close it and check your Settings draft is still there.
- Try swipes, Next/Back, all page dots, Android back, narrow/short screens, large text, and VoiceOver/TalkBack. Verify the active page is the only one exposed to screen readers.
- Enable Reduce Motion and check that Next/Back/dot navigation snaps to each page.

Validation: strict TypeScript and all 108 tests pass, including eight first-launch persistence checks. Android, iOS, and web JavaScript/assets exports passed. No browser/device surface was available for visual testing. A JavaScript export is not a signed APK or a hardware test.
