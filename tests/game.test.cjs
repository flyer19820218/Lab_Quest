'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {mkdirSync,writeFileSync}=require('node:fs');
const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const root=process.env.LAB_GAME_ROOT||path.join(__dirname,'..');
const out=process.env.LAB_GAME_OUTPUT||path.join(root,'artifacts','game-3d-v4');
const wait=(page,p)=>page.waitForFunction(p,null,{timeout:20000});
const snap=page=>page.evaluate(()=>window.labGame.snapshot());
const gap=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
function diff(a,b){a=PNG.sync.read(a);b=PNG.sync.read(b);let n=0;for(let i=0;i<a.data.length;i+=4)if(Math.abs(a.data[i]-b.data[i])+Math.abs(a.data[i+1]-b.data[i+1])+Math.abs(a.data[i+2]-b.data[i+2])>40)n++;return n;}
async function checkDownwardPair(page,stage,out){
  const samples={left:[],right:[]};
  for(let tick=0;tick<6;tick++){
    const flows=(await snap(page)).chargeFlows.filter(f=>f.from==='top'&&(f.to==='left'||f.to==='right'));
    assert.deepEqual(flows.map(f=>f.to).sort(),['left','right'],`stage ${stage} must show two separate electron flows`);
    assert.ok(flows.every(f=>f.origin[1]>3.18),`stage ${stage} must begin on the upper metal disc, not halfway down the stem`);
    for(const flow of flows)samples[flow.to].push(flow.position[1]);
    if(tick===3)await page.locator('#game').screenshot({path:path.join(out,`stage-${stage}-flow.png`)});
    await page.waitForTimeout(100);
  }
  for(const side of ['left','right'])for(let i=1;i<samples[side].length;i++)
    assert.ok(samples[side][i]<=samples[side][i-1]+.002,`stage ${stage} ${side} electron must never rise before reaching its leaf: ${samples[side]}`);
  return samples;
}
(async()=>{
 mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,...(process.platform==='darwin'?{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}:{})});const errors=[];
 try{
  const context=await browser.newContext({viewport:{width:1365,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const url=pathToFileURL(path.join(root,'lab_3d_walk_preview_0920_v4.html')).href;
  await page.goto(url);await wait(page,()=>!!window.labGame);await page.waitForTimeout(900);
  assert.equal((await snap(page)).mode,'walk');await page.locator('#game').screenshot({path:path.join(out,'room.png')});
  const start=await snap(page);await page.keyboard.down('d');await page.waitForTimeout(350);await wait(page,()=>Math.abs(window.labGame.snapshot().gait[0].hip)>.25);const walking=await snap(page);assert.ok(walking.gait.some(l=>l.knee>.15),'walking must articulate the knees');assert.ok(walking.gait[0].hip*walking.gait[1].hip<0,'legs alternate');assert.ok(walking.gait.every(l=>l.hip*(l.handZ-.06)>0),'arms swing opposite their same-side legs');await page.waitForTimeout(200);await page.keyboard.up('d');const moved=await snap(page);assert.ok(gap(start.position,moved.position)>.6,'WASD must move the actual avatar');
  // Move toward the bench front for several seconds: collision must reject crossing its bounds.
  await page.keyboard.down('w');for(let i=0;i<18;i++){await page.waitForTimeout(100);const {position:p}=await snap(page);assert.ok(!(Math.abs(p[0])<3.13&&Math.abs(p[2])<1.13),'character cannot enter table collider');}await page.keyboard.up('w');
  await page.locator('#interact').click();await wait(page,()=>window.labGame.snapshot().mode==='lab');await page.waitForTimeout(1100);
  assert.equal((await snap(page)).held,false);assert.equal(await page.locator('#near').isDisabled(),true);
  await page.locator('#pickup').click();const a=await page.locator('#game').screenshot();await page.waitForTimeout(1000);const b=await page.locator('#game').screenshot();const pickupPixels=diff(a,b);assert.ok(pickupPixels>500,'actual pickup animation must change pixels');
  await wait(page,()=>window.labGame.snapshot().held&&!window.labGame.snapshot().action);
  const farPose=await snap(page);await page.locator('#game').screenshot({path:path.join(out,'rod-far.png')});
  assert.equal(farPose.state.displacedElectrons,0);assert.equal(farPose.state.leafElectrons,3);
  await page.locator('#mid').click();await wait(page,()=>window.labGame.snapshot().state.inductionStage===1);
  let stageFlows=(await snap(page)).chargeFlows.filter(f=>f.from==='top');
  assert.deepEqual(stageFlows.map(f=>f.to).sort(),['left','right'],'first stage sends one blue electron to each leaf');
  const midFlowY=await checkDownwardPair(page,1,out);
  await wait(page,()=>window.labGame.snapshot().state.rodDistance===.5);const midPose=await snap(page);
  assert.equal(midPose.state.displacedElectrons,2);assert.equal(midPose.state.leafElectrons,4);assert.equal(midPose.state.leafAngle,28);
  assert.ok(gap(farPose.hand,midPose.hand)>.45,'middle position must visibly differ from far');assert.ok(midPose.rodDiscGap>.1);
  await page.locator('#game').screenshot({path:path.join(out,'rod-mid.png')});await page.waitForTimeout(400);
  await page.locator('#near').click();await wait(page,()=>window.labGame.snapshot().state.inductionStage===2);
  stageFlows=(await snap(page)).chargeFlows.filter(f=>f.from==='top');
  assert.deepEqual(stageFlows.map(f=>f.to).sort(),['left','right'],'second stage sends one more electron to each leaf');
  const nearFlowY=await checkDownwardPair(page,2,out);
  await wait(page,()=>window.labGame.snapshot().state.rodDistance===0);await page.waitForTimeout(1000);
  let s=await snap(page);assert.equal(s.character,'March');assert.ok(gap(midPose.hand,s.hand)>.45);assert.ok(s.rodDiscGap>.1,'near rod still has an air gap');for(const pose of [farPose,midPose,s])for(const arm of pose.armBones){assert.ok(Math.abs(arm.upper-.81)<1e-7&&Math.abs(arm.fore-.79)<1e-7,'bones never stretch');assert.ok(arm.reachError<.001,'hands can reach all targets');}assert.equal(s.state.electroscopeNetCharge,0);assert.equal(s.state.displacedElectrons,4);assert.equal(s.state.leafElectrons,5);assert.equal(s.state.leafAngle,56);assert.ok(gap(s.hand,s.rodGrip)<1e-7,'rod grip must be attached to the hand');assert.ok(s.stemBottom>s.baseTop);
  const nearPose=s;await page.locator('#game').screenshot({path:path.join(out,'holding-rod.png')});
  await page.locator('[data-answer="neutral"]').click();assert.equal((await snap(page)).completed.length,1);
  await page.locator('#next').click();await wait(page,()=>window.labGame.snapshot().state.mission===2&&!window.labGame.snapshot().action);
  await page.locator('#pickup').click();await wait(page,()=>window.labGame.snapshot().held&&!window.labGame.snapshot().action);
  await page.locator('#near').click();await wait(page,()=>window.labGame.snapshot().state.rodDistance===0);
  const rightHandBeforeGround=(await snap(page)).hand;await page.locator('#ground').click();assert.equal((await snap(page)).state.isGrounded,false,'contact must wait for the hand');
  await wait(page,()=>window.labGame.snapshot().state.isGrounded);s=await snap(page);assert.ok(gap(s.groundHand,s.groundContact)<.025);assert.ok(gap(s.hand,rightHandBeforeGround)<1e-6,'left hand grounds independently without moving the right hand');assert.equal(s.state.electroscopeNetCharge,4);
  assert.equal(s.chargeFlows.filter(f=>f.to==='earth').length,4,'four electrons leave along the ground wire');
  const groundStart=s.chargeFlows.filter(f=>f.to==='earth');
  const c=await page.locator('#game').screenshot();
  const fixedPositive=s.positiveMarks.slice(0,6);await page.waitForTimeout(180);
  assert.ok((await snap(page)).positiveMarks.slice(0,6).every((p,i)=>gap(p,fixedPositive[i])<1e-6),'positive sites on the top conductor stay fixed');
  await page.waitForTimeout(520);
  const groundLater=(await snap(page)).chargeFlows.filter(f=>f.to==='earth');
  assert.equal(groundLater.length,4);
  assert.ok(groundLater.every(f=>f.position[0]>groundStart.find(g=>g.index===f.index).position[0]+.5),'grounded electrons travel outward along the wire');
  const d=await page.locator('#game').screenshot();const groundPixels=diff(c,d);assert.ok(groundPixels>50);
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
  const ipadContext=await browser.newContext({viewport:{width:1366,height:1024},isMobile:true,hasTouch:true,deviceScaleFactor:1});const ipad=await ipadContext.newPage();ipad.on('pageerror',e=>errors.push(e.message));
  await ipad.goto(url);await wait(ipad,()=>!!window.labGame);await ipad.locator('#interact').tap();await wait(ipad,()=>window.labGame.snapshot().mode==='lab');
  const ipadLayout=await ipad.evaluate(()=>{const b=id=>document.querySelector(id).getBoundingClientRect(),world=b('#world'),game=b('#game'),controls=b('#lab-controls');return {worldRatio:world.width/world.height,worldBottom:world.bottom,controlsTop:controls.top,gameWidth:game.width,gameHeight:game.height,scrollX:document.documentElement.scrollWidth>innerWidth,scrollY:document.documentElement.scrollHeight>innerHeight,buttons:['#pickup','#far','#mid','#near','#ground','#leave'].every(id=>{const r=b(id);return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;})};});
  assert.ok(Math.abs(ipadLayout.worldRatio-16/9)<.01);assert.ok(Math.abs(ipadLayout.worldBottom-ipadLayout.controlsTop)<2,'iPad 16:9 scene joins the control dock');
  assert.equal(ipadLayout.gameWidth,1366);assert.equal(ipadLayout.gameHeight,1024);assert.equal(ipadLayout.scrollX||ipadLayout.scrollY,false);assert.equal(ipadLayout.buttons,true);
  await ipad.screenshot({path:path.join(out,'ipad-landscape.png')});await ipadContext.close();
  const phoneContext=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1});const phone=await phoneContext.newPage();phone.on('pageerror',e=>errors.push(e.message));
  await phone.goto(url);await wait(phone,()=>!!window.labGame);const phoneStart=await snap(phone),r=await phone.locator('#joystick').boundingBox();const client=await phoneContext.newCDPSession(phone);
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+r.width*.9,y:r.y+r.height/2}]});await phone.waitForTimeout(500);await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.ok(gap(phoneStart.position,(await snap(phone)).position)>.3,'touch joystick must move avatar');
  await phone.locator('#interact').tap();await wait(phone,()=>window.labGame.snapshot().mode==='lab');await phone.locator('#pickup').tap();await wait(phone,()=>window.labGame.snapshot().held&&!window.labGame.snapshot().action);
  await phone.locator('#near').tap();await wait(phone,()=>window.labGame.snapshot().state.isRodNear);assert.equal((await snap(phone)).state.electroscopeNetCharge,0);
  await phone.waitForTimeout(600);
  for(const viewport of [{width:844,height:390},{width:667,height:375}]){
    await phone.setViewportSize(viewport);await phone.evaluate(()=>window.scrollTo(0,0));
    const layout=await phone.evaluate(()=>{const r=id=>document.querySelector(id).getBoundingClientRect(),canvas=r('#world'),game=r('#game'),hint=r('.mission-card'),controls=r('#lab-controls');return {overflow:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight,hintInside:hint.top>=game.top&&hint.bottom<=game.bottom,controlsInside:controls.top>=game.top&&controls.bottom<=game.bottom,ratio:canvas.width/canvas.height,allVisible:['#world','#far','#mid','#near','#ground','#feedback','[data-answer="positive"]','[data-answer="negative"]','[data-answer="neutral"]'].every(id=>{const b=r(id);return b.top>=0&&b.left>=0&&b.right<=innerWidth&&b.bottom<=innerHeight;})};});
    assert.equal(layout.overflow,false,'landscape has no page scroll');assert.equal(layout.hintInside,true);assert.equal(layout.controlsInside,true);assert.equal(layout.allVisible,true,'scene, hints and rod/ground controls stay in the viewport');assert.ok(Math.abs(layout.ratio-16/9)<.01);
    for(const [id,distance] of [['mid',.5],['far',1],['near',0]]){await phone.locator('#'+id).tap();await wait(phone,()=>!window.labGame.snapshot().action&&window.labGame.snapshot().state.rodDistance===window.labGame.snapshot().targetDistance);assert.equal((await snap(phone)).state.rodDistance,distance);}
    await phone.screenshot({path:path.join(out,`touch-landscape-${viewport.width}.png`)});
  }
  await phone.evaluate(()=>{document.documentElement.requestFullscreen=function(){window.fullscreenTarget=this;return Promise.reject(new Error('unsupported'));};});
  await phone.locator('#fullscreen').tap();
  assert.equal(await phone.evaluate(()=>window.fullscreenTarget===document.documentElement),true,'native fullscreen targets the document root');
  assert.equal(await phone.evaluate(()=>document.documentElement.classList.contains('immersive-fallback')),true);
  assert.equal(await phone.evaluate(()=>{const b=document.querySelector('#game').getBoundingClientRect();return Math.abs(b.width-innerWidth)<1&&Math.abs(b.height-innerHeight)<1;}),true,'fallback fixes game to the full visual viewport');
  await phone.setViewportSize({width:390,height:844});
  assert.equal(await phone.locator('.portrait-note').isVisible(),true);
  assert.equal((await phone.locator('.portrait-note').textContent()).trim(),'請橫向使用');
  assert.deepEqual(errors,[]);const report={passed:true,preview:'lab_3d_walk_preview_0920_v4.html',character:'March articulated 3D',keyboard:true,tableCollision:true,automaticWalking:true,touchJoystick:true,kneesAndOppositeArmSwing:true,fixedArmLengths:[.81,.79],threeRodPositions:true,handTravelPerStage:gap(farPose.hand,midPose.hand),rodAirGaps:[farPose.rodDiscGap,midPose.rodDiscGap,nearPose.rodDiscGap],handGripError:gap(s.hand,s.rodGrip),groundContactVerified:true,groundFlowOutward:true,independentLeftHand:true,mobileSceneAndControlsVisible:true,ipadLandscape:ipadLayout,fullscreenRoot:true,fullscreenFallback:true,portraitPrompt:true,science:'0/2/4 paired electrons; each induction stage starts on the upper metal disc and follows disc-stem-leaf; grounded blue flow; fixed red positives',midFlowY,nearFlowY,savedRewards:true,animationPixels:{pickup:pickupPixels,grounding:groundPixels},browserErrors:errors};writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(report);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
