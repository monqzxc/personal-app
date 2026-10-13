/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GEN1_POKEMON, getPokemon, pokemonEvolutionPath, pokemonProgress, pokemonSpriteUrl } from '../src/features/fitness/pokemon.ts';

test('catalog offers the original 151 in Pokédex order with unique Showdown sprite names', () => {
  assert.equal(GEN1_POKEMON.length, 151);
  assert.equal(new Set(GEN1_POKEMON.map(pokemon => pokemon.slug)).size, 151);
  assert.deepEqual(GEN1_POKEMON.map(pokemon => pokemon.id), Array.from({ length: 151 }, (_, index) => index + 1));
  assert.equal(getPokemon(1)?.name, 'Bulbasaur');
  assert.equal(getPokemon(151)?.name, 'Mew');
  assert.equal(getPokemon(29)?.slug, 'nidoranf');
  assert.equal(getPokemon(32)?.slug, 'nidoranm');
  assert.equal(getPokemon(83)?.slug, 'farfetchd');
  assert.equal(getPokemon(122)?.slug, 'mrmime');
  assert.equal(pokemonSpriteUrl('charizard-megax'), 'https://play.pokemonshowdown.com/sprites/gen5/charizard-megax.png');
});

test('Charmander hatches at 5 km and evolves at exactly 10, 20, 30 and 40 km', () => {
  assert.deepEqual(pokemonEvolutionPath(4).map(stage => [stage.name, stage.distanceKm]), [
    ['Egg', 0], ['Charmander', 5], ['Charmeleon', 10], ['Charizard', 20], ['Mega Charizard X', 30], ['Gigantamax Charizard', 40],
  ]);
  for (const [distance, name] of [[0, 'Egg'], [4.999, 'Egg'], [5, 'Charmander'], [9.999, 'Charmander'],
    [10, 'Charmeleon'], [19.999, 'Charmeleon'], [20, 'Charizard'], [29.999, 'Charizard'], [30, 'Mega Charizard X'],
    [39.999, 'Mega Charizard X'], [40, 'Gigantamax Charizard']] as const) {
    assert.equal(pokemonProgress(4, distance)?.current.name, name);
  }
  const egg = pokemonProgress(4, 2.5)!;
  assert.equal(egg.progress, 0.5);
  assert.equal(egg.next?.name, 'Charmander');
  const middle = pokemonProgress(4, 7.5)!;
  assert.equal(middle.xp, 7500);
  assert.equal(middle.level, 8);
  assert.equal(middle.progress, 0.5);
  assert.equal(middle.next?.name, 'Charmeleon');
  assert.equal(pokemonProgress(4, 15)?.progress, 0.5);
  const last = pokemonProgress(4, 120)!;
  assert.equal(last.xp, 120000);
  assert.equal(last.level, 100);
  assert.equal(last.progress, 1);
  assert.equal(last.next, undefined);
});

test('all selections begin as eggs and remaining supported forms use successive milestones', () => {
  assert.deepEqual(pokemonEvolutionPath(5).map(stage => [stage.slug, stage.distanceKm]), [
    ['egg', 0], ['charmeleon', 5], ['charizard', 10], ['charizard-megax', 20], ['charizard-gmax', 30],
  ]);
  assert.deepEqual(pokemonEvolutionPath(6).map(stage => [stage.slug, stage.distanceKm]), [
    ['egg', 0], ['charizard', 5], ['charizard-megax', 10], ['charizard-gmax', 20],
  ]);
  assert.deepEqual(pokemonEvolutionPath(133).map(stage => stage.name), ['Egg', 'Eevee', 'Vaporeon']);
  assert.deepEqual(pokemonEvolutionPath(135).map(stage => stage.name), ['Egg', 'Jolteon']);
  assert.deepEqual(pokemonEvolutionPath(44).map(stage => stage.name), ['Egg', 'Gloom', 'Vileplume']);
  assert.deepEqual(pokemonEvolutionPath(61).map(stage => stage.name), ['Egg', 'Poliwhirl', 'Poliwrath']);
  assert.deepEqual(pokemonEvolutionPath(79).map(stage => stage.name), ['Egg', 'Slowpoke', 'Slowbro', 'Mega Slowbro']);
  assert.deepEqual(pokemonEvolutionPath(25).map(stage => stage.name), ['Egg', 'Pikachu', 'Raichu']);
  assert.deepEqual(pokemonEvolutionPath(151).map(stage => [stage.name, stage.distanceKm]), [['Egg', 0], ['Mew', 5]]);
  assert.equal(pokemonProgress(151, 4.999)?.current.name, 'Egg');
  assert.equal(pokemonProgress(151, 5)?.current.name, 'Mew');
  assert.equal(pokemonProgress(151, 5)?.level, 6);
  assert.equal(pokemonProgress(151, 5)?.next, undefined);
  assert.deepEqual(pokemonEvolutionPath(131).map(stage => [stage.slug, stage.distanceKm]), [['egg', 0], ['lapras', 5], ['lapras-gmax', 10]]);
  assert.equal(pokemonProgress(131, 9.999)?.current.name, 'Lapras');
  assert.equal(pokemonProgress(131, 10)?.current.name, 'Gigantamax Lapras');
  assert.equal(pokemonEvolutionPath(150).at(-1)?.slug, 'mewtwo-megax');
  for (const pokemon of GEN1_POKEMON) {
    const stages = pokemonEvolutionPath(pokemon.id);
    assert.deepEqual(stages[0], { name: 'Egg', slug: 'egg', distanceKm: 0 });
    assert.deepEqual(stages[1], { name: pokemon.name, slug: pokemon.slug, distanceKm: 5 });
    assert.equal(pokemonProgress(pokemon.id, 4.999)?.current.name, 'Egg');
    assert.equal(pokemonProgress(pokemon.id, 5)?.current.slug, pokemon.slug);
    assert.ok(stages.every((stage, index) => index === 0 || stage.distanceKm > stages[index - 1]!.distanceKm));
  }
});

test('invalid selections and distances cannot produce invalid progress', () => {
  for (const id of [0, -1, 152, 1.5, NaN, Infinity]) {
    assert.equal(getPokemon(id), undefined);
    assert.equal(pokemonProgress(id, 10), undefined);
    assert.deepEqual(pokemonEvolutionPath(id), []);
  }
  for (const distance of [-5, NaN, Infinity, -Infinity]) {
    const progress = pokemonProgress(4, distance)!;
    assert.equal(progress.distanceKm, 0);
    assert.equal(progress.xp, 0);
    assert.equal(progress.level, 1);
    assert.equal(progress.current.name, 'Egg');
    assert.equal(progress.progress, 0);
  }
});

test('each run starts fresh and earlier progress cannot carry over', () => {
  assert.equal(pokemonProgress(4, 40)?.current.name, 'Gigantamax Charizard');
  const nextRun = pokemonProgress(4, 0)!;
  assert.equal(nextRun.current.name, 'Egg');
  assert.equal(nextRun.xp, 0);
  assert.equal(nextRun.level, 1);
  assert.equal(pokemonProgress(4, 3)?.current.name, 'Egg');
});
