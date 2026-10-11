import { useState } from 'react';
import { Linking, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppHeader, Button, Card, EmptyState, Field, Label, Screen, layout } from '../../components/common/ui';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { RecordField } from '../../components/forms/RecordFields';
import { useAppStore } from '../../stores/useAppStore';
import { isModuleKey, moduleDefaults, modules } from './catalog';
import type { FitnessActivity, ModuleKey } from '../../types/life';
import { RelatedWorkspace } from './RelatedWorkspace';
import { dateOnly } from '../../utils/dates';
import { debtProgress } from '../finance/selectors';
import { ActivityDetails } from '../fitness/ActivityDetails';

type Params = { module: string; id?: string; inboxId?: string; parentId?: string; parentType?: string; kind?: string; idea?: string; transactionType?: string; currency?: string; month?: string; category?: string; taskId?: string; direction?: string };
function Editor({ module, params }: { module: ModuleKey; params: Params }) {
  const { id, inboxId, parentId, parentType, kind } = params;
  const data = useAppStore(state => state.data);
  const tasks = useAppStore(state => state.tasks);
  const [taskSearch, setTaskSearch] = useState('');
  const existing = data[module].find(item => item.id === id);
  const currency = useAppStore(state => state.settings.currency);
  const save = useAppStore(state => state.saveRecord);
  const remove = useAppStore(state => state.deleteRecord);
  const payBill = useAppStore(state => state.payBill);
  const renew = useAppStore(state => state.renewSubscription);
  const receive = useAppStore(state => state.receiveIncome);
  const saving = useAppStore(state => state.saving);
  const capture = data.inbox.find(item => item.id === inboxId);
  const [draft, setDraft] = useState<Record<string, unknown>>(() => {
    const defaults = moduleDefaults(module, params.currency ?? currency);
    if (module === 'activities' && params.taskId) defaults.taskId = params.taskId;
    if (module === 'budgets' && params.month) defaults.month = params.month;
    if (capture) defaults[modules[module].titleField] = capture.content;
    if (parentId) {
      if (parentType === 'person' && 'peopleIds' in defaults) defaults.peopleIds = [parentId];
      else defaults[parentType === 'project' ? 'projectId' : parentType === 'person' ? 'personId' : parentType === 'debt' ? 'debtId' : parentType === 'collection' ? 'collectionId' : 'tripId'] = parentId;
      if (!parentType && 'currency' in defaults) defaults.currency = data.trips.find(item => item.id === parentId)?.currency ?? currency;
      if (parentType === 'debt') {
        const debt = data.debts.find(item => item.id === parentId);
        if (debt) { defaults.currency = debt.currency; defaults.amount = debtProgress(debt, data.repayments).remaining; defaults.collectionId = debt.collectionId; }
      }
    }
    if (params.category && ['transactions', 'debts'].includes(module)) defaults.category = params.category;
    if (module === 'tripItems' && kind) defaults.kind = kind;
    if (module === 'projects' && params.idea) defaults.status = 'idea';
    if (module === 'transactions' && params.transactionType) defaults.type = params.transactionType;
    if (module === 'debts' && ['lent', 'borrowed'].includes(params.direction ?? '')) defaults.direction = params.direction;
    return existing ? { ...existing } : defaults;
  });
  const [confirm, setConfirm] = useState(false);
  const [linkError, setLinkError] = useState('');
  if ((id && !existing) || (inboxId && (!capture || capture.processed))) return <Screen><EmptyState title="Record unavailable" description="It may have been deleted or this capture may already be processed." action={<Button title="Back" onPress={() => router.back()} />} /></Screen>;
  function submit() {
    const input = { ...draft };
    for (const field of modules[module].fields) if (field.type === 'number') input[field.key] = String(draft[field.key]).trim() === '' ? NaN : Number(draft[field.key]);
    void save(module, input, id, inboxId).then(ok => { if (ok) router.back(); });
  }
  const converted = module === 'inbox' && draft.processed;
  const activeWorkout = module === 'activities' && existing && 'status' in existing && existing.status !== 'completed';
  const dirty = existing && modules[module].fields.some(field => JSON.stringify(field.type === 'number' ? Number(draft[field.key]) : draft[field.key]) !== JSON.stringify((existing as unknown as Record<string, unknown>)[field.key]));
  const settled = (module === 'bills' && draft.status === 'paid') || (module === 'expectedIncome' && draft.status === 'received');
  const receipts = data.transactions.filter(item => module === 'bills' ? item.billId === id : module === 'expectedIncome' ? item.expectedIncomeId === id : false);
  const repaymentDebt = module === 'repayments' ? data.debts.find(item => item.id === draft.debtId) : undefined;
  const borrowed = module === 'debts' ? draft.direction === 'borrowed' : repaymentDebt?.direction === 'borrowed';
  const hasRepayments = module === 'debts' && existing && data.repayments.some(item => item.debtId === existing.id);
  const fields = modules[module].fields.filter(field => !field.hidden
    && !(module === 'activities' && draft.source === 'gps' && ['durationMinutes', 'distanceKm'].includes(field.key))
    && !(module === 'debts' && field.key === 'walletId' && draft.existingDebt)
    && !(module === 'debts' && field.key === 'direction' && hasRepayments)
    && !(module === 'transactions' && field.key === 'toWalletId' && draft.type !== 'transfer')
    && !(module === 'transactions' && field.key === 'type' && (draft.billId || draft.subscriptionId || draft.expectedIncomeId))
    && !(settled && field.key === 'status')).map(field => {
      if (field.key === 'walletId' && ['debts', 'repayments'].includes(module)) return { ...field, label: (module === 'debts' ? borrowed : !borrowed) ? 'Received into wallet' : 'Paid from wallet' };
      if (field.key === 'date' && module === 'debts') return { ...field, label: borrowed ? 'Borrowed / recorded date' : 'Lent / recorded date' };
      if (field.key === 'date' && module === 'repayments') return { ...field, label: borrowed ? 'Paid date' : 'Received date' };
      return field;
    });
  function change(key: string, value: unknown) {
    setDraft(previous => {
      const next = { ...previous, [key]: value };
      if (module === 'transactions' && key === 'type' && value !== 'transfer') next.toWalletId = '';
      if (key === 'walletId' && value) next.currency = data.wallets.find(wallet => wallet.id === value)?.currency ?? next.currency;
      if (module === 'debts' && key === 'existingDebt' && value) next.walletId = '';
      if (module === 'repayments' && key === 'debtId' && value) {
        const debt = data.debts.find(item => item.id === value);
        if (debt) { next.currency = debt.currency; next.collectionId = debt.collectionId; }
      }
      return next;
    });
  }
  const conversionTypes = [ ['tasks', 'Task'], ['notes', 'Note'], ['transactions', 'Expense'], ['bills', 'Payment'], ['events', 'Event'], ['tripItems', 'Trip item'], ['bookmarks', 'Bookmark'], ['goals', 'Goal'] ] as const;
  return <Screen><AppHeader title={`${id ? 'Edit' : 'New'} ${modules[module].singular.toLowerCase()}`} eyebrow={inboxId ? 'Convert capture' : modules[module].title} />
    {module === 'activities' && existing && <ActivityDetails activity={existing as FitnessActivity} />}
    {module === 'activities' && <><Label muted>{draft.source === 'gps' ? 'GPS duration and distance are preserved. You can edit the name, notes, date, and links after finishing.' : 'Enter elapsed minutes and distance in kilometres. Use 0 km if you did not measure distance.'} Linking a task does not automatically complete it.</Label>
      <Card><Label bold>Linked task (optional)</Label><Label muted>{tasks.find(task => task.id === draft.taskId)?.title ?? (draft.taskId ? 'Linked task no longer available' : 'No task linked')}</Label><Field label="Find a task" value={taskSearch} onChangeText={setTaskSearch} placeholder="Go for a walk" /><View style={layout.wrap}>{tasks.filter(task => task.title.toLowerCase().includes(taskSearch.toLowerCase())).slice(0, 10).map(task => <Button key={task.id} title={task.title} variant={draft.taskId === task.id ? 'primary' : 'secondary'} onPress={() => change('taskId', task.id)} />)}</View>{draft.taskId ? <Button title="Clear task link" variant="ghost" onPress={() => change('taskId', '')} /> : null}</Card>
    </>}
    {existing && ['people', 'debts', 'trips'].includes(module) && <RelatedWorkspace module={module} record={existing} />}
    {module === 'debts' && <Label muted>{borrowed ? 'I owe them: new borrowing adds money to your wallet.' : 'They owe me: new lending or paying for someone deducts money from your wallet.'} Existing debt records money already owed without moving money again. Lending and borrowing do not count as income or personal spending. Save a separate entry for each person.</Label>}
    {hasRepayments && <Label muted>The direction is saved as {borrowed ? 'I owe them' : 'They owe me'}. Remove or reassign its repayments before changing direction.</Label>}
    {module === 'debts' && !data.people.length && <Button title="Add a person" variant="secondary" onPress={() => router.push({ pathname: '/record', params: { module: 'people' } })} />}
    {module === 'repayments' && <Label muted>{repaymentDebt ? borrowed ? 'Enter the amount you paid back. This deducts from your paying wallet without counting as personal spending.' : 'Enter the amount they paid back to you. This adds to your receiving wallet without counting as income.' : 'Choose a debt to record money paid back.'} Partial repayments are supported; the total cannot exceed the debt. Record each repayment here once.</Label>}
    {module === 'accounts' && <Card><Label bold>Directory, not a password vault</Label><Label muted>Never enter passwords, API keys, or recovery codes in any field.</Label></Card>}
    {module === 'wallets' && <Label muted>Use the balance before the first transaction you will assign to this wallet. Changing the opening balance adjusts today's balance too. A linked wallet must keep its currency until you reassign its records.</Label>}
    {module === 'transactions' && <Label muted>{draft.type === 'transfer' ? 'Choose two different wallets in the same currency. Transfers do not count as income, expenses, or budget spending.' : 'Choose a wallet to update its balance. Unassigned transactions count in monthly totals only.'} Future-dated transactions affect balances on their recorded date.</Label>}
    {['transactions', 'bills', 'subscriptions', 'expectedIncome', 'debts', 'repayments'].includes(module) && !data.wallets.length && <Button title="Create a wallet" variant="secondary" onPress={() => router.push({ pathname: '/record', params: { module: 'wallets' } })} />}
    {dirty && ['bills', 'subscriptions', 'expectedIncome'].includes(module) && <Label muted>Save your changes, then reopen this record to record a payment or receipt.</Label>}
    {module === 'bills' && existing && !['paid', 'cancelled'].includes(String(draft.status)) && <Button title="Record payment & expense" variant="secondary" disabled={Boolean(dirty)} busy={saving} onPress={() => { void payBill(existing.id).then(ok => { if (ok) router.back(); }); }} />}
    {module === 'subscriptions' && existing && draft.status === 'active' && String(draft.nextBillingDate) <= dateOnly() && <Button title="Record renewal & expense" variant="secondary" disabled={Boolean(dirty)} busy={saving} onPress={() => { void renew(existing.id).then(ok => { if (ok) router.back(); }); }} />}
    {module === 'expectedIncome' && existing && draft.status === 'expected' && <Button title="Mark received & add income" variant="secondary" disabled={Boolean(dirty)} busy={saving} onPress={() => { void receive(existing.id).then(ok => { if (ok) router.back(); }); }} />}
    {settled && <Card><Label bold>{module === 'bills' ? 'Paid' : 'Received'}</Label><Label muted>To correct actual money, edit the linked transaction. Changes to this plan do not update the recorded payment or receipt.</Label>{receipts.map(item => <Button key={item.id} title="Open transaction" variant="secondary" onPress={() => router.push({ pathname: '/record', params: { module: 'transactions', id: item.id } })} />)}{!receipts.length && <Label muted>No linked transaction is available. Historical plans or deleted transactions stay settled.</Label>}</Card>}
    {module === 'inbox' && existing && !converted && <Card><Label bold>Turn this into…</Label><View style={layout.wrap}>{conversionTypes.map(([key, label]) => <Button key={key} title={label} variant="secondary" onPress={() => router.replace({ pathname: key === 'tasks' ? '/task' : key === 'events' ? '/event' : '/record', params: { module: key, inboxId: existing.id } })} />)}</View><Label muted size={12}>The original capture is retained and linked after a successful save.</Label></Card>}
    {converted ? <Card><Label bold>Converted to {String(draft.convertedType)}</Label><Label>{String(draft.content)}</Label><Button title="Open converted record" variant="secondary" onPress={() => router.push({ pathname: draft.convertedType === 'tasks' ? '/task' : draft.convertedType === 'events' ? '/event' : '/record', params: { module: String(draft.convertedType), id: String(draft.convertedEntityId) } })} /></Card> : fields.map(field => <RecordField key={field.key} field={field.key === 'status' && ['bills', 'expectedIncome'].includes(module) ? { ...field, options: field.options?.filter(option => !['paid', 'received'].includes(option)) } : field} value={draft[field.key]} onChange={value => change(field.key, value)} />)}
    {module === 'expectedIncome' && <Label muted size={12}>Save this plan first. Mark received adds income dated today using the saved amount and wallet. Until then it stays separate from actual balances.</Label>}
    {module === 'bills' && <Label muted size={12}>Save the bill first, then use “Record payment & expense” to add today's expense using its saved amount and wallet. Recurring bills also create the next due bill.</Label>}
    {module === 'subscriptions' && <Label muted size={12}>Recording a renewal uses the saved amount, adds today’s expense, and advances one billing cycle. Estimates do not perform currency conversion.</Label>}
    {!converted && <Button title={id ? 'Save changes' : inboxId ? 'Create & process capture' : 'Save'} disabled={Boolean(activeWorkout)} busy={saving} onPress={submit} />}
    <Button title="Back" variant="ghost" disabled={saving} onPress={() => router.back()} />
    {existing && modules[module].fields.filter(field => field.type === 'url' && (existing as unknown as Record<string, unknown>)[field.key]).map(field => <Button key={field.key} title={`Open ${field.label.toLowerCase()}`} variant="secondary" icon="open-outline" onPress={() => { void Linking.openURL(String((existing as unknown as Record<string, unknown>)[field.key])).catch(() => setLinkError('This link could not be opened.')); }} />)}
    {linkError && <Label>{linkError}</Label>}
    {existing && !['people', 'debts', 'trips'].includes(module) && <RelatedWorkspace module={module} record={existing} />}
    {id && <Button title="Delete record" variant="danger" disabled={saving || Boolean(activeWorkout)} onPress={() => setConfirm(true)} />}
    <ConfirmationModal visible={confirm} title="Delete this record?" message={['debts', 'repayments'].includes(module) ? 'Wallet balances and money owed will be recalculated. A debt with repayments cannot be deleted until those repayments are removed or reassigned.' : module === 'transactions' ? 'Its effect on wallet balances and spending will be removed. Linked paid bills and received income plans stay settled.' : 'It will disappear from your lists. Related tasks, notes, and transactions are kept.'} busy={saving} onCancel={() => setConfirm(false)} onConfirm={() => { if (id) void remove(module, id).then(ok => { setConfirm(false); if (ok) router.back(); }); }} />
  </Screen>;
}
export default function RecordEditorScreen() {
  const params = useLocalSearchParams<Params>();
  return isModuleKey(params.module) ? <Editor key={`${params.module}:${params.id ?? params.inboxId ?? 'new'}`} module={params.module} params={params} /> : <Screen><EmptyState title="Record type not found" description="Choose a module from More." /></Screen>;
}
