import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { AppHeader, Button, Card, Chips, EmptyState, Field, Label, Screen, layout } from '../../components/common/ui';
import { useAppStore } from '../../stores/useAppStore';
import { RecordCard } from '../library/RecordCard';
import { selectTransactions, isMonth, type TransactionFilters } from './selectors';
import { dateOnly } from '../../utils/dates';

export default function TransactionsScreen({ tripId }: { tripId?: string }) {
  const data = useAppStore(state => state.data);
  const [filter, setFilter] = useState<TransactionFilters>({ month: tripId ? '' : dateOnly().slice(0, 7), type: 'all', walletId: '', category: '', search: '', tripId });
  const [walletSearch, setWalletSearch] = useState('');
  const change = (patch: Partial<TransactionFilters>) => setFilter(previous => ({ ...previous, ...patch }));
  const visible = selectTransactions(data.transactions, filter);
  const categories = [...new Set(data.transactions.map(item => item.category).filter(Boolean))];
  return <Screen><AppHeader title="Money in. Money out." eyebrow="Transaction history" />
    <View style={layout.wrap}><Button title="Quick expense" icon="add" onPress={() => router.push({ pathname: '/quick-expense', params: tripId ? { tripId } : {} })} /><Button title="Expenses & collections" variant="secondary" onPress={() => router.push({ pathname: '/expenses', params: tripId ? { tripId } : {} })} /></View>
    <View style={layout.wrap}>{(['expense', 'income', 'transfer'] as const).map(type => <Button key={type} title={`Add ${type}`} variant={type === 'expense' ? 'primary' : 'secondary'} onPress={() => router.push({ pathname: '/record', params: { module: 'transactions', transactionType: type, ...(tripId ? { parentId: tripId } : {}) } })} />)}</View>
    <Field label="Search transactions" placeholder="Name, description, category, or notes" value={filter.search} onChangeText={search => change({ search })} />
    <Field label="Month" placeholder="YYYY-MM · leave blank for all dates" value={filter.month} maxLength={7} onChangeText={month => change({ month })} />
    {filter.month && !isMonth(filter.month) ? <Label>Enter a valid month in YYYY-MM format.</Label> : null}
    <Chips items={['all', 'income', 'expense', 'transfer'] as const} value={filter.type} onChange={type => change({ type })} />
    <Card><Label bold>Wallet</Label><Field label="Find wallet" value={walletSearch} onChangeText={setWalletSearch} placeholder="Cash, bank, GCash…" />
      <View style={layout.wrap}>{[{ id: '', name: 'All wallets' }, { id: 'unassigned', name: 'Unassigned' }, ...data.wallets.filter(item => item.name.toLowerCase().includes(walletSearch.toLowerCase()))].map(wallet => <Button key={wallet.id} title={wallet.name} variant={filter.walletId === wallet.id ? 'primary' : 'secondary'} onPress={() => change({ walletId: wallet.id })} />)}</View>
    </Card>
    <Chips items={['All categories', ...categories]} value={filter.category || 'All categories'} onChange={category => change({ category: category === 'All categories' ? '' : category })} />
    <Label muted size={12}>{visible.length} transactions · newest first · transfers include both wallets</Label>
    {visible.map(item => <RecordCard key={item.id} module="transactions" record={item} />)}
    {!visible.length && <EmptyState title="No matching transactions" description="Add a transaction or adjust the month and filters." icon="wallet-outline" />}
  </Screen>;
}
