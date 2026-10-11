/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { INDICATOR_ART, INDICATOR_WAVE, LIQUID_BAR_TOP, liquidBarHeight, liquidBodyHeight, liquidTabGeometry } from '../src/components/navigation/liquidTabGeometry.ts';

test('all five phone tabs fit with reachable targets and space for both end notches', () => {
  for (const width of [272, 296, 328, 366, 420, 560]) {
    const g = liquidTabGeometry(width, 5);
    assert.equal(g.compact, false);
    assert.ok(g.touchWidth >= 44, `${width}: touch width`);
    assert.ok(g.bubbleSize >= 32 && g.bubbleSize <= 54);
    // The wave grows the notch's total half-width by at most one pixel.
    assert.ok(g.centers[0]! - g.notchRadius - g.shoulder - 1 >= g.corner);
    assert.ok(g.centers[4]! + g.notchRadius + g.shoulder + 1 <= width - g.corner);
    assert.ok(g.centers[0]! - g.touchWidth / 2 >= 0);
    assert.ok(g.centers[4]! + g.touchWidth / 2 <= width);
    for (let i = 1; i < g.centers.length; i++) assert.ok(g.centers[i]! - g.centers[i - 1]! >= g.touchWidth - 0.0001);
  }
});

test('interpolated selection stays inside the bar during long and interrupted moves', () => {
  for (const width of [296, 560]) {
    const g = liquidTabGeometry(width, 5);
    for (const index of [0, 0.1, 0.5, 1.9, 2.2, 3.6, 4]) {
      const center = g.first + index * g.step;
      assert.ok(center - g.bubbleSize * 1.12 / 2 >= 0);
      assert.ok(center + g.bubbleSize * 1.12 / 2 <= width);
    }
    assert.equal(g.first + 4 * g.step, g.centers[4]);
  }
});

test('the fluffy indicator, ear and tail included, stays inside the bar while it travels and wobbles', () => {
  for (const width of [240, 272, 296, 328, 366, 420, 560]) {
    const g = liquidTabGeometry(width, 5);
    const size = g.indicatorSize;
    const half = Math.max(INDICATOR_ART.bodyX - INDICATOR_ART.left, INDICATOR_ART.right - INDICATOR_ART.bodyX) * size;
    const earRise = (INDICATOR_ART.bodyY - INDICATOR_ART.top) * size;
    // Tilting swings the ear tip sideways by up to rise * sin(tilt).
    const reach = half * (1 + INDICATOR_WAVE.stretch) + earRise * Math.sin(INDICATOR_WAVE.tilt * Math.PI / 180);
    for (const index of [0, 0.1, 0.5, 1.9, 2.2, 3.6, 4]) {
      const center = g.first + index * g.step;
      assert.ok(center - reach >= 0, `${width}@${index}: left edge`);
      assert.ok(center + reach <= width, `${width}@${index}: right edge`);
    }
    // The ear may rise into the space above the bar, but not past the top of the tab bar.
    assert.ok(LIQUID_BAR_TOP + g.indicatorCenter - earRise - INDICATOR_WAVE.hop >= 0, `${width}: ear top`);
    assert.ok(size >= 57 && size <= 98, `${width}: indicator size ${size}`);
  }
});

test('the active icon rises onto the centre of the indicator body', () => {
  for (const width of [240, 296, 420]) {
    const g = liquidTabGeometry(width, 5);
    assert.ok(g.iconLift >= 0);
    // Resting icons are centred 24dp below the bar top; the focused icon lifts onto the body.
    assert.equal(24 - g.iconLift, g.indicatorCenter);
  }
  assert.equal(liquidTabGeometry(240, 5).iconLift, 0);
});

test('very narrow windows use compact slots and a single tab stays centered', () => {
  const compact = liquidTabGeometry(240, 5);
  assert.equal(compact.compact, true);
  assert.equal(compact.touchWidth, 48);
  assert.equal(liquidTabGeometry(320, 6).compact, true);
  assert.deepEqual(compact.centers, [24, 72, 120, 168, 216]);
  assert.equal(liquidTabGeometry(320, 1).centers[0], 160);
  assert.throws(() => liquidTabGeometry(0, 5), /dimensions/);
  assert.throws(() => liquidTabGeometry(320, 0), /dimensions/);
});

test('bar reservation and Quick Add offset can honor bottom safe areas and larger text', () => {
  assert.equal(liquidBarHeight(0), 114);
  assert.equal(liquidBarHeight(34), 136);
  assert.equal(liquidBodyHeight(2), 88);
  assert.equal(liquidBarHeight(34, 2), 154);
  assert.equal(liquidBodyHeight(0.8), 70);
});
