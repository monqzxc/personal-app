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

test('Charmander changes at exactly 5, 10, 20 and 40 total km and keeps earning XP', () => {
  assert.deepEqual(pokemonEvolutionPath(4).map(stage => [stage.name, stage.distanceKm]), [
    ['Charmander', 0], ['Charmeleon', 5], ['Charizard', 10], ['Mega Charizard X', 20], ['Gigantamax Charizard', 40],
  ]);
  for (const [distance, name] of [[0, 'Charmander'], [4.999, 'Charmander'], [5, 'Charmeleon'], [9.999, 'Charmeleon'],
    [10, 'Charizard'], [19.999, 'Charizard'], [20, 'Mega Charizard X'], [39.999, 'Mega Charizard X'], [40, 'Gigantamax Charizard']] as const) {
    assert.equal(pokemonProgress(4, distance)?.current.name, name);
  }
  const middle = pokemonProgress(4, 7.5)!;
  assert.equal(middle.xp, 7500);
  assert.equal(middle.level, 8);
  assert.equal(middle.progress, 0.5);
  assert.equal(middle.next?.name, 'Charizard');
  const last = pokemonProgress(4, 120)!;
  assert.equal(last.xp, 120000);
  assert.equal(last.level, 100);
  assert.equal(last.progress, 1);
  assert.equal(last.next, undefined);
});

test('evolved selections start as selected and only follow available Gen 1 stages', () => {
  assert.deepEqual(pokemonEvolutionPath(5).map(stage => [stage.slug, stage.distanceKm]), [
    ['charmeleon', 0], ['charizard', 5], ['charizard-megax', 20], ['charizard-gmax', 40],
  ]);
  assert.deepEqual(pokemonEvolutionPath(133).map(stage => stage.name), ['Eevee', 'Vaporeon']);
  assert.deepEqual(pokemonEvolutionPath(135).map(stage => stage.name), ['Jolteon']);
  assert.deepEqual(pokemonEvolutionPath(44).map(stage => stage.name), ['Gloom', 'Vileplume']);
  assert.deepEqual(pokemonEvolutionPath(61).map(stage => stage.name), ['Poliwhirl', 'Poliwrath']);
  assert.deepEqual(pokemonEvolutionPath(79).map(stage => stage.name), ['Slowpoke', 'Slowbro', 'Mega Slowbro']);
  assert.deepEqual(pokemonEvolutionPath(25).map(stage => stage.name), ['Pikachu', 'Raichu']);
  assert.deepEqual(pokemonEvolutionPath(151).map(stage => stage.name), ['Mew']);
  assert.equal(pokemonProgress(151, 5)?.level, 6);
  assert.equal(pokemonProgress(151, 5)?.next, undefined);
  assert.deepEqual(pokemonEvolutionPath(131).map(stage => [stage.slug, stage.distanceKm]), [['lapras', 0], ['lapras-gmax', 40]]);
  assert.equal(pokemonEvolutionPath(150).at(-1)?.slug, 'mewtwo-megax');
  for (const pokemon of GEN1_POKEMON) {
    const stages = pokemonEvolutionPath(pokemon.id);
    assert.equal(stages[0]?.slug, pokemon.slug);
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
    assert.equal(progress.current.name, 'Charmander');
    assert.equal(progress.progress, 0);
  }
});

test('each run starts fresh and earlier progress cannot carry over', () => {
  assert.equal(pokemonProgress(4, 40)?.current.name, 'Gigantamax Charizard');
  const nextRun = pokemonProgress(4, 0)!;
  assert.equal(nextRun.current.name, 'Charmander');
  assert.equal(nextRun.xp, 0);
  assert.equal(nextRun.level, 1);
  assert.equal(pokemonProgress(4, 3)?.current.name, 'Charmander');
});
