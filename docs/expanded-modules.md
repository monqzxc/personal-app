# Local modules — version 0.2

## Delivered scope

The remaining local features in Phases 2–4 now use the existing service/repository/storage architecture. The backend remains deliberately absent. Every module has validated creation, editing, deletion, search, and empty states. The common form/list screens share the repetitive mechanics; feature-specific calculations and workflows stay outside UI components.

The data envelope is schema **2**. `migrateV1ToV2` retains all Phase 1 task/event IDs and preferences, adds empty collections and a disabled-by-default notification preference, validates the resulting document, and saves the original schema-1 bytes before committing. A failed migration never silently resets data.

## Finance

- A transaction is income or expense in one currency. Positive amounts are required; zero and negative transaction amounts are rejected. Supported currencies are PHP, USD, EUR, JPY, and GBP. PHP is the initial default.
- Money validation accepts two fractional digits, or whole amounts for JPY. Monthly totals sum integer minor units. No currency conversion or cross-currency grand total is performed.
- Overview shows monthly income, expenses, unpaid bills due that month, tracked savings, and `income − expenses − unpaid bills`. This is a recorded monthly cash-flow estimate, not a bank-account balance. Savings funds are separate user-maintained balances and are not deducted again.
- Budgets compare recorded expense categories in the chosen month and currency against the budget amount. Category names must match exactly. Overlapping budgets are allowed and do not reserve money.
- **Record payment & expense** atomically marks the saved bill paid and creates one expense dated today. If recurring, it also creates the next bill. Repeating the action on the paid bill is rejected. Manually editing a bill’s status does not create or delete an expense.
- **Record renewal & expense** records one currently due subscription cycle and advances its renewal date. A future renewal cannot be recorded again early. For multiple missed cycles, each explicit action records one cycle. Paused/cancelled subscriptions are excluded from active estimates.
- Subscription estimates normalize weekly × 52 / 12, quarterly / 3, and yearly / 12. They are estimates, not scheduled bank charges.
- Payment/renewal actions use saved values. Save edits before recording a payment. Deleting bills, subscriptions, or trips retains existing transactions; there is no automatic financial reversal.

## Travel, projects, and goals

Trip workspaces keep typed items for flights, hotels, places, itinerary, bookings, packing, notes, and document links. Items have dates, times, locations, references, URLs, completion state, and notes. The item list can filter by kind and orders dated entries first. Trip expenses are normal Finance transactions with `tripId`; the trip budget display totals only matching-currency expenses. Notes can also link to a trip. Files themselves are not copied into the app.

Projects have technology tags, status, manually entered progress, start/target dates, repository/staging/production/documentation URLs, editable milestone checklists, and linked tasks, notes, and bookmarks. Quick Add → Idea creates a project in the idea state.

Goal progress uses either current/target values, completed milestones, or the proportion of linked non-cancelled tasks that are completed. A goal’s status stays under user control; reaching 100% does not silently archive it. Records preserve linked IDs when a parent is deleted. Clear or replace an unavailable parent link when editing a child.

## Notes, bookmarks, accounts, and Inbox

Notes are plain text. Notes/bookmarks support tags, categories, favorites, and project links. Bookmarks require an http(s) URL; credential-bearing URLs and script schemes are rejected.

The account directory has service, username, email, website, category, 2FA/recovery flags, and notes. It has no password/token fields. Validation rejects credential-shaped properties. Free-text fields are not secret detectors: never paste secrets into them. Device storage is not encrypted by this application.

Inbox conversion opens the relevant editor with the capture as its title. The new record and processed/link metadata are saved in one database mutation. Failed saves leave the capture unprocessed. A processed item retains its original content and can open the destination record. Repeated conversions are rejected; deleting the destination does not automatically reopen the original capture.

Global search uses a `SearchService` provider registry. Current providers include tasks, events, and every module. Additional modules register a provider without changing SearchScreen. Results are limited to 100 per query.

## Tasks and calendar

Completing a recurring task creates the next dated occurrence, resets its subtasks, and records `nextOccurrenceId` on the original. Reopening/recompleting the same occurrence does not generate duplicates. Intervals support days, weeks, or months. Monthly/yearly advancement clamps to the last valid day of the target month. New occurrences do not inherit an old reminder time; set a new reminder explicitly.

The calendar derives bills, renewals, trips, task deadlines, and important dates from source records. It does not store stale duplicate calendar events. Yearly February 29 dates are shown on February 28 in non-leap years. Timed local events use device wall time; audit timestamps and reminder instants are ISO timestamps. Overdue tasks remain date-based.

Date fields support a shared graphical month picker as well as validated text entry. Task cards support swipe-to-complete, with the checkbox retained as an accessible equivalent.

## Device integrations

`expo-notifications` and `expo-calendar` are the only added runtime dependencies. They are installed with Expo’s SDK-compatible versions, and their config plugins are declared in `app.json`.

