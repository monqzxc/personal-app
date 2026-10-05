import { Modal, View } from 'react-native';
import { Button, Card, Label } from './ui';
import { useTheme } from '../../theme/useTheme';

export function ConfirmationModal({ visible, title, message, busy, onCancel, onConfirm }: {
  visible: boolean; title: string; message: string; busy: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  const { colors, spacing } = useTheme();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={busy ? undefined : onCancel}>
    <View style={{ flex: 1, backgroundColor: colors.overlay, padding: spacing.xl, justifyContent: 'center', alignItems: 'center' }}>
      <Card style={{ width: '100%', maxWidth: 420 }}><View accessibilityViewIsModal style={{ gap: spacing.lg }}>
        <Label size={22} bold>{title}</Label><Label muted>{message}</Label>
        <Button title="Delete" variant="danger" busy={busy} onPress={onConfirm} />
        <Button title="Keep it" variant="ghost" disabled={busy} onPress={onCancel} />
      </View></Card>
    </View>
  </Modal>;
}
