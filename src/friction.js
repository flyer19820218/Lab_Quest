/* Lab Quest friction-charging rule card, based on Physical-Boys/electronics_1.html tab 2.
   The six-plus-six starting tally and four transferred electrons are model units,
   not a measurement in coulombs. The original teaching page is never modified. */
(function (root, factory) {
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.LabFriction=api;
})(typeof globalThis!=='undefined'?globalThis:this,function () {
  'use strict';
  const START=6,MAX_TRANSFER=4;
  const pairs=Object.freeze({
    plastic:Object.freeze({id:'plastic',tool:'塑膠尺',cloth:'毛皮',donor:'cloth',receiver:'tool'}),
    glass:Object.freeze({id:'glass',tool:'玻棒',cloth:'絲絹',donor:'tool',receiver:'cloth'})
  });
  function pairOf(id){
    if(!Object.hasOwn(pairs,id))throw new RangeError('Unknown friction material pair');
    return pairs[id];
  }
  function createState(pair='plastic'){
    pairOf(pair);
    return Object.freeze({pair,prediction:null,strokes:0,answer:null,complete:false,feedback:'ready',flow:null});
  }
  function selectPair(state,pair){pairOf(pair);return createState(pair);}
  function predict(state,receiver){
    if(receiver!=='tool'&&receiver!=='cloth')throw new RangeError('Prediction must name one material');
    if(state.strokes>0)return state;
    return Object.freeze({...state,prediction:receiver,feedback:'predicted'});
  }
  function rub(state){
    if(state.prediction===null)return Object.freeze({...state,feedback:'predict-first'});
    if(state.strokes>=MAX_TRANSFER)return state;
    const pair=pairOf(state.pair),strokes=state.strokes+1;
    return Object.freeze({...state,strokes,answer:null,complete:false,
      feedback:strokes===MAX_TRANSFER?'observe-results':'electron-moved',
      flow:Object.freeze({from:pair.donor,to:pair.receiver,number:strokes})});
  }
  function answer(state,receiver){
    if(receiver!=='tool'&&receiver!=='cloth')throw new RangeError('Answer must name one material');
    if(state.strokes<MAX_TRANSFER)return Object.freeze({...state,feedback:'rub-first'});
    const complete=receiver===pairOf(state.pair).receiver;
    return Object.freeze({...state,answer:receiver,complete,feedback:complete?'concept-correct':'check-electron-direction'});
  }
  function tally(state){
    const pair=pairOf(state.pair),n=state.strokes;
    const toolElectrons=START+(pair.receiver==='tool'?n:-n);
    const clothElectrons=START+(pair.receiver==='cloth'?n:-n);
    const result={tool:{positive:START,electrons:toolElectrons,net:START-toolElectrons},
      cloth:{positive:START,electrons:clothElectrons,net:START-clothElectrons}};
    result.totalNet=result.tool.net+result.cloth.net;
    result.totalElectrons=result.tool.electrons+result.cloth.electrons;
    return result;
  }
  return Object.freeze({START,MAX_TRANSFER,pairs,createState,selectPair,predict,rub,answer,tally});
});
