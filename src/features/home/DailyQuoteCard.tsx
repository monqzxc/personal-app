import { useEffect, useRef, useState } from 'react';
import { Image, Linking, Platform, Pressable, Share, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Card, Icon, Label, layout } from '../../components/common/ui';
import { useToday } from '../../hooks/useToday';
import { useAppStore } from '../../stores/useAppStore';
import { useTheme } from '../../theme/useTheme';
import { moduleDefaults } from '../library/catalog';
import { createDailyQuoteService, fallbackQuote, quoteContent, ZENQUOTES_URL } from './quotes';

const dailyQuotes = createDailyQuoteService({ storage: AsyncStorage, fetchQuote: Platform.OS === 'web' ? undefined : fetch });

export function DailyQuoteCard() {
  const { colors, spacing, radius } = useTheme();
  const today = useToday();
  const [quote, setQuote] = useState(() => fallbackQuote(today));
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const notes = useAppStore(state => state.data.notes);
  const appSaving = useAppStore(state => state.saving);
  const content = quoteContent(quote);
  const saved = notes.some(note => !note.deletedAt && note.content === content);
  useEffect(() => {
    let active = true;
    setMessage('');
    void dailyQuotes.load(today).then(value => { if (active) setQuote(value); });
    return () => { active = false; };
  }, [today]);

  async function saveQuote() {
    if (saveLock.current) return;
    const state = useAppStore.getState();
    if (state.data.notes.some(note => !note.deletedAt && note.content === content)) { setMessage('Already saved in Notes.'); return; }
    if (state.saving) { setMessage('Another change is saving. Please try again in a moment.'); return; }
    saveLock.current = true;
    setSaving(true);
    try {
      const success = await state.saveRecord('notes', { ...moduleDefaults('notes'), title: `Daily Inspiration - ${quote.day}`, content, category: 'Inspiration', tags: ['quote'], favorite: true });
      setMessage(success ? 'Saved to Notes. A little inspiration to keep.' : 'Could not save this quote. Please try again.');
    } catch { setMessage('Could not save this quote. Please try again.'); }
    finally { saveLock.current = false; setSaving(false); }
  }
  async function shareQuote() {
    try { await Share.share({ title: 'Daily Inspiration', message: content }); }
    catch { setMessage('Sharing is unavailable right now. You can save the quote to Notes.'); }
  }
  async function openAttribution() {
    try { await Linking.openURL(ZENQUOTES_URL); }
    catch { setMessage('Could not open ZenQuotes. Please try again when you are online.'); }
  }

  return <Card style={{ backgroundColor: colors.hero, borderColor: colors.heroTrack, padding: spacing.xl, overflow: 'hidden' }}>
    <View style={[layout.row, { alignItems: 'center', justifyContent: 'space-between' }]}>
      <View style={{ flex: 1, gap: spacing.sm }}>
        <View style={layout.row}><Icon name="sparkles-outline" color={colors.accent} size={18} /><Label size={11} bold color={colors.heroMuted} style={{ letterSpacing: 1.3, flexShrink: 1 }}>A MOMENT FOR YOU</Label></View>
        <Label size={25} bold color={colors.onHero}>Daily Inspiration</Label>
      </View>
      <Image source={require('../../../assets/monap-sleeping-ghost.png')} accessible={false} resizeMode="cover" style={{ width: 92, height: 92, borderRadius: radius.md }} />
    </View>
    <Label size={21} color={colors.onHero} style={{ lineHeight: 31 }}>{'\u201c'}{quote.text}{'\u201d'}</Label>
    <Label color={colors.heroMuted} size={14}>- {quote.author}</Label>
    {quote.source === 'ZenQuotes' ? <Pressable accessibilityRole="link" accessibilityLabel="Inspiration provided by ZenQuotes. Open website" onPress={() => void openAttribution()} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Label size={12} color={colors.heroMuted} style={{ textDecorationLine: 'underline' }}>Inspiration provided by ZenQuotes</Label>
    </Pressable> : <Label size={12} color={colors.heroMuted}>An original MONAPp thought</Label>}
    {quote.source === 'ZenQuotes' && quote.day !== today && <Label size={12} color={colors.heroMuted}>Your last downloaded inspiration, kept for offline moments.</Label>}
    <View style={layout.wrap}>
      <Button title={saved ? 'Saved to Notes' : 'Save quote'} icon={saved ? 'bookmark' : 'bookmark-outline'} onPress={() => void saveQuote()} disabled={saved || appSaving} busy={saving} />
      <Button title="Share" icon="share-outline" variant="secondary" onPress={() => void shareQuote()} />
    </View>
    {!!message && <View accessibilityLiveRegion="polite"><Label color={colors.onHero} size={13} style={{ marginTop: spacing.xs }}>{message}</Label></View>}
  </Card>;
}
