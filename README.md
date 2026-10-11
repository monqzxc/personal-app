# MONAPp — Personal Life Dashboard

A local-first mobile app built with React Native, Expo SDK 57, Expo Router, and strict TypeScript. Version 0.2 implements the local-app features across **Phases 1–4**. Phase 5 (Laravel, authentication, database, and multi-device sync) remains deferred under the original no-backend constraint.

## Run it

Use Node.js 24 LTS and npm. Dependencies are pinned through `package-lock.json`.

```sh
npm ci
npm start
```

Scan the QR code with an SDK 57-compatible Expo Go app, or use a development build. Press `a` for an installed Android emulator. A local iOS simulator requires macOS; a physical iPhone can use Expo Go. For a browser preview:

```sh
npm run web
```

On Windows PowerShell, use `npm.cmd` / `npx.cmd` if script execution policy blocks `npm.ps1`. No backend or cloud account is needed for local Expo Go development. Standalone builds use your Expo account; Android street maps optionally use a Google Maps key. See [phone installation and fitness](docs/fitness-and-installation.md) for Android APK and iPhone instructions.

## Included

- MONAPp branding, purple light/dark themes, and a bundled sleeping-ghost illustration on Home and the app icon. See [artwork and prompt](assets/README.md).
- Settings → App updates: check, download with progress, and confirm restart. Core features stay available offline. See [updating the app](docs/app-updates.md) for compatible app updates after installation.
- Settings → Data backup: export all saved data as JSON, import with preview/confirmation, and restore the pre-import copy. See [JSON backups](docs/data-backup.md). Current version 0.2.4 needs a new phone build for profile photos.
- Five-tab navigation: Home, Tasks, Calendar, Finance, More, with a floating purple bar, moving liquid notch, and reduced-motion support.
- Home dashboard derived from actual saved tasks and events. No demo records are inserted.
- Task create/edit/delete, status, priorities, categories, tags, descriptions, notes, subtasks, optional due dates and times, completion, search, filters, and sorting.
- Today, Upcoming, All, Completed, and Overdue views. All includes cancelled and undated tasks.
- Local calendar with month navigation, daily agenda, all-day/timed/multi-day events, event editing and deletion, and derived task deadlines.
- Floating Quick Add for quick expenses, tasks, income, transfers, money owed in either direction, expected income, payments, events, notes, goals, trips, ideas, and Inbox captures.
- System/light/dark appearance, first name, and default currency settings (PHP by default).
- Versioned local storage, runtime validation, serialized writes, error and loading states, confirmation dialogs, UUIDs, deletion tombstones, and repository contracts.

All Quick Add actions now work. More opens real modules, not placeholders.

- Finance: income/expense/transfer history, wallets with opening balances, expected income, bills, subscriptions, monthly category budgets with optional 80%/100% in-app alerts, and savings funds. Actual balances and monthly cash flow stay separate from planned money. Payments and receipts create linked transactions atomically. See the [budget monitoring guide](docs/budget-monitoring.md) for setup and calculation rules.
- Quick expense: name, optional description/person, amount, and date. Expenses are searchable, filterable by date/person, and grouped by day. Select entries across dates into **Collections**, such as Weekend Vacation, without duplicating money or changing dates. See [capture now, organize later](docs/finance-capture-and-collections.md).
- People: separate **They owe me** and **I owe them** balances, multiple debts, existing-debt entry without moving wallet money, full/partial repayments, and optional reminders. Link people to tasks, events, trips, projects, goals, notes, activities, and Collections. Trip workspaces include category shortcuts, personal budgets, and money covered for others. See [money owed and travel](docs/money-owed-and-travel.md).
- Fitness: manual walk/run logs, GPS duration/distance/pace, pause/resume, saved routes, weekly totals, and optional trip/task links. Installed builds support screen-lock tracking. See [fitness and phone installation](docs/fitness-and-installation.md).
- Travel workspaces: flights, hotels, places, itinerary, bookings, packing, notes, document links, and Finance-linked expenses.
- Projects: technologies, progress, URLs, milestones, linked tasks, notes, and bookmarks.
- Goals: progress from current/target values, milestones, or completed linked tasks.
- Notes/bookmarks with categories, tags, favorites; account directory without credential fields.
- Quick Capture/Inbox with atomic conversion to Task, Note, Expense, Payment, Event, Trip item, Bookmark, or Goal.
- Global search, personal analytics, important dates, and expanded Home widgets.
- Recurring tasks, swipe-to-complete, graphical date pickers, optional local device reminders, and device-calendar snapshot import/export.

