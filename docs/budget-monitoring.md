# Budget monitoring

Open **Finance** for Overview, Transactions, Budgets, Bills, Wallets, People, Collections, Debts, Repayments, Expected income, Subscriptions, and Savings. Overview also opens **Quick expense** and **Expenses by date**. Everything is manual and stored locally; there are no bank connections or new dependencies. See [money owed and travel](money-owed-and-travel.md) for lending, borrowing, and shared trip expenses. See [Finance capture and collections](finance-capture-and-collections.md) for quick capture and organizing records later.

## Start tracking

1. In Wallets, add Cash, Bank, GCash, or a savings wallet. Choose its currency and the balance **before the first transaction you will assign to it**. If you start with today's balance, only enter transactions from that point forward; assigning older transactions would count their effect again.
2. Add income or an expense with a positive amount and date. **Quick expense** needs only a name, amount, and date; description and person are optional. **More details** exposes wallet, currency, and category. The selected wallet supplies the currency. Leaving the wallet unassigned includes the entry in monthly totals but excludes it from wallet balances. A person link does not create a debt.
3. Use Transfer to move money between two wallets in the same currency. A single entry deducts from the source and adds to the destination. It never counts as income, expense, or budget spending.
4. Add a monthly budget using the same category as your expenses. Matching ignores case and surrounding spaces. Cards show spent, limit, remaining/over, and progress. The alert switch controls the 80% and 100% warning text inside the app; these are not push notifications.
5. Save future income under Expected income. Reopen it and select **Mark received & add income** when it arrives. Save bills, then reopen and choose **Record payment & expense** when paid. Each action creates one linked transaction dated today. To use another actual date or amount, edit that transaction.

## What the numbers mean

| Number | Calculation |
| --- | --- |
| Wallet balance today | Opening balance + income - expenses - outgoing transfers + incoming transfers - new lending + repayments received + new borrowing - repayments paid, through today; assigned records only |
| Monthly income / expenses | Actual entries in that month and currency through today; includes unassigned entries |
| Net cash flow | Monthly income − monthly expenses |
| Expected income | Outstanding expected-income plans in the selected month; excluded from actual money |
| Unpaid bills | Upcoming/overdue bills due in the selected month; excludes paid/cancelled bills and subscription estimates |
| Net after unpaid bills | Net cash flow − unpaid bills; a monthly planning figure, separate from wallet balances |
| Budget spending | Actual expenses in the budget's month, currency, and category through today |

Future-dated transactions are visible in history but enter actual totals on their recorded date. Today's wallet balances include past months and do not change with the overview's month filter. Budgets can overlap and do not reserve funds. Savings funds remain separate manual goal trackers; use a savings wallet for money included in wallet totals. Negative wallet balances are allowed. Currencies are never combined or converted.

## Find and correct records

Transaction history searches names/descriptions and supports month, type, wallet, and category filters. Clear the month for all dates. A transfer appears under either wallet. **Expenses by date** groups entries by their original day, with name/description search and inclusive date, person, and collection filters. Select records across dates and assign them to a Collection without changing amounts, dates, or wallet balances. Choose **All money activity** to include recorded income, transfers, lending, borrowing, and repayments; unpaid plans remain separate. Trip expense history starts with all dates for that trip, including expenses linked through its collections.

Edit or delete a transaction to recalculate balances, spending, and budgets. Transfer edits/deletion affect both wallets together. Payment and receipt links and their transaction types stay fixed. Paid bills and received plans cannot be reopened; deleting their actual transaction leaves them settled and prevents another payment/receipt action. Deleting a plan keeps the actual transaction. Editing a settled plan does not rewrite the actual transaction.

Opening-balance edits adjust the wallet's total. Wallet deletion or a currency change is blocked while active transactions, debts, repayments, bills, subscriptions, or expected-income plans reference it; reassign or unlink those records first.

## Existing data

Schema 3 adds empty wallets and expected-income collections, blank wallet links on existing transactions/bills/subscriptions, and enabled budget alerts. Existing record IDs, amounts, dates, and settings are preserved. The original schema-1 or schema-2 JSON is backed up before replacement. Unsupported/corrupt data or failed writes never reset the database.

The current schema is 6. Its migration adds collection/person links, transaction names from descriptions, and separate lending/borrowing direction; previous debts remain money lent to others. Participant links start empty. See [Finance capture and collections](finance-capture-and-collections.md) for the update and backup rules.

Existing transactions need a deliberate wallet assignment and an appropriate opening balance. The overview flags unassigned transactions. These records continue to count in monthly income and spending during setup.

## Verification

`npm run check` runs strict TypeScript and 70 tests. `tests/budget.test.ts` covers migration/backup failures, integer-minor-unit money, transfer edits/deletion, invalid/cross-currency wallets, in-use wallet protection, future/deleted entries, atomic receipts and payments, concurrent duplicate actions, renewals, budget thresholds, and combined history filters. `tests/lending.test.ts` covers person balances, repayments, trip spending, and schema-4 migration. `tests/financeOrganization.test.ts` and `tests/expenses.test.ts` cover borrowing, collection assignment/failure recovery, participant references, and date/person/collection filters. Android/iOS/web JavaScript exports pass. No new dependency is used.

Device smoke test: create PHP wallets with opening balances 1,000 and 2,000; add 500 income and 100 expense; transfer 300 between them. Total wallets should remain 3,400 after the transfer, and monthly net should be 400. Edit/delete the transfer and verify both wallets. Set a 100 category budget and test expense amounts 80, 100, and 101. Receive an income plan once, pay a bill once, reload, and verify persistence. Test the forms and alerts on a narrow phone screen in light and dark mode. Browser/native visual smoke testing remains to be done where a connected device/browser is available.
