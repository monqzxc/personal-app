import { useEffect, type ComponentProps, type PropsWithChildren } from 'react';
import { useIsFocused } from 'expo-router';
import { AccessibilityInfo, ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ColorValue, type TextInputProps, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/useTheme';
import { radius, spacing, typography } from '../../theme/tokens';
import { useAppStore } from '../../stores/useAppStore';
import { useToastStore } from '../../stores/useToastStore';

export type IconName = ComponentProps<typeof Ionicons>['name'];
export function Icon({ name, color, size = 22 }: { name: IconName; color?: ColorValue; size?: number }) {
  const { colors } = useTheme();
  return <Ionicons name={name} color={color ?? colors.text} size={size} />;
}
export function Label({ children, muted = false, size = typography.body, bold = false, color, style }: PropsWithChildren<{
  muted?: boolean; size?: number; bold?: boolean; color?: string; style?: ComponentProps<typeof Text>['style'];
}>) {
  const { colors } = useTheme();
  return <Text style={[{ color: color ?? (muted ? colors.muted : colors.text), fontSize: size, lineHeight: size * 1.45, fontWeight: bold ? '600' : '400' }, style]}>{children}</Text>;
}
export function Screen({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  const toast = useToastStore(state => state.toast);
  const error = useAppStore(state => state.actionError);
  const clearError = useAppStore(state => state.clearError);
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {error && <View accessibilityRole="alert" style={{ padding: spacing.lg, backgroundColor: colors.dangerSoft }}><Label color={colors.danger}>{error}</Label><Button title="Dismiss" onPress={clearError} variant="ghost" /></View>}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.screen}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
    {toast && <SuccessToast toast={toast} />}
  </SafeAreaView>;
}
function SuccessToast({ toast }: { toast: { message: string } }) {
  const focused = useIsFocused();
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const clearToast = useToastStore(state => state.clearToast);
  useEffect(() => {
    if (focused && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(toast.message);
  }, [focused, toast]);
  if (!focused) return null;
  return <View style={[shadows.card, { position: 'absolute', top: insets.top + spacing.sm, left: spacing.lg, right: spacing.lg, zIndex: 10, elevation: 10, borderRadius: radius.md, backgroundColor: colors.primary, paddingLeft: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }]}>
    <Icon name="checkmark-circle-outline" color={colors.onPrimary} />
    <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ flex: 1, paddingVertical: spacing.md, color: colors.onPrimary, fontSize: typography.body }}>{toast.message}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification" onPress={clearToast} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><Icon name="close" color={colors.onPrimary} /></Pressable>
  </View>;
}
export function AppHeader({ title, eyebrow, action }: { title: string; eyebrow?: string; action?: React.ReactNode }) {
  return <View style={styles.header}><View style={{ flex: 1, gap: spacing.xs }}>{eyebrow && <Label muted size={typography.caption} bold style={{ letterSpacing: 1.4 }}>{eyebrow.toUpperCase()}</Label>}<Label size={typography.heading} bold>{title}</Label></View>{action}</View>;
}
export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const { colors, shadows } = useTheme();
  return <View style={[styles.card, shadows.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>{children}</View>;
}
export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return <View style={styles.header}><Label size={typography.title} bold>{title}</Label>{action}</View>;
}
export function Button({ title, onPress, variant = 'primary', icon, disabled = false, busy = false }: {
  title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: IconName; disabled?: boolean; busy?: boolean;
}) {
  const { colors } = useTheme();
  const foreground = variant === 'primary' ? colors.onPrimary : variant === 'danger' ? colors.danger : colors.primary;
  const background = variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.primarySoft : variant === 'danger' ? colors.dangerSoft : colors.transparent;
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress}
    style={({ pressed }) => [styles.button, { backgroundColor: background, opacity: disabled || busy ? 0.5 : pressed ? 0.75 : 1 }]}>
    {busy ? <ActivityIndicator color={foreground} /> : icon && <Icon name={icon} color={foreground} size={18} />}
    <Label color={foreground} bold style={{ flexShrink: 1, textAlign: 'center' }}>{title}</Label>
  </Pressable>;
}
export function IconButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.iconButton, { backgroundColor: colors.surfaceAlt }]}><Icon name={icon} /></Pressable>;
}
export function Chips<T extends string>({ items, value, onChange }: { items: readonly T[]; value: T; onChange: (value: T) => void }) {
  const { colors } = useTheme();
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs }}>
    {items.map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: item === value }} onPress={() => onChange(item)}
      style={[styles.chip, { backgroundColor: item === value ? colors.primary : colors.surface, borderColor: item === value ? colors.primary : colors.border }]}>
      <Label size={typography.label} bold={item === value} color={item === value ? colors.onPrimary : colors.muted}>{item.replaceAll('_', ' ')}</Label>
    </Pressable>)}
  </ScrollView>;
}
export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  const { colors } = useTheme();
  return <View style={{ gap: spacing.sm }}><Label size={typography.label} bold>{label}</Label><TextInput {...props} accessibilityLabel={label}
    placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }, props.multiline && { minHeight: 100, textAlignVertical: 'top' }, props.style]} />
    {hint && <Label muted size={typography.caption}>{hint}</Label>}
  </View>;
}
export function EmptyState({ title, description, icon = 'leaf-outline', action }: { title: string; description: string; icon?: IconName; action?: React.ReactNode }) {
  const { colors } = useTheme();
  return <View style={styles.empty}><View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}><Icon name={icon} color={colors.primary} size={28} /></View>
    <Label size={18} bold>{title}</Label><Label muted style={{ textAlign: 'center', maxWidth: 320 }}>{description}</Label>{action}</View>;
}
export function Badge({ title, tone = 'neutral' }: { title: string; tone?: 'neutral' | 'primary' | 'danger' | 'warning' }) {
  const { colors } = useTheme();
  const foreground = tone === 'neutral' ? colors.muted : colors[tone];
  const background = tone === 'neutral' ? colors.surfaceAlt : colors[`${tone}Soft`];
  return <View style={{ alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm, backgroundColor: background }}><Label size={11} bold color={foreground}>{title}</Label></View>;
}
export const layout = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, stack: { gap: spacing.lg } });
const styles = StyleSheet.create({
  screen: { width: '100%', maxWidth: 800, alignSelf: 'center', padding: spacing.xl, paddingBottom: 112, gap: spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  card: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md },
  button: { minHeight: 48, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  iconButton: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  chip: { minHeight: 44, paddingHorizontal: spacing.lg, justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1 },
  input: { minHeight: 50, borderRadius: radius.md, borderWidth: 1, padding: spacing.md, fontSize: typography.body },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  emptyIcon: { width: 58, height: 58, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
