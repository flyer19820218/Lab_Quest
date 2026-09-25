(function () {
  'use strict';
  function create(T) {
    const root=new T.Group();root.name='FrictionMaterialsStation';
    root.position.set(4.28,0,1.43);
    const mat=(color,roughness=.68,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
    const m={wood:mat('#b98958'),edge:mat('#ebc486'),teal:mat('#315e5b'),dark:mat('#233e41'),
      fur:mat('#9a735b'),silk:mat('#b68aa5',.47),plastic:mat('#273e61',.38),
      glass:new T.MeshPhysicalMaterial({color:'#9ce5ee',transparent:true,opacity:.69,roughness:.13,metalness:.06}),
      electron:new T.MeshBasicMaterial({color:'#4dd2ff',toneMapped:false}),
      positive:new T.MeshBasicMaterial({color:'#ff4d4d',toneMapped:false})};
    const mesh=(geometry,material,parent=root)=>{const o=new T.Mesh(geometry,material);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
    const box=(w,h,d,material,x,y,z,parent=root)=>{const o=mesh(new T.BoxGeometry(w,h,d),material,parent);o.position.set(x,y,z);return o;};
    const ball=(r,material,x,y,z,parent=root)=>{const o=mesh(new T.SphereGeometry(r,12,8),material,parent);o.position.set(x,y,z);return o;};
    // Separate side table: it never moves or replaces the original electroscope bench.
    box(2.42,.13,1.45,m.edge,0,1.32,0);
    box(2.26,.22,1.33,m.teal,0,1.18,0);
    for(const x of [-1.01,1.01])for(const z of [-.56,.56])box(.13,1.12,.13,m.wood,x,.56,z);
    box(1.79,.025,.94,m.dark,0,1.40,0);
    box(.48,.20,.28,m.wood,.72,1.54,-.47);
    box(.48,.03,.30,m.edge,.72,1.66,-.47);
    const fur=new T.Group(),silk=new T.Group(),plastic=new T.Group(),glass=new T.Group();
    root.add(fur,silk,plastic,glass);
    box(1.30,.08,.65,m.fur,-.07,1.49,.08,fur);
    for(let i=0;i<22;i++){
      const x=-.65+(i%11)*.115,z=-.13+Math.floor(i/11)*.27;
      const tuft=mesh(new T.ConeGeometry(.028,.095,5),m.fur,fur);tuft.position.set(x,1.57,z);tuft.rotation.z=Math.sin(i*2.3)*.22;
    }
    box(1.32,.045,.66,m.silk,-.07,1.47,.08,silk);
    for(let i=0;i<10;i++)box(.008,.004,.60,m.edge,-.65+i*.13,1.50,.08,silk);
    box(1.24,.075,.14,m.plastic,-.09,1.65,.02,plastic);
    for(let i=0;i<10;i++)box(.012,.009,.045,m.edge,-.64+i*.118,1.696,.065,plastic);
    const glassRod=mesh(new T.CylinderGeometry(.058,.058,1.24,16),m.glass,glass);
    glassRod.rotation.z=Math.PI/2;glassRod.position.set(-.09,1.65,.02);
    const gleam=box(1.02,.010,.012,m.edge,-.09,1.688,.065,glass);gleam.castShadow=false;
    const chargeGroup=new T.Group();root.add(chargeGroup);
    const toolBlue=[],clothBlue=[],toolRed=[],clothRed=[];
    for(let i=0;i<4;i++){
      const x=-.52+i*.27;
      toolBlue.push(ball(.046,m.electron,x,1.83,.11,chargeGroup));
      clothBlue.push(ball(.046,m.electron,x,1.60,.39,chargeGroup));
      toolRed.push(ball(.043,m.positive,x,1.83,-.11,chargeGroup));
      clothRed.push(ball(.043,m.positive,x,1.60,-.30,chargeGroup));
    }
    const flying=ball(.065,m.electron,-.15,1.76,.15,chargeGroup);flying.visible=false;flying.castShadow=false;
    let pair='plastic',shown=0,desired=0,flight=null,rubTime=0;
    function setPair(next){
      pair=next;shown=desired=0;flight=null;flying.visible=false;
      fur.visible=plastic.visible=next==='plastic';
      silk.visible=glass.visible=next==='glass';
      updateMarks();
    }
    function updateMarks(){
      const receiverTool=pair==='plastic';
      toolBlue.forEach((o,i)=>o.visible=receiverTool&&i<shown);
      clothBlue.forEach((o,i)=>o.visible=!receiverTool&&i<shown);
      toolRed.forEach((o,i)=>o.visible=!receiverTool&&i<shown);
      clothRed.forEach((o,i)=>o.visible=receiverTool&&i<shown);
    }
    function setState(state){
      if(state.pair!==pair)setPair(state.pair);
      if(state.strokes<desired){shown=desired=state.strokes;flight=null;flying.visible=false;updateMarks();return;}
      desired=state.strokes;
      if(!flight&&shown<desired)startFlight();
    }
    function startFlight(){
      flight={number:shown+1,from:pair==='plastic'?'cloth':'tool',to:pair==='plastic'?'tool':'cloth',start:performance.now()};
      flying.visible=true;rubTime=performance.now();
    }
    function update(now){
      const rubbing=Math.max(0,1-(now-rubTime)/420);
      const offset=rubbing*Math.sin((now-rubTime)*.065)*.15;
      plastic.position.x=glass.position.x=offset;
      if(!flight)return;
      const t=Math.max(0,Math.min(1,(now-flight.start)/660));
      const from=flight.from==='tool'?new T.Vector3(-.15,1.83,.10):new T.Vector3(-.15,1.60,.39);
      const to=flight.to==='tool'?new T.Vector3(-.15,1.83,.10):new T.Vector3(-.15,1.60,.39);
      flying.position.copy(from.lerp(to,t));flying.position.y+=.25*Math.sin(Math.PI*t);
      if(t>=1){shown=flight.number;flight=null;flying.visible=false;updateMarks();if(shown<desired)startFlight();}
    }
    setPair('plastic');
    return {root,setState,update,getDisplayedTransfers:()=>shown,getFlight:()=>flight&&{...flight}};
  }
  window.LabFrictionStation=Object.freeze({create});
})();
