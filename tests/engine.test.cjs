'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine.js');
const near = { type: 'MOVE_ROD', distance: 0 };
const far = { type: 'MOVE_ROD', distance: 1 };
const ground = { type: 'SET_GROUNDED', value: true };
const disconnect = { type: 'SET_GROUNDED', value: false };
function run(mission, actions) {
  let state = E.createState(mission);
  for (const action of actions) {
    const old = JSON.stringify(state);
    const previous = state;
    state = E.reduce(state, action);
    assert.equal(JSON.stringify(previous), old, 'the reducer must not mutate the previous state');
    assert.deepEqual(E.checkInvariants(state), []);
  }
  return state;
}
test('negative rod induces separation without transferring a single electron', () => {
  const state = run(1, [near]);
  assert.equal(state.electroscopeNetCharge, 0);
  assert.equal(state.electronCount, 12);
  assert.equal(state.earthNetCharge, 0);
  assert.ok(state.leafChargeLeft < 0 && state.leafAngle > 0);
  assert.ok(state.topCharge > 0);
});
test('removing the rod reverses induction and closes neutral leaves', () => {
  const state = run(1, [near, far]);
  assert.equal(state.electroscopeNetCharge, 0);
  assert.equal(state.leafAngle, 0);
  assert.equal(state.operationComplete, false);
});
test('mission one cannot accidentally use the grounding path', () => {
  const state = run(1, [near, ground]);
  assert.equal(state.isGrounded, false);
  assert.equal(state.electroscopeNetCharge, 0);
});
test('near → ground → disconnect → far leaves net positive and open positive leaves', () => {
  const state = run(2, [near, ground, disconnect, far]);
  assert.equal(state.electroscopeNetCharge, 4);
  assert.equal(state.earthNetCharge, -4);
  assert.equal(state.electronCount, 8);
  assert.ok(state.leafChargeLeft > 0 && state.leafAngle > 0);
  assert.equal(state.taskPhase, 'check-charge');
  assert.equal(state.operationComplete, true);
});
test('near → ground → far → disconnect returns to neutral and explains the wrong order', () => {
  const state = run(2, [near, ground, far, disconnect]);
  assert.equal(state.electroscopeNetCharge, 0);
  assert.equal(state.electronCount, 12);
  assert.equal(state.leafAngle, 0);
  assert.equal(state.operationComplete, false);
  assert.equal(state.feedback, 'wrong-order');
});
test('moving through intermediate drag positions preserves charge at every step', () => {
  const actions = [near, ground];
  for (let i = 0; i <= 100; i++) actions.push({ type: 'MOVE_ROD', distance: i / 100 });
  const state = run(2, actions.concat(disconnect));
  assert.equal(state.electroscopeNetCharge, 0);
});
test('once isolated, moving the rod never changes net charge', () => {
  const actions = [near, ground, disconnect];
  for (let i = 0; i <= 100; i++) actions.push({ type: 'MOVE_ROD', distance: i / 100 });
  const state = run(2, actions);
  assert.equal(state.electroscopeNetCharge, 4);
});
test('grounding while far does not charge a neutral electroscope', () => {
  const state = run(2, [ground, disconnect]);
  assert.equal(state.electroscopeNetCharge, 0);
  assert.equal(state.operationComplete, false);
});
test('a wrong-order attempt can be retried without resetting or penalties', () => {
  const state = run(2, [near, ground, far, disconnect, near, ground, disconnect, far]);
  assert.equal(state.operationComplete, true);
  assert.equal(state.electroscopeNetCharge, 4);
});
test('completion requires both operation and the correct conceptual answer', () => {
  assert.equal(run(1, [{ type: 'ANSWER', value: 'neutral' }]).completed, false);
  assert.equal(run(1, [near, { type: 'ANSWER', value: 'positive' }]).completed, false);
  assert.equal(run(1, [near, { type: 'ANSWER', value: 'neutral' }]).completed, true);
  assert.equal(run(2, [near, ground, disconnect, far, { type: 'ANSWER', value: 'positive' }]).completed, true);
});
test('early rod removal cannot fake a completed charging operation', () => {
  const state = run(2, [near, far, ground, disconnect, { type: 'ANSWER', value: 'positive' }]);
  assert.equal(state.completed, false);
  assert.equal(state.electroscopeNetCharge, 0);
});
test('re-grounding a charged electroscope with rod far returns the electrons', () => {
  const state = run(2, [near, ground, disconnect, far, ground]);
  assert.equal(state.electroscopeNetCharge, 0);
  assert.equal(state.lastEvent.kind, 'from-earth');
  assert.equal(state.operationComplete, false);
});
test('equal spheres share -6 and 0 into -3 and -3, conserving the total', () => {
  const a = { charge: -6, size: 1 }, b = { charge: 0, size: 1 };
  const result = E.contactEqualSpheres(a, b);
  assert.equal(result.sphereA.charge, -3);
  assert.equal(result.sphereB.charge, -3);
  assert.equal(result.sphereA.charge + result.sphereB.charge, -6);
  assert.equal(a.charge, -6);
  assert.throws(() => E.contactEqualSpheres(a, { charge: 0, size: 2 }), RangeError);
});
test('distance boundaries and invalid inputs cannot corrupt the state', () => {
  assert.equal(run(1, [{ type: 'MOVE_ROD', distance: -10 }]).rodDistance, 0);
  assert.equal(run(1, [{ type: 'MOVE_ROD', distance: 10 }]).rodDistance, 1);
  assert.throws(() => E.reduce(E.createState(), { type: 'MOVE_ROD', distance: NaN }), TypeError);
  assert.throws(() => E.reduce(E.createState(2), { type: 'SET_GROUNDED', value: 'yes' }), TypeError);
});
test('deterministic exploratory action sequences keep every invariant', () => {
  let seed = 425;
  let state = E.createState(2);
  for (let i = 0; i < 3000; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const action = i % 3 ? { type: 'MOVE_ROD', distance: (seed % 1001) / 1000 } : { type: 'SET_GROUNDED', value: Boolean(seed % 2) };
    const previousCharge = state.electroscopeNetCharge;
    const wasGrounded = state.isGrounded;
    state = E.reduce(state, action);
    assert.deepEqual(E.checkInvariants(state), []);
    if (action.type === 'MOVE_ROD' && !wasGrounded) assert.equal(state.electroscopeNetCharge, previousCharge);
  }
});
