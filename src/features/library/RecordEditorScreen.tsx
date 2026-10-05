import { useState } from 'react';
import { Linking, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppHeader, Button, Card, EmptyState, Label, Screen, layout } from '../../components/common/ui';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { RecordField } from '../../components/forms/RecordFields';
import { useAppStore } from '../../stores/useAppStore';
import { isModuleKey, moduleDefaults, modules } from './catalog';
import type { ModuleKey } from '../../types/life';
import { RelatedWorkspace } from './RelatedWorkspace';
import { dateOnly } from '../../utils/dates';

type Params = { module: string; id?: string; inboxId?: string; parentId?: string; parentType?: string; kind?: string; idea?: string; transactionType?: string };
function Editor({ module, params }: { module: ModuleKey; params: Params }) {
  const { id, inboxId, parentId, parentType, kind } = params;
  const data = useAppStore(state => state.data);
  const existing = data[module].find(item => item.id === id);
  const currency = useAppStore(state => state.settings.currency);
  const save = useAppStore(state => state.saveRecord);
  const remove = useAppStore(state => state.deleteRecord);
  const payBill = useAppStore(state => state.payBill);
  const renew = useAppStore(state => state.renewSubscription);
  const saving = useAppStore(state => state.saving);
  const capture = data.inbox.find(item => item.id === inboxId);
  const [draft, setDraft] = useState<Record<string, unknown>>(() => {
    const defaults = moduleDefaults(module, currency);
    if (capture) defaults[modules[module].titleField] = capture.content;
    if (parentId) {
      defaults[parentType === 'project' ? 'projectId' : 'tripId'] = parentId;
      if (parentType !== 'project' && 'currency' in defaults) defaults.currency = data.trips.find(item => item.id === parentId)?.currency ?? currency;
    }
    if (module === 'tripItems' && kind) defaults.kind = kind;
    if (module === 'projects' && params.idea) defaults.status = 'idea';
    if (module === 'transactions' && params.transactionType) defaults.type = params.transactionType;
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
  const conversionTypes = [ ['tasks', 'Task'], ['notes', 'Note'], ['transactions', 'Expense'], ['bills', 'Payment'], ['events', 'Event'], ['tripItems', 'Trip item'], ['bookmarks', 'Bookmark'], ['goals', 'Goal'] ] as const;
  return <Screen><AppHeader title={`${id ? 'Edit' : 'New'} ${modules[module].singular.toLowerCase()}`} eyebrow={inboxId ? 'Convert capture' : modules[module].title} />
    {module === 'accounts' && <Card><Label bold>Directory, not a password vault</Label><Label muted>Never enter passwords, API keys, or recovery codes in any field.</Label></Card>}
    {module === 'bills' && existing && !['paid', 'cancelled'].includes(String(draft.status)) && <Button title="Record payment & expense" variant="secondary" busy={saving} onPress={() => { void payBill(existing.id).then(ok => { if (ok) router.back(); }); }} />}
    {module === 'subscriptions' && existing && draft.status === 'active' && String(draft.nextBillingDate) <= dateOnly() && <Button title="Record renewal & expense" variant="secondary" busy={saving} onPress={() => { void renew(existing.id).then(ok => { if (ok) router.back(); }); }} />}
    {module === 'inbox' && existing && !converted && <Card><Label bold>Turn this into…</Label><View style={layout.wrap}>{conversionTypes.map(([key, label]) => <Button key={key} title={label} variant="secondary" onPress={() => router.replace({ pathname: key === 'tasks' ? '/task' : key === 'events' ? '/event' : '/record', params: { module: key, inboxId: existing.id } })} />)}</View><Label muted size={12}>The original capture is retained and linked after a successful save.</Label></Card>}
    {converted ? <Card><Label bold>Converted to {String(draft.convertedType)}</Label><Label>{String(draft.content)}</Label><Button title="Open converted record" variant="secondary" onPress={() => router.push({ pathname: draft.convertedType === 'tasks' ? '/task' : draft.convertedType === 'events' ? '/event' : '/record', params: { module: String(draft.convertedType), id: String(draft.convertedEntityId) } })} /></Card> : modules[module].fields.filter(field => !field.hidden).map(field => <RecordField key={field.key} field={field} value={draft[field.key]} onChange={value => setDraft(previous => ({ ...previous, [field.key]: value }))} />)}
    {module === 'bills' && <Label muted size={12}>“Record payment & expense” uses the saved amount and records an expense today. Changing status manually only tracks the bill and does not create a transaction.</Label>}
    {module === 'subscriptions' && <Label muted size={12}>Recording a renewal uses the saved amount, adds today’s expense, and advances one billing cycle. Estimates do not perform currency conversion.</Label>}
    {!converted && <Button title={id ? 'Save changes' : inboxId ? 'Create & process capture' : 'Save'} busy={saving} onPress={submit} />}
    <Button title="Back" variant="ghost" disabled={saving} onPress={() => router.back()} />
    {existing && modules[module].fields.filter(field => field.type === 'url' && (existing as unknown as Record<string, unknown>)[field.key]).map(field => <Button key={field.key} title={`Open ${field.label.toLowerCase()}`} variant="secondary" icon="open-outline" onPress={() => { void Linking.openURL(String((existing as unknown as Record<string, unknown>)[field.key])).catch(() => setLinkError('This link could not be opened.')); }} />)}
    {linkError && <Label>{linkError}</Label>}
    {existing && <RelatedWorkspace module={module} record={existing} />}
    {id && <Button title="Delete record" variant="danger" disabled={saving} onPress={() => setConfirm(true)} />}
    <ConfirmationModal visible={confirm} title="Delete this record?" message="It will disappear from your lists. Related tasks, notes, and transactions are kept." busy={saving} onCancel={() => setConfirm(false)} onConfirm={() => { if (id) void remove(module, id).then(ok => { setConfirm(false); if (ok) router.back(); }); }} />
  </Screen>;
}
export default function RecordEditorScreen() {
  const params = useLocalSearchParams<Params>();
  return isModuleKey(params.module) ? <Editor key={`${params.module}:${params.id ?? params.inboxId ?? 'new'}`} module={params.module} params={params} /> : <Screen><EmptyState title="Record type not found" description="Choose a module from More." /></Screen>;
}
