import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { AppHeader, Card, Icon, Label, Screen, layout, type IconName } from '../../components/common/ui';
import { useTheme } from '../../theme/useTheme';
import type { ModuleKey } from '../../types/life';
import { modules } from '../library/catalog';

const entries: { module: ModuleKey; icon: IconName }[] = [
  { module: 'activities', icon: 'walk-outline' },
  { module: 'people', icon: 'people-outline' },
  { module: 'moneyCollections', icon: 'folder-outline' },
  { module: 'inbox', icon: 'file-tray-outline' }, { module: 'trips', icon: 'airplane-outline' },
  { module: 'projects', icon: 'code-slash-outline' }, { module: 'goals', icon: 'flag-outline' },
  { module: 'notes', icon: 'document-text-outline' }, { module: 'bookmarks', icon: 'bookmark-outline' },
  { module: 'accounts', icon: 'key-outline' }, { module: 'subscriptions', icon: 'repeat-outline' },
  { module: 'importantDates', icon: 'gift-outline' },
];
export default function MoreScreen() {
  const { colors } = useTheme();
  return <Screen><AppHeader title="Everything has a place." eyebrow="Your space" />
    {[{ title: 'Search everything', icon: 'search-outline' as const, route: '/search' as const }, { title: 'Personal analytics', icon: 'stats-chart-outline' as const, route: '/analytics' as const }, { title: 'Settings & integrations', icon: 'settings-outline' as const, route: '/settings' as const }].map(item => <Pressable key={item.title} accessibilityRole="button" onPress={() => router.push(item.route)}><Card><View style={layout.row}><Icon name={item.icon} color={colors.primary} /><View style={{ flex: 1 }}><Label bold>{item.title}</Label></View><Icon name="chevron-forward" size={18} /></View></Card></Pressable>)}
    {entries.map(item => <Pressable key={item.module} accessibilityRole="button" onPress={() => router.push({ pathname: '/module', params: { module: item.module } })}><Card><View style={layout.row}><Icon name={item.icon} color={colors.primary} /><View style={{ flex: 1 }}><Label bold>{modules[item.module].title}</Label></View><Icon name="chevron-forward" size={18} /></View></Card></Pressable>)}
  </Screen>;
}
