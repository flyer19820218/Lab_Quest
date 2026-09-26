(function(){
  'use strict';
  function create(T, layout){
    const camera=new T.PerspectiveCamera(62,16/9,.06,90);
    const position={...layout.start};
    function look(dx,dy){position.yaw-=dx*.004;position.pitch=Math.max(-.65,Math.min(.65,position.pitch-dy*.003));sync();}
    function sync(){camera.position.set(position.x,3.12,position.z);camera.rotation.order='YXZ';camera.rotation.set(position.pitch,position.yaw,0);}
    function step(right,back,turn,dt){
      position.yaw+=turn*1.45*dt;
      const n=Math.max(1,Math.hypot(right,back)),s=2.8*dt;
      const dx=(Math.cos(position.yaw)*right+Math.sin(position.yaw)*back)/n*s;
      const dz=(-Math.sin(position.yaw)*right+Math.cos(position.yaw)*back)/n*s;
      Object.assign(position,layout.move(position,dx,dz));sync();
    }
    sync();return {camera,position,look,step};
  }
  window.LabFirstPerson=Object.freeze({create});
})();
