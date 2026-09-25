'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const F=require('../src/friction.js');

test('both pairs start neutral and keep the same total number of electrons',()=>{
  for(const pair of Object.keys(F.pairs)){
    let state=F.createState(pair);
    assert.equal(F.tally(state).tool.net,0);
    assert.equal(F.tally(state).cloth.net,0);
    state=F.predict(state,F.pairs[pair].receiver);
    for(let i=0;i<4;i++){
      state=F.rub(state);
      const q=F.tally(state);
      assert.equal(q.totalNet,0);
      assert.equal(q.totalElectrons,12);
      assert.equal(q.tool.positive,6);
      assert.equal(q.cloth.positive,6);
      assert.equal(state.flow.from,F.pairs[pair].donor);
      assert.equal(state.flow.to,F.pairs[pair].receiver);
    }
    assert.equal(state.strokes,4);
    assert.equal(F.rub(state),state,'the model cannot transfer a fifth electron');
  }
});

test('fur gives four electrons to the plastic ruler',()=>{
  let state=F.predict(F.createState('plastic'),'tool');
  for(let i=0;i<4;i++)state=F.rub(state);
  assert.deepEqual(F.tally(state).tool,{positive:6,electrons:10,net:-4});
  assert.deepEqual(F.tally(state).cloth,{positive:6,electrons:2,net:4});
  assert.equal(F.answer(state,'tool').complete,true);
});

test('glass gives four electrons to silk, reversing the visible flow',()=>{
  let state=F.predict(F.createState('glass'),'cloth');
  for(let i=0;i<4;i++)state=F.rub(state);
  assert.deepEqual(F.tally(state).tool,{positive:6,electrons:2,net:4});
  assert.deepEqual(F.tally(state).cloth,{positive:6,electrons:10,net:-4});
  assert.equal(F.answer(state,'cloth').complete,true);
});

test('prediction and operation are both required, but a wrong answer is retryable',()=>{
  let state=F.createState('glass');
  state=F.rub(state);
  assert.equal(state.strokes,0);
  assert.equal(state.feedback,'predict-first');
  state=F.predict(state,'tool'); // A misconception is allowed as a hypothesis.
  state=F.answer(state,'cloth');
  assert.equal(state.feedback,'rub-first');
  for(let i=0;i<4;i++)state=F.rub(state);
  const before=F.tally(state);
  state=F.answer(state,'tool');
  assert.equal(state.complete,false);
  assert.equal(state.feedback,'check-electron-direction');
  assert.deepEqual(F.tally(state),before);
  state=F.answer(state,'cloth');
  assert.equal(state.complete,true);
});

test('switching or resetting a pair cannot leak transferred charge into the next trial',()=>{
  let state=F.predict(F.createState('plastic'),'tool');
  state=F.rub(F.rub(state));
  state=F.selectPair(state,'glass');
  assert.equal(state.strokes,0);
  assert.equal(state.prediction,null);
  assert.equal(F.tally(state).totalNet,0);
  assert.throws(()=>F.createState('balloon'),RangeError);
});
