import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppHeader, Button, Card, Chips, EmptyState, Field, Icon, Label, Screen, layout } from '../../components/common/ui';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { DateField } from '../../components/forms/DateField';
import { RelationField } from '../../components/forms/RecordFields';
import { useAppStore } from '../../stores/useAppStore';
import { useTheme } from '../../theme/useTheme';
import { localDate } from '../../utils/dates';
import { money } from './selectors';
import { groupMoneyByDate, moneyActivityTotals, selectMoneyActivity, toggleMoneySelection, validExpenseDates, type ExpenseFilters, type MoneyItem } from './expenseSelectors';

type NewCollection = { name: string; notes: string; tripId: string; peopleIds: string[] };
type Assignment = { items: MoneyItem[]; collectionId: string; name: string; newCollection?: NewCollection };

function Totals({ items }: { items: MoneyItem[] }) {
  return <>{moneyActivityTotals(items).map(total => <Label key={`${total.kind}:${total.currency}`} muted size={12}>{total.kind}: {money(total.amount, total.currency)}</Label>)}</>;
}

export default function ExpensesScreen() {
  const params = useLocalSearchParams<{ collectionId?: string; tripId?: string; personId?: string }>();
  const data = useAppStore(state => state.data);
  const saving = useAppStore(state => state.saving);
  const assign = useAppStore(state => state.assignMoneyRecords);
  const { colors, spacing, radius } = useTheme();
  const [filter, setFilter] = useState<ExpenseFilters>({ search: '', from: '', to: '', personId: params.personId ?? '', collectionId: params.collectionId ?? '', tripId: params.tripId, allActivity: Boolean((params.collectionId && params.collectionId !== 'unassigned') || params.personId) });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [targetId, setTargetId] = useState('');
  const [createNew, setCreateNew] = useState(true);
  const [newName, setNewName] = useState('');
  const [newTripId, setNewTripId] = useState(params.tripId ?? '');
  const [pending, setPending] = useState<Assignment | null>(null);
  const [status, setStatus] = useState('');
  const visible = selectMoneyActivity(data, filter);
  const chosen = visible.filter(item => selected.includes(item.key));
  const groups = groupMoneyByDate(visible);
  const collection = data.moneyCollections.find(item => item.id === filter.collectionId);
  function change(patch: Partial<ExpenseFilters>) { setFilter(previous => ({ ...previous, ...patch })); setSelected([]); setStatus(''); }
  function requestAssignment(remove = false) {
    if (!chosen.length) return;
    if (remove) { setPending({ items: chosen, collectionId: '', name: '' }); return; }
    if (createNew) {
      if (!newName.trim()) return;
      setPending({ items: chosen, collectionId: '', name: newName.trim(), newCollection: { name: newName.trim(), notes: '', tripId: newTripId, peopleIds: [...new Set(chosen.map(item => item.personId).filter(Boolean))] } });
    } else {
      const target = data.moneyCollections.find(item => item.id === targetId);
      if (target) setPending({ items: chosen, collectionId: target.id, name: target.name });
    }
  }
  async function confirmAssignment() {
    if (!pending || saving) return;
    const ok = await assign(pending.items.map(item => ({ module: item.module, id: item.id })), pending.collectionId, pending.newCollection);
    setPending(null);
    if (ok) {
      setStatus(`${pending.items.length} ${pending.items.length === 1 ? 'record' : 'records'} ${pending.name ? `added to ${pending.name}` : 'removed from its collection'}.`);
      setSelected([]); setNewName('');
    }
  }
  const changingCollection = pending?.items.some(item => item.collectionId && item.collectionId !== pending.collectionId);
  const activeFilters = Boolean(filter.from || filter.to || filter.personId || filter.collectionId || filter.tripId);
  return <Screen><AppHeader title={collection?.name ?? 'Expenses'} eyebrow="Capture first. Collect later." />
    <View style={layout.wrap}><Button title="Quick expense" icon="add" onPress={() => router.push({ pathname: '/quick-expense', params: { ...(filter.tripId ? { tripId: filter.tripId } : {}), ...(collection ? { collectionId: collection.id } : {}), ...(filter.personId && filter.personId !== 'unassigned' ? { personId: filter.personId } : {}) } })} />
      <Button title="Manage collections" variant="secondary" onPress={() => router.push({ pathname: '/module', params: { module: 'moneyCollections' } })} /></View>
    <Label muted>Select records from any date and put them in a Collection, such as Weekend Vacation. Collections organize the original records without duplicating their amounts.</Label>
    <Chips items={['Expenses only', 'All money activity']} value={filter.allActivity ? 'All money activity' : 'Expenses only'} onChange={value => change({ allActivity: value === 'All money activity' })} />
    {filter.allActivity ? <Label muted size={12}>Includes recorded income, transfers, lending, borrowing, and repayments. Totals stay separate by type and currency. Unpaid plans are not transactions.</Label> : null}
    <Field label="Search expenses" placeholder="Name or description" value={filter.search} onChangeText={search => change({ search })} />
    {activeFilters && <Card><Label bold>Current filters</Label>
      {filter.from || filter.to ? <Label muted>{filter.from || 'First record'} to {filter.to || 'Latest record'}</Label> : null}
      {filter.personId ? <Label muted>Person: {filter.personId === 'unassigned' ? 'No person linked' : data.people.find(item => item.id === filter.personId)?.name ?? 'unavailable'}</Label> : null}
      {filter.collectionId ? <Label muted>Collection: {filter.collectionId === 'unassigned' ? 'Uncollected' : collection?.name ?? 'unavailable'}</Label> : null}
      {filter.tripId ? <Label muted>Trip: {data.trips.find(item => item.id === filter.tripId)?.title ?? 'unavailable'}</Label> : null}
      <Button title="Clear filters" variant="ghost" onPress={() => change({ from: '', to: '', personId: '', collectionId: '', tripId: undefined })} /></Card>}
    <Button title={filtersOpen ? 'Hide filters' : 'Filter by date, person, or collection'} variant="secondary" onPress={() => setFiltersOpen(!filtersOpen)} />
    {filtersOpen && <><DateField label="From date (inclusive)" value={filter.from || null} optional onChange={from => change({ from: from ?? '' })} />
      <DateField label="To date (inclusive)" value={filter.to || null} optional onChange={to => change({ to: to ?? '' })} />
      <RelationField field={{ key: 'personId', label: 'Person filter', type: 'relation', collection: 'people' }} value={filter.personId === 'unassigned' ? '' : filter.personId} onChange={personId => change({ personId })} />
      <View style={layout.wrap}><Button title="All people" variant={!filter.personId ? 'primary' : 'secondary'} onPress={() => change({ personId: '' })} /><Button title="No person linked" variant={filter.personId === 'unassigned' ? 'primary' : 'secondary'} onPress={() => change({ personId: 'unassigned' })} /></View>
      <RelationField field={{ key: 'collectionId', label: 'Collection filter', type: 'relation', collection: 'moneyCollections' }} value={filter.collectionId === 'unassigned' ? '' : filter.collectionId} onChange={collectionId => change({ collectionId })} />
      <View style={layout.wrap}><Button title="All collections" variant={!filter.collectionId ? 'primary' : 'secondary'} onPress={() => change({ collectionId: '' })} /><Button title="Uncollected" variant={filter.collectionId === 'unassigned' ? 'primary' : 'secondary'} onPress={() => change({ collectionId: 'unassigned' })} /></View>
    </>}
    {!validExpenseDates(filter.from, filter.to) ? <Label color={colors.danger}>Enter valid dates in YYYY-MM-DD format. From date must be on or before To date.</Label> : null}
    {status ? <Label color={colors.primary}>{status}</Label> : null}
    {chosen.length > 0 && <Card><Label bold>{chosen.length} selected across {new Set(chosen.map(item => item.date)).size} dates</Label><Totals items={chosen} />
      <Chips items={['New collection', 'Existing collection']} value={createNew ? 'New collection' : 'Existing collection'} onChange={value => setCreateNew(value === 'New collection')} />
      {createNew ? <><Field label="Collection name" placeholder="Weekend Vacation" value={newName} onChangeText={setNewName} maxLength={200} />
        <RelationField field={{ key: 'tripId', label: 'Trip (optional)', type: 'relation', collection: 'trips' }} value={newTripId} onChange={setNewTripId} /></>
        : <RelationField field={{ key: 'collectionId', label: 'Destination collection', type: 'relation', collection: 'moneyCollections' }} value={targetId} onChange={setTargetId} />}
      <Button title={createNew ? 'Create collection & add selected' : 'Add selected to collection'} disabled={saving || (createNew ? !newName.trim() : !targetId)} onPress={() => requestAssignment()} />
      {chosen.some(item => item.collectionId) && <Button title="Remove selected from collections" variant="danger" disabled={saving} onPress={() => requestAssignment(true)} />}
      <Button title="Clear selection" variant="ghost" disabled={saving} onPress={() => setSelected([])} />
      <Label muted size={12}>Changing a search or filter clears the selection. Moving a record replaces its previous collection; it keeps its original date and amount.</Label>
    </Card>}
    <Card><Label bold>{visible.length} matching records</Label><Totals items={visible} /></Card>
    {groups.map(group => {
      const closed = collapsed.includes(group.date);
      const selectedCount = group.items.filter(item => selected.includes(item.key)).length;
      return <Card key={group.date}>
        <Button title={`${localDate(group.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · ${group.items.length} records`} icon={closed ? 'chevron-down' : 'chevron-up'} variant="secondary" onPress={() => setCollapsed(previous => closed ? previous.filter(date => date !== group.date) : [...previous, group.date])} />
        <Totals items={group.items} />
        <Button title={selectedCount === group.items.length ? 'Deselect this date' : `Select this date${selectedCount ? ` (${selectedCount} selected)` : ''}`} variant="ghost" disabled={saving} onPress={() => setSelected(previous => toggleMoneySelection(previous, group.items))} />
        {!closed && group.items.map(item => <View key={item.key} style={{ gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Pressable accessibilityRole="checkbox" accessibilityLabel={`Select ${item.name}, ${money(item.amount, item.currency)}`} accessibilityState={{ checked: selected.includes(item.key), disabled: saving }} disabled={saving} onPress={() => setSelected(previous => toggleMoneySelection(previous, [item]))} style={{ padding: spacing.sm, borderRadius: radius.sm, backgroundColor: selected.includes(item.key) ? colors.primarySoft : colors.transparent }}>
            <View style={layout.row}><Icon name={selected.includes(item.key) ? 'checkbox' : 'square-outline'} color={colors.primary} /><View style={{ flex: 1 }}><Label bold>{item.name}</Label><Label>{money(item.amount, item.currency)} · {item.kind}</Label></View></View>
          </Pressable>
          {item.description ? <Label muted>{item.description}</Label> : null}
          {item.personId ? <Label muted size={12}>Person: {data.people.find(person => person.id === item.personId)?.name ?? 'unavailable'}</Label> : null}
          <Label muted size={12}>Collection: {item.collectionId ? data.moneyCollections.find(value => value.id === item.collectionId)?.name ?? 'unavailable' : 'Uncollected'}</Label>
          <Button title="Edit record" variant="ghost" onPress={() => router.push({ pathname: '/record', params: { module: item.module, id: item.id } })} />
        </View>)}
      </Card>;
    })}
    {!visible.length && <EmptyState title="No matching records" description="Add a quick expense or adjust your search and filters." icon="wallet-outline" />}
    <ConfirmationModal visible={Boolean(pending)} title={pending?.name ? `Collect in ${pending.name}?` : 'Remove from collections?'}
      message={`${pending?.items.length ?? 0} selected records will ${pending?.name ? 'belong to this collection' : 'become uncollected'}.${changingCollection ? ' This replaces their previous collection links.' : ''} Dates, amounts, and wallet balances stay the same.`}
      busy={saving} confirmTitle={pending?.name ? 'Confirm collection' : 'Remove collection links'} confirmVariant={pending?.name ? 'primary' : 'danger'} cancelTitle="Cancel" onCancel={() => setPending(null)} onConfirm={() => { void confirmAssignment(); }} />
  </Screen>;
}