**Local reminders:** set a future date/time on a task, bill, subscription, trip, event, or important date, then enable Device reminders in Settings. Permission is requested only when enabling. Scheduling is centralized in `NotificationService`, excludes inactive/deleted records, and replaces this app’s scheduled reminders on launch, foregrounding, and saved changes. The next 60 future reminders are scheduled to stay under platform limits. Open the app to replenish the window. These are one-time reminders: recurring tasks and yearly dates do not create perpetual notifications. Device permissions, OS power settings, and platform restrictions can affect delivery. Failed scheduling is reported in Settings without rolling back saved records. Browser reminder scheduling is unsupported.

**Device calendars:** More → Settings → Connect device calendars, or Calendar → Device calendar integration. Permission is requested when listing calendars. Select a calendar to preview the next 90 days, then explicitly import. Imported events are local snapshots keyed by provider occurrence, so re-import skips existing occurrences. Subsequent remote edits are not automatically applied; delete a local copy and import again to refresh it. Import can be partially completed if one record fails validation; retry safely skips records already imported. Recurring source events are individual occurrences in the imported window. Calendar reminders are not copied.

Export a saved event to the system calendar form from its editor. The user chooses whether/where to save. Every export creates a copy; repeated exports can create duplicates. This does not establish two-way synchronization. Google/Apple calendars are accessed through calendars configured on the phone; no Google OAuth/backend is included. The SDK 57 legacy calendar API is isolated inside `DeviceCalendarProvider` for compatibility with Expo Go and future replacement.

Native permissions and delivery require testing on an Android/iOS device. For a custom build after plugin changes, rebuild the native app. Expo Go support depends on its installed SDK/native modules; use a development build if a device integration is unavailable. No APK/IPA has been produced in this workspace.

## New file guide

| File(s) | Purpose |
| --- | --- |
| `src/types/life.ts` | Typed finance, travel, project, goal, note, bookmark, account, capture, and important-date models |
| `src/features/library/catalog.ts` | Shared form metadata, module titles, defaults, and empty collections |
| `src/repositories/lifeRepository.ts` | Storage-independent module repository contract and local implementation |
| `src/repositories/financeRepository.ts` | Atomic bill-payment and subscription-renewal repository operations |
| `src/services/lifeService.ts` | Normalization, relation checks, validation, and module saves/deletes |
| `src/features/library/ModuleScreen.tsx` | Shared searchable module lists and filters |
| `src/features/library/RecordEditorScreen.tsx` | Shared validated editor, conversion, payment, deletion, and link actions |
| `src/features/library/RecordCard.tsx` | Shared summary cards |
| `src/features/library/RelatedWorkspace.tsx` | Trip/project/goal relationships and workspace actions |
| `src/components/forms/RecordFields.tsx` | Text, number, choice, reminder, relationship, and checklist fields |
| `src/components/forms/DateField.tsx` | Reusable calendar date picker |
| `src/features/finance/selectors.ts` | Currency-safe money totals and subscription estimates |
| `src/features/goals/progress.ts` | Three goal-progress modes |
| `src/utils/recurrence.ts` | Valid date advancement across month/year boundaries |
| `src/services/reminderSelectors.ts` | Pure reminder eligibility and ordering |
| `src/services/notificationService.ts` | Native permission and centralized local scheduling |
| `src/services/deviceCalendarService.ts` | Calendar-provider contract and native adapter |
| `src/features/calendar/screens/CalendarIntegrationScreen.tsx` | Calendar selection, preview, and explicit import |
| `src/services/searchService.ts` | Extensible search registry |
| `src/features/search/SearchScreen.tsx` | Global search UI |
| `src/features/analytics/AnalyticsScreen.tsx` | Task, money, goal, and account summaries |
| `src/features/home/LifeDashboardCards.tsx` | Payments, travel, goals, projects, notes, and capture widgets |
| `src/app/module.tsx`, `record.tsx`, `search.tsx`, `analytics.tsx`, `calendar-integration.tsx` | Thin Expo Router entries |
| `tests/life.test.ts` | Migration, every-module CRUD, payments, renewals, precision, conversion, recurrence, progress, search, calendar, and reminder checks |

Existing types, validation, storage migration, repository contracts, composition root, store, navigation, Home, Finance, task/event editors, Quick Add, More, and Settings were extended in place. `tests/core.test.ts` continues to cover the original persistence and task/calendar behavior.

## Device smoke test

1. Upgrade from Phase 1 data and verify existing tasks/settings remain.
2. Add PHP and USD transactions, then inspect each currency separately.
3. Pay a recurring bill and verify one expense, a paid bill, and one next bill.
4. Add a trip, packing item, and expense; inspect Finance and Calendar.
5. Link tasks to a project/goal and confirm progress changes on completion.
6. Convert an Inbox capture, verify the destination link, and restart the app.
7. Schedule a near-future reminder, enable permission, then background the app and verify delivery. Delete/complete the source and verify its pending reminder is removed.
8. Import a selected device calendar twice and verify no duplicate occurrences. Export one event using the native save form.
9. Exercise date pickers, swipe actions, long forms, and both themes on a small phone.

Outstanding release work: physical-device QA, upstream dependency audit remediation when compatible fixes exist, backups/export UX, and the separately deferred Phase 5 backend/sync implementation.
