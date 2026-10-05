import { router } from 'expo-router';
import { Button, EmptyState, Screen } from '../components/common/ui';
export default function NotFoundScreen() {
  return <Screen><EmptyState title="A page out of place" description="This page doesn’t exist. Let’s get you home." action={<Button title="Go home" onPress={() => router.replace('/')} />} /></Screen>;
}
