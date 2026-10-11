import { useEffect, useState } from 'react';
import { AccessibilityInfo, Keyboard, Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '../../theme/useTheme';
import { Icon, type IconName } from '../../components/common/ui';
import { LiquidTabBar } from '../../components/navigation/LiquidTabBar';
import { liquidBarHeight } from '../../components/navigation/liquidTabGeometry';

const tabs: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home-outline' },
  { name: 'tasks', title: 'Tasks', icon: 'checkbox-outline' },
  { name: 'calendar', title: 'Calendar', icon: 'calendar-outline' },
  { name: 'finance', title: 'Finance', icon: 'wallet-outline' },
  { name: 'more', title: 'More', icon: 'ellipsis-horizontal' },
];
export default function TabsLayout() {
  const { colors, spacing, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const systemReducedMotion = useReducedMotion();
  const [reducedMotion, setReducedMotion] = useState(systemReducedMotion);
  const [keyboardVisible, setKeyboardVisible] = useState(() => Keyboard.isVisible());
  useEffect(() => {
    let mounted = true;
    let preferenceChanged = false;
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { preferenceChanged = true; setReducedMotion(value); });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted && !preferenceChanged) setReducedMotion(value); }).catch(() => {});
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => { mounted = false; motion.remove(); show.remove(); hide.remove(); };
  }, []);
  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    {/* shortcut: disable page fades until Expo fixes detached blank tabs (expo/expo#49681). */}
    <Tabs tabBar={props => <LiquidTabBar {...props} keyboardVisible={keyboardVisible} reducedMotion={reducedMotion} />}
      screenOptions={{ headerShown: false, animation: 'none' }}>
      {tabs.map(tab => <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title, tabBarIcon: ({ color, size }) => <Icon name={tab.icon} color={color} size={size} /> }} />)}
    </Tabs>
    {!keyboardVisible && <Pressable accessibilityRole="button" accessibilityLabel="Quick add" onPress={() => router.push('/quick-add')} style={({ pressed }) => [{ position: 'absolute', right: spacing.xl + insets.right, bottom: liquidBarHeight(insets.bottom, fontScale) + 12, width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }, shadows.card]}><Icon name="add" color={colors.onPrimary} size={30} /></Pressable>}
  </View>;
}
