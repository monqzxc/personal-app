import { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppState } from 'react-native';
import { useAppStore } from '../stores/useAppStore';
import { useTheme } from '../theme/useTheme';
import { Button, EmptyState, Screen } from '../components/common/ui';
import OnboardingScreen from '../features/onboarding/OnboardingScreen';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  const initialize = useAppStore(state => state.initialize);
  const loaded = useAppStore(state => state.loaded);
  const loading = useAppStore(state => state.loading);
  const error = useAppStore(state => state.loadError);
  const clearError = useAppStore(state => state.clearError);
  const onboardingRequired = useAppStore(state => state.onboardingRequired);
  const completeOnboarding = useAppStore(state => state.completeOnboarding);
  const saving = useAppStore(state => state.saving);
  const actionError = useAppStore(state => state.actionError);
  const { colors, mode } = useTheme();
  useEffect(() => { void initialize(); }, [initialize]);
  useEffect(() => { const subscription = AppState.addEventListener('change', state => { if (state === 'active') void initialize(); }); return () => subscription.remove(); }, [initialize]);
  return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider><StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    {!loaded ? <Screen>{error ? <EmptyState icon="cloud-offline-outline" title="We couldn’t open your data" description={error} action={<Button title="Try again" busy={loading} onPress={() => void initialize()} />} /> : <EmptyState title="A moment for you" description="Opening your personal space…" action={<ActivityIndicator color={colors.primary} />} />}</Screen> :
      onboardingRequired ? <OnboardingScreen onFinish={() => { void completeOnboarding(); }} busy={saving || loading} error={actionError} /> :
      <Stack screenListeners={{ focus: clearError }} screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, headerShadowVisible: false, contentStyle: { backgroundColor: colors.background }, headerBackTitle: 'Back' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="quick-add" options={{ title: 'Quick add' }} />
        <Stack.Screen name="quick-expense" options={{ title: 'Quick expense' }} />
        <Stack.Screen name="expenses" options={{ title: 'Expenses' }} />
        <Stack.Screen name="task" options={{ title: 'Task', presentation: 'modal' }} />
        <Stack.Screen name="event" options={{ title: 'Event', presentation: 'modal' }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="app-updates" options={{ title: 'App updates' }} />
        <Stack.Screen name="data-backup" options={{ title: 'Data backup' }} />
        <Stack.Screen name="module" options={{ title: 'Your space' }} />
        <Stack.Screen name="record" options={{ title: 'Record' }} />
        <Stack.Screen name="search" options={{ title: 'Search' }} />
        <Stack.Screen name="analytics" options={{ title: 'Analytics' }} />
        <Stack.Screen name="calendar-integration" options={{ title: 'Device calendars' }} />
      </Stack>}
  </SafeAreaProvider></GestureHandlerRootView>;
}
