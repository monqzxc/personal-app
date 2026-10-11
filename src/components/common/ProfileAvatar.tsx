import { useState } from 'react';
import { Image, View } from 'react-native';
import { Label } from './ui';
import { useTheme } from '../../theme/useTheme';

export function ProfileAvatar({ name, photo, size = 48 }: { name: string; photo?: string; size?: number }) {
  const { colors } = useTheme();
  const [failedPhoto, setFailedPhoto] = useState<string>();
  return <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: colors.primarySoft, borderColor: colors.primary, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
    {photo && photo !== failedPhoto
      ? <Image accessible={false} source={{ uri: photo }} resizeMode="cover" onError={() => setFailedPhoto(photo)} style={{ width: '100%', height: '100%' }} />
      : <Label bold size={size * 0.42} color={colors.primary}>{[...name.trim()][0]?.toUpperCase() ?? 'M'}</Label>}
  </View>;
}
