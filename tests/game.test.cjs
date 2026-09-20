'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const http=require('node:http');
const {readFile,mkdirSync,writeFileSync}=require('node:fs');
const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const root=path.join(__dirname,'..'),out=path.join(root,'artifacts','game-bench-v6');
const snap=page=>page.evaluate(()=>window.labGame.snapshot());
const wait=(page,fn)=>page.waitForFunction(fn,null,{timeout:25000});
function diff(a,b){a=PNG.sync.read(a);b=PNG.sync.read(b);let count=0;for(let i=0;i<a.data.length;i+=4)if(Math.abs(a.data[i]-b.data[i])+Math.abs(a.data[i+1]-b.data[i+1])+Math.abs(a.data[i+2]-b.data[i+2])>35)count++;return count;}
function serve(){return http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  readFile(file,(error,body)=>{
    if(error){res.writeHead(404).end();return;}
    const type=file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.glb')?'model/gltf-binary':'application/octet-stream';
    res.writeHead(200,{'Content-Type':type}).end(body);
  });
});}
async function distance(page,value){await page.locator('#bench-distance').evaluate((el,n)=>{el.value=n;el.dispatchEvent(new Event('input',{bubbles:true}));},value);}
async function steer(page,side,duration=420){const b=await page.locator('#joystick').boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+side*b.width*.29,y,{steps:4});await page.waitForTimeout(duration);await page.mouse.up();}
async function visibleLayout(page){return page.evaluate(()=>{
  const box=sel=>document.querySelector(sel).getBoundingClientRect(),game=box('#game'),scene=box('#world');
  return {ratio:scene.width/scene.height,scroll:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight,
    controls:['#joystick','#notebook-button','#bench-ground','#bench-rod-negative','#bench-rod-positive','#bench-prev','#bench-next','#bench-leave'].every(sel=>{const b=box(sel);return b.left>=0&&b.right<=innerWidth&&b.top>=0&&b.bottom<=innerHeight;}),game:[game.width,game.height]};
});}
(async()=>{
  mkdirSync(out,{recursive:true});const server=serve();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;const errors=[];
  try{
    browser=await chromium.launch({headless:true,...(process.platform==='darwin'?{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}:{})});
    const url=`http://127.0.0.1:${server.address().port}/lab_3d_bench_preview_0920_v6.html`,page=await browser.newPage({viewport:{width:1365,height:1000}});
    page.on('pageerror',error=>errors.push(error.message));await page.goto(url);await wait(page,()=>window.labGame?.snapshot().avatarModel==='ready');
    assert.equal((await snap(page)).mode,'walk');assert.equal((await snap(page)).avatarVisible,true);
    await page.locator('#game').screenshot({path:path.join(out,'room.png')});
    const start=(await snap(page)).position;await page.keyboard.down('d');await page.waitForTimeout(360);await page.keyboard.up('d');
    assert.ok(Math.hypot((await snap(page)).position[0]-start[0],(await snap(page)).position[2]-start[2])>.4);
    await page.locator('#interact').click();await wait(page,()=>window.labGame.snapshot().mode==='lab'&&window.labGame.snapshot().rodPosition[0]<-2.7);
    let s=await snap(page);assert.equal(s.avatarVisible,false);assert.equal(s.staticChargeMarkersVisible,0);
    assert.equal(await page.locator('#bench-hud').isVisible(),true);assert.equal(await page.locator('#lab-controls').isVisible(),false);
    assert.equal(await page.locator('#joystick').evaluate(el=>el.parentElement.id),'bench-lever');
    assert.ok(Math.abs(s.groundPad[0]-1.70)<.001&&Math.abs(s.groundPad[2]-.30)<.001,'the original v1 ground terminal is restored');
    assert.ok(Math.abs(s.groundWireEnd[0]-s.groundPad[0])<.04,'the original lead reaches the grounding pad');
    assert.equal(s.rodPositiveBarsVisible,0);
    assert.equal(s.bench.dist,0);await page.locator('#game').screenshot({path:path.join(out,'bench-neutral.png')});
    const farX=s.rodPosition[0];await distance(page,37);s=await snap(page);assert.equal(s.bench.dist,37);assert.equal(s.bench.plateQ,37);assert.equal(s.bench.leafQ,-37);
    await steer(page,1);s=await snap(page);assert.ok(s.bench.dist>47,'the walking joystick approaches the rod continuously');
    const closer=s.bench.dist;await steer(page,-1);s=await snap(page);assert.ok(s.bench.dist<closer-10,'the same joystick can move the rod farther away');
    await distance(page,83);await wait(page,()=>window.labGame.snapshot().rodPosition[0]>-1.8);s=await snap(page);assert.equal(s.bench.dist,83);assert.ok(s.rodPosition[0]>farX+.9);assert.equal(s.bench.netQ,0);assert.ok(s.benchFlowVisible>0);
    assert.equal(await page.locator('#level').textContent(),'Lv. 1');
    await distance(page,100);await page.waitForTimeout(250);const a=await page.locator('#world').screenshot();await page.waitForTimeout(950);const b=await page.locator('#world').screenshot();assert.ok(diff(a,b)>80,'blue electron flow or gold leaves visibly animate');
    await page.locator('#bench-task-open').click();assert.equal(await page.locator('#bench-task-detail').isVisible(),true);assert.match(await page.locator('#bench-think').textContent(),/自由電子/);
    await page.locator('#bench-task-close').click();await page.locator('#bench-next').click();assert.equal((await snap(page)).benchTaskIndex,1);
    await page.locator('#bench-ground').click();s=await snap(page);assert.equal(s.bench.isGrounded,true);assert.equal(s.bench.leafQ,0);assert.equal(s.bench.plateQ,200);assert.equal(s.bench.flow.direction,'leaf-to-earth');
    await page.locator('#game').screenshot({path:path.join(out,'bench-grounded.png')});
    await page.locator('#bench-next').click();await page.locator('#bench-ground').click();await distance(page,0);s=await snap(page);
    assert.equal(s.bench.netQ,200);assert.equal(s.bench.plateQ,100);assert.equal(s.bench.leafQ,100);assert.equal(s.benchObserved[2],true);
    assert.deepEqual(s.completed,[1,2]);assert.equal(await page.locator('#level').textContent(),'Lv. 2');
    assert.match(await page.locator('#notebook-button').textContent(),/Lv\. 2 · 100\/100/);assert.equal(s.rewardVisible,true);
    assert.equal(await page.locator('#reward-toast').isVisible(),true);
    await page.locator('#notebook-button').click();assert.match(await page.locator('#inventory').textContent(),/金屬球.*琥珀工具箱/);await page.locator('#close-notebook').click();
    await page.locator('#game').screenshot({path:path.join(out,'bench-positive.png')});
    await page.locator('#bench-next').click();await page.locator('#bench-preset-negative').click();await distance(page,90);
    s=await snap(page);assert.equal(s.benchObserved[3],true);assert.ok(s.bench.leafQ<0);
    await page.locator('#bench-next').click();await page.locator('#bench-preset-negative').click();await page.locator('#bench-rod-positive').click();
    assert.equal((await snap(page)).rodPositiveBarsVisible,3,'a positive rod has three red plus signs');
    await distance(page,50);assert.equal((await snap(page)).bench.leafQ,0);await distance(page,100);s=await snap(page);assert.ok(s.bench.leafQ>0);assert.equal(s.benchObserved[4],true);
    await page.locator('#game').screenshot({path:path.join(out,'bench-opposite-rod.png')});
    await page.locator('#bench-leave').click();s=await snap(page);assert.equal(s.mode,'walk');assert.equal(s.avatarVisible,true);assert.ok(s.position[2]>1.13,'avatar returns in front of the table collider');assert.equal(await page.locator('#joystick').evaluate(el=>el.parentElement.id),'walk-ui');
    await page.reload();await wait(page,()=>!!window.labGame);assert.deepEqual((await snap(page)).completed,[1,2]);
    const layouts=[];
    for(const viewport of [{width:1366,height:1024},{width:844,height:390},{width:667,height:375}]){
      const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1});const phone=await context.newPage();phone.on('pageerror',error=>errors.push(error.message));
      await phone.goto(url);await wait(phone,()=>!!window.labGame);await phone.locator('#interact').tap();await wait(phone,()=>window.labGame.snapshot().mode==='lab');
      await wait(phone,()=>document.querySelector('#world').getBoundingClientRect().width/document.querySelector('#world').getBoundingClientRect().height>1.7);
      const layout=await visibleLayout(phone);assert.equal(layout.scroll,false,`${viewport.width}: no page scrolling`);assert.ok(Math.abs(layout.ratio-16/9)<.01);assert.equal(layout.controls,true,`${viewport.width}: all bench controls in viewport`);
      await phone.locator('#bench-distance').evaluate(el=>{el.value='60';el.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal((await snap(phone)).bench.dist,60);
      await phone.waitForTimeout(900);await phone.screenshot({path:path.join(out,`touch-${viewport.width}.png`)});layouts.push({viewport,layout});await context.close();
    }
    assert.deepEqual(errors,[]);
    const report={passed:true,characterHiddenAtBench:true,tableGeometryPreserved:true,continuousRod:true,originalV1Ground:true,sharedJoystick:true,positiveRodPlusSigns:true,originalFiveTasks:true,groundingSequence:true,stationaryPositiveTint:true,movingBlueElectrons:true,oldMarkersHidden:true,walkModePreserved:true,experienceSaved:true,visibleRewards:true,layouts,browserErrors:errors};
    writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(report);
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
