# JSON data backup

MONAPp **0.2.3** adds **More → Settings & integrations → Data backup**. Save any preference changes first. Finish an active or paused workout before exporting or importing.

## Export your records

1. Choose **Export JSON**.
2. On Android, choose an app or file destination in the system share sheet and complete saving there. On iPhone, choose **Save to Files**. The browser downloads a dated JSON file.
3. Keep that file outside MONAPp, preferably with a second copy on another device. Opening or dismissing the share sheet alone does not save a backup.

The export includes every saved collection and preference: tasks/subtasks, calendar events, wallets, transactions, budgets, bills, subscriptions, expected income, savings, people, debts, repayments, money collections, trips and their items, projects, goals, notes, bookmarks, account metadata, inbox captures, important dates, and completed fitness activities with GPS routes. IDs, participant/person/collection links, debt direction, timestamps, and deletion history are preserved. Counts in the preview show records that have not been deleted.

Backups are readable, **unencrypted JSON** and may contain financial details, private notes, and location history. MONAPp does not upload them to a server; any destination you select in the share sheet handles its own copy. System calendar contents that you have not imported, device permissions, installed app updates, and external documents referenced by links are not included.

## Import on this phone or another device

1. Install MONAPp 0.2.3 with the Finance/schema-6 update, or a compatible newer release, on the destination device. An earlier 0.2.3 update can only read its supported database schema.
2. Copy your JSON file to a location available in the device's file picker.
3. Open **Data backup → Choose JSON file** and select it.
4. Review the export date and current-versus-backup record counts.
5. Choose **Restore this backup → Replace and restore**.

Import **replaces all local records and preferences**. It does not merge files or append duplicate transactions. Canceling the picker, preview, or confirmation changes nothing. After restoration, old editor screens are discarded and the app reloads the saved records. Reminder definitions remain in the backup, but device reminders are switched off; enable them again in Settings on the destination phone.

Before replacement, MONAPp saves one recovery copy on that device. **Preview previous data** lets you review and restore it using the same confirmation flow. Restoring it saves the displaced data as the next recovery copy. A later import replaces this single copy. It is not an external backup and will not survive uninstalling or clearing app data. Export anything you want to retain permanently.

Invalid files, unsupported formats, newer database schemas, duplicate IDs, broken financial references, invalid routes, and unfinished workouts are rejected. If records change after the preview, choose the file again. Failure to save the recovery copy prevents replacement. A failed database write preserves the original data.

## Format and limits

The UTF-8 JSON envelope contains:

| Field | Value |
| --- | --- |
| `format` | `"monapp-backup"` |
| `formatVersion` | `1` |
| `exportedAt` | ISO timestamp |
| `data` | Full database object: `schemaVersion: 6`, `settings`, `tasks`, `events`, and all module collections |

Use an exported file as the template if generating JSON yourself. Required record fields, UUIDs, valid dates, currencies, wallet/person/debt/collection references and participant links, and all collection arrays must satisfy the same rules as records saved in the app. Arbitrary JSON or a file containing only expenses is not a full backup. Database schemas 1 through 5 inside this envelope are migrated to schema 6 before preview; the source file is never modified. Old debts remain money lent to other people, old transaction descriptions supply their names, and new collection/participant links start empty. Export before updating because older app code cannot read a schema-6 backup. See [Finance capture and collections](finance-capture-and-collections.md).

Files are limited to **10 MiB** for reading/export. Restore additionally limits both the incoming and current compact database to **1.5 MiB**, so the restored records and the recovery copy remain readable within Android's per-entry AsyncStorage limit. Oversized data is rejected before writing, never truncated. Larger datasets need a storage adapter upgrade; they can still be exported if the file fits the export limit. Storage can also run out sooner due to other saved data. Use one active browser tab while restoring; the write queue does not coordinate separate tabs.

The recovery/import screen currently requires the app's existing database to load successfully. A startup corruption error continues to preserve the original storage; this screen is not a repair tool for an unreadable database.

## Build for your phone

Version 0.2.3 adds native file sharing and directly uses Expo FileSystem's system picker. It needs a **new APK/iPhone build**, not an over-the-air update to a 0.2.2 installation. The version/runtime is now **0.2.3**; package/bundle identity and storage key are unchanged.

```powershell
cd E:\personal-app
npm.cmd run check
npx.cmd eas-cli@latest build --platform android --profile preview
```

Install the APK over your existing app using the same signing key. **Do not uninstall or clear app data.** Open Data backup and export a file once installed. For iPhone, follow [fitness and installation](fitness-and-installation.md) and build with `--platform ios`. The Finance capture/Collections changes add no native dependencies and keep runtime 0.2.3; an existing 0.2.3 installation can receive them through a compatible JavaScript update after publication. Nothing has been published for these Finance changes. See [app updates](app-updates.md).

## Verification

The 70-test suite includes full round trips across all collections, Unicode, balances and relationships, GPS data, deletion history, malformed/unsafe/newer JSON, legacy migration, size limits, failed writes, concurrent restores, stale previews, recovery after relaunch, and active workout protection. Strict TypeScript and Android/iOS/web JavaScript exports also pass.

Phone smoke test: export a small backup, save it outside the app, add a temporary task, import the backup, verify the temporary task is gone and balances/routes are correct, then restore **previous data** and verify the task returns. Also cancel each step, try invalid JSON, relaunch, and repeat on a second device. Native picker/share-sheet behavior and a signed installation still require physical-device testing.
