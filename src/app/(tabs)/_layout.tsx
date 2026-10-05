import { Pressable, View } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { Icon, type IconName } from '../../components/common/ui';

const tabs: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'grid-outline' },
  { name: 'tasks', title: 'Tasks', icon: 'checkbox-outline' },
  { name: 'calendar', title: 'Calendar', icon: 'calendar-outline' },
  { name: 'finance', title: 'Finance', icon: 'wallet-outline' },
  { name: 'more', title: 'More', icon: 'ellipsis-horizontal' },
];
export default function TabsLayout() {
  const { colors, spacing, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted,
      tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 64 + insets.bottom, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 8) },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' } }}>
      {tabs.map(tab => <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title, tabBarIcon: ({ color, size }) => <Icon name={tab.icon} color={color} size={size} /> }} />)}
    </Tabs>
    <Pressable accessibilityRole="button" accessibilityLabel="Quick add" onPress={() => router.push('/quick-add')} style={({ pressed }) => [{ position: 'absolute', right: spacing.xl, bottom: 82 + insets.bottom, width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }, shadows.card]}><Icon name="add" color={colors.onPrimary} size={30} /></Pressable>
  </View>;
}
