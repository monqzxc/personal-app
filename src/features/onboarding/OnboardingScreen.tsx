import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';
import { Button, Icon, Label, type IconName } from '../../components/common/ui';
import { palettes } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const slides = [
  { tag: 'A SPACE FOR YOU', title: 'YOUR LIFE.\nAT YOUR PACE.', heading: 'A little progress. A little rest.', description: 'Welcome to MONAPp. Keep your plans, money, and movement together, with room for a nap.', color: '#6D3AC7' },
  { tag: 'MAKE ROOM FOR YOUR DAY', title: 'LESS RUSH.\nMORE ROOM.', heading: 'Your day, a little clearer.', description: 'Plan tasks, remember appointments, and keep the people you care about in the picture.', color: '#7545C4' },
  { tag: 'CAPTURE NOW. ORGANIZE LATER.', title: 'SMALL SPENDS.\nBIGGER PLANS.', heading: 'Catch the little expenses.', description: 'Save an expense in the moment. Group it into a trip or Collection later, and keep track of money owed.', color: '#6033A5' },
  { tag: 'EVERY LITTLE STEP COUNTS', title: 'MOVE A LITTLE.\nREST A LITTLE.', heading: 'Find your own rhythm.', description: 'Log a walk or run, or track your time, distance, and route. Your next small step starts here.', color: '#4C2B80' },
];
const ink = palettes.light.text;
const purple = palettes.light.primary;

function PreviewRow({ icon, title, detail, amount }: { icon: IconName; title: string; detail: string; amount?: string }) {
  return <View style={styles.previewRow}>
    <View style={styles.previewIcon}><Icon name={icon} color={purple} size={22} /></View>
    <View style={{ flex: 1 }}><Label color={ink} bold size={14}>{title}</Label><Label color={palettes.light.muted} size={11}>{detail}</Label></View>
    {amount ? <Label color={ink} bold size={16}>{amount}</Label> : null}
  </View>;
}

function SlidePreview({ page, width }: { page: number; width: number }) {
  if (page === 0) {
    const size = Math.max(140, Math.min(248, width - 88));
    return <Image source={require('../../../assets/monap-sleeping-ghost.png')} resizeMode="cover" style={{ width: size, height: size, borderRadius: 28, alignSelf: 'center' }} />;
  }
  if (page === 1) return <View style={[styles.preview, { transform: [{ rotate: '-2deg' }] }]}>
    <View style={styles.previewHeader}><Label color={ink} bold size={12}>EXAMPLE DAY</Label><Icon name="sunny-outline" color={purple} size={20} /></View>
    <View style={styles.week}>{['M', 'T', 'W', 'T', 'F'].map((day, index) => <View key={index} style={[styles.day, index === 2 && { backgroundColor: purple }]}><Label color={index === 2 ? '#FFFFFF' : ink} size={11}>{day}</Label><Label color={index === 2 ? '#FFFFFF' : ink} bold size={16}>{12 + index}</Label></View>)}</View>
    <PreviewRow icon="checkbox-outline" title="Make a little progress" detail="One task at a time" />
    <PreviewRow icon="calendar-outline" title="Lunch with a friend" detail="12:00 PM · Your calendar" />
    <View style={styles.softNote}><Icon name="sparkles-outline" color={purple} size={16} /><Label color={purple} bold size={12}>A plan with room to breathe.</Label></View>
  </View>;
  if (page === 2) return <View style={{ gap: 12 }}>
    <View style={[styles.preview, { transform: [{ rotate: '2deg' }] }]}>
      <View style={styles.previewHeader}><Label color={ink} bold size={12}>EXAMPLE EXPENSES</Label><Icon name="wallet-outline" color={purple} size={20} /></View>
      <PreviewRow icon="cafe-outline" title="Coffee" detail="Quick expense" amount="₱120" />
      <PreviewRow icon="bus-outline" title="Fare" detail="Quick expense" amount="₱35" />
    </View>
    <View style={[styles.preview, { backgroundColor: '#E9DDFB', transform: [{ rotate: '-2deg' }] }]}>
      <View style={styles.previewHeader}><Icon name="folder-open-outline" color={purple} size={26} /><View style={{ flex: 1 }}><Label color={ink} bold size={16}>Weekend getaway</Label><Label color={palettes.light.muted} size={12}>One Collection. All the little things.</Label></View></View>
    </View>
  </View>;
  return <View style={[styles.preview, { transform: [{ rotate: '-2deg' }] }]}>
    <View style={styles.previewHeader}><Label color={ink} bold size={12}>EXAMPLE WALK</Label><Icon name="leaf-outline" color={purple} size={20} /></View>
    <View style={styles.walkArt}><View style={styles.walkOrbit} /><View style={styles.walkCircle}><Icon name="walk-outline" color={purple} size={62} /></View><View style={styles.routePoint}><Icon name="checkmark" color={ink} size={20} /></View></View>
    <View style={styles.metrics}>{[{ value: '2.4', label: 'KILOMETERS' }, { value: '32', label: 'MINUTES' }].map(metric => <View key={metric.label} style={{ flex: 1, alignItems: 'center' }}><Label color={ink} bold size={30}>{metric.value}</Label><Label color={palettes.light.muted} size={10}>{metric.label}</Label></View>)}</View>
  </View>;
}

