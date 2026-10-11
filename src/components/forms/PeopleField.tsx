import { useState } from 'react';
import { Switch, View } from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from '../../stores/useAppStore';
import { useTheme } from '../../theme/useTheme';
import { Button, Card, Field, Label, layout } from '../common/ui';

export function PeopleField({ value, onChange, label = 'People (optional)' }: { value: string[]; onChange: (value: string[]) => void; label?: string }) {
  const people = useAppStore(state => state.data.people);
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const matches = people.filter(person => !value.includes(person.id) && person.name.toLowerCase().includes(search.trim().toLowerCase()));
  const options = [...value.map(id => ({ id, name: people.find(person => person.id === id)?.name ?? 'Person no longer available' })), ...matches.slice(0, 15)];
  return <Card>
    <Label bold>{label}</Label>
    <Label muted>{value.length ? `${value.length} selected` : 'No people linked'}</Label>
    <Field label="Find people" placeholder="Search by name" value={search} onChangeText={setSearch} />
    {options.map(person => <View key={person.id} style={layout.row}>
      <Switch accessibilityLabel={`Include ${person.name}`} value={value.includes(person.id)} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surface} onValueChange={selected => onChange(selected ? [...value, person.id] : value.filter(id => id !== person.id))} />
      <Label style={{ flex: 1 }}>{person.name}</Label>
    </View>)}
    {matches.length > 15 && <Label muted size={12}>Search to find more people.</Label>}
    {!options.length && <Label muted>{people.length ? 'No people match this search.' : 'Add a person to link them to this record.'}</Label>}
    <Button title="Add a person" variant="ghost" onPress={() => router.push({ pathname: '/record', params: { module: 'people' } })} />
  </Card>;
}
