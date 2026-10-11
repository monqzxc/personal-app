import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Chips, Label, SectionHeader, layout } from '../../components/common/ui';
import { useAppStore } from '../../stores/useAppStore';
import { useToday } from '../../hooks/useToday';
import { debtProgress, money, owedTotal } from './selectors';
import { RecordCard } from '../library/RecordCard';

export function LendingWorkspace({ personId, debtId }: { personId?: string; debtId?: string }) {
  const data = useAppStore(state => state.data);
  const today = useToday();
  const [filter, setFilter] = useState('All');
  const [direction, setDirection] = useState('Both directions');
  const debts = data.debts.filter(item => debtId ? item.id === debtId : item.personId === personId).sort((a, b) => b.date.localeCompare(a.date));
  const debt = debtId ? debts[0] : undefined;
  const shownDebts = debts.filter(item => direction === 'Both directions' || item.direction === (direction === 'They owe me' ? 'lent' : 'borrowed'));
  const payments = data.repayments.filter(item => shownDebts.some(loan => loan.id === item.debtId)).sort((a, b) => b.date.localeCompare(a.date));
  const progress = debt && debtProgress(debt, data.repayments, today);
  return <View style={layout.stack}>
    <SectionHeader title={debt ? 'Repayment progress' : 'Money between you'} />
    {personId && <>
      {[...new Set(debts.map(item => item.currency))].map(currency => <Card key={currency}><Label bold>{currency}</Label><Label>They owe me: {money(owedTotal(data, currency, personId, today, 'lent'), currency)}</Label><Label>I owe them: {money(owedTotal(data, currency, personId, today, 'borrowed'), currency)}</Label></Card>)}
      <View style={layout.wrap}>
        <Button title="They owe me" icon="add" onPress={() => router.push({ pathname: '/record', params: { module: 'debts', parentId: personId, parentType: 'person', direction: 'lent' } })} />
        <Button title="I owe them" variant="secondary" icon="add" onPress={() => router.push({ pathname: '/record', params: { module: 'debts', parentId: personId, parentType: 'person', direction: 'borrowed' } })} />
      </View>
      <Chips items={['Both directions', 'They owe me', 'I owe them']} value={direction} onChange={setDirection} />
      <Chips items={['All', 'Outstanding', 'Settled']} value={filter} onChange={setFilter} />
      {shownDebts.filter(item => filter === 'All' || (debtProgress(item, data.repayments, today).remaining === 0 ? filter === 'Settled' : filter === 'Outstanding')).map(item => <RecordCard key={item.id} module="debts" record={item} />)}
      {!debts.length && <Label muted>Record money you lent, money you borrowed, or an existing debt.</Label>}
    </>}
    {debt && progress && <Card><Label bold>{progress.status} · {money(progress.remaining, debt.currency)} still owed</Label><Label>{money(progress.paid, debt.currency)} repaid of {money(debt.amount, debt.currency)}</Label><Label muted>{debt.direction === 'borrowed' ? 'You owe' : 'Owed to you by'} {data.people.find(item => item.id === debt.personId)?.name}</Label>
      {progress.remaining > 0 && <Button title="Record full or partial repayment" onPress={() => router.push({ pathname: '/record', params: { module: 'repayments', parentId: debt.id, parentType: 'debt' } })} />}
      <Label muted size={12}>Uses the saved debt. {debt.direction === 'borrowed' ? 'Your repayment decreases the paying wallet.' : 'Their repayment increases the receiving wallet.'} Repayments reduce the amount owed and do not count as income or personal spending.</Label>
    </Card>}
    <SectionHeader title="Repayment history" />
    {payments.map(item => <RecordCard key={item.id} module="repayments" record={item} />)}
    {!payments.length && <Label muted>No repayments recorded yet.</Label>}
  </View>;
}
