(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LabLayout=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const bounds=Object.freeze({minX:-11.65,maxX:11.65,minZ:-6.65,maxZ:6.65});
  const stations=Object.freeze([
    {id:'vdg',title:'炸毛之謎',topic:'范德格拉夫靜電球',center:[-6.4,3.3],approach:[-6.1,5.3],radius:2.1,number:'01'},
    {id:'friction',title:'電荷去哪裡？',topic:'摩擦起電',center:[-7,0],approach:[-7,2.1],radius:1.8,number:'02'},
    {id:'balloon',title:'沒有帶電，也能吸住？',topic:'氣球與中性黑板',center:[-7,-4.4],approach:[-7,-2.25],radius:1.8,number:'03'},
    {id:'induction',title:'沒碰到，電子先動了',topic:'靜電感應與感應起電',center:[0,-4.4],approach:[0,-2.3],radius:1.8,number:'04'},
    {id:'contact',title:'碰過以後，怎麼分？',topic:'接觸起電',center:[7,-4.4],approach:[7,-2.25],radius:1.8,number:'05'},
    {id:'leyden',title:'電荷能留下來嗎？',topic:'萊頓瓶',center:[7,0],approach:[7,2.1],radius:1.8,number:'06'},
    {id:'scope',title:'用金箔找證據',topic:'驗電器探究',center:[0,0],approach:[0,2.3],radius:1.9,number:'07'}
  ].map(Object.freeze));
  // Physical surfaces, before the player's radius is applied. Render geometry
  // uses the same plan; no invisible giant interaction blocker surrounds a desk.
  const obstacles=Object.freeze([
    {id:'scope-table',x:0,z:0,w:5.6,d:1.85},
    {id:'friction-table',x:-7,z:0,w:2.42,d:1.45},
    {id:'balloon-table',x:-7,z:-4.4,w:3.6,d:1.6},
    {id:'induction-table',x:0,z:-4.4,w:4.2,d:1.8},
    {id:'contact-table',x:7,z:-4.4,w:4.2,d:1.8},
    {id:'leyden-table',x:7,z:0,w:3.6,d:1.8},
    {id:'vdg-dome',x:-7.43,z:3.22,w:1.55,d:1.55},
    {id:'vdg-platform',x:-5.34,z:3.22,w:1.85,d:1.85},
    ...[-4.25,4.25].flatMap(x=>[{id:`divider-${x}-back`,x,z:-5.15,w:.18,d:3.3},{id:`divider-${x}-front`,x,z:-.85,w:.18,d:1.4}]),
    {id:'back-cabinet-left',x:-8.3,z:-6.15,w:5.4,d:.95},
    {id:'back-cabinet-right',x:8.3,z:-6.15,w:5.4,d:.95},
    {id:'supply-cabinet',x:10.7,z:3.7,w:1.2,d:3.0}
  ].map(Object.freeze));
  function blocked(x,z,radius=.34){
    if(x-radius<bounds.minX||x+radius>bounds.maxX||z-radius<bounds.minZ||z+radius>bounds.maxZ)return true;
    return obstacles.some(o=>{const dx=Math.max(Math.abs(x-o.x)-o.w/2,0),dz=Math.max(Math.abs(z-o.z)-o.d/2,0);return dx*dx+dz*dz<radius*radius;});
  }
  function move(position,dx,dz,radius=.34){
    // Substeps prevent a long frame from tunnelling through thin partitions.
    let x=position.x,z=position.z;const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.12));
    for(let i=0;i<n;i++){if(!blocked(x+dx/n,z,radius))x+=dx/n;if(!blocked(x,z+dz/n,radius))z+=dz/n;}
    return {x,z};
  }
  function near(position){return stations.filter(s=>Math.hypot(position.x-s.approach[0],position.z-s.approach[1])<s.radius).sort((a,b)=>Math.hypot(position.x-a.approach[0],position.z-a.approach[1])-Math.hypot(position.x-b.approach[0],position.z-b.approach[1]))[0]||null;}
  return Object.freeze({bounds,stations,obstacles,blocked,move,near,start:Object.freeze({x:-6.1,z:5.8,yaw:0,pitch:-.12}),floorArea:336,previousFloorArea:153.4});
});
