'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {mkdirSync,writeFileSync}=require('node:fs');
const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const root=process.env.LAB_GAME_ROOT||path.join(__dirname,'..');
const out=process.env.LAB_GAME_OUTPUT||path.join(root,'artifacts','game-3d');
const wait=(page,p)=>page.waitForFunction(p,null,{timeout:20000});
const snap=page=>page.evaluate(()=>window.labGame.snapshot());
const gap=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
function diff(a,b){a=PNG.sync.read(a);b=PNG.sync.read(b);let n=0;for(let i=0;i<a.data.length;i+=4)if(Math.abs(a.data[i]-b.data[i])+Math.abs(a.data[i+1]-b.data[i+1])+Math.abs(a.data[i+2]-b.data[i+2])>40)n++;return n;}
(async()=>{
 mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,...(process.platform==='darwin'?{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}:{})});const errors=[];
 try{
  const context=await browser.newContext({viewport:{width:1365,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const url=pathToFileURL(path.join(root,'lab_3d_walk_preview_0919_v1.html')).href;
  await page.goto(url);await wait(page,()=>!!window.labGame);await page.waitForTimeout(900);
  assert.equal((await snap(page)).mode,'walk');await page.locator('#game').screenshot({path:path.join(out,'room.png')});
  const start=await snap(page);await page.keyboard.down('d');await page.waitForTimeout(650);await page.keyboard.up('d');const moved=await snap(page);assert.ok(gap(start.position,moved.position)>.6,'WASD must move the actual avatar');
  // Move toward the bench front for several seconds: collision must reject crossing its bounds.
  await page.keyboard.down('w');for(let i=0;i<18;i++){await page.waitForTimeout(100);const {position:p}=await snap(page);assert.ok(!(Math.abs(p[0])<3.13&&Math.abs(p[2])<1.13),'character cannot enter table collider');}await page.keyboard.up('w');
  await page.locator('#interact').click();await wait(page,()=>window.labGame.snapshot().mode==='lab');await page.waitForTimeout(1100);
  assert.equal((await snap(page)).held,false);assert.equal(await page.locator('#near').isDisabled(),true);
  await page.locator('#pickup').click();const a=await page.locator('#game').screenshot();await page.waitForTimeout(1000);const b=await page.locator('#game').screenshot();const pickupPixels=diff(a,b);assert.ok(pickupPixels>500,'actual pickup animation must change pixels');
  await wait(page,()=>window.labGame.snapshot().held&&!window.labGame.snapshot().action);
  await page.locator('#near').click();await wait(page,()=>window.labGame.snapshot().state.rodDistance===0);await page.waitForTimeout(1000);
  let s=await snap(page);assert.equal(s.state.electroscopeNetCharge,0);assert.ok(s.state.leafAngle>0);assert.ok(gap(s.hand,s.rodGrip)<1e-7,'rod grip must be attached to the hand');assert.ok(s.stemBottom>s.baseTop);
  await page.locator('#game').screenshot({path:path.join(out,'holding-rod.png')});
  await page.locator('[data-answer="neutral"]').click();assert.equal((await snap(page)).completed.length,1);
  await page.locator('#next').click();await wait(page,()=>window.labGame.snapshot().state.mission===2&&!window.labGame.snapshot().action);
  await page.locator('#pickup').click();await wait(page,()=>window.labGame.snapshot().held&&!window.labGame.snapshot().action);
  await page.locator('#near').click();await wait(page,()=>window.labGame.snapshot().state.rodDistance===0);
  await page.locator('#ground').click();assert.equal((await snap(page)).state.isGrounded,false,'contact must wait for the hand');
  await wait(page,()=>window.labGame.snapshot().state.isGrounded);s=await snap(page);assert.ok(gap(s.groundHand,s.groundContact)<.025);assert.equal(s.state.electroscopeNetCharge,4);
  const c=await page.locator('#game').screenshot();await page.waitForTimeout(1000);const d=await page.locator('#game').screenshot();const groundPixels=diff(c,d);assert.ok(groundPixels>50);
  await page.locator('#game').screenshot({path:path.join(out,'grounding.png')});
  await page.locator('#far').click();await wait(page,()=>window.labGame.snapshot().state.rodDistance===1);assert.equal((await snap(page)).state.electroscopeNetCharge,0);
  await page.locator('#ground').click();await page.locator('#near').click();await wait(page,()=>window.labGame.snapshot().state.rodDistance===0);
  await page.locator('#ground').click();await wait(page,()=>window.labGame.snapshot().state.isGrounded);await page.locator('#ground').click();
  await page.locator('#far').click();await wait(page,()=>window.labGame.snapshot().state.rodDistance===1);s=await snap(page);assert.equal(s.state.electroscopeNetCharge,4);
  await page.locator('[data-answer="positive"]').click();assert.equal((await snap(page)).rewardVisible,true);assert.equal(await page.locator('#level').textContent(),'Lv. 2');
  await page.locator('#leave').click();await wait(page,()=>window.labGame.snapshot().mode==='walk');assert.equal((await snap(page)).held,false);await page.waitForTimeout(1200);
  await page.locator('#game').screenshot({path:path.join(out,'level-two-room.png')});
  await page.reload();await wait(page,()=>!!window.labGame);assert.equal((await snap(page)).completed.length,2);assert.equal((await snap(page)).rewardVisible,true);
  const beforeJoy=await snap(page);const joy=await page.locator('#joystick').boundingBox();await page.mouse.move(joy.x+joy.width/2,joy.y+joy.height/2);await page.mouse.down();await page.mouse.move(joy.x+joy.width,joy.y+joy.height/2);await page.waitForTimeout(500);await page.mouse.up();assert.ok(gap(beforeJoy.position,(await snap(page)).position)>.4);
  const phoneContext=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1});const phone=await phoneContext.newPage();phone.on('pageerror',e=>errors.push(e.message));
  await phone.goto(url);await wait(phone,()=>!!window.labGame);const phoneStart=await snap(phone),r=await phone.locator('#joystick').boundingBox();const client=await phoneContext.newCDPSession(phone);
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+r.width*.9,y:r.y+r.height/2}]});await phone.waitForTimeout(500);await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.ok(gap(phoneStart.position,(await snap(phone)).position)>.3,'touch joystick must move avatar');
  await phone.locator('#interact').tap();await wait(phone,()=>window.labGame.snapshot().mode==='lab');await phone.locator('#pickup').tap();await wait(phone,()=>window.labGame.snapshot().held&&!window.labGame.snapshot().action);
  await phone.locator('#near').tap();await wait(phone,()=>window.labGame.snapshot().state.isRodNear);assert.equal((await snap(phone)).state.electroscopeNetCharge,0);
  assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await phone.locator('#game').screenshot({path:path.join(out,'touch-landscape.png')});
  assert.deepEqual(errors,[]);const report={passed:true,keyboard:true,tableCollision:true,automaticWalking:true,touchJoystick:true,handGripError:gap(s.hand,s.rodGrip),groundContactVerified:true,science:'neutral induction / wrong order neutral / correct order +4',savedRewards:true,animationPixels:{pickup:pickupPixels,grounding:groundPixels},browserErrors:errors};writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(report);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
