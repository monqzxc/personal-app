import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import type { Debt, ModuleKey, ModuleRecord, Wallet } from '../../types/life';
import { recordTitle } from './catalog';
import { Badge, Card, Icon, Label, layout } from '../../components/common/ui';
import { useTheme } from '../../theme/useTheme';
import { debtProgress, money, owedTotal, walletBalance } from '../finance/selectors';
import { useAppStore } from '../../stores/useAppStore';
import { useToday } from '../../hooks/useToday';
import { dateOnly } from '../../utils/dates';
import { durationText, paceText } from '../fitness/tracking';
import { pokemonProgress } from '../fitness/pokemon';

export function RecordCard({ module, record }: { module: ModuleKey; record: ModuleRecord }) {
  const { colors } = useTheme();
  const data = useAppStore(state => state.data);
  const today = useToday();
  const values = record as unknown as Record<string, unknown>;
  const due = values.dueDate ?? values.expectedDate ?? values.nextBillingDate ?? values.startDate ?? values.date ?? values.targetDate;
  const amount = module === 'wallets' ? walletBalance(record as Wallet, data.transactions, today, data) : values.amount;
  const walletName = (id: unknown) => data.wallets.find(wallet => wallet.id === id)?.name ?? 'Unassigned';
  const prefix = module === 'transactions' ? values.type === 'income' ? '+' : values.type === 'expense' ? '−' : '↔ ' : '';
  const status = module === 'bills' && !['paid', 'cancelled'].includes(String(values.status)) && String(values.dueDate) < dateOnly() ? 'overdue' : values.status;
  const repaymentDebt = module === 'repayments' ? data.debts.find(item => item.id === values.debtId) : undefined;
  const collection = values.collectionId ? data.moneyCollections.find(item => item.id === values.collectionId) : undefined;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${recordTitle(module, record)}`} onPress={() => router.push({ pathname: '/record', params: { module, id: record.id } })}>
    <Card><View style={layout.row}><View style={{ flex: 1, gap: 8 }}><Label bold>{recordTitle(module, record)}</Label>
      {module === 'activities' && <Label muted>{String(values.kind)} · {durationText(Number(values.durationMinutes))} · {Number(values.distanceKm).toFixed(2)} km · {paceText(Number(values.durationMinutes), Number(values.distanceKm))}</Label>}
      {module === 'activities' && typeof values.pokemonId === 'number' && <Badge title={`${pokemonProgress(values.pokemonId, Number(values.distanceKm))?.current.name} · ${Math.floor(Number(values.distanceKm) * 1000).toLocaleString()} XP`} tone="primary" />}
      {module === 'people' && <>{[...new Set(data.debts.filter(item => item.personId === record.id).map(item => item.currency))].map(currency => <View key={currency}><Label bold>They owe me: {money(owedTotal(data, currency, record.id, today, 'lent'), currency)}</Label><Label>I owe them: {money(owedTotal(data, currency, record.id, today, 'borrowed'), currency)}</Label></View>)}{!data.debts.some(item => item.personId === record.id) && <Label muted>No money owed recorded</Label>}</>}
      {module === 'debts' && <><Label muted>{data.people.find(item => item.id === values.personId)?.name}</Label><Badge title={values.direction === 'borrowed' ? 'I owe them' : 'They owe me'} /><Badge title={debtProgress(record as Debt, data.repayments, today).status} /><Label bold>{money(debtProgress(record as Debt, data.repayments, today).remaining, String(values.currency))} still owed</Label></>}
      {module === 'repayments' && <><Label muted>{repaymentDebt?.direction === 'borrowed' ? 'Paid to' : 'Received from'} {data.people.find(item => item.id === repaymentDebt?.personId)?.name ?? 'Person unavailable'}</Label><Label muted>{repaymentDebt?.name} · {walletName(values.walletId)}</Label></>}
      {module === 'transactions' && <>{values.description && values.description !== values.name ? <Label muted>{String(values.description)}</Label> : null}<Badge title={String(values.type)} tone={values.type === 'income' ? 'primary' : 'neutral'} />{values.personId ? <Badge title={data.people.find(item => item.id === values.personId)?.name ?? 'Person unavailable'} /> : null}<Label muted size={12}>{walletName(values.walletId)}{values.type === 'transfer' ? ` → ${walletName(values.toWalletId)}` : ''}{String(values.date) > today ? ' · Future dated' : ''}</Label></>}
      {collection && <Badge title={collection.name} tone="primary" />}
      {Array.isArray(values.peopleIds) && values.peopleIds.length > 0 && <Label muted size={12}>People: {values.peopleIds.map(id => data.people.find(person => person.id === id)?.name ?? 'Person unavailable').join(', ')}</Label>}
      {module === 'wallets' && <Label muted size={12}>{String(values.kind)} · {String(values.currency)} · balance today</Label>}
      <View style={layout.wrap}>{values.category ? <Label muted size={12}>{String(values.category)}</Label> : null}{due ? <Label muted size={12}>{String(due)}</Label> : null}{status ? <Badge title={String(status)} tone={status === 'overdue' ? 'danger' : 'neutral'} /> : null}{values.favorite ? <Icon name="star" color={colors.warning} size={16} /> : null}{module === 'inbox' && <Badge title={values.processed ? 'Processed' : 'Inbox'} tone={values.processed ? 'neutral' : 'primary'} />}</View>
      {Array.isArray(values.technology) && <Label muted size={12}>{values.technology.join(' · ')}</Label>}
    </View>{typeof amount === 'number' && <Label bold color={values.type === 'income' ? colors.primary : colors.text}>{prefix}{money(amount, String(values.currency))}</Label>}<Icon name="chevron-forward" size={16} color={colors.muted} /></View></Card>
  </Pressable>;
}
