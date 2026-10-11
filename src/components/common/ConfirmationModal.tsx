import { Modal, View } from 'react-native';
import { Button, Card, Label } from './ui';
import { useTheme } from '../../theme/useTheme';

export function ConfirmationModal({ visible, title, message, busy, onCancel, onConfirm, confirmTitle = 'Delete', cancelTitle = 'Keep it', confirmVariant = 'danger' }: {
  visible: boolean; title: string; message: string; busy: boolean; onCancel: () => void; onConfirm: () => void;
  confirmTitle?: string; cancelTitle?: string; confirmVariant?: 'primary' | 'danger';
}) {
  const { colors, spacing } = useTheme();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={busy ? undefined : onCancel}>
    <View style={{ flex: 1, backgroundColor: colors.overlay, padding: spacing.xl, justifyContent: 'center', alignItems: 'center' }}>
      <Card style={{ width: '100%', maxWidth: 420 }}><View accessibilityViewIsModal style={{ gap: spacing.lg }}>
        <Label size={22} bold>{title}</Label><Label muted>{message}</Label>
        <Button title={confirmTitle} variant={confirmVariant} busy={busy} onPress={onConfirm} />
        <Button title={cancelTitle} variant="ghost" disabled={busy} onPress={onCancel} />
      </View></Card>
    </View>
  </Modal>;
}
