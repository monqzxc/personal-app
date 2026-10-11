import type { ImperativeRouter } from 'expo-router';

export function closeQuickExpense(navigation: Pick<ImperativeRouter, 'canDismiss' | 'dismiss' | 'replace'>, dismissKeyboard: () => void) {
  dismissKeyboard();
  if (navigation.canDismiss()) navigation.dismiss();
  else navigation.replace('/finance');
}