See [expanded modules and behavior](docs/expanded-modules.md) for exact financial semantics, native integration limits, and file responsibilities. Server features, cloud authentication, exchange-rate conversion, continuous calendar sync, a password vault, and binary document attachments are not included. Trip document entries store links. Rich-text notes and other explicitly future features remain deferred.

## Architecture

```text
Route → feature screen → Zustand actions → service → repository contract
                                                       ↓
                                                 Local repository
                                                       ↓
                                             Versioned AsyncStorage JSON
```

Screens never import AsyncStorage or read JSON files. Replace the repository instances in `src/services/container.ts` with implementations of the same contracts when Laravel is introduced. Service operations and UI call sites stay intact; authentication, API error mapping, timestamp/conflict semantics, and sync orchestration will still need implementation in Phase 5.

See [the architecture and file guide](docs/architecture.md) for models, navigation, storage rules, dependencies, and every source file’s responsibility.

## Checks

```sh
npm run check
npx expo install --check
npx expo export --platform web
npx expo export --platform android --platform ios
```

The tests use Node’s built-in test runner, with no test framework dependency. They cover task lifecycle, reload persistence, concurrent writes, failed-write recovery, invalid/corrupt/newer data preservation, date validation, task filtering, and calendar projection. Bundling is not a substitute for testing on a physical device.

Verification covers strict TypeScript, 108 core/module/finance/fitness/update/backup/navigation/profile/onboarding/feedback tests, and web/Android/iOS exports. Finance tests cover migrations, transfers, lending/borrowing and repayment balances, atomic collection assignment, participant references, day groups and filters, trip spending, currency constraints, duplicate payments/receipts, write failures, and budget thresholds. Native file pickers/share sheets, GPS/background tracking, map rendering, notification delivery, calendar permission dialogs, and visual touch interactions still require a physical-device smoke test. A successful JavaScript bundle export is not an APK/IPA build or proof of native runtime behavior.

Manual smoke test:

1. Create a task due today, add a subtask, then confirm Home, Tasks, and Calendar show it.
2. Edit its deadline; check the calendar moves it. Complete it; check the deadline disappears.
3. Create a timed event and a multi-day event; inspect both days and edit/delete the event.
4. Try an empty title or invalid date; an error should appear and the form should retain its content.
5. Save a name and dark mode in Settings, reload, and verify settings and records persist.
6. Delete a task through the confirmation dialog; ensure it disappears after reloading.

## Data and scope

Data is stored in the app’s AsyncStorage sandbox (browser local storage on web), not in source files. It is not encrypted. Do not enter passwords, secrets, or recovery codes, including in account notes. The account directory stores metadata only and rejects credential-shaped fields. Clearing browser/app data or uninstalling can remove records; use Settings → Data backup to export a JSON copy outside the app before clearing data. Imports replace local records after preview/confirmation and keep one local recovery copy.

Calendar dates are device-local wall dates. Audit timestamps are full ISO 8601 UTC strings. The model is JSON-friendly; there are no persisted JavaScript `Date`, `Map`, or `Set` objects. Overdue is currently date-based, so a task becomes overdue the day after its due date, regardless of due time.

The database key is `daywell.database`. Schemas 1–5 upgrade sequentially to schema 6 after validation, retaining the original document under `daywell.database.backup.vN`, where N is its original schema version. Schema 4 adds people, debts, and repayments; schema 5 adds fitness activities. Schema 6 adds money collections, transaction names/person links, debt direction, and participant links. Old debts remain money lent to others; existing descriptions become transaction names. Amounts, dates, wallet assignments, IDs, and settings are preserved. Transactions from before schema 3 remain unassigned until you choose a wallet. Export a backup before updating; older code cannot open schema 6. Unsupported or corrupt data blocks loading and is preserved. Future upgrades must register explicit migrations.

## Dependency audit

The current `npm audit` reports 31 findings (20 high, 11 moderate), including transitive Expo/Metro tooling and Expo Router’s `query-string` dependency. Several proposed fixes require incompatible SDK upgrades/downgrades. No forced audit fix was applied. Recheck the audit and Expo-compatible updates before distributing the app; this initial development scaffold is not release-hardened.

## Mobile dashboard

Home includes a daily quote with offline fallback, a selectable week, daily plans, money and payment summaries, weekly fitness, uncollected expenses, and the next trip. See the [mobile dashboard guide](docs/mobile-dashboard.md) for behavior and phone checks.

Profile photos and the Quick Expense return fix are ready in **0.2.4**. This version requires a new native build; see the [profile photo and rebuild guide](docs/profile-photo.md).

Fresh installations now include a purple four-page welcome flow. Existing users can replay it from **Settings > Welcome tour**; see the [welcome tour guide](docs/welcome-tour.md). No additional native build requirements beyond 0.2.4 were added.
