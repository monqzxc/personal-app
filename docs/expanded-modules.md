# Local modules — version 0.2

## Delivered scope

The remaining local features in Phases 2–4 now use the existing service/repository/storage architecture. The backend remains deliberately absent. Every module has validated creation, editing, deletion, search, and empty states. The common form/list screens share the repetitive mechanics; feature-specific calculations and workflows stay outside UI components.

The data envelope is schema **6**. `migrateV1ToV2` retains all Phase 1 task/event IDs and preferences and adds the local modules. `migrateV2ToV3` adds wallets and expected income, keeps existing finance records unassigned, and enables in-app budget alerts. `migrateV3ToV4` adds people, debts, and repayments; see [money owed and travel](money-owed-and-travel.md). `migrateV4ToV5` adds fitness activities; see [fitness and phone installation](fitness-and-installation.md). `migrateV5ToV6` adds money collections, transaction names/person links, separate lending/borrowing direction, and participants. Old debts remain `lent`; existing transaction descriptions supply their new names. New participant and collection links start empty. See [Finance capture and collections](finance-capture-and-collections.md). The resulting document is validated and the original bytes are backed up before committing. A failed migration never silently resets data.

## Finance

- **Quick expense** captures name, amount, date, optional description, and optional person; wallet/currency/category live under More details. An unassigned expense counts in spending without changing a wallet. A person link is context and does not create a debt.
- **Expenses by date** groups original records by day, searches names/descriptions, and filters by date/person/collection. Select across dates into a new or existing Collection, optionally linked to a trip. Moving records replaces their collection link without copying records or changing dates, amounts, or balances. **All money activity** includes recorded income, transfers, lending, borrowing, and repayments, with separate totals by kind/currency; unpaid plans stay separate.
- **People** shows separate They owe me/I owe them balances and linked plans. Lending subtracts from the assigned wallet; borrowing adds to it. Repayments reverse those effects. Existing debts do not move the original amount. Debt activity is excluded from ordinary income/expense/budget totals.
- A transaction is income, expense, or a transfer between two distinct wallets in the same currency. Positive amounts are required; zero and negative transaction amounts are rejected. Supported currencies are PHP, USD, EUR, JPY, and GBP. PHP is the initial default. Transfers are excluded from income, expenses, and budgets.
- Money validation accepts two fractional digits, or whole amounts for JPY. Monthly totals sum integer minor units. No currency conversion or cross-currency grand total is performed.
- Overview shows today's wallet balances separately from monthly income, expenses, net cash flow, expected income, unpaid bills due that month, and `income − expenses − unpaid bills`. Expected income stays separate until marked received. Savings funds are separate user-maintained goal balances and are not deducted again. See [budget monitoring](budget-monitoring.md) for setup and correction rules.
- Budgets compare expense categories in the chosen month and currency against the budget amount. Category matching ignores case and surrounding spaces. Progress bars show remaining/over amounts and optional 80%/100% in-app alerts. Overlapping budgets are allowed and do not reserve money.
- **Record payment & expense** atomically marks the saved bill paid and creates one expense dated today using its wallet. If recurring, it also creates the next bill. Repeating the action on a paid bill is rejected. The editor uses this action to mark bills paid; historical paid records are retained.
- **Mark received & add income** atomically settles an expected-income plan and adds its saved amount to the chosen wallet. A received plan cannot be received twice, including after deleting its receipt.
- **Record renewal & expense** records one currently due subscription cycle and advances its renewal date. A future renewal cannot be recorded again early. For multiple missed cycles, each explicit action records one cycle. Paused/cancelled subscriptions are excluded from active estimates.
- Subscription estimates normalize weekly × 52 / 12, quarterly / 3, and yearly / 12. They are estimates, not scheduled bank charges.
- Payment/renewal/receipt actions use saved values and are disabled while unsaved changes exist. Save edits and reopen before recording. Deleting bills or subscriptions retains existing transactions. A trip cannot be deleted while an active money collection references it; remove that collection link first. Deleting an otherwise unreferenced trip retains its money records. Editing/deleting transactions recalculates money; deleting a payment/receipt keeps its source plan settled. A linked wallet cannot be deleted or change currency until its records are reassigned.

## Travel, projects, and goals

Trip workspaces keep typed items for flights, hotels, places, itinerary, bookings, packing, notes, and document links. Items have dates, times, locations, references, URLs, completion state, and notes. The item list can filter by kind and orders dated entries first. Trip expenses are normal Finance transactions linked directly by `tripId` or through a trip-linked Collection. The trip budget totals matching-currency expenses through today, counting each once even if both links exist. Notes can also link to a trip. Files themselves are not copied into the app.

Projects have technology tags, status, manually entered progress, start/target dates, repository/staging/production/documentation URLs, editable milestone checklists, and linked tasks, notes, and bookmarks. Quick Add → Idea creates a project in the idea state.

Goal progress uses either current/target values, completed milestones, or the proportion of linked non-cancelled tasks that are completed. A goal’s status stays under user control; reaching 100% does not silently archive it. Records preserve linked IDs when a parent is deleted. Clear or replace an unavailable parent link when editing a child.

Tasks, events, trips and trip items, projects, goals, notes, activities, important dates, and money collections accept participant links. A person's **Plans together** workspace gathers those records. Linking a person is local context, not an invitation or automatic expense split. Active person links block deletion until removed or reassigned.

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

Reminders and calendar integration use `expo-notifications` and `expo-calendar`, installed with Expo’s SDK-compatible versions and configured in `app.json`. Fitness and JSON backup use the native dependencies documented in their guides. The Finance capture/Collections changes add no dependencies and keep native version/runtime 0.2.3.

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
| `src/repositories/financeRepository.ts` | Atomic payments, receipts, renewals, and collection assignment |
| `src/services/lifeService.ts` | Normalization, relation checks, validation, and module saves/deletes |
| `src/features/library/ModuleScreen.tsx` | Shared searchable module lists and filters |
| `src/features/library/RecordEditorScreen.tsx` | Shared validated editor, conversion, payment, deletion, and link actions |
| `src/features/library/RecordCard.tsx` | Shared summary cards |
| `src/features/library/RelatedWorkspace.tsx` | Trip/project/goal/collection relationships and workspace actions |
| `src/components/forms/RecordFields.tsx` | Text, number, choice, reminder, relationship, participant, and checklist fields |
| `src/components/forms/DateField.tsx` | Reusable calendar date picker |
| `src/features/finance/selectors.ts` | Currency-safe money totals, debt directions, trip spending, and subscription estimates |
| `src/features/finance/QuickExpenseScreen.tsx`, `ExpensesScreen.tsx`, `expenseSelectors.ts` | Fast capture, filters, day groups, selection, and collection assignment |
| `src/features/library/PersonWorkspace.tsx`, `src/components/forms/PeopleField.tsx` | Linked plans and reusable participant selection |
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

Strict TypeScript, all 70 automated tests, and Android/iOS/web JavaScript exports pass. The Finance changes have not been published and visual/device checks remain pending.

Outstanding release work: physical-device QA, upstream dependency audit remediation when compatible fixes exist, and the separately deferred Phase 5 backend/sync implementation.
