const assert = require('node:assert/strict');
const { test } = require('node:test');
const { distanceKm, distanceMiles, matchesLocationFilter } = require('../src/lib/location.ts');

const origin = { latitude: 0, longitude: 0 };

test('distance uses miles, including zero latitude and longitude', () => {
  assert.equal(distanceMiles(origin, origin), 0);
  assert.ok(Math.abs(distanceMiles(origin, { latitude: 0, longitude: 1 }) - 69.093) < 0.01);
});

test('nearby filtering includes the boundary and excludes a farther post', () => {
  const post = { latitude: 0, longitude: 0.1 };
  assert.equal(matchesLocationFilter(post, origin, 10), true);
  assert.equal(matchesLocationFilter(post, origin, 5), false);
  assert.equal(matchesLocationFilter(post, origin, distanceMiles(origin, post)), true);
});

test('unknown post locations appear only with any distance selected', () => {
  assert.equal(matchesLocationFilter({}, origin, 10), false);
  assert.equal(matchesLocationFilter({ latitude: 0 }, origin, 10), false);
  assert.equal(matchesLocationFilter({ latitude: null, longitude: null }, origin, null), true);
  assert.equal(matchesLocationFilter(origin, null, 10), false);
});

test('distance follows the short path across the date line', () => {
  const distance = distanceKm({ latitude: 0, longitude: 179.99 }, { latitude: 0, longitude: -179.99 });
  assert.ok(distance > 2 && distance < 3);
});