export default function OnboardingScreen({ onFinish, busy = false, error, replay = false }: { onFinish: () => void; busy?: boolean; error?: string | null; replay?: boolean }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const systemReducedMotion = useReducedMotion();
  const [reducedMotion, setReducedMotion] = useState(systemReducedMotion);
  const [page, setPage] = useState(0);
  const [pageWidth, setPageWidth] = useState(Math.min(width, 600));
  const pager = useRef<ScrollView>(null);
  const currentPage = useRef(0);
  const last = page === slides.length - 1;
  function goToPage(next: number) {
    const target = Math.max(0, Math.min(slides.length - 1, next));
    currentPage.current = target; setPage(target);
    pager.current?.scrollTo({ x: target * pageWidth, animated: !reducedMotion });
  }
  useEffect(() => {
    let mounted = true;
    let changed = false;
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { changed = true; setReducedMotion(value); });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted && !changed) setReducedMotion(value); }).catch(() => {});
    return () => { mounted = false; listener.remove(); };
  }, []);
  useEffect(() => { pager.current?.scrollTo({ x: currentPage.current * pageWidth, animated: false }); }, [pageWidth]);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (busy) return true;
      if (page === 0) return false;
      goToPage(page - 1); return true;
    });
    return () => listener.remove();
  }, [page, pageWidth, busy, reducedMotion]);
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={styles.shell} onLayout={event => { const measured = event.nativeEvent.layout.width; if (measured > 0) setPageWidth(measured); }}>
      <View style={styles.topbar}><View style={styles.brand}><Icon name="moon" color={colors.primary} size={22} /><Label bold size={20}>MONAPp</Label></View><Button title={replay ? 'Close' : 'Skip'} variant="ghost" disabled={busy} onPress={onFinish} /></View>
      <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} scrollEnabled={!busy} style={{ flex: 1 }}
        onMomentumScrollEnd={event => { const next = Math.max(0, Math.min(slides.length - 1, Math.round(event.nativeEvent.contentOffset.x / pageWidth))); currentPage.current = next; setPage(next); }}>
        {slides.map((slide, index) => <ScrollView key={slide.tag} style={{ width: pageWidth, flexShrink: 0 }} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}
          accessibilityElementsHidden={page !== index} importantForAccessibility={page === index ? 'auto' : 'no-hide-descendants'}>
          <View style={[styles.hero, { backgroundColor: slide.color }]}>
            <View style={styles.tag}><Icon name={index === 3 ? 'footsteps-outline' : 'sparkles-outline'} size={13} color="#EADAFE" /><Text style={styles.tagText}>{slide.tag}</Text></View>
            <Text accessibilityRole="header" style={[styles.headline, { fontSize: pageWidth < 350 ? 31 : 37, lineHeight: pageWidth < 350 ? 34 : 40 }]}>{slide.title}</Text>
            <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SlidePreview page={index} width={pageWidth} /></View>
          </View>
          <View style={styles.caption}><Label bold size={22}>{slide.heading}</Label><Label muted size={15}>{slide.description}</Label>
            {index === 3 && <View style={[styles.privacy, { backgroundColor: colors.primarySoft }]}><Icon name="shield-checkmark-outline" color={colors.primary} size={21} /><Label color={colors.primary} size={12} style={{ flex: 1 }}>Your records stay on your device. Export a backup to keep a copy.</Label></View>}
          </View>
        </ScrollView>)}
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={styles.progressRow}><View style={styles.dots}>{slides.map((slide, index) => <Pressable key={slide.tag} accessibilityRole="button" accessibilityLabel={`Show intro page ${index + 1}: ${slide.heading}`} accessibilityState={{ selected: page === index, disabled: busy }} disabled={busy} onPress={() => goToPage(index)} style={styles.dotTarget}><View style={{ height: 7, width: page === index ? 24 : 7, borderRadius: 8, backgroundColor: page === index ? colors.primary : colors.border }} /></Pressable>)}</View><Label muted size={12} style={{ flexShrink: 1 }}>{page + 1} / {slides.length}</Label></View>
        {error ? <View accessibilityRole="alert"><Label color={colors.danger} size={13}>{error}</Label></View> : null}
        <View style={styles.actions}>{page > 0 && <Button title="Back" variant="ghost" disabled={busy} onPress={() => goToPage(page - 1)} />}<View style={{ flex: 1 }}><Button title={last ? replay ? 'Back to app' : 'Get started' : 'Next'} icon={last ? 'checkmark' : 'arrow-forward'} busy={busy} onPress={last ? onFinish : () => goToPage(page + 1)} /></View></View>
      </View>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  shell: { flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center' },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', paddingHorizontal: 24, paddingTop: 4, paddingBottom: 2 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  page: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16, gap: 22, flexGrow: 1 },
  hero: { borderRadius: 30, padding: 22, gap: 22, overflow: 'hidden' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tagText: { color: '#EADAFE', fontSize: 10, fontWeight: '700', letterSpacing: 1, flexShrink: 1 },
  headline: { color: '#FFFFFF', fontWeight: '900', letterSpacing: -1.3 },
  caption: { gap: 8, paddingHorizontal: 4 },
  preview: { backgroundColor: '#FCFAFF', padding: 15, borderRadius: 22, gap: 12 },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7 },
  previewIcon: { backgroundColor: '#EEE5FC', width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row', gap: 5 },
  day: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 13, gap: 2, backgroundColor: '#F0EAF8' },
  softNote: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingTop: 4, flexWrap: 'wrap' },
  walkArt: { height: 126, alignItems: 'center', justifyContent: 'center' },
  walkOrbit: { position: 'absolute', width: 150, height: 98, borderRadius: 50, borderWidth: 2, borderStyle: 'dashed', borderColor: '#CAB3E7', transform: [{ rotate: '-20deg' }] },
  walkCircle: { backgroundColor: '#EEE5FC', width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  routePoint: { position: 'absolute', left: '70%', top: 4, backgroundColor: '#CFEDB1', width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  metrics: { flexDirection: 'row', paddingBottom: 4 },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, padding: 12, marginTop: 4 },
  footer: { paddingHorizontal: 24, paddingBottom: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row' },
  dotTarget: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
