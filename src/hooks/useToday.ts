import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { dateOnly } from '../utils/dates';

export function useToday() {
  const [today, setToday] = useState(dateOnly);
  useEffect(() => {
    const update = () => setToday(dateOnly());
    const interval = setInterval(update, 30_000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') update(); });
    return () => { clearInterval(interval); subscription.remove(); };
  }, []);
  return today;
}
