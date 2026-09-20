'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const B=require('../src/physical-boys-bench.js');

test('the five inquiry prompts are carried into the game',()=>{
  assert.equal(B.tasks.length,5);
  assert.match(B.tasks[0].think,/自由電子/);
  assert.match(B.tasks[4].verify,/再次張開/);
});
test('continuous rod distance uses the Physical-Boys plate and leaf formula',()=>{
  let s=B.createState();
  for(const dist of [0,1,14,37.5,50,76,100]){
    s=B.setDistance(s,dist);
    assert.equal(s.dist,dist);
    assert.equal(s.plateQ,dist);
    assert.ok(Math.abs(s.leafQ+dist)<1e-9);
    assert.equal(s.netQ,0);
  }
  assert.ok(B.leafAngle(s)>0);
});
test('ground, disconnect, then withdraw rod leaves positive net charge',()=>{
  let s=B.setDistance(B.createState(),100);
  s=B.toggleGround(s);
  assert.equal(s.leafQ,0);assert.equal(s.plateQ,200);assert.equal(s.flow.direction,'leaf-to-earth');
  s=B.toggleGround(s);
  assert.equal(s.isGrounded,false);assert.equal(s.netQ,200);
  s=B.setDistance(s,0);
  assert.equal(s.plateQ,100);assert.equal(s.leafQ,100);assert.equal(s.netQ,200);
});
test('with ground still connected, withdrawing the rod returns to neutral',()=>{
  let s=B.toggleGround(B.setDistance(B.createState(),100));
  s=B.setDistance(s,0);s=B.toggleGround(s);
  assert.equal(s.netQ,0);assert.equal(s.leafQ,0);
});
test('advanced negative preset with opposite positive rod closes and reopens leaves',()=>{
  let s=B.forceSetCharge(B.createState(),-100);
  s=B.setRod(s,1);
  s=B.setDistance(s,50);assert.equal(s.leafQ,0);
  s=B.setDistance(s,100);assert.equal(s.leafQ,50);assert.ok(B.leafAngle(s)>0);
  assert.match(B.chargeColor(s.leafQ),/^rgb\(/);
});
