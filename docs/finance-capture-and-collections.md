# Quick expenses, people, and collections

MONAPp lets you capture an expense immediately and organize it later. A **Collection** is a named group of existing money records, such as **Weekend Vacation**. It does not create another charge.

## Capture an expense

1. Tap **Quick expense** on Home or Finance. You can also use Quick Add.
2. Enter **Name** and **Amount**. Add a description if useful; the date starts as today and can be changed.
3. Use **Include a person (optional)** to associate someone with the expense. You can create a person from this form.
4. Open **More details** if you want to choose a wallet, currency, or category now.
5. Tap **Save expense**, or **Save & add another** to keep recording expenses.

Example: Name `Lunch`, description `Cafe after the beach`, amount `250`, yesterday's date, and an optional person.

An expense without a wallet still counts in spending totals. Assigning a wallet later makes it affect that wallet's balance. The default currency comes from the selected Finance currency or linked trip when opened from that context, otherwise your settings. Choosing a wallet uses its currency.

A person on an expense is context only. It does not create a debt or divide the amount among people. To record a shared payment accurately, enter your share as an expense and each amount someone owes you as **They owe me**. Do not also record the full bill as an expense.

## Review and collect later

1. Open Finance and tap **Expenses by date**.
2. Search by name or description. Use **Filter by date, person, or collection** to narrow the list; date boundaries are inclusive. **Uncollected** shows records you have not organized yet.
3. Expand a date and select individual records, or tap **Select this date** to select the whole visible group. Select across as many dates as needed.
4. Choose **New collection**, enter `Weekend Vacation`, and optionally link a trip such as `Travel to Cebu`. Or choose **Existing collection**.
5. Tap **Create collection & add selected** or **Add selected to collection**, review the confirmation, and confirm.

Changing the search or filters clears your selection. Collapsing a date does not clear it. Each record belongs to at most one collection; moving it replaces its previous collection link. **Remove selected from collections** leaves the underlying records intact.

The **Expenses only** view shows expenses. **All money activity** also includes recorded income, transfers, lending, borrowing, and repayments. Planned bills and budgets are not money transactions; a paid bill already has its recorded transaction. Totals remain separate by activity type and currency, with no automatic conversion or netting.

Open **Manage collections** or **Finance > Collections** to review, rename, or edit a collection. A new collection created from selected items includes their linked people. Later assignments do not automatically change its participants; edit the collection if needed.

## Connect a collection to travel

Create or edit a collection and choose its optional trip. Its expenses then contribute to that trip's spending in the trip's currency, once per expense. Directly linked trip expenses are also included. Collection organization never changes the original amount, date, wallet movement, or overall spending total.

A record already linked directly to a different trip cannot be assigned to a collection for another trip. Edit or clear that record's direct trip link first. Trip budget totals include activity through today and keep other currencies separate.

Use a trip's **View trip expenses** button to review its records by date. Switch to **All money activity** for loans and repayments. A repayment's own collection can organize it separately from its original loan; when filtering trips, its own collection's trip takes precedence.

## Track people and money in either direction

Open **Finance > People**, add or open a person, and use:

- **They owe me** for money you lent or paid on their behalf.
- **I owe them** for money you borrowed or owe that person.
- **Record full or partial repayment** on a saved debt to reduce its outstanding amount.

Balances are shown separately for each direction and currency. Lending reduces the selected wallet and their repayment increases it. Borrowing increases the selected wallet and your repayment reduces it. An **existing debt** records an opening amount owed without recording the original wallet movement again. Loans and repayments do not count as income or personal spending.

You cannot change who owes a debt while it has repayments. Remove or reassign those repayments first if correcting the direction. Validation also prevents overpayment, invalid repayment dates, and incompatible wallet currencies.

The person's **Plans together** area links to tasks, scheduled events, trips, projects, goals, notes, activities, important dates, trip items, and collections that include them. Add people while creating or editing these records; use the person's shortcuts for a new task, event, trip, project, or note. Their expense shortcuts open money records filtered to that person.

People are local records, not invitations or shared accounts. Adding someone to a plan does not send a message. Remove their active links before deleting the person.

## Updating and JSON backups

Export a JSON backup from Settings before installing this update. The app upgrades database schemas 1-5 to schema **6**, retaining an original migration backup in local storage. Old debts become **They owe me**, existing transaction descriptions supply their initial names, new participant lists start empty, and existing records start without a collection.

JSON exports include collections, participants, debt directions, and the new transaction fields. Supported older backups are migrated when imported. Import remains a replacement of local data, not a merge. Older app code cannot read schema 6; use the exported pre-update backup if you need to return to an older version. See [JSON backups](data-backup.md).

This Finance change adds no native dependencies and keeps app/runtime version **0.2.3**. It has not been published or packaged as a new APK. An existing 0.2.3 installation can receive the JavaScript update when published; an older runtime needs a compatible build. See [app updates](app-updates.md) and [phone installation](fitness-and-installation.md).

## Verification and a phone smoke test

Automated verification passed: TypeScript, all **70 tests**, and Expo bundle exports for Android, iOS, and web. Tests cover lending and borrowing balances, atomic collection assignments, preservation of dates and totals, filtering and grouping, participant validation, old-data migration, and backups. These exports are JavaScript/assets bundles, not signed installation packages. Touch interactions and on-device behavior still need testing.

On a test device:

1. Create a person and attach them to a task, event, and trip. Open the person's page and check those links.
2. Add expenses on two different dates, with descriptions and optional people. Restart the app and check they remain saved.
3. Search and filter them, select across both dates, and create `Weekend Vacation`. Check their dates and overall expense totals are unchanged.
4. Link the collection to a trip. Confirm its expenses appear in trip spending once. Move or uncollect a record and verify it still exists.
5. Record both a loan and borrowing with the same person, then a partial repayment of each. Check the separate outstanding balances and opposite wallet movements.
6. Export JSON and preview that backup before restoring on a test device. Check collection and people links survive the restore.

## Quick Expense save return

Quick Add and Quick Expense now use full-screen stack pages. **Save expense** closes the keyboard and returns to Home, where the **Expense saved.** toast appears, wherever the form was opened from. **Cancel** returns to the page that opened the expense; if there is no previous stack page, it opens Finance. Save & add another stays in the form. This removes the native modal replacement/dismissal path associated with the reported black screen after a saved expense. It does not change stored expenses.

Phone verification is still required: open Quick Expense from Home, Quick Add, Finance, a collection, and a person; save with the keyboard open, confirm Home appears with the toast, and verify the expense exists exactly once. Also test Save & add another and Cancel. The reported native screen failure has not been reproduced on a connected device.

## Success feedback and blank tab workaround

Successful saves, edits, deletes, task toggles, finance actions, imports, preferences, and fitness actions now show a dismissible toast for five seconds. Toasts follow the active screen across navigation, including native editor modals. Repeated saves restart the timer; rejected or failed shared actions do not show success. Quick Expense uses the same toast for both save buttons.

The installed Expo Router still derives tab detachment from its fade animation, matching [Expo issue #49681](https://github.com/expo/expo/issues/49681). Tab page fades are disabled as a workaround for blank tab content when returning from an editor. The animated tab bar and the caller-preserving Quick Expense return behavior remain in place. This is a likely cause of the reported black screen, not a confirmed on-device diagnosis.

Verification: TypeScript and all 108 automated tests pass, including success/failure feedback and repeated-toast timing. No connected phone or preview browser was available for interaction testing. Recheck Save expense from Home, Quick Add, Finance, collections, and people, plus Save & add another, updates, and deletes on the installed app. No update has been published.
