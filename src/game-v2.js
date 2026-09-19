(function () {
  'use strict';
  const $ = id => document.getElementById(id), T = window.THREE, E = window.StaticElectricity;
  if (!T || !E) { $('loading').textContent = '無法載入實驗室，請確認 vendor 與 src 資料夾完整。'; return; }
  const V = (x=0,y=0,z=0) => new T.Vector3(x,y,z);
  const saveKey = 'lab-quest-3d-v1';
  let completed=[];
  try { const v=JSON.parse(localStorage.getItem(saveKey)); if(Array.isArray(v)) completed=[...new Set(v.filter(n=>n===1||n===2))]; } catch (_) {}
  let state=E.createState(1), mode='walk', held=false, action=null, targetDistance=1, groundWanted=false, turning=0;
  let path=[], autoBench=false, lastTime=0, raf=0, isWalking=false;
  const keys=new Set(), joystick={x:0,y:0,pointer:null};
  const scene=new T.Scene(); scene.background=new T.Color('#b8d2c6'); scene.fog=new T.Fog('#b8d2c6',22,45);
  const camera=new T.OrthographicCamera(-8,8,4.5,-4.5,.1,80);
  let renderer;
  try { renderer=new T.WebGLRenderer({canvas:$('world'),antialias:true,preserveDrawingBuffer:true}); }
  catch (_) { $('loading').textContent='此瀏覽器未啟用 WebGL，請用支援 3D 的瀏覽器開啟。'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.shadowMap.enabled=true; renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.outputColorSpace=T.SRGBColorSpace; renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=1.3;
  scene.add(new T.HemisphereLight('#e8f5ff','#7b8661',2));
  const sun=new T.DirectionalLight('#fff1cf',3.2);sun.position.set(-4,10,6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.5,far:30});sun.shadow.bias=-.0004;scene.add(sun);
  const fill=new T.DirectionalLight('#bfddff',1.1);fill.position.set(5,5,-4);scene.add(fill);
  const mat=(color,roughness=.65,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
  const M={wood:mat('#ba8753'),edge:mat('#e3bc81'),teal:mat('#3f736e'),dark:mat('#284b50'),cream:mat('#ede3c7'),blue:mat('#285da0'),trim:mat('#f2bd56'),skin:mat('#eab18a'),hair:mat('#362c2b'),shoe:mat('#eceddc'),pants:mat('#263c56'),metal:mat('#acbec1',.27,.65),red:mat('#d94e4e',.3,.25),gold:mat('#efc259',.35,.65),rubber:mat('#303e45'),electron:new T.MeshStandardMaterial({color:'#4dd2ff',emissive:'#19719b',emissiveIntensity:.8}),positive:new T.MeshStandardMaterial({color:'#ff4d4d',emissive:'#8a2525',emissiveIntensity:.25})};
  function mesh(geometry,material,parent=scene){const o=new T.Mesh(geometry,material);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function box(w,h,d,material,x,y,z,parent=scene){const o=mesh(new T.BoxGeometry(w,h,d),material,parent);o.position.set(x,y,z);return o;}
  function ball(rx,ry,rz,material,x,y,z,parent=scene){const o=mesh(new T.SphereGeometry(1,24,16),material,parent);o.scale.set(rx,ry,rz);o.position.set(x,y,z);return o;}
  function cyl(r,h,material,x,y,z,parent=scene){const o=mesh(new T.CylinderGeometry(r,r,h,32),material,parent);o.position.set(x,y,z);return o;}
  function link(a,b,r,material,parent=scene){const o=cyl(r,1,material,0,0,0,parent);setLink(o,a,b);return o;}
  function setLink(o,a,b){o.position.copy(a).add(b).multiplyScalar(.5);o.scale.y=a.distanceTo(b);o.quaternion.setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize());}
  function curve(points,r,material,parent=scene){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),40,r,8,false),material,parent);}
  function label(text,color='#eef0d4',size=1){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.font='600 54px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,256,64);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const o=new T.Sprite(new T.SpriteMaterial({map,depthWrite:false}));o.scale.set(size,size/4,1);return o;}
  // A walkable room, with its front walls removed like a small game diorama.
  box(13,.22,11.8,M.dark,0,-.18,0);
  const planks=[mat('#c7a477'),mat('#c0a075'),mat('#cfad81')];
  for(let i=0;i<18;i++) for(let j=0;j<6;j++) box(.70,.08,1.94,planks[(i+j)%3],-6.0+i*.71,-.03,-4.87+j*1.96);
  box(13,5,.18,mat('#8fb5aa'),0,2.45,-5.75);box(.18,5,11.6,mat('#bdd0b9'),-6.5,2.45,0);
  box(13,.18,.24,M.edge,0,.20,-5.6);box(.24,.18,11.5,M.edge,-6.35,.20,0);
  // Large windows and quiet academic details.
  for(const x of [-3.3,1.7]) {
    box(3.3,2.6,.09,M.cream,x,3.1,-5.59);box(3.03,2.31,.11,mat('#9acbd1'),x,3.1,-5.51);
    for(const dx of [-1.55,0,1.55])box(.07,2.45,.12,M.cream,x+dx,3.1,-5.40);
    box(3.1,.07,.12,M.cream,x,3.1,-5.40);box(3.5,.12,.5,M.edge,x,1.83,-5.43);
  }
  box(2.15,2.1,.12,M.dark,-6.34,3,-2.9).rotation.y=Math.PI/2;
  const boardTitle=label('實驗 · 觀察 · 發現','#e7e5be',2.7);boardTitle.position.set(-6.1,3.8,-2.9);scene.add(boardTitle);
  const carpet=box(6.9,.015,5.2,mat('#568e82'),0,.025,.1);box(6.6,.019,4.9,mat('#699f8f'),0,.027,.1);
  // One real bench: top, apron, legs, and drawers all have depth and cast shadows.
  const table=new T.Group();scene.add(table);
  box(5.6,.19,1.85,M.edge,0,1.62,0,table);box(5.45,.07,1.73,M.wood,0,1.74,0,table);
  box(5.15,.30,1.52,M.teal,0,1.40,0,table);
  for(const x of [-2.42,2.42])for(const z of [-.66,.66])box(.17,1.35,.17,M.wood,x,.66,z,table);
  for(const x of [-1.6,0,1.6]){box(1.43,.27,.07,M.teal,x,1.40,.80,table);box(.35,.035,.07,M.trim,x,1.4,.85,table);}
  box(3.6,.025,1.35,M.dark,-.15,1.79,.04);
  // Empty equipment rack becomes visibly populated upon earning level 2.
  box(2.1,1.7,1.0,M.teal,4.6,.85,-4.75);box(2.2,.1,1.08,M.edge,4.6,1.74,-4.75);
  const rackTitle=label('器材架','#f2e3b7',1.45);rackTitle.position.set(4.6,2.7,-4.75);scene.add(rackTitle);
  const rewardRack=new T.Group();scene.add(rewardRack);
  for(const x of [4.18,4.95]){cyl(.25,.07,M.dark,x,1.83,-4.65,rewardRack);cyl(.03,.32,M.rubber,x,2,-4.65,rewardRack);ball(.19,.19,.19,M.metal,x,2.26,-4.65,rewardRack);}
  const crate=box(.55,.34,.40,M.trim,5.28,1.96,-5.04,rewardRack);box(.55,.04,.40,M.dark,5.28,2.14,-5.04,rewardRack);
  // A plant, a door, and wall lamps give orientation without extra game systems.
  cyl(.40,.66,mat('#c98f65'),-5.5,.33,-4.7);
  for(let i=0;i<7;i++){const a=i*2.4;const leaf=ball(.16,.6,.11,mat(i%2?'#4a8864':'#679f6a'),-5.5+Math.sin(a)*.2,1.05+Math.cos(a)*.15,-4.7+Math.cos(a)*.2);leaf.rotation.z=Math.sin(a)*.65;}
  box(1.35,2.6,.10,M.dark,-6.32,1.3,3.0).rotation.y=Math.PI/2;
  for(const x of [-.8,4.0]){cyl(.17,.18,M.trim,x,4.5,-5.3);const lamp=new T.PointLight('#ffe3a1',3,5);lamp.position.set(x,4.25,-4.7);scene.add(lamp);}
  // Electroscope stem stops at the leaf hinge. Glass and insulating stopper carry no charges.
  const scope=new T.Group();scope.position.set(-.5,1.81,.18);scene.add(scope);
  cyl(.56,.11,M.dark,0,.055,0,scope);cyl(.52,.035,M.metal,0,.123,0,scope);
  const glass=new T.MeshPhysicalMaterial({color:'#bde8e9',transparent:true,opacity:.13,roughness:.15,metalness:.05,side:T.DoubleSide,depthWrite:false});
  const profile=[V(.47,.15),V(.47,.65),V(.45,.86),V(.30,1.12),V(.17,1.22)].map(p=>new T.Vector2(p.x,p.y));
  const jar=mesh(new T.LatheGeometry(profile,48),glass,scope);jar.castShadow=false;jar.renderOrder=3;
  for(const side of [-1,1])curve([V(side*.47,.16,0),V(side*.47,.65,0),V(side*.44,.9,0),V(side*.17,1.22,0)],.009,M.metal,scope);
  cyl(.037,.63,M.metal,0,.905,0,scope); // bottom .59 (hinge), never .15 (base)
  cyl(.18,.16,M.rubber,0,1.22,0,scope);cyl(.37,.07,M.red,0,1.345,0,scope);
  cyl(.33,.013,mat('#ed7167',.25,.2),0,1.386,0,scope);
  const leafPivots=[new T.Group(),new T.Group()];leafPivots.forEach((p,i)=>{p.position.set(0,.59,0);scope.add(p);box(.11,.41,.009,M.gold,0,-.205,i*.009,p);});
  ball(.055,.045,.04,M.gold,0,.59,.025,scope);
  const groundBase=V(1.70,1.81,.30),padY=2.05;
  cyl(.25,.10,M.dark,groundBase.x,1.85,groundBase.z);cyl(.16,.15,M.metal,groundBase.x,1.96,groundBase.z);
  const pad=cyl(.22,.065,M.trim,groundBase.x,padY,groundBase.z);const padGlyph=label('⏚','#284b50',.3);padGlyph.position.set(1.70,2.13,.38);scene.add(padGlyph);
  const wirePoints=[V(-.14,3.155,.18),V(.08,2.92,.38),V(.30,1.94,.52),V(1.68,1.98,.3)];
  curve(wirePoints,.021,M.rubber);
  const switchArm=link(V(1.95,1.83,.3),V(2.19,2.02,.3),.023,M.trim);
  curve([V(2.18,1.83,.3),V(2.72,1.81,.3),V(2.95,.8,.22),V(3.1,.10,.2)],.024,M.rubber);
  // March: independent 3D meshes, modelled from the reference sheets (never flat sprites).
  const avatar=new T.Group();avatar.position.set(0,0,3.8);scene.add(avatar);
  const C={jacket:mat('#253e68'),seam:mat('#344f79'),shirt:mat('#44484f'),hair:mat('#202125'),hairLight:mat('#303238'),frame:mat('#1b2126'),pants:mat('#283443'),shoe:mat('#292d34'),sole:mat('#d5d3c9'),skin:mat('#eeb490'),white:mat('#f5f0e6'),iris:mat('#584131')};
  const pelvis=new T.Group(),torso=new T.Group();avatar.add(pelvis,torso);
  pelvis.position.y=1.57;
  ball(.36,.20,.23,C.pants,0,0,0,pelvis);
  // Slightly tapered jacket, an open front, and the same science shirt as the references.
  ball(.40,.54,.25,C.jacket,0,2.13,0,torso);
  box(.32,.83,.08,C.shirt,0,2.13,.244,torso);
  for(const side of [-1,1]){
    const panel=box(.16,.92,.075,C.jacket,side*.25,2.10,.232,torso);panel.rotation.z=side*-.035;
    const collar=box(.16,.25,.045,C.seam,side*.14,2.56,.241,torso);collar.rotation.z=side*.35;
    for(const y of [1.78,2.01,2.24])ball(.017,.017,.008,C.seam,side*.175,y,.286,torso);
  }
  const atom=new T.Group();atom.position.set(0,2.26,.295);torso.add(atom);
  for(const angle of [0,Math.PI/3,-Math.PI/3]){const orbit=mesh(new T.TorusGeometry(.12,.008,6,32),C.white,atom);orbit.scale.y=1.45;orbit.scale.x=.53;orbit.rotation.z=angle;}
  ball(.023,.023,.015,C.white,0,0,0,atom);
  cyl(.125,.22,C.skin,0,2.76,0,torso);
  const head=new T.Group();head.position.set(0,3.16,.015);torso.add(head);
  ball(.40,.47,.34,C.skin,0,0,0,head);ball(.071,.075,.082,C.skin,0,-.05,.335,head);
  const framePath=new T.Shape();framePath.moveTo(-.135,.14);framePath.lineTo(.135,.14);framePath.quadraticCurveTo(.165,.14,.165,.105);framePath.lineTo(.145,-.105);framePath.quadraticCurveTo(.14,-.14,.105,-.14);framePath.lineTo(-.105,-.14);framePath.quadraticCurveTo(-.14,-.14,-.145,-.105);framePath.lineTo(-.165,.105);framePath.quadraticCurveTo(-.165,.14,-.135,.14);
  for(const side of [-1,1]){
    ball(.071,.13,.080,C.skin,side*.39,-.03,0,head);ball(.034,.066,.034,mat('#d99778'),side*.43,-.03,.034,head);
    ball(.115,.133,.039,C.white,side*.175,.045,.315,head);
    ball(.064,.088,.025,C.iris,side*.175,.025,.350,head);
    ball(.038,.067,.014,C.frame,side*.175,.025,.373,head);ball(.018,.025,.009,C.white,side*.156,.060,.384,head);
    const brow=box(.19,.035,.025,C.hair,side*.175,.244,.293,head);brow.rotation.z=-side*.10;
    const ring=mesh(new T.TubeGeometry(new T.CatmullRomCurve3(framePath.getPoints(8).map(p=>V(p.x,p.y,0)),true,'centripetal'),64,.020,8,true),C.frame,head);ring.position.set(side*.181,.043,.391);
    link(V(side*.34,.085,.393),V(side*.415,.075,-.11),.019,C.frame,head);
  }
  curve([V(-.028,.073,.397),V(0,.084,.409),V(.028,.073,.397)],.018,C.frame,head);
  curve([V(-.105,-.21,.298),V(0,-.246,.327),V(.105,-.21,.298)],.013,mat('#914936'),head);
  ball(.418,.31,.36,C.hair,0,.25,-.063,head);
  // Swept overlapping locks establish March's silhouette from all viewing angles.
  for(let i=0;i<6;i++){const tuft=ball(.12,.27,.115,i===2?C.hairLight:C.hair,-.29+i*.105,.275+Math.sin(i*.5)*.045,.223,head);tuft.rotation.z=-.55;}
  for(const side of [-1,1])ball(.085,.19,.13,C.hair,side*.353,.10,-.12,head);
  const legs=[];
  for(const side of [-1,1]){
    const hip=new T.Group(),knee=new T.Group(),ankle=new T.Group();hip.position.set(side*.205,0,0);pelvis.add(hip);hip.add(knee);knee.position.y=-.67;knee.add(ankle);ankle.position.y=-.68;
    const thigh=mesh(new T.CylinderGeometry(.165,.143,.67,16),C.pants,hip);thigh.position.y=-.335;
    ball(.144,.15,.14,C.pants,0,0,0,knee);const shin=mesh(new T.CylinderGeometry(.142,.12,.68,16),C.pants,knee);shin.position.y=-.34;
    ball(.16,.12,.26,C.shoe,0,-.072,.08,ankle);box(.31,.065,.47,C.sole,0,-.16,.085,ankle);
    for(const z of [.05,.12,.19])box(.19,.012,.02,C.white,0,.004,z,ankle);
    legs.push({hip,knee,ankle});
  }
  const shoulders=[V(-.48,2.61,0),V(.48,2.61,0)],arms=[],upperLength=.81,foreLength=.79;
  const rest=[V(-.57,1.30,.06),V(.57,1.30,.06)],down=V(0,-1,0);
  for(let i=0;i<2;i++){
    const shoulder=new T.Group(),elbow=new T.Group(),wrist=new T.Group(),hand=new T.Group();shoulder.position.copy(shoulders[i]);torso.add(shoulder);shoulder.add(elbow);elbow.position.y=-upperLength;elbow.add(wrist);wrist.position.y=-foreLength;wrist.add(hand);
    ball(.178,.19,.18,C.jacket,0,0,0,shoulder);
    const upper=mesh(new T.CylinderGeometry(.172,.139,upperLength,16),C.jacket,shoulder);upper.position.y=-upperLength/2;
    ball(.139,.14,.139,C.jacket,0,0,0,elbow);
    cyl(.146,.18,C.seam,0,-.095,0,elbow);
    const fore=mesh(new T.CylinderGeometry(.115,.074,foreLength-.16,16),C.skin,elbow);fore.position.y=-(foreLength+.16)/2;
    ball(.081,.09,.074,C.skin,0,-foreLength,0,elbow);
    ball(.104,.12,.072,C.skin,0,0,0,hand);
    const fingers=[];
    for(let f=0;f<4;f++){const finger=new T.Group();finger.position.set(-.066+f*.044,-.067,.028);hand.add(finger);ball(.025,.074-f*.005,.026,C.skin,0,-.046,0,finger);fingers.push(finger);}
    const thumb=ball(.038,.073,.034,C.skin,i===0?.10:-.10,-.015,.035,hand);thumb.rotation.z=i===0?-.4:.4;
    arms.push({shoulder,elbow,wrist,hand,fingers,reachError:0});
  }
  function poseArm(i,target){
    const arm=arms[i];avatar.updateMatrixWorld(true);
    const goal=torso.worldToLocal(avatar.localToWorld(target.clone())),s=shoulders[i],delta=goal.clone().sub(s),distance=delta.length(),n=delta.normalize(),d=T.MathUtils.clamp(distance,.05,upperLength+foreLength-.001);
    const reachable=s.clone().addScaledVector(n,d);
    // Real shoulder → elbow → wrist hierarchy. IK rotates bones, never stretches them.
    const pole=mode==='walk'?V(i===0?-.2:.2,-.2,-1):V(i===0?-.25:.35,-1,-.25),perp=pole.addScaledVector(n,-pole.dot(n)).normalize();
    const along=(upperLength*upperLength-foreLength*foreLength+d*d)/(2*d),height=Math.sqrt(Math.max(0,upperLength*upperLength-along*along));
    const bend=s.clone().addScaledVector(n,along).addScaledVector(perp,height);
    arm.shoulder.quaternion.setFromUnitVectors(down,bend.clone().sub(s).normalize());
    const foreRotation=new T.Quaternion().setFromUnitVectors(down,reachable.clone().sub(bend).normalize());
    arm.elbow.quaternion.copy(arm.shoulder.quaternion).invert().multiply(foreRotation);
    // A stable wrist keeps the grasped rod horizontal; the left fingers contact the terminal.
    arm.wrist.quaternion.copy(foreRotation).invert();arm.reachError=Math.max(0,distance-d);
    arm.fingers.forEach(f=>f.rotation.x=i===0&&held?-1.28:mode==='lab'&&i===1?.12:.18);
  }
  // Instrument is parented to the hand only after the pickup animation reaches it.
  const rod=new T.Group(),rodGrip=new T.Object3D();rod.add(rodGrip);scene.add(rod);
  const shaft=cyl(.058,.72,C.frame,.19,0,0,rod);shaft.rotation.z=Math.PI/2;
  const handle=cyl(.069,.22,M.rubber,-.07,0,0,rod);handle.rotation.z=Math.PI/2;
  for(const x of [.24,.36,.48])box(.055,.012,.012,M.electron,x,0,.058,rod);
  const RACK=V(-1.60,1.88,-.05),FAR=V(-1.05,2.35,-.70),NEAR=V(-1.60,3.15,.18),PRESS=V(1.70,2.235,.30),IDLE=V(.78,1.92,-.53),STATION=V(.05,0,-1.15);
  rod.position.copy(RACK);
  for(const x of [-1.89,-1.24])box(.08,.055,.24,M.trim,x,1.835,-.05);
  const posMarks=[],negMarks=[];let assignments=[];
  function charge(negative){const g=new T.Group();scene.add(g);ball(.035,.035,.035,negative?M.electron:M.positive,0,0,0,g);box(.044,.010,.008,M.cream,0,0,.035,g);if(!negative)box(.010,.044,.008,M.cream,0,0,.035,g);return g;}
  for(let i=0;i<12;i++){posMarks.push(charge(false));negMarks.push(charge(true));}
  function chargePoint(zone,slot,angle,positive=false){
    const off=positive?-.027:.027;
    if(zone==='top'){const p=[[-.23,1.397],[-.08,1.397],[.08,1.397],[.23,1.397],[0,1.04],[0,.82]][slot];return scope.localToWorld(V(p[0]+off,p[1],.07));}
    if(zone==='earth')return V(3.1,.10,.2);
    const a=(zone==='left'?1:-1)*angle,d=.09+slot*.075;
    return scope.localToWorld(V(-Math.sin(a)*d+off,.59-Math.cos(a)*d,.055));
  }
  function rearrange(){
    const pool=[];[['top',state.topElectrons],['left',state.leafElectrons],['right',state.leafElectrons],['earth',12-state.electronCount]].forEach(([zone,n])=>{for(let slot=0;slot<n;slot++)pool.push({zone,slot});});
    const mapped=new Map();assignments.forEach((a,i)=>{const k=pool.findIndex(p=>p.zone===a.zone&&p.slot===a.slot);if(k>=0)mapped.set(i,pool.splice(k,1)[0]);});
    assignments=negMarks.map((g,i)=>{const dest=mapped.get(i)||pool.shift(),old=assignments[i];return {...dest,from:g.position.clone(),oldZone:old?old.zone:dest.zone,start:performance.now(),moving:!!old&&old.zone!==dest.zone};});
  }
  function dispatch(a){const next=E.reduce(state,a);if(next!==state){const moved=next.topElectrons!==state.topElectrons||next.leafElectrons!==state.leafElectrons||next.electronCount!==state.electronCount;state=next;if(moved)rearrange();updateUI();}}
  const messages={ready:'先拿起負電棒，控制人物的手靠近圓盤。','induced-neutral':'第二段：左右鋁箔再各分離 1 個藍色電子，共增加 2 個；累計 4 個。正電荷固定在金屬上。','induction-reversed':'棒移遠，藍色電子回到上方導體，金箔閉合。','ready-to-ground':'第二段完成：累計 4 個藍色電子分離到鋁箔。保持負棒靠近，再用左手接地。','electrons-to-earth':'接地已接通，藍色電子沿接地線流出；紅色正電荷仍固定在金屬上。接著抬起左手。','charge-isolated':'手已抬起，接地斷開。最後再移走負電棒。','positive-remains':'電子流走後留下淨正電，金箔在移棒後仍張開。','wrong-order':'先移棒時，地面把電子補回來了。再試試先斷地。','ground-without-rod':'棒還沒靠近；接地不能讓中性驗電器留下電荷。','rod-too-early':'還沒接地就移棒，驗電器的總電荷仍是零。','observe-first':'先完成操作，再回答總電荷。','not-net-charge':'金箔張開不等於總電荷改變。想想電子有沒有進出。','electrons-left':'離開的是電子，因此最後留下哪一種淨電荷？','concept-correct':'實驗與判斷都完成了！'};
  function saveProgress(){try{localStorage.setItem(saveKey,JSON.stringify(completed));}catch(_){$('feedback').textContent+='（此瀏覽器無法儲存，進度僅保留本次。）';}}
  function progress(){const xp=completed.reduce((n,m)=>n+(m===1?40:60),0);$('level').textContent='Lv. '+(xp>=100?2:1);$('xp').textContent=xp+' / 100 經驗';$('xp-bar').value=xp;rewardRack.visible=xp>=100;$('inventory').replaceChildren();['March：方框眼鏡、深藍外套、科學 T 恤','驗電器、負電棒、接地線',...(xp>=100?['新器材：一組等大的金屬球（器材架）','新裝備：琥珀工具箱']:[])].forEach(t=>{const li=document.createElement('li');li.textContent=t;$('inventory').appendChild(li);});$('record').textContent='已完成 '+completed.length+' / 2 個靜電發現。';}
  function updateUI(){
    const lab=mode==='lab';$('lab-controls').hidden=!lab;$('walk-ui').hidden=lab;$('instrument-stats').hidden=!lab;
    document.querySelector('.game-shell').classList.toggle('is-lab',lab);
    $('mode-label').textContent=lab?'實驗桌 · 人物操作':'自由走動';$('held-label').textContent=held?'手持負電棒':'雙手空著';
    $('mission-tag').textContent=lab?'實驗 '+state.mission+' / 2 · 靜電研究':'第一天 · 自由探索';
    $('mission-title').textContent=lab?(state.mission===1?'不碰它，金箔也會動？':'把電荷留下來。'):'先到實驗桌看看吧。';
    $('instruction').textContent=lab?(held?(state.mission===1?'右手選「遠、中、近」，觀察金箔的變化。':'右手靠近 → 左手接地 → 抬左手 → 移棒。'):'點負電棒或按「拿起」，March 會伸出右手。'):'拖左下搖桿、使用方向鍵，或點地板走過去。';
    $('pickup').disabled=held||!!action;
    for(const [id,d] of [['near',0],['mid',.5],['far',1]]){$(id).disabled=!held||!!action;$(id).setAttribute('aria-pressed',String(held&&targetDistance===d));}
    $('ground').disabled=state.mission!==2||!held||!!action;$('ground').setAttribute('aria-pressed',String(groundWanted));$('ground').textContent=groundWanted?'抬左手，斷地':'左手接地';
    $('reset').disabled=!!action;$('leave').disabled=!!action;
    $('net').textContent='淨電荷 '+(state.electroscopeNetCharge>0?'+':'')+state.electroscopeNetCharge;
    $('ground-status').textContent=state.isGrounded?'接地接通':'接地斷開';
    $('electron-status').textContent=state.inductionStage===0?'遠：額外分離 0 個電子':state.inductionStage===1?'中：第一段左右各 1 個，共 2 個電子':'近：第二段左右再各 1 個，累計 4 個電子';
    $('action-caption').textContent=action?'March 正在'+action.label+'…':held?'右手持棒：'+(targetDistance===0?'近':targetDistance===.5?'中':'遠')+'。也能拖曳負電棒切換三段；左手獨立操作接地。':'負電棒放在桌上。先拿起，再進行實驗。';
    $('question').hidden=!lab||!state.operationComplete||state.completed;
    $('question-text').textContent=state.mission===1?'負棒沒碰到圓盤，驗電器的總電荷是？':'斷地、移棒後，驗電器帶什麼電？';
    $('next').hidden=!lab||!state.completed||state.mission!==1;
    if(lab)$('feedback').textContent=state.inductionStage===1&&!state.isGrounded&&state.electroscopeNetCharge===0?'第一段：藍色電子從上方導體分流，左右鋁箔各增加 1 個，共 2 個。紅色正電荷固定不動。':messages[state.feedback]||messages.ready;
    progress();
  }
  function handWorld(i){avatar.updateMatrixWorld(true);return arms[i].hand.getWorldPosition(V());}
  function handToWorld(i,p){avatar.updateMatrixWorld(true);poseArm(i,avatar.worldToLocal(p.clone()));}
  function handAction(label,target,duration,finish){action={label,start:performance.now(),from:handWorld(0),to:target.clone(),duration,finish};updateUI();}
  function takeRod(){if(mode!=='lab'||held||action)return;handAction('伸手拿棒',RACK,650,()=>{arms[0].hand.add(rod);rod.position.set(0,0,0);rod.rotation.set(0,0,0);held=true;handAction('拿起負電棒',FAR,550,()=>{targetDistance=1;});});}
  function putAway(finish){groundWanted=false;dispatch({type:'SET_GROUNDED',value:false});targetDistance=1;dispatch({type:'MOVE_ROD',distance:1});if(!held){finish();return;}handAction('放回負電棒',RACK,650,()=>{scene.attach(rod);rod.position.copy(RACK);rod.rotation.set(0,0,0);held=false;finish();});}
  function resetMission(mission){if(action)return;putAway(()=>{state=E.createState(mission);targetDistance=1;rearrange();updateUI();});}
  function enterBench(){mode='lab';avatar.position.copy(STATION);avatar.rotation.y=0;torso.position.set(0,0,.55);torso.rotation.set(0,0,0);pelvis.position.set(0,1.57,.15);turning=0;legs.forEach(l=>{l.hip.rotation.set(0,0,0);l.knee.rotation.x=.06;l.ankle.rotation.x=-.06;});groundWanted=false;path=[];autoBench=false;isWalking=false;handToWorld(0,FAR);handToWorld(1,IDLE);updateUI();}
  function leaveBench(){if(action)return;putAway(()=>{mode='walk';torso.position.set(0,0,0);pelvis.position.set(0,1.57,0);groundWanted=false;state=E.createState(state.mission);rearrange();keys.clear();updateUI();$('walk-feedback').textContent='可以繼續在房間裡走走，再回到桌邊實驗。';$('world').focus({preventScroll:true});});}
  // Collision-aware grid navigation routes around the table, never through it.
  const blocked=(x,z)=>Math.abs(x)>5.94||Math.abs(z)>5.15||(Math.abs(x)<3.13&&Math.abs(z)<1.13)||(x>3.18&&z<-3.72)||(x<-4.80&&z<-3.86);
  const gridStep=.32,gridN=39,toGrid=n=>Math.round(n/gridStep)+19,key=(x,z)=>x+','+z;
  function findPath(goal){
    const start=[toGrid(avatar.position.x),toGrid(avatar.position.z)],end=[toGrid(goal.x),toGrid(goal.z)],open=[start],seen=new Set([key(...start)]),parents=new Map();let found=null;
    while(open.length){const p=open.shift();if(Math.hypot(p[0]-end[0],p[1]-end[1])<=1){found=p;break;}for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const q=[p[0]+dx,p[1]+dz],k=key(...q);if(q.some(v=>v<0||v>=gridN)||seen.has(k)||blocked((q[0]-19)*gridStep,(q[1]-19)*gridStep))continue;seen.add(k);parents.set(k,p);open.push(q);}}
    if(!found)return [];
    const route=[];while(key(...found)!==key(...start)){route.unshift(V((found[0]-19)*gridStep,0,(found[1]-19)*gridStep));found=parents.get(key(...found));if(!found)break;}
    if(!blocked(goal.x,goal.z))route.push(goal.clone());return route;
  }
  function goBench(){if(mode!=='walk')return;const arrival=V(.5,0,-1.30);path=findPath(arrival);autoBench=path.length>0;if(autoBench){$('walk-feedback').textContent='研究員正在走到實驗桌後方，準備拿取器材。';$('interact').querySelector('span').textContent='前往實驗桌…';}}
  const destination=mesh(new T.RingGeometry(.18,.23,32),new T.MeshBasicMaterial({color:'#fff0a5',side:T.DoubleSide,transparent:true,opacity:.8}));destination.rotation.x=-Math.PI/2;destination.position.y=.07;destination.visible=false;
  function moveCharacter(dx,dz,dt){const step=2.4*dt,n=Math.hypot(dx,dz);if(!n)return;dx=dx/n*step;dz=dz/n*step;const p=avatar.position;if(!blocked(p.x+dx,p.z))p.x+=dx;if(!blocked(p.x,p.z+dz))p.z+=dz;turning=Math.atan2(dx,dz);const diff=Math.atan2(Math.sin(turning-avatar.rotation.y),Math.cos(turning-avatar.rotation.y));avatar.rotation.y+=diff*Math.min(1,dt*14);}
  // Keep charge trajectories on metal; none ever cross the rod/disc air gap.
  function pathPoint(points,t){let lengths=points.slice(1).map((p,i)=>p.distanceTo(points[i])),remaining=lengths.reduce((a,b)=>a+b,0)*t;for(let i=0;i<lengths.length;i++){if(remaining<=lengths[i]||i===lengths.length-1)return points[i].clone().lerp(points[i+1],lengths[i]?Math.min(1,remaining/lengths[i]):1);remaining-=lengths[i];}return points.at(-1).clone();}
  function animateCharges(now,dt){
    const target=state.leafAngle*Math.PI/180,alpha=1-Math.exp(-dt*7);leafPivots[0].rotation.z+=(target-leafPivots[0].rotation.z)*alpha;leafPivots[1].rotation.z=-leafPivots[0].rotation.z;
    const a=leafPivots[0].rotation.z;
    posMarks.forEach((g,i)=>g.position.copy(chargePoint(i<6?'top':i<9?'left':'right',i<6?i:(i-6)%3,a,true)));
    const pivot=scope.localToWorld(V(0,.59,.07)),disc=scope.localToWorld(V(0,1.345,.07));
    negMarks.forEach((g,i)=>{const p=assignments[i];if(!p)return;const t=Math.min(1,(now-p.start)/950),end=chargePoint(p.zone,p.slot,a);g.visible=p.zone!=='earth'||(p.moving&&t<1);
      if(p.moving&&t<1){let route=[p.from];
        if(p.oldZone==='earth')route.push(V(2.18,1.83,.3),...wirePoints.slice().reverse(),disc);
        else if(p.oldZone!=='top')route.push(pivot,disc);
        else if(p.zone==='top'||p.zone==='earth')route.push(disc);
        // Induction: each new electron travels directly down from the upper
        // conductor through the hinge to its own leaf, never up to the disc.
        if(p.zone==='earth')route.push(...wirePoints,V(1.95,1.83,.3),V(2.18,1.83,.3),V(3.1,.10,.2));
        else if(p.zone!=='top')route.push(pivot);
        route.push(end);g.position.copy(pathPoint(route,t));
      }else g.position.lerp(end,Math.min(1,dt*14));
    });
    setLink(switchArm,V(1.95,1.83,.3),state.isGrounded?V(2.18,1.83,.3):V(2.19,2.02,.3));
  }
  const camWalk=V(9,9.5,12),camLab=V(3.2,4.8,8.4),look=new T.Vector3(),camAim=V(0,1,0);let camWidth=16;
  function resize(){const b=$('world').getBoundingClientRect();renderer.setSize(b.width,b.height,false);updateCamera();}
  function updateCamera(){const b=$('world').getBoundingClientRect(),ratio=b.width/b.height;camera.left=-camWidth/2;camera.right=camWidth/2;camera.top=camWidth/ratio/2;camera.bottom=-camera.top;camera.updateProjectionMatrix();}
  new ResizeObserver(resize).observe($('game'));camera.position.copy(camWalk);
  function frame(now){
    raf=0;const dt=Math.min(.05,(now-lastTime)/1000||.016);lastTime=now;
    if(mode==='walk'){
      let sx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joystick.x;
      let sy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+joystick.y;
      if(Math.hypot(sx,sy)>.08){path=[];autoBench=false;destination.visible=false;moveCharacter(sx*.8+sy*.6,-sx*.6+sy*.8,dt);isWalking=true;}
      else if(path.length){const p=path[0],d=p.clone().sub(avatar.position);if(d.length()<.12){path.shift();if(!path.length){destination.visible=false;if(autoBench)enterBench();}}else moveCharacter(d.x,d.z,dt);isWalking=path.length>0;}
      else isWalking=false;
      const phase=now*.010,swing=isWalking?Math.sin(phase)*.5:0,bob=isWalking?Math.abs(Math.sin(phase))*.035:0;
      legs.forEach((l,i)=>{const step=i===0?swing:-swing;l.hip.rotation.x=-step;l.knee.rotation.x=isWalking?.07+Math.max(0,step)*1.3:.05;l.ankle.rotation.x=-l.knee.rotation.x*.35;});
      torso.position.y=bob;torso.rotation.z=isWalking?swing*.035:Math.sin(now*.0018)*.008;pelvis.position.y=1.57+bob;head.rotation.x*=1-Math.min(1,dt*4);head.rotation.y*=1-Math.min(1,dt*4);
      poseArm(0,rest[0].clone().add(V(0,bob,-swing*.9)));poseArm(1,rest[1].clone().add(V(0,bob,swing*.9)));
      if(!autoBench)$('interact').querySelector('span').textContent=Math.hypot(avatar.position.x,avatar.position.z)<4?'操作實驗桌':'走到實驗桌';
    } else {
      if(action){const current=action,t=Math.min(1,(now-current.start)/current.duration),ease=t*t*(3-2*t),p=current.from.clone().lerp(current.to,ease);p.y+=Math.sin(t*Math.PI)*.13;handToWorld(0,p);if(t===1){action=null;current.finish();updateUI();}}
      else if(held){const d=state.rodDistance+(targetDistance-state.rodDistance)*Math.min(1,dt*6),settled=Math.abs(d-targetDistance)<.001?targetDistance:d;handToWorld(0,NEAR.clone().lerp(FAR,settled));dispatch({type:'MOVE_ROD',distance:settled});}
      else {const p=handWorld(0).lerp(FAR,Math.min(1,dt*8));handToWorld(0,p);}
      const p=handWorld(1),goal=groundWanted?PRESS:IDLE;p.lerp(goal,Math.min(1,dt*9));handToWorld(1,p);
      if(groundWanted&&!state.isGrounded&&handWorld(1).distanceTo(PRESS)<.02)dispatch({type:'SET_GROUNDED',value:true});
      head.rotation.y+=(held?-.20-head.rotation.y:-head.rotation.y)*Math.min(1,dt*4);head.rotation.x+=((held?.11:0)-head.rotation.x)*Math.min(1,dt*4);
    }
    const blend=1-Math.exp(-dt*5);camera.position.lerp(mode==='lab'?camLab:camWalk,blend);camAim.lerp(mode==='lab'?V(0,2.30,0):V(0,1,0),blend);camera.lookAt(camAim);camWidth+=((mode==='lab'?7.6:16)-camWidth)*blend;updateCamera();
    animateCharges(now,dt);renderer.render(scene,camera);if(!document.hidden)raf=requestAnimationFrame(frame);
  }
  $('interact').addEventListener('click',goBench);$('pickup').addEventListener('click',takeRod);
  function chooseDistance(distance){if(held&&!action){targetDistance=distance;updateUI();}}
  $('near').addEventListener('click',()=>chooseDistance(0));$('mid').addEventListener('click',()=>chooseDistance(.5));$('far').addEventListener('click',()=>chooseDistance(1));
  function toggleGround(){if(mode!=='lab'||state.mission!==2||!held||action)return;groundWanted=!groundWanted;if(!groundWanted)dispatch({type:'SET_GROUNDED',value:false});updateUI();}
  $('ground').addEventListener('click',toggleGround);$('reset').addEventListener('click',()=>resetMission(state.mission));$('leave').addEventListener('click',leaveBench);$('next').addEventListener('click',()=>resetMission(2));
  document.querySelectorAll('[data-answer]').forEach(b=>b.addEventListener('click',()=>{dispatch({type:'ANSWER',value:b.dataset.answer});if(state.completed&&!completed.includes(state.mission)){completed.push(state.mission);saveProgress();progress();$('feedback').textContent=state.mission===1?'發現完成！＋40 經驗。接著挑戰先斷地、再移棒。':'＋60 經驗！升到 Lv. 2，新的金屬球與工具箱已放到器材架。';}}));
  $('notebook-button').addEventListener('click',()=>{keys.clear();joystick.x=joystick.y=0;$('notebook').showModal();});$('close-notebook').addEventListener('click',()=>$('notebook').close());
  // Fullscreen includes controls, so operating never strands the player.
  $('fullscreen').addEventListener('click',async()=>{
    if(document.fullscreenElement){await document.exitFullscreen();return;}
    if(document.documentElement.classList.contains('immersive-fallback')){document.documentElement.classList.remove('immersive-fallback');return;}
    try {
      if(!document.documentElement.requestFullscreen)throw new Error('Fullscreen API unavailable');
      await document.documentElement.requestFullscreen();
    } catch (_) {
      document.documentElement.classList.add('immersive-fallback');
      $(mode==='lab'?'feedback':'walk-feedback').textContent='已切換沉浸畫面；再次按全螢幕可退出。';
    }
  });
  window.addEventListener('keydown',e=>{if($('notebook').open||/INPUT|TEXTAREA/.test(e.target.tagName))return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','e','escape'].includes(k)){e.preventDefault();keys.add(k);if(k==='e'&&!e.repeat){if(mode==='walk')goBench();else if(!held)takeRod();}if(k==='escape'&&mode==='lab')leaveBench();}});
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  function cancelInput(){keys.clear();joystick.x=joystick.y=0;joystick.pointer=null;$('stick').style.transform='';groundWanted=false;if(state.isGrounded)dispatch({type:'SET_GROUNDED',value:false});}
  window.addEventListener('blur',cancelInput);document.addEventListener('visibilitychange',()=>{cancelInput();if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;}else if(!raf){lastTime=performance.now();raf=requestAnimationFrame(frame);}});
  $('joystick').addEventListener('pointerdown',e=>{if(joystick.pointer!==null)return;joystick.pointer=e.pointerId;$('joystick').setPointerCapture(e.pointerId);joyMove(e);});
  function joyMove(e){if(e.pointerId!==joystick.pointer)return;const r=$('joystick').getBoundingClientRect(),x=(e.clientX-r.x-r.width/2)/(r.width*.36),y=(e.clientY-r.y-r.height/2)/(r.height*.36),n=Math.max(1,Math.hypot(x,y));joystick.x=x/n;joystick.y=y/n;$('stick').style.transform=`translate(${joystick.x*26}px,${joystick.y*26}px)`;}
  $('joystick').addEventListener('pointermove',joyMove);['pointerup','pointercancel','lostpointercapture'].forEach(event=>$('joystick').addEventListener(event,e=>{if(e.pointerId===joystick.pointer){joystick.pointer=null;joystick.x=joystick.y=0;$('stick').style.transform='';}}));
  const ray=new T.Raycaster(),plane=new T.Plane(V(0,1,0),0);let dragRod=null;
  function rayAt(e){const r=$('world').getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.x)/r.width*2-1,-(e.clientY-r.y)/r.height*2+1),camera);}
  $('world').addEventListener('pointerdown',e=>{if(e.button>0)return;rayAt(e);if(mode==='walk'){const p=ray.ray.intersectPlane(plane,V());if(p&&!blocked(p.x,p.z)){autoBench=false;path=findPath(p);destination.position.set(p.x,.075,p.z);destination.visible=path.length>0;}}
    else if(ray.intersectObject(rod,true).length){if(!held)takeRod();else if(!action){dragRod={id:e.pointerId,x:e.clientX,distance:targetDistance};$('world').setPointerCapture(e.pointerId);}}
    else if(ray.intersectObject(pad,true).length)toggleGround();});
  $('world').addEventListener('pointermove',e=>{if(dragRod&&dragRod.id===e.pointerId){const w=$('world').getBoundingClientRect().width;chooseDistance(Math.round(Math.max(0,Math.min(1,dragRod.distance-(e.clientX-dragRod.x)/(w*.12)))*2)/2);}});
  ['pointerup','pointercancel','lostpointercapture'].forEach(t=>$('world').addEventListener(t,()=>{dragRod=null;}));
  window.addEventListener('pagehide',()=>{if(raf)cancelAnimationFrame(raf);raf=0;});window.addEventListener('pageshow',()=>{if(!raf){lastTime=performance.now();raf=requestAnimationFrame(frame);}});
  // Read-only instrumentation for geometric and interaction acceptance tests.
  function rodDiscGap(){let nearest=Infinity;for(let i=0;i<=30;i++){const p=rod.localToWorld(V(-.17+.72*i/30,0,0)),radial=Math.hypot(p.x+.5,p.z-.18);nearest=Math.min(nearest,Math.hypot(Math.max(0,radial-.37),Math.max(0,Math.abs(p.y-3.155)-.04))-.058);}return nearest;}
  window.labGame=Object.freeze({snapshot:()=>{
    scene.updateMatrixWorld(true);
    return {mode,character:'March',position:avatar.position.toArray(),held,action:action?.label||null,state:JSON.parse(JSON.stringify(state)),targetDistance,pathLength:path.length,groundWanted,
      hand:handWorld(0).toArray(),rodGrip:rodGrip.getWorldPosition(V()).toArray(),groundHand:handWorld(1).toArray(),groundContact:PRESS.toArray(),rodDiscGap:rodDiscGap(),
      armBones:arms.map(a=>({upper:a.shoulder.getWorldPosition(V()).distanceTo(a.elbow.getWorldPosition(V())),fore:a.elbow.getWorldPosition(V()).distanceTo(a.hand.getWorldPosition(V())),reachError:a.reachError})),
      gait:legs.map((l,i)=>({hip:l.hip.rotation.x,knee:l.knee.rotation.x,handZ:arms[i].hand.getWorldPosition(V()).applyMatrix4(avatar.matrixWorld.clone().invert()).z})),
      stemBottom:2.40,baseTop:1.95,completed:completed.slice(),rewardVisible:rewardRack.visible,webgl:renderer.getContext() instanceof WebGL2RenderingContext,geometryCount:renderer.info.memory.geometries,
      chargeFlows:assignments.flatMap((p,i)=>p.moving&&performance.now()-p.start<950?[{index:i,from:p.oldZone,to:p.zone,slot:p.slot,position:negMarks[i].position.toArray()}]:[]),
      electronMarks:negMarks.map((g,i)=>({zone:assignments[i]?.zone,position:g.position.toArray(),visible:g.visible})),
      positiveMarks:posMarks.map(g=>g.position.toArray())};
    },screenPoint:which=>{const p=(which==='rod'?rod.getWorldPosition(V()):which==='pad'?pad.position.clone():which==='rack'?V(4.6,2,-4.7):V(0,0,3)).project(camera),r=$('world').getBoundingClientRect();return {x:r.x+(p.x+1)*r.width/2,y:r.y+(1-p.y)*r.height/2};}});
  scene.updateMatrixWorld(true);rearrange();assignments.forEach((p,i)=>negMarks[i].position.copy(chargePoint(p.zone,p.slot,0)));updateUI();resize();$('loading').hidden=true;raf=requestAnimationFrame(frame);
})();
