export interface Pokemon { id: number; name: string; slug: string }
export interface PokemonStage { name: string; slug: string; distanceKm: number }

// National Pokédex order; sprite names follow Pokémon Showdown's gen5 directory.
const names = [
  'Bulbasaur', 'Ivysaur', 'Venusaur', 'Charmander', 'Charmeleon', 'Charizard', 'Squirtle', 'Wartortle', 'Blastoise',
  'Caterpie', 'Metapod', 'Butterfree', 'Weedle', 'Kakuna', 'Beedrill', 'Pidgey', 'Pidgeotto', 'Pidgeot', 'Rattata', 'Raticate',
  'Spearow', 'Fearow', 'Ekans', 'Arbok', 'Pikachu', 'Raichu', 'Sandshrew', 'Sandslash', 'Nidoran♀', 'Nidorina', 'Nidoqueen',
  'Nidoran♂', 'Nidorino', 'Nidoking', 'Clefairy', 'Clefable', 'Vulpix', 'Ninetales', 'Jigglypuff', 'Wigglytuff', 'Zubat', 'Golbat',
  'Oddish', 'Gloom', 'Vileplume', 'Paras', 'Parasect', 'Venonat', 'Venomoth', 'Diglett', 'Dugtrio', 'Meowth', 'Persian', 'Psyduck',
  'Golduck', 'Mankey', 'Primeape', 'Growlithe', 'Arcanine', 'Poliwag', 'Poliwhirl', 'Poliwrath', 'Abra', 'Kadabra', 'Alakazam',
  'Machop', 'Machoke', 'Machamp', 'Bellsprout', 'Weepinbell', 'Victreebel', 'Tentacool', 'Tentacruel', 'Geodude', 'Graveler', 'Golem',
  'Ponyta', 'Rapidash', 'Slowpoke', 'Slowbro', 'Magnemite', 'Magneton', "Farfetch'd", 'Doduo', 'Dodrio', 'Seel', 'Dewgong', 'Grimer',
  'Muk', 'Shellder', 'Cloyster', 'Gastly', 'Haunter', 'Gengar', 'Onix', 'Drowzee', 'Hypno', 'Krabby', 'Kingler', 'Voltorb', 'Electrode',
  'Exeggcute', 'Exeggutor', 'Cubone', 'Marowak', 'Hitmonlee', 'Hitmonchan', 'Lickitung', 'Koffing', 'Weezing', 'Rhyhorn', 'Rhydon',
  'Chansey', 'Tangela', 'Kangaskhan', 'Horsea', 'Seadra', 'Goldeen', 'Seaking', 'Staryu', 'Starmie', 'Mr. Mime', 'Scyther', 'Jynx',
  'Electabuzz', 'Magmar', 'Pinsir', 'Tauros', 'Magikarp', 'Gyarados', 'Lapras', 'Ditto', 'Eevee', 'Vaporeon', 'Jolteon', 'Flareon',
  'Porygon', 'Omanyte', 'Omastar', 'Kabuto', 'Kabutops', 'Aerodactyl', 'Snorlax', 'Articuno', 'Zapdos', 'Moltres', 'Dratini',
  'Dragonair', 'Dragonite', 'Mewtwo', 'Mew',
];
export const GEN1_POKEMON: readonly Pokemon[] = names.map((name, index) => ({
  id: index + 1,
  name,
  slug: name.toLowerCase().replace('♀', 'f').replace('♂', 'm').replace(/[^a-z]/g, ''),
}));

export function getPokemon(id: number): Pokemon | undefined {
  return Number.isInteger(id) ? GEN1_POKEMON[id - 1] : undefined;
}
export function pokemonSpriteUrl(slug: string) {
  return `https://play.pokemonshowdown.com/sprites/gen5/${slug}.png`;
}

// Ordinary evolutions stay in Gen 1. Branches use Vileplume, Poliwrath, Slowbro and Vaporeon.
const evolutionFamilies = [
  [1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12], [13, 14, 15], [16, 17, 18], [19, 20], [21, 22], [23, 24],
  [25, 26], [27, 28], [29, 30, 31], [32, 33, 34], [35, 36], [37, 38], [39, 40], [41, 42], [43, 44, 45],
  [46, 47], [48, 49], [50, 51], [52, 53], [54, 55], [56, 57], [58, 59], [60, 61, 62], [63, 64, 65],
  [66, 67, 68], [69, 70, 71], [72, 73], [74, 75, 76], [77, 78], [79, 80], [81, 82], [84, 85], [86, 87],
  [88, 89], [90, 91], [92, 93, 94], [96, 97], [98, 99], [100, 101], [102, 103], [104, 105], [109, 110],
  [111, 112], [116, 117], [118, 119], [120, 121], [129, 130], [133, 134], [138, 139], [140, 141], [147, 148, 149],
];

// Only forms with artwork in https://play.pokemonshowdown.com/sprites/gen5/ are included.
const megaIds = new Set([3, 6, 9, 15, 18, 36, 65, 71, 80, 94, 115, 121, 127, 130, 142, 149, 150]);
const gigantamaxIds = new Set([3, 6, 9, 12, 68, 94, 99, 131, 143]);

export function pokemonEvolutionPath(id: number): PokemonStage[] {
  if (!getPokemon(id)) return [];
  const family = evolutionFamilies.find(ids => ids.includes(id));
  const remaining = family ? family.slice(family.indexOf(id)) : [id];
  const stages = remaining.map((speciesId, index) => {
    const pokemon = getPokemon(speciesId)!;
    return { name: pokemon.name, slug: pokemon.slug, distanceKm: index === 0 ? 5 : index * 10 };
  });
  const finalId = remaining.at(-1)!;
  const final = getPokemon(finalId)!;
  if (megaIds.has(finalId)) {
    const variant = finalId === 6 || finalId === 150 ? 'x' : '';
    stages.push({ name: `Mega ${final.name}${variant ? ' X' : ''}`, slug: `${final.slug}-mega${variant}`, distanceKm: stages.length * 10 });
  }
  if (gigantamaxIds.has(finalId)) {
    stages.push({ name: `Gigantamax ${final.name}`, slug: `${final.slug}-gmax`, distanceKm: stages.length * 10 });
  }
  return [{ name: 'Egg', slug: 'egg', distanceKm: 0 }, ...stages];
}

export function pokemonProgress(id: number, distanceKm: number) {
  const pokemon = getPokemon(id);
  if (!pokemon) return undefined;
  const distance = Number.isFinite(distanceKm) ? Math.max(0, distanceKm) : 0;
  const stages = pokemonEvolutionPath(id);
  const current = stages.findLast(stage => stage.distanceKm <= distance)!;
  const next = stages.find(stage => stage.distanceKm > distance);
  const xp = Math.floor(distance * 1000);
  return {
    pokemon, stages, current, next, distanceKm: distance, xp, level: Math.min(100, Math.floor(xp / 1000) + 1),
    progress: next ? (distance - current.distanceKm) / (next.distanceKm - current.distanceKm) : 1,
  };
}
