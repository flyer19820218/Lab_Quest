'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const http=require('node:http');
const {readFile,mkdirSync}=require('node:fs');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..'),out=path.join(root,'artifacts','friction-station');
function server(){return http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  readFile(file,(error,body)=>{
    if(error){res.writeHead(404).end();return;}
    const type=file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.glb')?'model/gltf-binary':'application/octet-stream';
    res.writeHead(200,{'Content-Type':type}).end(body);
  });
});}
const snap=page=>page.evaluate(()=>window.labGame.snapshot());
async function reachStation(page,touch=false){
  const act=async(selector)=>touch?page.locator(selector).tap():page.locator(selector).click();
  let point=await page.evaluate(()=>window.labGame.screenPoint('foyer-door'));
  if(touch)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
  await page.waitForFunction(()=>document.querySelector('#interact span').textContent==='進入實驗區',{timeout:25000});
  await act('#interact');await page.waitForFunction(()=>window.labGame.snapshot().area==='lab');
  await page.waitForTimeout(700);
  point=await page.evaluate(()=>window.labGame.screenPoint('friction'));
  if(touch)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
  await page.waitForFunction(()=>document.querySelector('#interact span').textContent==='研究摩擦起電',{timeout:25000});
  assert.equal((await snap(page)).mode,'walk','approach alone never auto-starts the task');
  await act('#interact');await page.waitForFunction(()=>window.labGame.snapshot().mode==='friction');
}
async function doPair(page,id,receiver,drag=false){
  await page.locator(`#friction-${id}`).click();
  await page.locator(`#friction-predict-${receiver}`).click();
  if(drag){
    const b=await page.locator('#friction-rub-zone').boundingBox();
    await page.mouse.move(b.x+b.width*.25,b.y+b.height*.5);await page.mouse.down();
    await page.mouse.move(b.x+b.width*.75,b.y+b.height*.5,{steps:8});await page.mouse.up();
    assert.equal((await snap(page)).friction.strokes,1,'a real drag transfers one electron unit');
  }
  for(let i=drag?1:0;i<4;i++)await page.locator('#friction-rub-key').click();
  await page.waitForFunction(()=>window.labGame.snapshot().frictionDisplayed===4,{timeout:10000});
  const s=await snap(page),t=s.frictionTally;
  assert.equal(s.friction.strokes,4);assert.equal(t.totalNet,0);assert.equal(t.totalElectrons,12);
  assert.equal(t[receiver].net,-4);
  await page.locator(`#friction-answer-${receiver}`).click();
  assert.equal((await snap(page)).friction.complete,true);
}
(async()=>{
  mkdirSync(out,{recursive:true});const web=server();await new Promise(ok=>web.listen(0,'127.0.0.1',ok));
  let browser;const errors=[];
  try{
    browser=await chromium.launch({headless:true,...(process.platform==='darwin'?{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}:{})});
    const url=`http://127.0.0.1:${web.address().port}/index.html?friction-test=1`;
    for(const [name,viewport,touch] of [['desktop',{width:1365,height:900},false],['iphone',{width:844,height:390},true],['ipad',{width:1366,height:1024},true]]){
      const context=await browser.newContext({viewport,hasTouch:touch,isMobile:touch,deviceScaleFactor:1});
      const page=await context.newPage();page.on('pageerror',e=>errors.push(`${name}: ${e.message}`));
      await page.goto(url);await page.waitForFunction(()=>window.labGame?.snapshot().avatarModel==='ready',{timeout:25000});
      await reachStation(page,touch);
      assert.equal(await page.locator('#friction-hud').isVisible(),true);
      assert.equal((await snap(page)).avatarVisible,false);
      await page.waitForTimeout(1100);await page.locator('#game').screenshot({path:path.join(out,`${name}-ready.png`)});
      await doPair(page,'plastic','tool',!touch);
      await page.locator('#game').screenshot({path:path.join(out,`${name}-plastic.png`)});
      await doPair(page,'glass','cloth');
      assert.deepEqual((await snap(page)).frictionDone.sort(),['glass','plastic']);
      const fit=await page.evaluate(()=>{
        const viewport={w:innerWidth,h:innerHeight};
        const selectors=['.friction-pairs','#friction-glass','#friction-feedback','#friction-leave','#friction-reset'];
        return {scroll:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight,inside:selectors.every(sel=>{const e=document.querySelector(sel),b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.top>=0&&b.bottom<=innerHeight;}),viewport};
      });
      assert.equal(fit.scroll,false,`${name}: no page scroll`);assert.equal(fit.inside,true,`${name}: controls remain on screen`);
      await page.locator('#game').screenshot({path:path.join(out,`${name}-glass.png`)});
      await (touch?page.locator('#friction-leave').tap():page.locator('#friction-leave').click());
      assert.equal((await snap(page)).mode,'walk');assert.equal((await snap(page)).avatarVisible,true);
      await context.close();
    }
    assert.deepEqual(errors,[]);
    console.log({passed:true,frictionPairs:2,desktop:true,iPhoneLayout:true,iPadLayout:true,noAutoTask:true,labPreserved:true,browserErrors:errors});
  }finally{if(browser)await browser.close();await new Promise(ok=>web.close(ok));}
})().catch(error=>{console.error(error);process.exitCode=1;});
