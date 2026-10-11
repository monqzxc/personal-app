# MONAPp mobile dashboard

**Current build: 0.2.4.** Profile photos add native photo selection and resizing, so rebuild once before using this source. Do not send the new code to a 0.2.3 installation through an OTA update. See [profile photos and the Quick Expense fix](profile-photo.md) for the current rebuild and phone checks.

Home now brings daily plans, money, and movement together in purple cards. It uses the existing MONAP artwork and respects your light/dark theme. The current app is 0.2.4 with database schema 6. Profile photos use native photo selection and resizing; choose one in Settings and save preferences to show it on Home.

## Using Home

- Tap your initial to open Settings, or the search icon to search your records.
- **Daily Inspiration** shows a quote and its author. **Save quote** saves a favorite Note in the Inspiration category; **Share** opens the phone share sheet. Saved quotes retain attribution and are included in ordinary JSON backups. Saving the same unchanged quote again does not create another note.
- **Add expense**, **Add task**, **Schedule**, and **Start walk** provide quick capture. An unfinished workout changes the walking shortcut to **View workout**. Starting a walk opens Fitness with walk selected; you still choose the tracking mode and tap Start there.
- **Your week** shows Sunday through Saturday. Dots mark active task deadlines or events. Swipe the date row on narrow screens, use the arrows for other weeks, or tap **Today** to return. Task and event creation uses the selected date. Opening Calendar or the full task list preserves that date; subsequent changes to their filters are kept when returning from an editor.
- **Your day** shows pending tasks, scheduled events, and tasks completed on the selected date. The next timed appointment appears first, including one currently underway, with time, location, and linked people. Up to three active tasks are ordered by priority, then time. Overdue tasks have a separate section based on today.
- **Money today** shows expenses in your preferred currency and up to two current-month category budgets, prioritizing the highest percentage used. **Hide amounts** hides monetary values and budget progress throughout the lower Home cards, including payments and the trip card. This is a temporary display toggle and resets when Home remounts; it is not an app-wide privacy setting.
- **Coming due** lists overdue payments first, followed by items due through seven days from today: unpaid bills, active subscription renewals, and remaining amounts you owe with due dates. Each item keeps its own currency. No combined total or projected recurring cycles are added.
- **This week's movement** shows completed walks/runs, kilometers, and active minutes from the existing fitness records. A paused or recording workout gets a return shortcut. Walk/run buttons preselect the activity in Fitness without starting GPS or requesting permissions on Home.
- **Organize later** opens uncollected expenses, ready to select into a Collection. **Next getaway** appears for an ongoing or upcoming trip and shows departure timing and spending in that trip's currency.

The date strip changes the plans section and task/event shortcuts. Quotes, money, payment deadlines, and weekly fitness remain anchored to the current day. Projects, goals, notes, and inbox remain available through More rather than taking up separate Home sections.

## Quotes and offline behavior

Native builds request `https://zenquotes.io/api/today` without sending any app records. Free-use attribution links to [ZenQuotes](https://zenquotes.io); its [API documentation](https://docs.zenquotes.io/zenquotes-documentation/) explains caching and attribution requirements.

The service shares concurrent requests, allows one attempt per local date, times out after five seconds, and validates quote/author fields. Its optional cache uses `monapp.dailyQuote`, separate from the saved-data database. If offline, rate-limited, or the response is unusable, Home keeps the last downloaded quote or shows an original MONAPp thought. It tries again on the next local date. Cache failures do not block Home. The provider's daily quote changes on its own server schedule, so the same quote can span two local dates.

Web shows the bundled or cached thought without directly fetching ZenQuotes because its free endpoint restricts browser access. The quote cache is not included in JSON backups; quotes saved to Notes are included.

## Liquid navigation

The five tabs use a floating purple bar with a raised active circle. The curved notch follows the circle, which stretches during movement and springs back to its rounded shape. Screens fade over 160 milliseconds. Quick Add stays above the bar, and both hide while the keyboard is open.

The bar reserves space for the bottom safe area and larger text, keeps accessible tab labels and selection states, and uses a compact layout in very narrow windows. Turning on the phone's Reduce Motion setting snaps to the selected tab and disables the screen fade; changes to that setting also apply while the app is open. The animation uses the already-installed Reanimated library, with no new native dependencies.

## Validation and phone checks

TypeScript and all **97 automated tests** pass, including quote caching, request failures/timeouts, attribution, date boundaries, appointment selection, pending payments, money precision, trip summaries, and navigation geometry at narrow and wide sizes. Expo JavaScript/assets exports for Android, iOS, and web also passed; these are not signed installation packages. No update has been published and no signed APK/IPA was generated for this change.

No browser or phone UI was available for visual testing here. On your phone, check:

1. Light and dark themes, a narrow screen, and larger text. All dates and buttons should remain reachable.
2. Pick another day, create a task/event, and verify its initial date. Open the full task list/Calendar, change its filter/date, edit an item, then return; your changed selection should remain.
3. Open Home online and verify the quote, author, and source link. Save it twice and confirm one Note; test Share. Reopen offline to verify fallback behavior.
4. Compare today's expenses, category budget progress, and due payments with Finance. Hide amounts and check payment/trip cards too.
5. Open Start run and confirm run is selected. Pause a workout, return Home, and use its shortcut to resume in Fitness.
6. Open Organize later and confirm it shows uncollected expenses. Assign a collection and check the Home count decreases.
7. Switch Home to More, then rapidly tap other tabs. The bubble and notch should stay aligned and settle at the final selection. Check both end tabs, screen rotation, larger text, and Quick Add.
8. Open the keyboard and confirm the bar and Quick Add hide, then return when the keyboard closes. Check the bottom spacing with iPhone safe areas or Android navigation buttons. Toggle Reduce Motion while the app is open and verify the selection snaps without animation.

For installation or publishing a later compatible update to an existing 0.2.4 build, use [phone installation](fitness-and-installation.md) or [app updates](app-updates.md). Profile photo support requires the 0.2.4 native build first. Export a JSON backup before updating.
