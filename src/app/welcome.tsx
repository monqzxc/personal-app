import { router } from 'expo-router';
import OnboardingScreen from '../features/onboarding/OnboardingScreen';

export default function WelcomeTour() {
  return <OnboardingScreen replay onFinish={() => { if (router.canDismiss()) router.dismiss(); else router.replace('/'); }} />;
}
