/* Only qualitative/model-unit rules; original Physical-Boys is read-only. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LabInquiry=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function induction(rod=-1){return {rod,near:false,grounded:false,electrons:6,earthQ:0,flow:null};}
  function changeInduction(s,changes){
    const n={...s,...changes,flow:null};
    if(n.grounded)n.electrons=n.near?(n.rod===-1?2:10):6;
    n.earthQ=n.electrons-6;
    if(n.electrons!==s.electrons)n.flow={from:n.electrons<s.electrons?'metal':'earth',to:n.electrons<s.electrons?'earth':'metal',count:Math.abs(n.electrons-s.electrons)};
    return n;
  }
  function contact(sign=-1){return {sign,a:sign*8,b:0,touching:false,flow:null};}
  function touch(s){
    if(s.touching)return s;
    const each=(s.a+s.b)/2,delta=each-s.a,count=Math.abs(delta);
    return {...s,a:each,b:each,touching:true,flow:count?{from:delta>0?'a':'b',to:delta>0?'b':'a',count}:null};
  }
  function separate(s){return {...s,touching:false,flow:null};}
  function balloon(){return {rubbed:false,distance:0,balloonQ:0,sweaterQ:0,boardQ:0};}
  function rubBalloon(s){return {...s,rubbed:true,balloonQ:-4,sweaterQ:4};}
  function distanceBalloon(s,d){return {...s,distance:Math.max(0,Math.min(2,Math.round(d)))};}
  return Object.freeze({induction,changeInduction,contact,touch,separate,balloon,rubBalloon,distanceBalloon});
});
