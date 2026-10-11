import { useRef, useState } from 'react';
import { Keyboard, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppHeader, Button, Chips, Field, Label, Screen, layout } from '../../components/common/ui';
import { DateField } from '../../components/forms/DateField';
import { RelationField } from '../../components/forms/RecordFields';
import { useAppStore } from '../../stores/useAppStore';
import { useTheme } from '../../theme/useTheme';
import { dateOnly, isDateOnly } from '../../utils/dates';
import { moduleDefaults } from '../library/catalog';
import { quickExpenseAmount } from './expenseSelectors';
import { closeQuickExpense, finishQuickExpense } from './quickExpenseNavigation';

export default function QuickExpenseScreen() {
  const params = useLocalSearchParams<{ tripId?: string; personId?: string; collectionId?: string; currency?: string }>();
  const data = useAppStore(state => state.data);
  const settingsCurrency = useAppStore(state => state.settings.currency);
  const save = useAppStore(state => state.saveRecord);
  const saving = useAppStore(state => state.saving);
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<string | null>(dateOnly());
  const [personId, setPersonId] = useState(params.personId ?? '');
  const linkedTripId = params.tripId || data.moneyCollections.find(item => item.id === params.collectionId)?.tripId;
  const linkedTrip = data.trips.find(item => item.id === linkedTripId);
  const initialCurrency = ['PHP', 'USD', 'EUR', 'JPY', 'GBP'].includes(params.currency ?? '') ? params.currency! : linkedTrip?.currency ?? settingsCurrency;
  const [currency, setCurrency] = useState(initialCurrency);
  const [walletId, setWalletId] = useState('');
  const [category, setCategory] = useState('');
  const [details, setDetails] = useState(false);
  const [showPerson, setShowPerson] = useState(Boolean(params.personId));
  const [error, setError] = useState('');
  const submitting = useRef(false);
  async function submit(another: boolean) {
    if (submitting.current || saving) return;
    const parsed = quickExpenseAmount(amount, currency);
    if (!name.trim()) { setError('Add a name for this expense.'); return; }
    if (parsed === null) { setError(`Enter a positive amount in ${currency}${currency === 'JPY' ? ' using whole numbers' : ' with up to 2 decimal places'}.`); return; }
    if (!isDateOnly(date)) { setError('Choose a valid expense date.'); return; }
    setError('');
    submitting.current = true;
    Keyboard.dismiss();
    try {
      const ok = await save('transactions', {
        ...moduleDefaults('transactions', currency), name: name.trim(), description: description.trim(),
        amount: parsed, date, personId, walletId, category, type: 'expense', tripId: params.tripId ?? '', collectionId: params.collectionId ?? '',
      });
      if (ok && another) {
        setName(''); setDescription(''); setAmount(''); setPersonId(params.personId ?? '');
      } else if (ok) finishQuickExpense(router, Keyboard.dismiss);
    } finally { submitting.current = false; }
  }
  return <Screen><AppHeader title="Quick expense" eyebrow="Capture now. Organize later." />
    {params.collectionId ? <Label muted>Collection: {data.moneyCollections.find(item => item.id === params.collectionId)?.name ?? 'unavailable'}</Label> : null}
    {linkedTrip ? <Label muted>Trip: {linkedTrip.title}</Label> : null}
    {error ? <View accessibilityRole="alert"><Label color={colors.danger}>{error}</Label></View> : null}
    <View style={layout.stack} pointerEvents={saving ? 'none' : 'auto'}>
      <Field label="Name" placeholder="Coffee, fare, groceries..." value={name} onChangeText={setName} maxLength={200} editable={!saving} autoFocus />
      <Field label="Description (optional)" placeholder="What was this for?" value={description} onChangeText={setDescription} editable={!saving} />
      <Field label={`Amount (${currency})`} placeholder="0.00" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" editable={!saving} />
      <DateField label="Date" value={date} onChange={setDate} />
      <Button title={showPerson ? 'Hide person options' : 'Include a person (optional)'} variant="ghost" onPress={() => setShowPerson(!showPerson)} disabled={saving} />
      {showPerson && <><RelationField field={{ key: 'personId', label: 'Person', type: 'relation', collection: 'people' }} value={personId} onChange={setPersonId} />
        <Button title="Add a new person" variant="ghost" onPress={() => router.push({ pathname: '/record', params: { module: 'people' } })} /></>}
      {personId && !showPerson ? <Label muted>With {data.people.find(person => person.id === personId)?.name ?? 'selected person'}</Label> : null}
      {personId ? <Label muted size={12}>This person link is a label. To track money owed, add a lending or borrowing entry separately.</Label> : null}
      <Button title={details ? 'Hide extra details' : 'More details (wallet, currency, category)'} variant="ghost" onPress={() => setDetails(!details)} disabled={saving} />
      {details && <><Label bold>Currency</Label><Chips items={['PHP', 'USD', 'EUR', 'JPY', 'GBP']} value={currency} onChange={value => { setCurrency(value); if (data.wallets.find(wallet => wallet.id === walletId)?.currency !== value) setWalletId(''); }} />
        <RelationField field={{ key: 'walletId', label: 'Wallet', type: 'relation', collection: 'wallets' }} value={walletId} onChange={value => { setWalletId(value); const wallet = data.wallets.find(item => item.id === value); if (wallet) setCurrency(wallet.currency); }} />
        <Field label="Category (optional)" value={category} onChangeText={setCategory} editable={!saving} /></>}
    </View>
    <Label muted size={12}>{walletId ? `Updates ${data.wallets.find(wallet => wallet.id === walletId)?.name ?? 'the selected wallet'} on the recorded date.` : 'Without a wallet, this counts in spending totals only. You can assign a wallet later.'} Find this in Expenses and add it to a Collection when you are ready.</Label>
    <Button title="Save expense" busy={saving} onPress={() => { void submit(false); }} />
    <Button title="Save & add another" variant="secondary" disabled={saving} onPress={() => { void submit(true); }} />
    <Button title="Cancel" variant="ghost" disabled={saving} onPress={() => closeQuickExpense(router, Keyboard.dismiss)} />
  </Screen>;
}
