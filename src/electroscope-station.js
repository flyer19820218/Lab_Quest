(function(){'use strict';
// Exact instrument/table geometry extracted from the approved game.js prototype.
function create(T,B){const scene=new T.Group();const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
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
  // One real bench: top, apron, legs, and drawers all have depth and cast shadows.
  const table=new T.Group();scene.add(table);
  box(5.6,.19,1.85,M.edge,0,1.62,0,table);box(5.45,.07,1.73,M.wood,0,1.74,0,table);
  box(5.15,.30,1.52,M.teal,0,1.40,0,table);
  for(const x of [-2.42,2.42])for(const z of [-.66,.66])box(.17,1.35,.17,M.wood,x,.66,z,table);
  for(const x of [-1.6,0,1.6]){box(1.43,.27,.07,M.teal,x,1.40,.80,table);box(.35,.035,.07,M.trim,x,1.4,.85,table);}
  box(3.6,.025,1.35,M.dark,-.15,1.79,.04);
  // Electroscope stem stops at the leaf hinge. Glass and insulating stopper carry no charges.
  const scope=new T.Group();scope.position.set(-.5,1.81,.18);scene.add(scope);
  cyl(.56,.11,M.dark,0,.055,0,scope);cyl(.52,.035,M.metal,0,.123,0,scope);
  const glass=new T.MeshPhysicalMaterial({color:'#bde8e9',transparent:true,opacity:.13,roughness:.15,metalness:.05,side:T.DoubleSide,depthWrite:false});
  const profile=[V(.47,.15),V(.47,.65),V(.45,.86),V(.30,1.12),V(.17,1.22)].map(p=>new T.Vector2(p.x,p.y));
  const jar=mesh(new T.LatheGeometry(profile,48),glass,scope);jar.castShadow=false;jar.renderOrder=3;
  for(const side of [-1,1])curve([V(side*.47,.16,0),V(side*.47,.65,0),V(side*.44,.9,0),V(side*.17,1.22,0)],.009,M.metal,scope);
  cyl(.037,.63,M.metal,0,.905,0,scope); // bottom .59 (hinge), never .15 (base)
  const plateMaterial=mat('#acbec1',.27,.65),foilMaterial=mat('#efc259',.35,.65);
  cyl(.18,.16,M.rubber,0,1.22,0,scope);cyl(.37,.07,plateMaterial,0,1.345,0,scope);
  cyl(.33,.013,plateMaterial,0,1.386,0,scope);
  const leafPivots=[new T.Group(),new T.Group()];leafPivots.forEach((p,i)=>{p.position.set(0,.59,0);scope.add(p);box(.11,.41,.009,foilMaterial,0,-.205,i*.009,p);});
  ball(.055,.045,.04,M.gold,0,.59,.025,scope);
  const groundBase=V(1.70,1.81,.30),padY=2.05;
  cyl(.25,.10,M.dark,groundBase.x,1.85,groundBase.z);cyl(.16,.15,M.metal,groundBase.x,1.96,groundBase.z);
  const pad=cyl(.22,.065,M.trim,groundBase.x,padY,groundBase.z);const padGlyph=label('⏚','#284b50',.3);padGlyph.position.set(1.70,2.13,.38);scene.add(padGlyph);
  const wirePoints=[V(-.14,3.155,.18),V(.08,2.92,.38),V(.30,1.94,.52),V(1.68,1.98,.3)];
  curve(wirePoints,.021,M.rubber);
  const switchArm=link(V(1.95,1.83,.3),V(2.19,2.02,.3),.023,M.trim);
  curve([V(2.18,1.83,.3),V(2.72,1.81,.3),V(2.95,.8,.22),V(3.1,.10,.2)],.024,M.rubber);
  const rod=new T.Group();scene.add(rod);
  const shaft=cyl(.058,.72,mat('#1b2126'),.19,0,0,rod);shaft.rotation.z=Math.PI/2;
  const handle=cyl(.069,.22,M.rubber,-.07,0,0,rod);handle.rotation.z=Math.PI/2;
  const rodChargeMaterial=new T.MeshBasicMaterial({color:'#4dd2ff',toneMapped:false}),rodPositiveBars=[];
  for(const x of [.24,.36,.48]){
    box(.075,.018,.013,rodChargeMaterial,x,0,.059,rod);
    const upright=box(.018,.075,.013,rodChargeMaterial,x,0,.061,rod);upright.visible=false;rodPositiveBars.push(upright);
  }
  const RACK=V(-1.60,1.88,-.05);rod.position.copy(RACK);
  for(const x of [-1.89,-1.24])box(.08,.055,.24,M.trim,x,1.835,-.05);
  const particles=Array.from({length:12},()=>{const p=ball(.043,.043,.043,M.electron,0,0,0);p.castShadow=false;p.visible=false;return p;}),flows=[];
  let state=B.createState(),active=false,remainder=0;
  function pathPoint(points,t){let lengths=points.slice(1).map((p,i)=>p.distanceTo(points[i])),remaining=lengths.reduce((a,b)=>a+b,0)*t;for(let i=0;i<lengths.length;i++){if(remaining<=lengths[i]||i===lengths.length-1)return points[i].clone().lerp(points[i+1],lengths[i]?Math.min(1,remaining/lengths[i]):1);remaining-=lengths[i];}return points.at(-1).clone();}
  function spawn(direction,amount){
    scene.updateMatrixWorld(true);
    const disc=scope.localToWorld(V(0,1.345,.07)),stem=scope.localToWorld(V(0,.905,.07)),pivot=scope.localToWorld(V(0,.59,.07));
    const ground=[disc,...wirePoints,V(1.95,1.83,.3),V(2.18,1.83,.3),V(3.1,.10,.2)];
    const number=direction.includes('earth')?Math.min(4,Math.max(1,Math.floor(amount/20))):2;
    for(let i=0;i<number;i++){
      const leaf=scope.localToWorld(V(i%2?.075:-.075,.18,.09));
      const path=direction==='plate-to-leaf'?[disc,stem,pivot,leaf]:direction==='leaf-to-plate'?[leaf,pivot,stem,disc]:direction==='leaf-to-earth'?[leaf,pivot,stem,...ground]:ground.slice().reverse();
      const particle=particles.find(p=>!p.visible);if(!particle)break;
      particle.visible=true;particle.position.copy(path[0]);flows.push({particle,path,start:performance.now()+i*70,duration:Math.min(1600,700+path.slice(1).reduce((n,p,j)=>n+p.distanceTo(path[j]),0)*310)});
    }
  }
  function setState(next){
    const old=state;state=next;
    if(old.isGrounded===state.isGrounded){
      if(!state.isGrounded){remainder+=state.leafQ-old.leafQ;if(Math.abs(remainder)>=6){spawn(remainder<0?'plate-to-leaf':'leaf-to-plate',Math.abs(remainder));remainder=0;}}
      else if(state.flow)spawn(state.flow.direction,state.flow.amount);
    }else{remainder=0;if(state.flow)spawn(state.flow.direction,state.flow.amount);}
  }
  function setActive(value){active=value;if(!active){flows.length=0;particles.forEach(p=>p.visible=false);}}
  function update(now,dt){
    const target=B.leafAngle(state),alpha=1-Math.exp(-dt*7);
    leafPivots[0].rotation.z+=(target-leafPivots[0].rotation.z)*alpha;leafPivots[1].rotation.z=-leafPivots[0].rotation.z;
    plateMaterial.color.set(Math.abs(state.plateQ)<1?'#acbec1':B.chargeColor(state.plateQ));
    foilMaterial.color.set(Math.abs(state.leafQ)<1?'#efc259':B.chargeColor(state.leafQ));
    rodChargeMaterial.color.set(state.rodType===1?'#ff4d4d':'#4dd2ff');rodPositiveBars.forEach(bar=>bar.visible=state.rodType===1);
    setLink(switchArm,V(1.95,1.83,.3),state.isGrounded?V(2.18,1.83,.3):V(2.19,2.02,.3));
    rod.position.copy(active?V(-2.75+1.20*state.dist/100,3.155,.18):RACK);
    for(let i=flows.length-1;i>=0;i--){const f=flows[i],t=Math.max(0,(now-f.start)/f.duration);if(t>=1){f.particle.visible=false;flows.splice(i,1);}else f.particle.position.copy(pathPoint(f.path,t));}
  }
  return {root:scene,setState,setActive,update,snapshot:()=>({flowVisible:particles.filter(p=>p.visible).length,flows:flows.map(f=>({origin:f.path[0].toArray(),position:f.particle.position.toArray()})),stemBottom:2.40,rodPositiveBarsVisible:rodPositiveBars.filter(p=>p.visible).length,rodPosition:rod.position.toArray(),plateColor:plateMaterial.color.getHexString(),leafColor:foilMaterial.color.getHexString()})};
}
window.LabElectroscope=Object.freeze({create});
})();
