(async function(){
  'use strict';
  const $=id=>document.getElementById(id),T=window.THREE,B=window.PhysicalBoysBench,R=window.LabFriction,I=window.LabInquiry,L=window.LabLayout;
  if(!T||!B||!R||!I||!L||!T.GLTFLoader){$('loading').textContent='遊戲模組未完整載入，請重新整理。';return;}
  const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),shell=document.querySelector('.game-shell');
  let mode='walk',activeStation=null,environment=null,leyden=null,environmentStatus='loading',leydenView='full';
  let bench=B.createState(),friction=R.createState(),inquiry=null,inquiryPhase='predict',prediction=null,flowEvidence={neutral:false,grounded:false,isolated:false,charged:false};
  let benchTaskIndex=0,completed=[],lastTime=0,raf=0,rewardTimer=0,foyerGuess=null;
  const saveKey='lab-quest-3d-v1',discoveriesKey='lab-quest-fp-discoveries-v1',frictionDone=new Set(),discoveries=new Set();
  try{const saved=JSON.parse(localStorage.getItem(saveKey));if(Array.isArray(saved))completed=[...new Set(saved.filter(x=>x===1||x===2))];const found=JSON.parse(localStorage.getItem(discoveriesKey));if(Array.isArray(found))for(const x of found)if(typeof x==='string')discoveries.add(x);}catch(_){}
  const keys=new Set(),joy={x:0,y:0,pointer:null},turnPointers=new Map();let lookPointer=null;
  const touch=navigator.maxTouchPoints>0||matchMedia('(pointer: coarse)').matches;
  const scene=new T.Scene();scene.background=new T.Color('#a5c0b6');scene.fog=new T.Fog('#b7cec2',28,65);
  const navigation=window.LabFirstPerson.create(T,L),camera=navigation.camera,closeCamera=new T.OrthographicCamera(-4,4,3,-3,.06,60);
  let renderer;try{renderer=new T.WebGLRenderer({canvas:$('world'),antialias:!touch,powerPreference:'low-power'});}catch(_){$('loading').textContent='此瀏覽器無法開啟 WebGL 3D，請檢查 Safari 設定。';return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,touch?1.25:1.75));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  scene.add(new T.HemisphereLight('#eff6ef','#6e8c7a',2.0));
  const sun=new T.DirectionalLight('#fff0d6',2.5);sun.position.set(-4,12,6);sun.castShadow=true;sun.shadow.mapSize.set(touch?1024:2048,touch?1024:2048);Object.assign(sun.shadow.camera,{left:-14,right:14,top:10,bottom:-10,near:.5,far:35});sun.shadow.bias=-.0005;scene.add(sun);
  const fill=new T.DirectionalLight('#bedce6',1.0);fill.position.set(7,6,-4);scene.add(fill);
  const scope=window.LabElectroscope.create(T,B);scene.add(scope.root);
  const materials=window.LabFrictionStation.create(T);materials.root.position.set(-7,0,0);scene.add(materials.root);materials.setState(friction);
  const exhibit=window.LabFoyer.create(T,{exhibitOnly:true});exhibit.root.position.set(-5.6,0,4.3);scene.add(exhibit.root);
  const view=window.LabInquiryView.create($('inquiry-canvas'));
  // Existing Lv.2 items remain earned, not sold; a physical shelf at the entrance.
  const rewardRack=new T.Group();scene.add(rewardRack);
  const surface=color=>new T.MeshStandardMaterial({color,roughness:.55});
  function part(g,m,x,y,z,parent=rewardRack){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  for(const z of [3.1,3.9]){part(new T.CylinderGeometry(.18,.18,.06,20),surface('#294c49'),10.60,1.90,z);part(new T.CylinderGeometry(.03,.03,.36,12),surface('#b7c9c6'),10.60,2.11,z);part(new T.SphereGeometry(.19,20,12),surface('#b7c9c6'),10.60,2.45,z);}
  part(new T.BoxGeometry(.42,.30,.55),surface('#d7ab61'),10.62,2.06,4.55);
  function progress(){
    const xp=completed.reduce((sum,n)=>sum+(n===1?40:60),0);rewardRack.visible=mode==='walk'&&xp>=100;$('level').textContent=`Lv. ${xp>=100?2:1}`;$('xp').textContent=`${xp} / 100 經驗`;$('xp-bar').value=xp;$('notebook-button').textContent=`🎒 Lv. ${xp>=100?2:1} · ${xp}/100`;
    $('inventory').replaceChildren();for(const item of ['第一人稱研究員','七個自由探索區',...(xp>=100?['已解鎖：等大金屬球與琥珀工具箱']:[]),...Array.from(discoveries).map(id=>'探究記錄：'+(L.stations.find(s=>s.id===id)?.topic||id))]){const li=document.createElement('li');li.textContent=item;$('inventory').appendChild(li);}
    $('record').textContent=`保留 ${completed.length} / 2 個原有靜電發現；本次分區記錄 ${discoveries.size} 項。`;
  }
  function remember(id){discoveries.add(id);try{localStorage.setItem(discoveriesKey,JSON.stringify([...discoveries]));}catch(_){}progress();}
  function reward(n){if(completed.includes(n))return;completed.push(n);try{localStorage.setItem(saveKey,JSON.stringify(completed));}catch(_){}progress();$('reward-toast').textContent=n===1?'操作與解釋完成！＋40 經驗':'操作與解釋完成！＋60 經驗，原有 Lv. 2 器材已解鎖';$('reward-toast').hidden=false;clearTimeout(rewardTimer);rewardTimer=setTimeout(()=>$('reward-toast').hidden=true,4500);}
  function paused(){return $('notebook').open||$('lab-map').open||!$('foyer-observe').hidden;}
  function clearInput(){keys.clear();joy.x=joy.y=0;joy.pointer=null;lookPointer=null;turnPointers.clear();$('stick').style.transform='';}
  function updateWalk(){
    if(mode!=='walk')return;const station=L.near(navigation.position),button=$('interact');
    button.disabled=!station;button.querySelector('span').textContent=station?`${station.number} · ${station.topic}`:'走近任一實驗桌';
    $('mission-tag').textContent=station?`研究區 ${station.number} · 自主探究`:'電學館 · 自由探索';$('mission-title').textContent=station?station.title:'今天，你想解開哪個謎？';$('instruction').textContent=station?'按互動鍵開始；不想做也能繼續走。':'左搖桿移動，拖畫面轉頭。導覽圖可找器材。';
  }
  function updateBench(){
    const task=B.tasks[benchTaskIndex];$('bench-task-open').textContent=`探究任務 ${benchTaskIndex+1} / 5`;$('bench-task-summary').textContent=task.think;$('bench-task-title').textContent=task.title;$('bench-think').textContent=task.think;$('bench-act').textContent=task.act;$('bench-verify').textContent=task.verify;
    $('bench-distance').value=bench.dist;$('bench-distance-label').textContent=`${bench.dist<5?'遠':bench.dist>95?'近':'調整中'} · ${Math.round(bench.dist)}%`;$('bench-readout').textContent=`盤 ${Math.round(bench.plateQ)} · 金箔 ${Math.round(bench.leafQ)} · 淨電荷 ${Math.round(bench.netQ)}`;
    $('bench-rod-negative').setAttribute('aria-pressed',String(bench.rodType===-1));$('bench-rod-positive').setAttribute('aria-pressed',String(bench.rodType===1));$('bench-ground').setAttribute('aria-pressed',String(bench.isGrounded));$('bench-ground').textContent=bench.isGrounded?'解除接地':'接地';$('bench-prev').disabled=benchTaskIndex===0;$('bench-next').disabled=benchTaskIndex===4;
    const charged=flowEvidence.charged&&bench.dist<3&&!bench.isGrounded&&bench.netQ>0;
    $('scope-question').hidden=!(charged||flowEvidence.neutral&&bench.dist>=80&&bench.netQ===0&&!bench.isGrounded);
    $('scope-question-text').textContent=charged?'斷地、移棒後，驗電器帶什麼電？':'金箔張開，總電荷變成什麼？';
  }
  function setBench(next){
    const old=bench;bench=next;scope.setState(bench);
    if(bench.rodType===-1&&bench.dist>=80&&bench.netQ===0&&!bench.isGrounded)flowEvidence.neutral=true;
    if(bench.rodType===-1&&bench.isGrounded&&bench.dist>=80)flowEvidence.grounded=true;
    if(old.isGrounded&&!bench.isGrounded&&bench.dist>=80&&flowEvidence.grounded)flowEvidence.isolated=true;
    if(flowEvidence.isolated&&bench.dist<3&&!bench.isGrounded&&bench.netQ>0)flowEvidence.charged=true;
    updateBench();
  }
  function updateFriction(){
    const pair=R.pairs[friction.pair],total=R.tally(friction);for(const id of ['plastic','glass'])$(`friction-${id}`).setAttribute('aria-pressed',String(friction.pair===id));
    for(const phase of ['predict','answer'])for(const target of ['tool','cloth'])$(`friction-${phase}-${target}`).textContent=pair[target];
    $('friction-predict').hidden=friction.prediction!==null;$('friction-act').hidden=friction.prediction===null||friction.strokes>=4;$('friction-explain').hidden=friction.strokes<4||friction.complete;$('friction-complete').hidden=!friction.complete;
    $('friction-count').textContent=`${friction.strokes} / 4 次`;for(const target of ['tool','cloth'])$(`friction-${target}-charge`).textContent=`${pair[target]}：${total[target].net>0?'+':''}${total[target].net}`;
    $('friction-stage').textContent=friction.complete?'探究完成':friction.strokes===4?'解釋結果':'預測 → 操作 → 觀察';
    $('friction-feedback').textContent=friction.complete?`${pair[pair.receiver]}得到電子帶負電；總電荷仍為零。`:friction.feedback==='check-electron-direction'?'再看藍色電子的方向，得到電子的材料帶負電。':friction.prediction===null?'先預測誰會得到電子。':friction.strokes===4?'比較兩件物品的淨電荷，再回答。':'左右拖曳材料或按摩擦一次。只有電子移動。';
    $('friction-complete-text').textContent=frictionDone.size===2?'兩組都完成；去氣球與黑板區找下一個問題吧。':'可以換另一組材料比較。';
  }
  function actionButton(text,fn,pressed){const b=document.createElement('button');b.type='button';b.textContent=text;if(pressed!==undefined)b.setAttribute('aria-pressed',String(pressed));b.addEventListener('click',fn);$('inquiry-actions').appendChild(b);return b;}
  function updateInquiry(){
    const id=activeStation.id,s=inquiry;$('inquiry-actions').replaceChildren();$('inquiry-title').textContent=`${activeStation.number} · ${activeStation.topic}`;
    if(id==='leyden'){
      $('inquiry-status').textContent='新建 3D 器材 · 結構觀察';$('inquiry-prompt').textContent='內外金屬箔沒有相接；中間是玻璃絕緣層。';
      for(const [key,name] of [['full','完整外觀'],['cutaway','看剖面'],['exploded','拆解三層']])actionButton(name,()=>{leydenView=key;setLeydenView();updateInquiry();},leydenView===key);
      $('inquiry-feedback').textContent='上方金屬端連內箔，外端連外箔。此版先觀察結構；虛擬充放電尚待確認，沒有高壓操作教學。';return;
    }
    $('inquiry-status').textContent=inquiryPhase==='predict'?'先提出猜想':inquiryPhase==='complete'?'操作＋解釋完成 ✓':'操作與觀察';
    const questions={balloon:'摩擦後氣球吸住黑板，表示黑板也帶了淨電荷嗎？',induction:'負棒靠近 → 接地 → 先斷地再移棒，金屬最後帶什麼電？',contact:'等大金屬球 A 帶 −8、B 中性，接觸後各帶多少？'};
    if(inquiryPhase==='predict'){
      $('inquiry-prompt').textContent=questions[id];
      const choices=id==='balloon'?[['有淨電荷','yes'],['仍是中性','neutral']]:id==='contact'?[['每球 −4','half'],['A −8、B 0','unchanged']]:[['正電','positive'],['負電','negative'],['中性','neutral']];
      for(const [label,value] of choices)actionButton(label,()=>{prediction=value;inquiryPhase='operate';updateInquiry();});$('inquiry-feedback').textContent='猜想不會直接判錯；先做實驗找證據。';return;
    }
    if(id==='induction'){
      $('inquiry-prompt').textContent='靠近、接地、斷地、移棒；順序可以自由比較。';
      for(const [sign,label] of [[-1,'負棒'],[1,'正棒']])actionButton(label,()=>{inquiry=I.induction(sign);syncInquiry(true);},s.rod===sign);
      actionButton(s.near?'移開棒':'靠近棒',()=>{inquiry=I.changeInduction(s,{near:!s.near});syncInquiry();},s.near);
      actionButton(s.grounded?'斷開接地':'接地',()=>{inquiry=I.changeInduction(s,{grounded:!s.grounded});syncInquiry();},s.grounded);
      const q=6-s.electrons;$('inquiry-feedback').textContent=`金屬 ${s.electrons} 個電子／6 個固定正位，淨電荷 ${q>0?'+':''}${q}。地球反向改變，總和仍 0。`;
      if(!s.near&&!s.grounded&&s.electrons!==6){actionButton('解釋：留下相反電荷',()=>finishInquiry(true));actionButton('解釋：棒的電荷穿過空氣',()=>finishInquiry(false));}
    }else if(id==='contact'){
      $('inquiry-prompt').textContent='等大、孤立的兩球。接觸後，先看電子移動方向。';
      actionButton('A 負電',()=>{inquiry=I.contact(-1);syncInquiry(true);},s.sign===-1);actionButton('A 正電',()=>{inquiry=I.contact(1);syncInquiry(true);},s.sign===1);
      actionButton(s.touching?'分開兩球':'接觸兩球',()=>{inquiry=s.touching?I.separate(s):I.touch(s);syncInquiry();},s.touching);
      $('inquiry-feedback').textContent=`總電荷：${s.a+s.b}。${s.a===s.b?'電子已重新分配；分開不會恢復原本電荷。':'球還沒接觸。'}`;
      if(s.a===s.b){actionButton(`每球 ${s.sign*4}，总電荷守恆`,()=>finishInquiry(true));actionButton('分開就全部回復中性',()=>finishInquiry(false));}
    }else if(id==='balloon'){
      $('inquiry-prompt').textContent='乳膠氣球 × 羊毛衣物；觀察中性黑板的近端。';
      actionButton('摩擦衣物',()=>{inquiry=I.rubBalloon(s);syncInquiry();},s.rubbed);
      for(const [d,label] of [[0,'遠'],[1,'中'],[2,'近']])actionButton(label,()=>{inquiry=I.distanceBalloon(s,d);syncInquiry();},s.distance===d);
      $('inquiry-feedback').textContent='質性模型：黑板極化但淨電荷仍為零。實際吸附受表面、材質與濕度影響。';
      if(s.rubbed&&s.distance===2){actionButton('黑板仍中性，近端極化吸引',()=>finishInquiry(true));actionButton('黑板一定變成帶正電',()=>finishInquiry(false));}
    }
    actionButton('重試',()=>{resetInquiry();syncInquiry(true);});
    if(inquiryPhase==='complete')$('inquiry-feedback').textContent='完成！你的猜想已與觀察比較；可以重試或返回實驗室。';
  }
  function finishInquiry(correct){if(correct){inquiryPhase='complete';remember(activeStation.id);updateInquiry();}else $('inquiry-feedback').textContent='再看看電子是否跨越空氣、是否有接地，以及總電荷。可以重新操作比較。';}
  function resetInquiry(){const id=activeStation.id;inquiry=id==='induction'?I.induction():id==='contact'?I.contact():I.balloon();inquiryPhase='predict';prediction=null;}
  function syncInquiry(reset=false){view.set(activeStation.id,inquiry,reset);updateInquiry();}
  const jarParts=[];
  function setLeydenView(){if(!leyden)return;for(const item of jarParts){const n=item.node,name=n.name,isHalf=/Cutaway/.test(name),isFull=/Full/.test(name);n.visible=isHalf?leydenView==='cutaway':isFull?leydenView!=='cutaway':true;n.position.copy(item.position);if(leydenView==='exploded'){if(/^OuterFoil/.test(name)||name==='OuterTerminal')n.position.x+=1.55;if(/^InnerFoil/.test(name)||/InnerMetalStem|InnerConnection|TopMetalTerminal|InsulatingStopper/.test(name))n.position.x-=1.55;}}}
  function setVisibility(){
    const walk=mode==='walk';if(environment)environment.visible=walk;scope.root.visible=walk||mode==='lab';materials.root.visible=walk||mode==='friction';exhibit.root.visible=walk;rewardRack.visible=walk&&completed.includes(1)&&completed.includes(2);if(leyden)leyden.visible=walk||activeStation?.id==='leyden';
    shell.classList.toggle('is-experiment',!walk);shell.classList.toggle('is-lab',mode==='lab');shell.classList.toggle('is-friction',mode==='friction');$('walk-ui').hidden=!walk;$('bench-hud').hidden=mode!=='lab';$('friction-hud').hidden=mode!=='friction';$('inquiry-hud').hidden=mode!=='inquiry';$('inquiry-canvas').hidden=mode!=='inquiry'||activeStation.id==='leyden';$('scope-question').hidden=true;
  }
  function enter(){if(mode!=='walk'||paused())return;const station=L.near(navigation.position);if(!station)return;clearInput();activeStation=station;
    if(station.id==='vdg'){$('foyer-observe').hidden=false;$('foyer-close').focus();return;}
    mode=station.id==='scope'?'lab':station.id==='friction'?'friction':'inquiry';
    if(mode==='lab'){bench=B.createState();flowEvidence={neutral:false,grounded:false,isolated:false,charged:false};scope.setState(bench);scope.setActive(true);$('bench-lever').appendChild($('joystick'));$('joystick').setAttribute('aria-label','帶電棒搖桿。右／上靠近，左／下移遠。');updateBench();}
    else if(mode==='friction')updateFriction();
    else if(station.id==='leyden'){leydenView='full';setLeydenView();updateInquiry();}
    else{resetInquiry();syncInquiry(true);}
    setVisibility();if(mode==='lab')updateBench();$('mode-label').textContent=station.topic;
  }
  function leave(){if(mode==='walk')return;clearInput();mode='walk';activeStation=null;scope.setActive(false);$('walk-ui').prepend($('joystick'));$('joystick').setAttribute('aria-label','觸控移動搖桿');$('bench-task-detail').hidden=true;$('bench-task-open').setAttribute('aria-expanded','false');leydenView='full';setLeydenView();setVisibility();updateWalk();$('mode-label').textContent='第一人稱 · 自由探索';$('world').focus({preventScroll:true});}
  $('interact').addEventListener('click',enter);for(const id of ['bench-leave','friction-leave','inquiry-leave'])$(id).addEventListener('click',leave);
  function closeObservation(){$('foyer-observe').hidden=true;clearInput();$('world').focus({preventScroll:true});}
  for(const id of ['foyer-close','foyer-watch'])$(id).addEventListener('click',closeObservation);
  document.querySelectorAll('[data-foyer-guess]').forEach(b=>b.addEventListener('click',()=>{foyerGuess=b.dataset.foyerGuess;remember('vdg');closeObservation();$('walk-feedback').textContent='猜想已記下。往材料區走，用摩擦實驗找電荷來源。';}));
  $('bench-distance').addEventListener('input',e=>setBench(B.setDistance(bench,+e.target.value)));
  for(const [id,sign] of [['negative',-1],['positive',1]])$('bench-rod-'+id).addEventListener('click',()=>setBench(B.setRod(bench,sign)));
  $('bench-ground').addEventListener('click',()=>setBench(B.toggleGround(bench)));
  for(const [id,q] of [['negative',-100],['neutral',0],['positive',100]])$('bench-preset-'+id).addEventListener('click',()=>{flowEvidence={neutral:false,grounded:false,isolated:false,charged:false};setBench(B.forceSetCharge(bench,q));});
  for(const [id,delta] of [['prev',-1],['next',1]])$('bench-'+id).addEventListener('click',()=>{benchTaskIndex=Math.max(0,Math.min(4,benchTaskIndex+delta));updateBench();});
  $('bench-task-open').addEventListener('click',()=>{$('bench-task-detail').hidden=false;$('bench-task-open').setAttribute('aria-expanded','true');clearInput();});$('bench-task-close').addEventListener('click',()=>{$('bench-task-detail').hidden=true;$('bench-task-open').setAttribute('aria-expanded','false');});
  document.querySelectorAll('[data-scope-answer]').forEach(b=>b.addEventListener('click',()=>{const charged=flowEvidence.charged&&bench.netQ>0&&bench.dist<3;const right=charged?'positive':'neutral';if(b.dataset.scopeAnswer===right){reward(charged?2:1);remember('scope');$('scope-question-text').textContent='正確！用電子有沒有進出來判斷，而不只看金箔張開。';}else $('scope-question-text').textContent='再看淨電荷：金箔張開不一定表示有淨電荷。';}));
  function rubOnce(){if(mode!=='friction')return;friction=R.rub(friction);materials.setState(friction);updateFriction();}
  for(const id of ['plastic','glass'])$('friction-'+id).addEventListener('click',()=>{friction=R.selectPair(friction,id);materials.setState(friction);updateFriction();});
  for(const target of ['tool','cloth']){$('friction-predict-'+target).addEventListener('click',()=>{friction=R.predict(friction,target);updateFriction();});$('friction-answer-'+target).addEventListener('click',()=>{friction=R.answer(friction,target);if(friction.complete){frictionDone.add(friction.pair);remember('friction');}updateFriction();});}
  $('friction-rub-key').addEventListener('click',rubOnce);$('friction-reset').addEventListener('click',()=>{friction=R.createState(friction.pair);materials.setState(friction);updateFriction();});
  let rubPointer=null,rubX=0,rubDirection=0;
  $('friction-rub-zone').addEventListener('pointerdown',e=>{rubPointer=e.pointerId;rubX=e.clientX;rubDirection=0;e.currentTarget.setPointerCapture(e.pointerId);});
  $('friction-rub-zone').addEventListener('pointermove',e=>{if(e.pointerId!==rubPointer)return;const delta=e.clientX-rubX,direction=Math.sign(delta);if(Math.abs(delta)>40&&direction!==rubDirection){rubOnce();rubDirection=direction;rubX=e.clientX;}});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])$('friction-rub-zone').addEventListener(type,()=>rubPointer=null);
  $('friction-rub-zone').addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();rubOnce();}});
  function drawMap(){const c=$('map-canvas').getContext('2d'),mx=x=>500+x*37,mz=z=>240+z*29;c.clearRect(0,0,1000,500);c.fillStyle='#173a31';c.fillRect(45,25,910,440);c.strokeStyle='#9db8a0';c.lineWidth=3;c.strokeRect(mx(-12),mz(-7),24*37,14*29);c.fillStyle='#628d7b';for(const o of L.obstacles)c.fillRect(mx(o.x-o.w/2),mz(o.z-o.d/2),o.w*37,o.d*29);for(const s of L.stations){c.fillStyle='#f1e6c7';c.font='bold 20px system-ui';c.textAlign='center';c.fillText(s.number,mx(s.center[0]),mz(s.center[1])-14);}const p=navigation.position;c.fillStyle='#ffe08b';c.beginPath();c.arc(mx(p.x),mz(p.z),8,0,Math.PI*2);c.fill();c.strokeStyle='#ffe08b';c.beginPath();c.moveTo(mx(p.x),mz(p.z));c.lineTo(mx(p.x-Math.sin(p.yaw)*.75),mz(p.z-Math.cos(p.yaw)*.75));c.stroke();}
  $('map-list').replaceChildren(...L.stations.map(s=>{const p=document.createElement('div');p.textContent=`${s.number} · ${s.topic}`;return p;}));
  $('map-button').addEventListener('click',()=>{clearInput();drawMap();$('lab-map').showModal();});$('map-close').addEventListener('click',()=>$('lab-map').close());
  $('notebook-button').addEventListener('click',()=>{clearInput();progress();$('notebook').showModal();});$('close-notebook').addEventListener('click',()=>$('notebook').close());
  $('fullscreen').addEventListener('click',async()=>{if(document.fullscreenElement){await document.exitFullscreen();return;}if(document.documentElement.classList.contains('immersive-fallback')){document.documentElement.classList.remove('immersive-fallback');return;}try{if(!document.documentElement.requestFullscreen)throw new Error('Unavailable');await document.documentElement.requestFullscreen();}catch(_){document.documentElement.classList.add('immersive-fallback');$('walk-feedback').textContent='已切換沉浸畫面；Safari 的網址列仍可能保留。';}});
  window.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA/.test(e.target.tagName)||$('notebook').open||$('lab-map').open)return;const k=e.key.toLowerCase();if(k==='escape'){if(!$('foyer-observe').hidden)closeObservation();else if(!$('bench-task-detail').hidden){$('bench-task-detail').hidden=true;$('bench-task-open').setAttribute('aria-expanded','false');}else if(mode!=='walk')leave();return;}if(paused())return;if(['w','a','s','d','q','r','arrowup','arrowdown','arrowleft','arrowright','e'].includes(k)){e.preventDefault();keys.add(k);if(k==='e'&&!e.repeat)enter();}});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  function moveJoy(e){if(e.pointerId!==joy.pointer)return;const r=$('joystick').getBoundingClientRect(),x=(e.clientX-r.x-r.width/2)/(r.width*.36),y=(e.clientY-r.y-r.height/2)/(r.height*.36),n=Math.max(1,Math.hypot(x,y));joy.x=x/n;joy.y=y/n;$('stick').style.transform=`translate(${joy.x*26}px,${joy.y*26}px)`;}
  $('joystick').addEventListener('pointerdown',e=>{if(joy.pointer!==null)return;joy.pointer=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);moveJoy(e);});$('joystick').addEventListener('pointermove',moveJoy);for(const type of ['pointerup','pointercancel','lostpointercapture'])$('joystick').addEventListener(type,e=>{if(e.pointerId===joy.pointer){joy.pointer=null;joy.x=joy.y=0;$('stick').style.transform='';}});
  $('world').addEventListener('pointerdown',e=>{if(mode!=='walk'||paused()||e.button>0)return;lookPointer={id:e.pointerId,x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);});$('world').addEventListener('pointermove',e=>{if(lookPointer?.id!==e.pointerId)return;navigation.look(e.clientX-lookPointer.x,e.clientY-lookPointer.y);lookPointer.x=e.clientX;lookPointer.y=e.clientY;});for(const type of ['pointerup','pointercancel','lostpointercapture'])$('world').addEventListener(type,()=>lookPointer=null);
  for(const [id,value] of [['look-left',1],['look-right',-1]]){const b=$(id);b.addEventListener('pointerdown',e=>{turnPointers.set(e.pointerId,value);b.setPointerCapture(e.pointerId);});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,e=>turnPointers.delete(e.pointerId));b.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){navigation.step(0,0,value,.28);e.preventDefault();}});}
  function resize(){const r=$('world').getBoundingClientRect();if(r.width>1&&r.height>1){renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}}
  new ResizeObserver(resize).observe($('game'));window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);
  function render(){
    const r=$('world').getBoundingClientRect(),panel=mode==='walk'?0:$('bench-hud').hidden?mode==='friction'?document.querySelector('.friction-panel').getBoundingClientRect().height:$('inquiry-panel').getBoundingClientRect().height:document.querySelector('.bench-controls').getBoundingClientRect().height;
    renderer.setViewport(0,0,r.width,r.height);renderer.clear();
    if(mode==='inquiry'&&activeStation.id!=='leyden')return;
    if(mode==='walk'){renderer.render(scene,camera);return;}
    const h=Math.max(1,r.height-panel),aspect=r.width/h,width=mode==='lab'?7.6:mode==='friction'?5.7:Math.max(leydenView==='exploded'?7.5:5.1,3.25*aspect);
    closeCamera.left=-width/2;closeCamera.right=width/2;closeCamera.top=width/(r.width/h)/2;closeCamera.bottom=-closeCamera.top;closeCamera.updateProjectionMatrix();
    if(mode==='lab'){closeCamera.position.set(3.2,4.8,8.4);closeCamera.lookAt(V(0,2.30,0));}
    else if(mode==='friction'){closeCamera.position.set(-2.88,5.7,4.67);closeCamera.lookAt(V(-7,1.57,0));}
    else{closeCamera.position.set(7,3.96,7);closeCamera.lookAt(V(7,3.02,0));}
    renderer.setViewport(0,panel,r.width,h);renderer.render(scene,closeCamera);renderer.setViewport(0,0,r.width,r.height);
  }
  function frame(now){raf=0;const dt=Math.min(.05,(now-lastTime)/1000||.016);lastTime=now;
    if(!paused()&&environmentStatus==='ready'){
      if(mode==='walk'){const right=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joy.x,back=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+joy.y,turn=(keys.has('q')?1:0)-(keys.has('r')?1:0)+Array.from(turnPointers.values()).reduce((a,b)=>a+b,0);navigation.step(right,back,turn,dt);updateWalk();}
      else if(mode==='lab'&&$('bench-task-detail').hidden){let axis=Math.abs(joy.x)>=Math.abs(joy.y)?joy.x:-joy.y;axis+=(keys.has('arrowright')||keys.has('arrowup')?1:0)-(keys.has('arrowleft')||keys.has('arrowdown')?1:0);if(Math.abs(axis)>.08)setBench(B.setDistance(bench,bench.dist+axis*65*dt));}
    }
    exhibit.update(dt);scope.update(now,dt);materials.update(now);view.draw(now);render();if(!document.hidden)raf=requestAnimationFrame(frame);
  }
  function stop(){clearInput();if(raf)cancelAnimationFrame(raf);raf=0;}
  function resume(){if(!raf&&!document.hidden){lastTime=performance.now();raf=requestAnimationFrame(frame);}}
  window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>document.hidden?stop():resume());window.addEventListener('pagehide',stop);window.addEventListener('pageshow',resume);
  window.labGame=Object.freeze({snapshot:()=>({mode,activeStation:activeStation?.id||null,environmentStatus,firstPerson:true,characterDownloaded:false,position:[navigation.position.x,0,navigation.position.z],yaw:navigation.position.yaw,pitch:navigation.position.pitch,nearStation:L.near(navigation.position)?.id||null,floorArea:L.floorArea,bench:{...bench},friction:{...friction},frictionTally:R.tally(friction),frictionDone:[...frictionDone],frictionDisplayed:materials.getDisplayedTransfers(),frictionFlight:materials.getFlight(),inquiry:inquiry?{...inquiry}:null,inquiryPhase,prediction,leydenView,leydenParts:jarParts.map(p=>({name:p.node.name,visible:p.node.visible,position:p.node.position.toArray()})),foyerHairCharge:exhibit.getHairCharge(),foyerGuess,observationOpen:!$('foyer-observe').hidden,completed:[...completed],discoveries:[...discoveries],rewardVisible:rewardRack.visible,benchFlowVisible:scope.snapshot().flowVisible,scope:scope.snapshot(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles})});
  progress();updateWalk();setVisibility();resize();resume();
  const load=url=>new Promise((resolve,reject)=>{let done=false;const timer=setTimeout(()=>{done=true;reject(new Error('模型下載逾時'));},20000);new T.GLTFLoader().load(url,g=>{if(done)return;clearTimeout(timer);resolve(g.scene);},undefined,error=>{clearTimeout(timer);reject(error);});});
  try{
    [environment,leyden]=await Promise.all([load('assets/environment/electricity-gallery.glb?v=0926-fp-01'),load('assets/environment/leyden-jar.glb?v=0926-fp-01')]);
    environment.name='BlenderElectricityGallery';environment.traverse(o=>{if(o.isMesh){o.receiveShadow=true;o.castShadow=false;}});scene.add(environment);
    leyden.position.set(7,1.81,0);leyden.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;jarParts.push({node:o,position:o.position.clone()});if(/Glass/.test(o.name)){o.material.transparent=true;o.material.opacity=.25;o.material.depthWrite=false;o.material.side=T.DoubleSide;}}});scene.add(leyden);setLeydenView();environmentStatus='ready';setVisibility();$('loading').hidden=true;
  }catch(error){environmentStatus='failed';$('loading').replaceChildren();const p=document.createElement('p');p.textContent='實驗室模型未載入。請確認網路，再重新開啟。';const b=document.createElement('button');b.textContent='重新載入';b.type='button';b.addEventListener('click',()=>location.reload());$('loading').append(p,b);console.error('Lab model load failed',error);}
})();
