# Daywell — Personal Life Dashboard

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

On Windows PowerShell, use `npm.cmd` / `npx.cmd` if script execution policy blocks `npm.ps1`. No backend, environment variables, login, or cloud account is needed for local development.

## Included

- Five-tab navigation: Home, Tasks, Calendar, Finance, More.
- Home dashboard derived from actual saved tasks and events. No demo records are inserted.
- Task create/edit/delete, status, priorities, categories, tags, descriptions, notes, subtasks, optional due dates and times, completion, search, filters, and sorting.
- Today, Upcoming, All, Completed, and Overdue views. All includes cancelled and undated tasks.
- Local calendar with month navigation, daily agenda, all-day/timed/multi-day events, event editing and deletion, and derived task deadlines.
- Floating Quick Add for tasks, expenses, payments, events, notes, goals, trips, ideas, and Inbox captures.
- System/light/dark appearance, first name, and default currency settings (PHP by default).
- Versioned local storage, runtime validation, serialized writes, error and loading states, confirmation dialogs, UUIDs, deletion tombstones, and repository contracts.

All Quick Add actions now work. More opens real modules, not placeholders.

- Finance: transactions, bills, subscriptions, budgets, savings funds, monthly totals and category spending, with currency-separated calculations. Bill payment and renewal actions create expense records atomically.
- Travel workspaces: flights, hotels, places, itinerary, bookings, packing, notes, document links, and Finance-linked expenses.
- Projects: technologies, progress, URLs, milestones, linked tasks, notes, and bookmarks.
- Goals: progress from current/target values, milestones, or completed linked tasks.
- Notes/bookmarks with categories, tags, favorites; account directory without credential fields.
- Quick Capture/Inbox with atomic conversion to Task, Note, Expense, Payment, Event, Trip item, Bookmark, or Goal.
- Global search, personal analytics, important dates, and expanded Home widgets.
- Recurring tasks, swipe-to-complete, graphical date pickers, optional local device reminders, and device-calendar snapshot import/export.

See [expanded modules and behavior](docs/expanded-modules.md) for exact financial semantics, native integration limits, and file responsibilities. No server, cloud authentication, exchange-rate conversion, continuous calendar sync, password vault, binary document attachments, or backup/export UI is included. Trip document entries store links. Rich-text notes and other explicitly future features remain deferred.

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

Verification covers strict TypeScript, 19 core/module tests, and web/Android/iOS exports. Native notification delivery, calendar permission dialogs, and visual touch interactions still require a physical-device smoke test. A successful JavaScript bundle export is not an APK/IPA build or proof of native runtime behavior.

Manual smoke test:

1. Create a task due today, add a subtask, then confirm Home, Tasks, and Calendar show it.
2. Edit its deadline; check the calendar moves it. Complete it; check the deadline disappears.
3. Create a timed event and a multi-day event; inspect both days and edit/delete the event.
4. Try an empty title or invalid date; an error should appear and the form should retain its content.
5. Save a name and dark mode in Settings, reload, and verify settings and records persist.
6. Delete a task through the confirmation dialog; ensure it disappears after reloading.

## Data and scope

Data is stored in the app’s AsyncStorage sandbox (browser local storage on web), not in source files. It is not encrypted. Do not enter passwords, secrets, or recovery codes, including in account notes. The account directory stores metadata only and rejects credential-shaped fields. Clearing browser/app data or uninstalling can remove records; there is no in-app backup/export yet.

Calendar dates are device-local wall dates. Audit timestamps are full ISO 8601 UTC strings. The model is JSON-friendly; there are no persisted JavaScript `Date`, `Map`, or `Set` objects. Overdue is currently date-based, so a task becomes overdue the day after its due date, regardless of due time.

The database key is `daywell.database`. Schema 1 upgrades to schema 2 automatically after validation, retaining the original document under `daywell.database.backup.v1`. An unsupported or corrupt document blocks loading and is preserved. Future upgrades must register explicit migrations.

## Dependency audit

The initial `npm audit` reports 29 findings (19 high, 10 moderate), including transitive Expo/Metro tooling and Expo Router’s `query-string` dependency. Its proposed fixes require incompatible SDK upgrades/downgrades. No forced audit fix was applied. Recheck the audit and Expo-compatible updates before distributing the app; this initial development scaffold is not release-hardened.
