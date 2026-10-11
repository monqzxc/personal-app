import type { ImperativeRouter } from 'expo-router';

// Pops back to the existing Home tab (or replaces with Home when there is no stack below).
export function finishQuickExpense(navigation: Pick<ImperativeRouter, 'dismissTo'>, dismissKeyboard: () => void) {
  dismissKeyboard();
  navigation.dismissTo('/');
}

export function closeQuickExpense(navigation: Pick<ImperativeRouter, 'canDismiss' | 'dismiss' | 'replace'>, dismissKeyboard: () => void) {
  dismissKeyboard();
  if (navigation.canDismiss()) navigation.dismiss();
  else navigation.replace('/finance');
}
