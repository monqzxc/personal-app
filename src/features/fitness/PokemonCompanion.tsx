import { useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Field, Icon, Label, layout } from '../../components/common/ui';
import { useTheme } from '../../theme/useTheme';
import { GEN1_POKEMON, pokemonProgress, pokemonSpriteUrl } from './pokemon';

export function PokemonSprite({ slug, size = 96 }: { slug: string; size?: number }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState('');
  return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    {failed === slug ? <Icon name={slug === 'egg' ? 'egg-outline' : 'sparkles-outline'} size={size / 2} color={colors.primary} />
      : <Image key={slug} accessible={false} source={{ uri: pokemonSpriteUrl(slug) }} resizeMode="contain" style={{ width: size, height: size }} onError={() => setFailed(slug)} />}
  </View>;
}

export function PokemonCompanion({ pokemonId, distanceKm, title = 'Your running partner' }: { pokemonId: number; distanceKm: number; title?: string }) {
  const { colors, radius, spacing } = useTheme();
  const progress = pokemonProgress(pokemonId, distanceKm);
  if (!progress) return null;
  const isEgg = progress.current.slug === 'egg';
  const percent = Math.round(progress.progress * 100);
  return <View style={{ gap: spacing.md, padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.primarySoft }}>
    <Label bold color={colors.primary}>{title}</Label>
    <View style={layout.row}>
      <PokemonSprite slug={progress.current.slug} />
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Label size={22} bold>{progress.current.name}</Label>
        <Label bold>{isEgg ? '' : `Lv. ${progress.level} · `}{progress.xp.toLocaleString()} XP</Label>
        <Label muted size={12}>{progress.distanceKm.toFixed(2)} km this run{isEgg ? ` · Hatches into ${progress.pokemon.name}` : progress.current.slug !== progress.pokemon.slug ? ` · Hatched as ${progress.pokemon.name}` : ''}</Label>
      </View>
    </View>
    {progress.next ? <>
      <Label bold>{(progress.next.distanceKm - progress.distanceKm).toFixed(2)} km to {isEgg ? `hatch ${progress.next.name}` : progress.next.name}</Label>
      <View accessibilityRole="progressbar" accessibilityLabel={isEgg ? `Progress to hatch ${progress.next.name}` : `Progress to ${progress.next.name}`} accessibilityValue={{ min: 0, max: 100, now: percent }} style={{ height: 8, overflow: 'hidden', borderRadius: radius.pill, backgroundColor: colors.border }}>
        <View style={{ height: '100%', width: `${percent}%`, backgroundColor: colors.primary }} />
      </View>
    </> : <Label muted>{progress.stages.length > 2 ? 'Final form reached. Keep running to earn XP!' : 'This partner has no further evolution. Running still earns XP!'}</Label>}
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xs }}>
      {progress.stages.map(stage => <View key={stage.slug} style={{ width: 100, alignItems: 'center', padding: spacing.sm, borderRadius: radius.sm, backgroundColor: stage.slug === progress.current.slug ? colors.surface : colors.transparent, opacity: progress.distanceKm >= stage.distanceKm ? 1 : 0.6 }}>
        <PokemonSprite slug={stage.slug} size={56} />
        <Label size={12} bold style={{ textAlign: 'center' }}>{stage.name}</Label>
        <Label size={12} muted>{progress.distanceKm >= stage.distanceKm ? '✓ ' : ''}{stage.distanceKm} km</Label>
      </View>)}
    </ScrollView>
    <Label muted size={12}>Every run starts with an egg. Hatch at 5 km, then evolve at 10 km and every 10 km after. 1 km = 1,000 XP.</Label>
  </View>;
}

export function PokemonPicker({ visible, selected, onSelect, onClose }: {
  visible: boolean; selected?: number; onSelect: (id?: number) => void; onClose: () => void;
}) {
  const { colors, spacing, radius } = useTheme();
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const dexNumber = /^#?\d+$/.test(query) ? Number(query.replace('#', '')) : undefined;
  const matches = GEN1_POKEMON.filter(pokemon => dexNumber === undefined
    ? pokemon.name.toLowerCase().includes(query) || pokemon.slug.includes(query)
    : pokemon.id === dexNumber);
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View accessibilityViewIsModal style={{ flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center', padding: spacing.lg, gap: spacing.md }}>
          <View style={layout.row}><View style={{ flex: 1 }}><Label size={22} bold>Choose your partner</Label><Label muted>Generation 1 · 151 Pokémon</Label></View><Button title="Done" variant="ghost" onPress={onClose} /></View>
          <Field label="Find a Pokémon" value={search} onChangeText={setSearch} placeholder="Name or Pokédex number" autoCorrect={false} />
          <FlatList data={matches} numColumns={3} keyExtractor={pokemon => String(pokemon.id)} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.md }} columnWrapperStyle={{ gap: spacing.sm }}
            ListEmptyComponent={<Label muted>No Pokémon found. Try another name or number.</Label>}
            renderItem={({ item }) => {
              return <Pressable accessibilityRole="button" accessibilityLabel={`Choose ${item.name}`} accessibilityState={{ selected: item.id === selected }} onPress={() => { onSelect(item.id); onClose(); }}
                style={({ pressed }) => ({ flex: 1, maxWidth: '33.33%', alignItems: 'center', padding: spacing.sm, borderRadius: radius.md, borderWidth: 2, borderColor: item.id === selected ? colors.primary : colors.border, backgroundColor: item.id === selected ? colors.primarySoft : colors.surface, opacity: pressed ? 0.7 : 1 })}>
                <Label muted size={12}>#{String(item.id).padStart(3, '0')}</Label><PokemonSprite slug={item.slug} size={64} /><Label size={12} bold style={{ textAlign: 'center' }}>{item.name}</Label>
              </Pressable>;
            }} />
          <Label muted size={12}>Your chosen Pokémon hatches from an egg at 5 km each run. Mega and Gigantamax forms are available for supported evolution paths. Sprite artwork loads online from Pokémon Showdown.</Label>
          <Button title="Run without a Pokémon" variant="secondary" onPress={() => { onSelect(undefined); onClose(); }} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
