const test=require('node:test'),assert=require('node:assert/strict'),L=require('../src/lab-layout.js'),I=require('../src/inquiry-engine.js');
test('legacy electroscope/table geometry is extracted byte-for-byte, including every numeric coordinate',()=>{
  const fs=require('node:fs'),path=require('node:path'),old=fs.readFileSync(path.join(__dirname,'../src/game.js'),'utf8'),current=fs.readFileSync(path.join(__dirname,'../src/electroscope-station.js'),'utf8');
  const between=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b)).trim();
  assert.equal(between(old,'// One real bench','// Empty equipment'),between(current,'// One real bench','// Electroscope stem'));
  assert.equal(between(old,'// Electroscope stem','// Keep the original'),between(current,'// Electroscope stem','const rod=new T.Group()'));
});
test('new room is approximately twice the old area; all desks are reachable',()=>{
  assert.ok(L.floorArea/L.previousFloorArea>2&&L.floorArea/L.previousFloorArea<2.3);
  const step=.4,key=(x,z)=>`${x},${z}`,start=[Math.round(L.start.x/step),Math.round(L.start.z/step)],open=[start],seen=new Set([key(...start)]);
  for(let i=0;i<open.length;i++){const [x,z]=open[i];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=key(nx,nz);if(seen.has(k)||L.blocked(nx*step,nz*step))continue;seen.add(k);open.push([nx,nz]);}}
  for(const s of L.stations)assert.ok(open.some(([x,z])=>Math.hypot(x*step-s.approach[0],z*step-s.approach[1])<.6),s.id+' has a walkable approach');
});
test('large steps cannot tunnel through desks and walls',()=>{const p=L.move({x:0,z:4},0,-10);assert.ok(p.z>=1.25);const q=L.move({x:10,z:5.6},100,0);assert.ok(q.x<=11.31);});
test('isolated induction only separates charge; grounding respects electron count and order',()=>{
  for(const rod of [-1,1]){const s=I.changeInduction(I.induction(rod),{near:true});assert.equal(s.electrons,6);assert.equal(s.flow,null);
    const g=I.changeInduction(s,{grounded:true});assert.equal(g.electrons,rod===-1?2:10);assert.equal(6-g.electrons+g.earthQ,0);assert.equal(g.flow.from,rod<0?'metal':'earth');
    const isolated=I.changeInduction(g,{grounded:false}),done=I.changeInduction(isolated,{near:false});assert.equal(done.electrons,g.electrons);assert.equal(6-done.electrons,rod<0?4:-4);
    const wrong=I.changeInduction(g,{near:false});assert.equal(wrong.electrons,6);assert.equal(wrong.earthQ,0);
  }
});
test('equal isolated spheres share charge, retain it, and do not transfer again when balanced',()=>{for(const sign of [-1,1]){const s=I.touch(I.contact(sign));assert.equal(s.a,sign*4);assert.equal(s.b,sign*4);assert.equal(s.flow.from,sign<0?'a':'b');assert.equal(s.a+s.b,sign*8);assert.equal(I.separate(s).a,sign*4);const again=I.touch(I.separate(s));assert.equal(again.flow,null);assert.equal(again.a,sign*4);assert.equal(again.b,sign*4);}});
test('balloon attracts neutral board without giving it net charge',()=>{let s=I.rubBalloon(I.balloon());s=I.distanceBalloon(s,2);assert.equal(s.balloonQ+s.sweaterQ,0);assert.equal(s.boardQ,0);assert.equal(s.distance,2);});
