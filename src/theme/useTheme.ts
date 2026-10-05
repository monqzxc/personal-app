import { useColorScheme } from 'react-native';
import { useAppStore } from '../stores/useAppStore';
import { palettes, radius, shadows, spacing, typography } from './tokens';

export function useTheme() {
  const preference = useAppStore(state => state.settings.theme);
  const system = useColorScheme();
  const mode = preference === 'system' ? system === 'dark' ? 'dark' : 'light' : preference;
  return { mode, colors: palettes[mode], spacing, radius, shadows, typography };
}
