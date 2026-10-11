import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { AppHeader, Button, Card, Icon, Label, Screen, layout, type IconName } from './ui';
import { useTheme } from '../../theme/useTheme';

const actions: { title: string; icon: IconName; module?: string; route?: '/task' | '/event' | '/quick-expense'; idea?: string; transactionType?: string; direction?: string }[] = [
  { title: 'Quick expense', icon: 'wallet-outline', route: '/quick-expense' }, { title: 'Task', icon: 'checkbox-outline', route: '/task' },
  { title: 'Income', icon: 'wallet-outline', module: 'transactions', transactionType: 'income' },
  { title: 'Transfer', icon: 'swap-horizontal-outline', module: 'transactions', transactionType: 'transfer' },
  { title: 'Expected income', icon: 'calendar-outline', module: 'expectedIncome' },
  { title: 'Fitness activity', icon: 'walk-outline', module: 'activities' },
  { title: 'Money owed to me', icon: 'people-outline', module: 'debts' },
  { title: 'Money I owe', icon: 'people-outline', module: 'debts', direction: 'borrowed' },
  { title: 'Payment', icon: 'card-outline', module: 'bills' }, { title: 'Event', icon: 'calendar-outline', route: '/event' },
  { title: 'Note', icon: 'document-text-outline', module: 'notes' }, { title: 'Goal', icon: 'flag-outline', module: 'goals' },
  { title: 'Trip', icon: 'airplane-outline', module: 'trips' }, { title: 'Idea', icon: 'bulb-outline', module: 'projects', idea: 'true' },
  { title: 'Quick capture', icon: 'file-tray-outline', module: 'inbox' },
];
export default function QuickAddScreen() {
  const { colors } = useTheme();
  return <Screen><AppHeader title="Get it off your mind." eyebrow="Quick add" />
    {actions.map(item => <Pressable key={item.title} accessibilityRole="button" accessibilityLabel={`Add ${item.title}`} onPress={() => item.route ? router.replace(item.route) : router.replace({ pathname: '/record', params: { module: item.module!, ...(item.transactionType ? { transactionType: item.transactionType } : {}), ...(item.idea ? { idea: item.idea } : {}), ...(item.direction ? { direction: item.direction } : {}) } })}>
      <Card><View style={layout.row}><Icon name={item.icon} color={colors.primary} size={26} /><View style={{ flex: 1 }}><Label bold>{item.title}</Label></View><Icon name="arrow-forward" color={colors.primary} /></View></Card>
    </Pressable>)}<Button title="Close" variant="ghost" onPress={() => router.back()} /></Screen>;
}
