(function () {
  'use strict';

  // The foyer is intentionally a visual observation, not a charge simulation.
  // No polarity, electron path, or answer is inferred from this animation.
  function create(THREE, options={}) {
    const root = new THREE.Group();
    root.name = 'ElectricityFoyer';
    const material = (color, roughness=.74, metalness=0) => new THREE.MeshStandardMaterial({color, roughness, metalness});
    const palette = {
      floor: material('#c59a66'), wood: material('#8c6147'), wall: material('#a9c7bd'),
      panel: material('#2c615d'), brass: material('#e5b968',.36,.55),
      cream: material('#e9e1c9'), glass: material('#a3d3d2',.22,.12),
      silver: material('#cad5d2',.16,.77), ceramic: material('#b6d3d2'),
      teal: material('#3a9b98'), tealLight: material('#85c4af'),
      eye: material('#162a31'), blush: material('#d69b8c'), dark: material('#274547')
    };
    const add = (geometry, surface, parent=root) => {
      const part = new THREE.Mesh(geometry,surface);
      part.castShadow=true;part.receiveShadow=true;parent.add(part);return part;
    };
    const box=(w,h,d,surface,x,y,z,parent=root)=>{
      const part=add(new THREE.BoxGeometry(w,h,d),surface,parent);
      part.position.set(x,y,z);return part;
    };
    const sphere=(rx,ry,rz,surface,x,y,z,parent=root)=>{
      const part=add(new THREE.SphereGeometry(1,20,14),surface,parent);
      part.position.set(x,y,z);part.scale.set(rx,ry,rz);return part;
    };
    const cylinder=(rTop,rBottom,h,surface,x,y,z,parent=root)=>{
      const part=add(new THREE.CylinderGeometry(rTop,rBottom,h,24),surface,parent);
      part.position.set(x,y,z);return part;
    };
    const between=(a,b,r,surface,parent=root)=>{
      const d=new THREE.Vector3().subVectors(b,a);
      const part=cylinder(r,r,d.length(),surface,0,0,0,parent);
      part.position.copy(a).add(b).multiplyScalar(.5);
      part.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
      return part;
    };

    // Warm, open-front museum room. The right-hand illuminated doorway is the
    // voluntary route to the existing experiment bench; the room is not a quest gate.
    if(!options.exhibitOnly){
    box(13,.20,11.8,palette.wood,0,-.18,0);
    for(let i=0;i<22;i++)box(.035,.012,11.7,palette.cream,-6.3+i*.6,-.065,0);
    box(13,5,.20,palette.wall,0,2.43,-5.75);
    box(.20,5,11.8,palette.wall,-6.5,2.43,0);
    box(13,.34,.30,palette.panel,0,.23,-5.59);
    for(const x of [-5.65,-3.8,2.85,5.7]){
      box(.24,4.45,.30,palette.cream,x,2.37,-5.46);
      cylinder(.20,.23,.17,palette.brass,x,4.57,-5.40);
    }
    for(const x of [-4.65,1.65]){
      box(2.35,2.28,.10,palette.panel,x,2.95,-5.58);
      box(2.12,2.05,.11,palette.glass,x,2.95,-5.48);
      box(.08,2.05,.12,palette.brass,x,2.95,-5.36);
      box(2.16,.08,.12,palette.brass,x,2.95,-5.34);
      box(2.50,.11,.35,palette.wood,x,1.78,-5.33);
    }
    const portal = new THREE.Group();root.add(portal);portal.position.set(4.48,0,-5.40);
    box(2.45,3.50,.12,palette.brass,0,1.77,0,portal);
    box(2.17,3.24,.16,palette.panel,0,1.69,.09,portal);
    box(1.82,2.85,.17,palette.dark,0,1.49,.18,portal);
    for(const side of [-1,1])box(.09,3.15,.22,palette.brass,side*.99,1.67,.22,portal);
    box(2.02,.10,.22,palette.brass,0,3.22,.22,portal);
    sphere(.12,.12,.08,palette.brass,.69,1.55,.31,portal);
    const portalGlow = new THREE.PointLight('#ffdea2',1.5,3.5);
    portalGlow.position.set(4.48,2.75,-4.9);root.add(portalGlow);
    box(6.5,.018,4.75,palette.panel,-.55,.026,-.80);
    box(6.22,.020,4.47,palette.tealLight,-.55,.033,-.80);
    box(5.9,.021,4.15,palette.panel,-.55,.04,-.80);
    for(const x of [-4.5,3.0]){
      cylinder(.29,.37,.60,palette.wood,x,.30,-3.82);
      cylinder(.37,.37,.08,palette.brass,x,.64,-3.82);
      for(const side of [-1,1]){
        const leaf=sphere(.15,.33,.12,palette.teal,x+side*.17,.93,-3.82);
        leaf.rotation.z=side*.6;
      }
      sphere(.20,.22,.18,palette.tealLight,x,1.22,-3.82);
    }

    }
    // Opaque metal collecting dome, insulating column, and stable base.
    const domeCenter=new THREE.Vector3(-1.83,2.42,-1.08);
    cylinder(.66,.72,.13,palette.brass,-1.83,.16,-1.08);
    cylinder(.52,.55,.43,palette.panel,-1.83,.45,-1.08);
    cylinder(.22,.25,1.51,palette.ceramic,-1.83,1.42,-1.08);
    cylinder(.37,.23,.21,palette.brass,-1.83,2.26,-1.08);
    sphere(.74,.62,.71,palette.silver,domeCenter.x,domeCenter.y,domeCenter.z);
    const shine=sphere(.26,.075,.08,material('#ffffff',.14),-2.08,2.71,-.48);
    shine.rotation.z=-.38;shine.castShadow=false;

    // The demonstration character is deliberately an original teal-furred
    // laboratory creature, not March or any character from the teaching site.
    const creature=new THREE.Group();root.add(creature);creature.position.set(.26,0,-1.08);
    cylinder(.84,.91,.17,palette.brass,0,.12,0,creature);
    cylinder(.73,.78,.27,palette.dark,0,.34,0,creature);
    for(const x of [-.47,.47])cylinder(.18,.19,.25,palette.ceramic,x,.19,0,creature);
    sphere(.42,.60,.35,palette.teal,0,1.08,0,creature);
    sphere(.32,.21,.23,palette.tealLight,-.19,.59,.11,creature);
    sphere(.32,.21,.23,palette.tealLight,.19,.59,.11,creature);
    sphere(.62,.57,.53,palette.tealLight,.08,2.06,0,creature);
    sphere(.48,.43,.09,palette.teal,.08,2.23,-.31,creature);
    for(const side of [-1,1]){
      sphere(.115,.145,.060,palette.cream,.08+side*.24,2.11,.496,creature);
      sphere(.056,.084,.045,palette.eye,.08+side*.24,2.10,.549,creature);
      sphere(.020,.024,.011,palette.cream,.06+side*.24,2.14,.589,creature);
      sphere(.115,.055,.025,palette.blush,.08+side*.38,1.92,.439,creature);
      sphere(.16,.12,.08,palette.teal,side*.56,2.18,-.07,creature);
    }
    sphere(.055,.038,.025,palette.dark,.08,1.91,.526,creature);
    const smile=new THREE.CatmullRomCurve3([
      new THREE.Vector3(-.06,1.82,.528),new THREE.Vector3(.08,1.79,.541),new THREE.Vector3(.22,1.82,.528)
    ]);
    add(new THREE.TubeGeometry(smile,12,.012,5,false),palette.dark,creature);
    // One paw visibly touches the dome's right flank for the entire sequence.
    const paw=new THREE.Vector3(-1.10,2.35,-.70);
    between(new THREE.Vector3(-.14,1.62,-.96),paw,.11,palette.tealLight);
    sphere(.14,.13,.12,palette.tealLight,paw.x,paw.y,paw.z);
    between(new THREE.Vector3(.53,1.60,-.98),new THREE.Vector3(.80,1.17,-.51),.12,palette.tealLight);
    sphere(.16,.14,.12,palette.tealLight,.80,1.17,-.51);

    // A single lightweight, vertex-coloured mesh holds many curved, tapered
    // strands. Rest and charged shapes share anchored roots on the scalp.
    const hairRoot=new THREE.Group();hairRoot.position.set(.34,2.14,-1.08);root.add(hairRoot);
    const segments=8,sides=5,rest=[],charged=[],colors=[],indices=[];
    const strandColors=['#237d7b','#389c94','#67b8a7','#b0d1a7'].map(v=>new THREE.Color(v));
    let strandIndex=0;
    for(let ring=0;ring<5;ring++){
      const elevation=.30+ring*.245;
      const count=ring===4?18:28;
      for(let i=0;i<count;i++){
        const azimuth=(i+(ring%2)*.5)*Math.PI*2/count;
        const radial=new THREE.Vector3(Math.cos(elevation)*Math.cos(azimuth),Math.sin(elevation),Math.cos(elevation)*Math.sin(azimuth));
        const origin=new THREE.Vector3(radial.x*.60,radial.y*.55,radial.z*.52);
        const u=new THREE.Vector3(-Math.sin(azimuth),0,Math.cos(azimuth));
        const v=new THREE.Vector3().crossVectors(radial,u).normalize();
        const reach=.72+.16*Math.sin(i*3.7+ring*2.1);
        const bend=.18*Math.sin(i*2.33+ring*1.8);
        const tone=strandColors[(i+ring)%strandColors.length];
        for(let step=0;step<=segments;step++){
          const t=step/segments,spine=origin.clone().addScaledVector(radial,.025);
          const atRest=spine.clone().addScaledVector(radial,.035*t);
          const atBurst=spine.clone().addScaledVector(radial,reach*t)
            .addScaledVector(u,bend*Math.sin(t*Math.PI*.86))
            .addScaledVector(v,.10*Math.sin(t*Math.PI))
            .add(new THREE.Vector3(0,-.15*t*t,0));
          const radius=(.010+.003*Math.sin(i*1.7+ring))*Math.pow(1-t,.8)+.0015;
          for(let side=0;side<sides;side++){
            const a=side*Math.PI*2/sides;
            const offset=u.clone().multiplyScalar(Math.cos(a)*radius).addScaledVector(v,Math.sin(a)*radius);
            rest.push(...atRest.clone().add(offset).toArray());
            charged.push(...atBurst.clone().add(offset).toArray());
            colors.push(tone.r,tone.g,tone.b);
          }
        }
        const first=strandIndex*(segments+1)*sides;
        for(let step=0;step<segments;step++)for(let side=0;side<sides;side++){
          const a=first+step*sides+side,b=first+step*sides+(side+1)%sides,c=a+sides,d=b+sides;
          indices.push(a,c,b,b,c,d);
        }
        strandIndex++;
      }
    }
    const hairGeometry=new THREE.BufferGeometry();
    hairGeometry.setAttribute('position',new THREE.Float32BufferAttribute(rest,3));
    hairGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    hairGeometry.setIndex(indices);hairGeometry.computeVertexNormals();
    const hair=add(hairGeometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}),hairRoot);
    hair.frustumCulled=false;
    let elapsed=0,hairCharge=0;
    function update(dt){
      elapsed+=dt;
      const target=Math.min(1,Math.max(0,(elapsed-.6)/3.2));
      const eased=target*target*(3-2*target);
      if(Math.abs(eased-hairCharge)<.0005)return;
      hairCharge=eased;
      const array=hairGeometry.attributes.position.array;
      for(let i=0;i<array.length;i++)array[i]=rest[i]+(charged[i]-rest[i])*hairCharge;
      hairGeometry.attributes.position.needsUpdate=true;
      hairGeometry.computeVertexNormals();
    }
    return {root,update,domeCenter,observationPoint:new THREE.Vector3(.40,0,1.04),doorPoint:new THREE.Vector3(4.42,0,-3.75),getHairCharge:()=>hairCharge};
  }
  window.LabFoyer=Object.freeze({create});
})();
