/* Port of the electroscope model and inquiry text in Physical-Boys/electronics_1.html,
   tab 6. The source lesson is read-only; coordinates remain in the 3D game's scene. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PhysicalBoysBench = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const tasks = [
    {title:'🔍 挑戰一：感應起電的無中生有',
      think:'如果拿「負電棒」慢慢靠近「電中性」的驗電器，裡面的自由電子會怎麼跑？底下的金箔會發生什麼事？',
      act:'將下方設為「還原電中性」，點選「負電棒」，慢慢將距離滑桿從「遠」拉到「近」。',
      verify:'觀察藍色電子流動的方向。下方的金箔張開了嗎？這說明了「靜電力大小」與「距離」有什麼關係？'},
    {title:'⚡ 挑戰二：接地瞬間的電子狂流',
      think:'保持負電棒在靠近的狀態。現在如果用手摸一下驗電器（接地），被排斥在底下的電子會往哪裡逃？金箔會怎樣？',
      act:'保持負電棒在「近」處。接著，按下畫面上的「⚡ 點擊接地」。',
      verify:'觀察藍色電子的真實流動路徑！為什麼電子寧願往地下跑？此時底下的金箔發生了什麼事？'},
    {title:'✋ 挑戰三：移開手的正確時機',
      think:'在接地的狀態下，如果我們先移開手（解除接地），再把負電棒拿遠，驗電器最後會帶什麼電？',
      act:'先點擊「🔌 解除接地 (移手)」，最後再將帶電棒拉回最「遠」。',
      verify:'看看儀表板上的當前淨電荷！為什麼一開始明明是用「負」電棒感應，最後驗電器卻會帶「正」電？'},
    {title:'🧐 挑戰四：檢驗未知電荷 (同性)',
      think:'如果驗電器已經帶「負電」（金箔張開），這時拿「負電棒」靠近，金箔會張得更大還是縮小？',
      act:'點擊【資優專區】的「預設帶負電」。接著選擇「負電棒」，並慢慢將滑桿拉近。',
      verify:'金箔的角度怎麼變化了？請利用「電子被往下排斥」的觀點來解釋這個現象！'},
    {title:'😈 挑戰五：極限異性力場大魔王',
      think:'如果驗電器帶「負電」，改拿「正電棒」極度靠近，金箔會只是一直縮合嗎？還是會發生意想不到的事？',
      act:'保持「預設帶負電」。這次改選「正電棒」，並將滑桿非常緩慢、一路拉到最「近」。',
      verify:'觀察下方的金箔，它會先慢慢「閉合」，拉到極限時竟然會「再次張開」並呈現紅色！真實的金屬箔片當然不會變色；紅色代表該區域缺乏電子、帶正電。請解釋這個現象！'}
  ];
  const clamp = n => Math.max(0, Math.min(100, Number(n) || 0));
  function createState() {
    return {rodType:-1, dist:0, isGrounded:false, netQ:0, plateQ:0, leafQ:0, flow:null};
  }
  // This target distribution is identical to t6_updatePhysics in the source lesson.
  function updatePhysics(previous, changes) {
    const next={...previous,...changes,flow:null};
    const rod_influence=next.rodType*next.dist;
    let target_Q_plate=0,target_Q_leaf=0;
    if (!next.isGrounded) {
      target_Q_plate=(next.netQ/2)-rod_influence;
      target_Q_leaf=(next.netQ/2)+rod_influence;
    } else {
      target_Q_leaf=0;
      target_Q_plate=-rod_influence*2;
    }
    if (!next.isGrounded) {
      const diffLeaf=target_Q_leaf-previous.leafQ;
      if (diffLeaf < -5) next.flow={direction:'plate-to-leaf',amount:Math.abs(diffLeaf)};
      else if (diffLeaf > 5) next.flow={direction:'leaf-to-plate',amount:Math.abs(diffLeaf)};
    } else {
      const diffTotal=(target_Q_plate+target_Q_leaf)-(previous.plateQ+previous.leafQ);
      if (diffTotal > 5) next.flow={direction:'leaf-to-earth',amount:Math.abs(diffTotal)};
      else if (diffTotal < -5) next.flow={direction:'earth-to-plate',amount:Math.abs(diffTotal)};
    }
    next.plateQ=target_Q_plate;next.leafQ=target_Q_leaf;
    return next;
  }
  function setDistance(state,dist) { return updatePhysics(state,{dist:clamp(dist)}); }
  function setRod(state,rodType) {
    if (rodType !== -1 && rodType !== 1) throw new RangeError('Unknown rod polarity');
    return updatePhysics(state,{rodType});
  }
  function toggleGround(state) {
    const isGrounded=!state.isGrounded;
    const netQ=isGrounded?state.netQ:state.plateQ+state.leafQ;
    return updatePhysics(state,{isGrounded,netQ});
  }
  function forceSetCharge(state,q) {
    if (![-100,0,100].includes(q)) throw new RangeError('Unknown preset charge');
    return {...state,netQ:q,isGrounded:false,dist:0,plateQ:q/2,leafQ:q/2,flow:null};
  }
  function leafAngle(state) { return Math.min(Math.abs(state.leafQ)/100,1.2)*(Math.PI/6.4); }
  // Original t6_getChargeColor, retained for the existing 3D plate and leaves.
  function chargeColor(q) {
    const base='#2d3a33',target=q>0?'#ff4d4d':'#4dd2ff',ratio=Math.min(Math.abs(q)/100,1);
    const a=parseInt(base.slice(1),16),b=parseInt(target.slice(1),16);
    const channel=shift=>Math.round(((a>>shift)&255)*(1-ratio)+((b>>shift)&255)*ratio);
    return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
  }
  return Object.freeze({tasks,createState,updatePhysics,setDistance,setRod,toggleGround,forceSetCharge,leafAngle,chargeColor});
});
