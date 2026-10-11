# Money owed and trip expenses

## People and repayments

Open **Finance > People** (also available in More), add a person, then reopen their page. Choose **They owe me** for money you lend or pay on their behalf, or **I owe them** for money you borrow. Each entry has a name, amount, currency, date, optional due date, notes, optional reminder, and optional trip/collection. A person can have several outstanding or settled entries. Balances stay separate by direction and currency, rather than canceling one another out.

For a new loan, choose the wallet the money leaves or enters. Lending deducts from that wallet; borrowing adds to it. For money already owed before you started tracking, enable **Existing debt** to record the debt without moving the original amount in your wallet. Record the original loan/opening-debt date before any repayments you plan to enter.

Open a debt and choose **Record full or partial repayment**. The amount starts at the remaining balance; lower it for a partial payment. For **They owe me**, choose the receiving wallet: repayment reduces their debt and increases your wallet. For **I owe them**, choose the paying wallet: repayment reduces your debt and decreases your wallet. Lending, borrowing, and repayments have their own history and do not count as ordinary income, expenses, or category budget spending. Do not duplicate them as transactions.

For example: Juan borrows PHP 2,000; you cover another PHP 300 lunch for Juan; Juan repays PHP 500. Juan's page shows **PHP 1,800 under They owe me**. If you also borrow PHP 400 from Juan, **I owe them shows PHP 400** separately. Repayments are assigned to one debt at a time. To repay several debts, record an allocation against each debt.

Overpayment, a repayment before the loan date, future loan/repayment dates, and mismatched currencies are rejected. Amounts use integer minor units for calculations. Full repayment sets the computed status to Settled. Optional reminders reuse device-reminder settings and stop being scheduled once settled; no messages are sent to the other person.

Edits and deletion recalculate wallet and person totals. Deleting a repayment reverses its wallet effect and restores the amount owed. A debt with active repayments cannot be deleted, changed to the other direction, or reduced below the amount already repaid. Remove/reassign repayments first. People and wallets with active linked records cannot be deleted. Reassigning a debt to another person also moves its repayment history to that person.

## Plans and quick expenses with people

A person's **Plans together** workspace shows linked tasks, events, trips and trip items, projects, goals, notes, activities, important dates, and collections. Use the participant picker in those records to include one or more people. These links are local planning context, not invitations or shared accounts.

**Quick expense with this person** records an expense with their name linked. It does not make them owe you money or split a bill. Use a separate debt when money should be repaid. **Expenses by date** can filter by person, search names/descriptions, and group entries by day. Select entries from multiple dates into a Collection such as **Weekend Vacation**. See [Finance capture and collections](finance-capture-and-collections.md) for the complete workflow.

## Travel to Cebu

Create a trip named **Travel to Cebu**, set its currency and personal budget, save, and reopen. The trip workspace appears above the edit form and includes:

- Category shortcuts for **Food, Fare, Stay, Activities, Other**. They prefill the trip, category, and trip currency; categories remain editable.
- Personal spending by category and the amount remaining or over your trip budget.
- **I paid for someone**, which adds a trip-linked money-owed entry.
- Money covered for others and what they still owe you, separate from personal spending.
- **View trip expenses** and **Add trip collection**, plus itinerary, bookings, packing, notes, document links, and walks/runs.

For a PHP 600 lunch split evenly between you and Juan, record **PHP 300 Food expense** for yourself and **PHP 300 They owe me** for Juan using the same wallet and trip. Your wallet decreases by PHP 600, your personal trip budget uses PHP 300, and Juan owes PHP 300. If Juan repays PHP 100, the wallet increases by PHP 100 and the debt falls to PHP 200. Do not also record the full PHP 600 as an expense.

A Collection can gather expenses from different dates and link them to this trip. Trip totals count a record once even if it has both a direct trip link and a matching collection link. A record already linked directly to another trip must have that direct link removed before assigning it to this trip's collection. Grouping keeps original dates, amounts, and wallet balances.

Trip summaries use the trip currency and records through today. Entries in other currencies remain visible in history but are excluded from that currency's totals. Only expenses consume your personal trip budget; money lent for others is shown separately. Money borrowed is excluded from the amount covered for others. A trip cannot be deleted while a money collection references it; clear that collection's trip link first. Deleting a trip otherwise retains its money records.

## Storage and checks

Schema 4 originally added `people`, `debts`, and `repayments`. The current schema 6 adds debt direction, money collections, transaction names/person links, and participant links. Schemas 1 through 5 migrate sequentially, retaining a backup of the original document before replacement. Old debts remain money lent to others, old transaction descriptions supply their new names, and new collection/participant links start empty. Balances derive directly from these records; no duplicate expense/income transaction is created for lending, borrowing, repayment, or collection assignment.

Strict TypeScript, all 70 automated tests, and Android/iOS/web JavaScript exports pass. `tests/lending.test.ts`, `tests/financeOrganization.test.ts`, and `tests/expenses.test.ts` cover both debt directions, repayments, corrections/deletion, currencies, concurrent actions, failed writes, migration backups, person links, collection assignment, date groups/filters, and the Cebu example. These exports are not signed APK/IPA builds. The Finance changes add no native dependencies, keep runtime 0.2.3, and have not been published.

Shared bills require manual shares; automatic splitting and interest calculations are not included. Data remains local; [JSON backup](data-backup.md) supports transfer and recovery without cloud sync. Export before updating because older app code cannot open schema 6.

Manual device smoke test: create Juan and a wallet, record the PHP 2,000/PHP 300/PHP 500 lending example, reload, and verify PHP 1,800 owed. Then borrow PHP 400 and repay PHP 100; verify I owe them is PHP 300 and the wallet increased by PHP 300 for those two entries. Check that the two debt directions remain separate. Try the Cebu lunch example, attach a person to a plan, and group quick expenses from different dates into Weekend Vacation. Verify editing/deletion, overpayment errors, existing-debt mode, category shortcuts, and narrow-screen/light/dark layouts. Browser and device UI testing remain pending.
