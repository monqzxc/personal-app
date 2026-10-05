import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppHeader, Button, Card, Chips, EmptyState, Field, Icon, Label, Screen, layout } from '../../../components/common/ui';
import { ConfirmationModal } from '../../../components/common/ConfirmationModal';
import { useAppStore } from '../../../stores/useAppStore';
import { useTheme } from '../../../theme/useTheme';
import { createId } from '../../../services/container';
import { emptyTask } from '../taskService';
import type { TaskInput } from '../../../types/models';
import { ReminderField, RelationField } from '../../../components/forms/RecordFields';
import { DateField } from '../../../components/forms/DateField';

export default function TaskEditorScreen() {
  const { id, inboxId, projectId, goalId } = useLocalSearchParams<{ id?: string; inboxId?: string; projectId?: string; goalId?: string }>();
  const capture = useAppStore(state => state.data.inbox.find(item => item.id === inboxId));
  const existing = useAppStore(state => state.tasks.find(task => task.id === id));
  const save = useAppStore(state => state.saveTask);
  const remove = useAppStore(state => state.deleteTask);
  const saving = useAppStore(state => state.saving);
  const { colors, spacing } = useTheme();
  const [draft, setDraft] = useState<TaskInput>(() => existing ?? { ...emptyTask(), title: capture?.content ?? '', ...(projectId ? { projectId } : {}), ...(goalId ? { goalId } : {}) });
  const [newSubtask, setNewSubtask] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [localError, setLocalError] = useState('');
  function change<K extends keyof TaskInput>(key: K, value: TaskInput[K]) { setDraft(previous => ({ ...previous, [key]: value })); }
  function addSubtask() {
    const title = newSubtask.trim();
    if (!title) { setLocalError('Enter a subtask title first.'); return; }
    change('subtasks', [...draft.subtasks, { id: createId(), title, completed: false }]);
    setNewSubtask('');
    setLocalError('');
  }
  if (id && !existing) return <Screen><EmptyState title="Task not found" description="This task may have been deleted." action={<Button title="Back" onPress={() => router.back()} />} /></Screen>;
  return <Screen>
    <AppHeader title={id ? 'A little more detail.' : 'One thing at a time.'} eyebrow={id ? 'Edit task' : 'New task'} />
    <Field label="Title *" placeholder="What would you like to do?" value={draft.title} onChangeText={value => change('title', value)} maxLength={200} autoFocus />
    <Field label="Description" placeholder="A few details to get you started" value={draft.description} onChangeText={value => change('description', value)} multiline />
    <Field label="Category" placeholder="Personal, Work, Learning…" value={draft.category} onChangeText={value => change('category', value)} />
    <View style={layout.stack}><Label bold>Priority</Label><Chips items={['low', 'medium', 'high', 'urgent'] as const} value={draft.priority} onChange={value => change('priority', value)} /></View>
    <View style={layout.stack}><Label bold>Status</Label><Chips items={['pending', 'in_progress', 'completed', 'cancelled'] as const} value={draft.status} onChange={value => change('status', value)} /></View>
    <View style={[layout.row, { alignItems: 'flex-start' }]}>
      <View style={{ flex: 1 }}><DateField label="Due date" value={draft.dueDate} optional onChange={value => change('dueDate', value)} /></View>
      <View style={{ flex: 1 }}><Field label="Due time" placeholder="HH:mm" hint="Optional · 24-hour time" value={draft.dueTime ?? ''} onChangeText={value => change('dueTime', value || null)} autoCapitalize="none" maxLength={5} /></View>
    </View>
    <Field label="Tags" placeholder="home, errands, weekend" hint="Separate tags with commas." value={draft.tags.join(',')} onChangeText={value => change('tags', value.split(','))} />
    <Card><Label size={18} bold>Small steps</Label>
      {draft.subtasks.map(item => <View key={item.id} style={layout.row}>
        <Switch accessibilityLabel={`Complete subtask ${item.title}`} value={item.completed} trackColor={{ true: colors.primary }} onValueChange={value => change('subtasks', draft.subtasks.map(sub => sub.id === item.id ? { ...sub, completed: value } : sub))} />
        <View style={{ flex: 1 }}><Field label="Subtask title" value={item.title} maxLength={200} onChangeText={value => change('subtasks', draft.subtasks.map(sub => sub.id === item.id ? { ...sub, title: value } : sub))} /></View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove subtask ${item.title}`} onPress={() => change('subtasks', draft.subtasks.filter(sub => sub.id !== item.id))} style={{ padding: spacing.md }}><Icon name="close" color={colors.muted} /></Pressable>
      </View>)}
      <Field label="New subtask" placeholder="Break it into something smaller" value={newSubtask} onChangeText={setNewSubtask} maxLength={200} onSubmitEditing={addSubtask} />
      {localError && <Label color={colors.danger}>{localError}</Label>}
      <Button title="Add subtask" variant="secondary" icon="add" onPress={addSubtask} />
    </Card>
    <Field label="Notes" placeholder="Anything else worth remembering" value={draft.notes} onChangeText={value => change('notes', value)} multiline />
    <Card><View style={[layout.row, { justifyContent: 'space-between' }]}><Label bold>Recurring task</Label><Switch accessibilityLabel="Recurring task" value={draft.isRecurring} onValueChange={value => setDraft(previous => ({ ...previous, isRecurring: value, recurrence: value ? { frequency: 'weekly', interval: 1 } : null }))} /></View>
      {draft.recurrence && <><Chips items={['daily', 'weekly', 'monthly'] as const} value={draft.recurrence.frequency} onChange={frequency => change('recurrence', { frequency, interval: draft.recurrence!.interval })} /><Field label="Repeat interval" keyboardType="number-pad" value={String(draft.recurrence.interval)} onChangeText={value => change('recurrence', { frequency: draft.recurrence!.frequency, interval: Number(value) })} /></>}
      <Label muted size={12}>Completing a recurring task creates one next occurrence. Reminders must be set separately on the new occurrence.</Label>
    </Card>
    <ReminderField value={draft.reminder} onChange={value => change('reminder', value)} />
    <RelationField field={{ key: 'projectId', label: 'Project', type: 'relation', collection: 'projects' }} value={draft.projectId ?? ''} onChange={value => change('projectId', value || undefined)} />
    <RelationField field={{ key: 'goalId', label: 'Goal', type: 'relation', collection: 'goals' }} value={draft.goalId ?? ''} onChange={value => change('goalId', value || undefined)} />
    <Button title={id ? 'Save changes' : 'Create task'} busy={saving} onPress={() => { void save(draft, id, inboxId).then(ok => { if (ok) router.back(); }); }} />
    <Button title="Cancel" variant="ghost" disabled={saving} onPress={() => router.back()} />
    {id && <Button title="Delete task" variant="danger" icon="trash-outline" disabled={saving} onPress={() => setConfirm(true)} />}
    <ConfirmationModal visible={confirm} title="Delete this task?" message="This task will disappear from your lists and calendar." busy={saving} onCancel={() => setConfirm(false)} onConfirm={() => {
      if (id) void remove(id).then(ok => { setConfirm(false); if (ok) router.back(); });
    }} />
  </Screen>;
}
