# Architecture and foundation file guide

Current version: 0.2.4, schema 6. This guide covers the shared foundation; [expanded modules](expanded-modules.md) documents the remaining local features, all additional files, and device-integration limits.

## 1. Recommended setup

Expo SDK 57, React Native 0.86.3, React 19.2.3, Expo Router 57, and TypeScript 6 in strict mode. Versions were taken from Expo’s official `expo-template-default@57.0.28` dependency manifest and checked with Expo’s installer. This repository was assembled incrementally without copying the template’s demo screens.

For a separate project, Expo’s official starting point is `npx create-expo-app@latest`; then install native dependencies using `npx expo install` so they match the selected SDK. Do not run the generator over this completed scaffold.

References: [Expo setup](https://docs.expo.dev/get-started/create-a-project/), [src directory](https://docs.expo.dev/router/reference/src-directory/), [SDK 57 Router](https://docs.expo.dev/versions/v57.0.0/sdk/router/), [JavaScript tabs](https://docs.expo.dev/router/advanced/tabs/).

## 2. Dependencies and why they exist

| Dependency | Purpose |
| --- | --- |
| `expo`, `react`, `react-native` | Mobile runtime and native UI |
| `expo-router`, `expo-linking`, `expo-constants` | File routes, links, Expo runtime metadata |
| `react-native-safe-area-context`, `react-native-screens` | Safe areas and native navigation screens |
| `react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets` | SDK-matched navigation dependencies; Reanimated drives the liquid tab bar on the UI thread |
| `expo-status-bar`, `expo-system-ui` | Status bar and native automatic appearance support |
| `@react-native-async-storage/async-storage` | Local JSON persistence behind the database adapter |
| `expo-crypto` | Secure random UUID generation on supported platforms |
| `zustand` | Shared loaded records, loading/error state, and settings |
| `@expo/vector-icons`, `expo-font` | Consistent bundled icons and font loading |
| `react-dom`, `react-native-web` | Browser preview of the same React Native UI |
| `typescript`, `@types/react`, `@types/node` | Strict checking and types for the built-in Node test runner |
| `expo-location`, `expo-task-manager`, `react-native-maps` | Foreground/background GPS and native route maps |
| `expo-dev-client` | Development builds with the native tracking configuration |
| `expo-notifications`, `expo-calendar` | Optional local reminders and device-calendar access behind services |

No UI framework, date library, backend client, TanStack Query, Laravel, or cloud database is included. Add remote query management when actual remote APIs arrive.

## 3. Folder structure

```text
src/
  app/                    Expo Router routes and layouts
    (tabs)/               Home, Tasks, Calendar, Finance, More
  components/common/      Shared visual primitives and dialogs
  features/
    home/screens/
    tasks/{screens,components}/
    calendar/{screens,components}/
    fitness/              GPS tracking, route display, manual logs, and history
    finance/              Overview, money totals, and finance sections
    library/              Shared module forms, lists, and workspaces
    goals/                Goal-progress calculations
    search/               Global search screen
    analytics/            Personal analytics
    settings/             Settings and More
  hooks/                  Date rollover hook
  repositories/           Contracts and local implementations
  services/               Composition, validation, calendar logic, metadata
  storage/                Versioned JSON database and migrations
  stores/                 Zustand orchestration
  theme/                  Central tokens and theme selection
  types/                  JSON-friendly domain contracts
  utils/                  Local calendar-date helpers
tests/                    Runtime checks with in-memory storage
docs/                     Architecture explanation
```

The common module forms serve Finance, Travel, Projects, Goals, Notes, Bookmarks, Accounts, Subscriptions, Inbox, and important dates. Specialized logic lives in its feature or service. Empty per-module folders and duplicate CRUD screens are not generated.

## 4. Models

`Entity` contains a UUID `id`, ISO `createdAt`/`updatedAt`, nullable `deletedAt`, integer `version`, `syncStatus`, and optional `lastSyncedAt`/`serverUpdatedAt`. Local edits increment `version`; sync states remain `local` until an actual sync implementation exists.

`Task` contains the requested task fields, `Subtask[]`, optional goal/project IDs, participant `peopleIds`, typed priority/status, recurrence rules, a reminder instant, and optional `nextOccurrenceId`. Completing a recurring task atomically creates one next occurrence.

`CalendarEvent` contains date/time boundaries, all-day flag, title/description/category/location, reminder metadata, optional paired related-entity type/ID, and an optional provider-occurrence key for imports, and participant `peopleIds`. `Settings` contains first name, theme preference, default currency, and notification opt-in. `Database` is the schema-6 envelope for tasks, events, settings, and the collections in `types/life.ts`.

UUIDs come from Expo Crypto. Calendar dates are `YYYY-MM-DD`, times are `HH:mm`, and audit timestamps use `toISOString()`. Runtime validators reject impossible dates, invalid ranges, blank titles, bad enums/IDs, duplicate IDs, and malformed stored records.

## 5. Local storage and migrations

`LocalDatabase` takes a small `KeyValueStorage` interface. Production injects AsyncStorage; tests inject a Map-backed adapter. It serializes **both reads and writes**, so overlapping updates across collections cannot overwrite one another within the app process.

Every write reads the latest document, applies the change, validates the complete result, awaits persistence, and only then returns success. Zustand updates its visible records after successful writes. Failed writes preserve the previous data and do not block later queue operations.

The envelope uses `schemaVersion: 6` with a collection for every implemented module. Missing storage means a new empty database. Missing/unknown schema versions, malformed JSON, or invalid records produce an error; they never trigger automatic reset. `migrateV1ToV2`, `migrateV2ToV3`, `migrateV3ToV4`, `migrateV4ToV5`, and `migrateV5ToV6` are implemented and tested. Schema 6 adds money collections, named transactions with optional person links, lending/borrowing direction, and participant links; see [Finance capture and collections](finance-capture-and-collections.md). Old debts default to `lent`, and the original transaction description supplies its new name. Schema 5 adds fitness activities; see [fitness and installation](fitness-and-installation.md). Schema 4 adds people, debts, and repayments; see [money owed and travel](money-owed-and-travel.md). Wallets and expected income are covered in [budget monitoring](budget-monitoring.md). An original-version backup is persisted before a migrated document replaces the original. Future migrations must remain sequential and validated.

The whole document is rewritten per mutation. This is suitable for a small personal dataset; switch the storage adapter to SQLite if volume warrants it. The queue is process-local: the web preview is intended for one active browser tab, not concurrent editing across tabs. Local persistence is not encryption. Settings exposes JSON file backup/import; keep exported copies outside the app. See [JSON backup](data-backup.md) for storage limits.

## 6. Repository contracts and future Laravel

`Repository<T>` defines asynchronous `getAll`, `getById`, `create`, `update`, and `delete`. `TaskRepository` and `CalendarRepository` specialize it. `update` excludes identity and synchronization metadata from caller patches. `delete` retains tombstones while normal reads hide them. `SettingsRepository` defines `get` and `update`.

The composition root is the only place that chooses concrete adapters:

```ts
const taskRepository: TaskRepository = new LocalTaskRepository(database);
// Phase 5: const taskRepository: TaskRepository = new ApiTaskRepository(client);
export const taskService = new TaskService(taskRepository, randomUUID);
```

An API adapter will map Laravel JSON responses and error shapes to these contracts. Keep UUIDs, snake_case/camelCase mapping, dates, deletion behavior, and server-managed versions consistent. Add authentication, queue/retry/conflict policy, and TanStack Query only with the remote implementation. The local write queue is not a synchronization engine.

`CalendarService` manages local events and imports. `CalendarProvider` isolates native device access. `buildAgenda` projects active task deadlines, unpaid bills, trips, renewals, and important dates without persisting duplicate calendar events. `NotificationService` centralizes optional native reminder scheduling and permissions.

## 7. Theme and reusable UI

`tokens.ts` owns light/dark semantic palettes, spacing, radius, typography, and shadows. `useTheme` resolves persisted light/dark/system preference. Screens reference semantic tokens rather than repeating color values.

Shared UI includes Screen, AppHeader, Card, SectionHeader, Label, Button, IconButton, Chips, Field, EmptyState, Badge, Icon, and ConfirmationModal. Controls have accessibility labels/roles, sufficient primary touch areas, keyboard-aware forms, and visible error messages. No fake currency statistics or inactive action buttons are presented as working features.

## 8. Navigation

```text
Root Stack
  (tabs)
    index       Home
    tasks       Task views
    calendar    Calendar and agenda
    finance     Overview, transactions, people, collections, debts, repayments, wallets, budgets, and plans
    more        Local modules, search, analytics, and Settings
  quick-add     Modal: Quick expense/Task/Income/Transfer/Debt/Payment/Event/Note/Goal/Trip/Idea/Capture
  quick-expense Modal: fast expense entry
  expenses      Day groups, search/filters, selection, and collection assignment
  task          Modal: create or edit (?id=UUID)
  event         Modal: create or edit (?id=UUID or ?date=YYYY-MM-DD)
  settings      Preferences
  module        Shared module list (?module=...)
  record        Shared record editor (?module=...&id=UUID)
  search        Global search
  analytics     Personal summaries
  calendar-integration  Explicit device-calendar import
  +not-found    Invalid-route recovery
```

The floating add button lives in the tab layout. Quick Add replaces itself with the selected editor, so saving returns to the originating tab. Route files only export their feature screens. SDK 57 JavaScript tabs come from `expo-router/js-tabs`.

## 9. Home and 10. Task module

Home derives today’s active tasks, overdue tasks, today’s events, and tasks completed today. `LifeDashboardCards` adds payments, upcoming travel, active goals/projects, recent notes, and Quick Capture. Widgets show only real saved records, with short previews and links to full modules.

Tasks are split into service, selectors, list screen, editor screen, and reusable TaskCard. The service validates/normalizes saves and manages completion metadata. Selectors implement date-based views, text/tag search, category filtering, and sort order. The editor handles only draft form state; persistence remains outside the component. Subtasks have independent UUIDs and completion states.

## Source-file responsibilities

| File(s) | Responsibility |
| --- | --- |
| `package.json`, `package-lock.json` | Scripts, direct dependencies, reproducible dependency graph |
| `app.config.js`, `eas.json` | Optional Android map key and native build profiles |
| `app.json` | Expo app identity, appearance, Router/font plugins, web output |
| `tsconfig.json` | Strict TypeScript, indexed-access checking, source alias |
| `.gitignore` | Excludes generated bundles, caches, dependencies, local secrets, native generated projects |
| `README.md`, `docs/architecture.md` | Running, scope, limitations, architecture, file guide |
| `src/types/models.ts` | Shared entity, task, event, settings, and database contracts |
| `src/utils/dates.ts` | Device-local date parsing/formatting and calendar grids |
| `src/services/validation.ts` | Runtime validation of all records and the schema-6 document |
| `src/services/entity.ts` | New record metadata |
| `src/storage/migrations.ts` | Empty schema-6 database and tested sequential v1 through v6 migrations |
| `src/storage/localDatabase.ts` | Storage interface, document persistence, serialization, migration backups |
| `src/repositories/contracts.ts` | Storage-independent repository interfaces |
| `src/repositories/localRepository.ts` | Shared CRUD, immutable identity, versions, tombstones |
| `src/repositories/taskRepository.ts` | Typed local task adapter |
| `src/repositories/calendarRepository.ts` | Typed local event adapter |
| `src/repositories/settingsRepository.ts` | Local preferences adapter |
| `src/services/container.ts` | Production dependency wiring and UUID provider |
| `src/services/calendarService.ts` | Event saves/deletes and derived agenda |
| `src/stores/useAppStore.ts` | Initialization, mutations, shared records, settings, loading/errors |
| `src/theme/tokens.ts`, `src/theme/useTheme.ts` | Design tokens and theme selection |
| `src/hooks/useToday.ts` | Date rollover while open and refresh on foregrounding |
| `src/components/common/ui.tsx` | Reusable controls and layout primitives |
| `src/components/common/ConfirmationModal.tsx` | Reusable deletion confirmation |
| `src/components/common/QuickAddScreen.tsx` | Global add menu for implemented features |
| `src/features/home/screens/HomeScreen.tsx` | Real-data dashboard widgets |
| `src/features/tasks/taskService.ts` | Task normalization, validation, completion lifecycle |
| `src/features/tasks/selectors.ts` | Task views, search, category filtering, sorting |
| `src/features/tasks/components/TaskCard.tsx` | Accessible task summary, completion, edit link |
| `src/features/tasks/screens/TasksScreen.tsx` | Task list, filters, search, empty states |
| `src/features/tasks/screens/TaskEditorScreen.tsx` | Task form, subtasks, delete flow |
| `src/features/calendar/components/AgendaCard.tsx` | Calendar event/deadline summary and source link |
| `src/features/calendar/screens/CalendarScreen.tsx` | Month navigation, day selection, agenda |
| `src/features/calendar/screens/EventEditorScreen.tsx` | Local event form and delete flow |
| `src/features/finance/FinanceScreen.tsx` | Finance overview, section navigation, spending and budgets |
| `src/features/settings/MoreScreen.tsx` | Module, search, analytics, and settings navigation |
| `src/features/settings/SettingsScreen.tsx` | Persisted personal preferences |
| `src/app/_layout.tsx` | Data-loading gate, root navigation, status bar, error recovery |
| `src/app/(tabs)/_layout.tsx` | Five tabs and floating Quick Add |
| `src/app/(tabs)/index.tsx`, `tasks.tsx`, `calendar.tsx`, `finance.tsx`, `more.tsx` | Thin entry routes for tab screens |
| `src/app/task.tsx`, `event.tsx`, `quick-add.tsx`, `settings.tsx` | Thin editor/preferences routes |
| `src/app/+not-found.tsx` | Route-not-found recovery |
| `tests/core.test.ts` | Persistence, recovery, validation, task/calendar behavior checks |

`expo-env.d.ts`, `.expo/`, `dist/`, and `node_modules/` are generated, not hand-maintained source.

## App updates

`features/settings/AppUpdatesScreen.tsx` uses the installed Expo Updates hook for check/download/pending state; `appUpdates.ts` provides result messages and the restart guard tested in `tests/appUpdates.test.ts`. `app/app-updates.tsx` exposes it from Settings. Native version 0.2.2 disables automatic downloads so users choose when to download. See [app updates](app-updates.md).

## JSON backup and restore

`services/backupService.ts` creates the versioned backup envelope, validates imports with existing migrations/record validation, and prepares record-count previews. `services/backupFiles.native.ts` uses Expo FileSystem and Sharing; its web counterpart uses a file input and download. `features/settings/DataBackupScreen.tsx` and `app/data-backup.tsx` expose export, preview, confirmation, and previous-data recovery. `useAppStore.restoreBackup` refreshes all records and reconciles notifications after a restore.

`LocalDatabase.replace` uses the existing serialized queue, revalidates data/size/workout state, rejects stale previews, stores the current document under `daywell.database.beforeImport`, then replaces the database. Both current and incoming datasets must fit the restoration size limit so the recovery copy is usable. Only the latest recovery copy is kept; see [data backup](data-backup.md) and `tests/backup.test.ts`. Backups now include schema 6 and its collections/participant links. Native version/runtime is now 0.2.4 for profile photo support.


## Finance capture, collections, and people

`QuickExpenseScreen.tsx` saves normal transactions through the existing store/service path. `ExpensesScreen.tsx` uses `expenseSelectors.ts` for searchable money activity, day groups, per-kind/per-currency totals, and cross-date selection. `FinanceRepository.assignMoneyRecords` creates an optional collection and assigns selected transactions/debts/repayments in one validated write. It changes links only, preserving dates, amounts, and wallet balances. Direct trip links cannot conflict with a collection's trip. Trip spending counts an expense once whether linked directly, through its collection, or both.

`PeopleField.tsx` provides the shared participant picker. `PersonWorkspace.tsx` gathers linked tasks, events, and module records alongside `LendingWorkspace.tsx`, which separates lending from borrowing. Person-linked expenses are context only; they do not create debts. Validation protects active person/collection references from deletion. A debt's direction cannot change while it has repayments, including during concurrent writes.

`tests/financeOrganization.test.ts` checks schema-6 migration/backups, both debt directions, participant references, atomic assignment, and failure recovery. `tests/expenses.test.ts` checks amount parsing, filters, date grouping, collection/trip matching, separate currency totals, and selection. Strict TypeScript, all 97 tests, and Android/iOS/web JavaScript exports pass. Visual and physical-device testing remain pending; these exports do not produce a signed installation. No Finance update has been published. See the [workflow guide](finance-capture-and-collections.md).

## Mobile Home dashboard

`features/home/screens/HomeScreen.tsx` composes the greeting, `DailyQuoteCard`, `WeekStrip`, daily plan, and `LifeDashboardCards`. Pure `dayPlan.ts` and `dashboardSelectors.ts` derive date, money, due-payment, and travel summaries; they do not write records. Task and Calendar screens consume incoming dashboard date filters, while Fitness accepts an initial activity kind. `quotes.ts` validates and caches the optional daily ZenQuotes response separately from the database; saving a quote uses the existing Notes service. See [mobile dashboard](mobile-dashboard.md) and the quote, home-plan, and dashboard tests. Schema 6 is unchanged; profile photos now require native runtime 0.2.4.

## Liquid tab navigation

`src/components/navigation/LiquidTabBar.tsx` renders the native-view notch, moving circle, accessible tab buttons, and spring deformation using the installed Reanimated library. `liquidTabGeometry.ts` shares the measured layout and safe-area height with the tab layout and Quick Add; its geometry is covered by `tests/liquidTabBar.test.ts`. The tabs layout handles keyboard visibility, live reduced-motion preferences, and screen fades. Native box shadows avoid Android elevation changing the stacking order of the notch, circle, and icons. No data, dependency, or runtime changes are required.

## Profile photo and Quick Expense return

`services/profilePhoto.ts` uses the SDK-matched photo picker and image manipulator to create a 256-pixel JPEG; `utils/profilePhoto.ts` validates bounded local data URIs and supplies square crop geometry. Optional `Settings.profilePhoto` is saved through the existing settings repository and included in JSON backups without a schema migration. The repository prevents adding a photo that would exceed the existing database restore limit. `ProfileAvatar` shares the photo/initial display between Settings and Home.

Quick Add and Quick Expense use regular stack pages, with a tabs anchor and keyboard dismissal before saving. `quickExpenseNavigation.ts` returns to an existing caller or replaces the page with Finance if there is no dismissible stack. Regression tests cover return targets, photo storage/backup round trips, invalid images, failed writes, and image sizing. Native phone confirmation remains required; see [profile photos and Quick Expense](profile-photo.md).

## First-launch onboarding

`features/onboarding/OnboardingScreen.tsx` renders the four-page native ScrollView tour with reduced-motion support and a Settings replay route at `app/welcome.tsx`. The root layout gates its navigator while `onboardingRequired` is true, without calling the router before a navigator exists. `OnboardingService` stores pending/complete in the separate `monapp.onboarding` key before database startup; an existing database bypasses the tour. `completeOnboarding` persists completion before clearing the gate and surfaces failures through the existing error state. `tests/onboarding.test.ts` covers fresh/returning installs, interrupted tours, existing/corrupt databases, and storage failures. See [welcome tour](welcome-tour.md).
