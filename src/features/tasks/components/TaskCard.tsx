import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import type { Task } from '../../../types/models';
import { Badge, Card, Icon, Label, layout } from '../../../components/common/ui';
import { useTheme } from '../../../theme/useTheme';
import { useAppStore } from '../../../stores/useAppStore';
import { formatDate } from '../../../utils/dates';
import { isOverdue } from '../selectors';
import { useRef } from 'react';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Button } from '../../../components/common/ui';

export function TaskCard({ task }: { task: Task }) {
  const { colors, spacing } = useTheme();
  const toggle = useAppStore(state => state.toggleTask);
  const saving = useAppStore(state => state.saving);
  const completed = task.status === 'completed';
  const swipe = useRef<SwipeableMethods>(null);
  return <Swipeable ref={swipe} renderRightActions={() => <View style={{ justifyContent: 'center', padding: spacing.sm }}><Button title={completed ? 'Reopen' : 'Complete'} disabled={saving} onPress={() => { swipe.current?.close(); void toggle(task.id); }} /></View>}><Card><View style={layout.row}>
    <Pressable accessibilityRole="checkbox" accessibilityLabel={`Complete ${task.title}`} accessibilityState={{ checked: completed, disabled: saving }}
      disabled={saving} onPress={() => void toggle(task.id)} style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}>
      <Icon name={completed ? 'checkmark-circle' : 'ellipse-outline'} color={completed ? colors.primary : colors.muted} size={26} />
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${task.title}`} onPress={() => router.push({ pathname: '/task', params: { id: task.id } })} style={{ flex: 1, gap: spacing.sm }}>
      <Label bold style={{ textDecorationLine: completed ? 'line-through' : 'none' }}>{task.title}</Label>
      <View style={layout.wrap}>
        <Label size={12} muted>{task.category}</Label>
        {task.dueDate && <Label size={12} color={isOverdue(task) ? colors.danger : colors.muted}>{formatDate(task.dueDate)}{task.dueTime ? ` · ${task.dueTime}` : ''}</Label>}
        {task.subtasks.length > 0 && <Label size={12} muted>{task.subtasks.filter(item => item.completed).length}/{task.subtasks.length} subtasks</Label>}
      </View>
      <View style={layout.wrap}><Badge title={task.priority} tone={task.priority === 'urgent' ? 'danger' : task.priority === 'high' ? 'warning' : 'neutral'} />
        {task.status !== 'pending' && <Badge title={task.status.replaceAll('_', ' ')} tone={completed ? 'primary' : 'neutral'} />}</View>
    </Pressable>
    <Icon name="chevron-forward" color={colors.muted} size={16} />
  </View></Card></Swipeable>;
}
