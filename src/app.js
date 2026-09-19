(function () {
  'use strict';
  const E = window.StaticElectricity;
  const $ = id => document.getElementById(id);
  const all = selector => [...document.querySelectorAll(selector)];
  const NS = 'http://www.w3.org/2000/svg';
  const STORAGE_KEY = 'physical-boys-lab-quest:v1';
  const sign = value => value > 0 ? '+' + value : String(value);
  let profile = { name: '', completed: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && typeof saved.name === 'string') {
      profile.name = saved.name.trim().slice(0, 12);
      profile.completed = Array.isArray(saved.completed) ? [...new Set(saved.completed.filter(n => n === 1 || n === 2))] : [];
    }
  } catch (_) { /* A blocked or corrupt local save must not stop the lab. */ }
  let state = E.createState(1);
  let raf = 0;
  let animation = null;
  let drawnAngle = 0;
  let groundPointer = null;
  let groundKey = false;
  let drag = null;
  const svg = $('lab-scene');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const feedback = {
    ready: '用手拖曳，或按「靠近負電棒」。兩種方式都能完成實驗。',
    'induced-neutral': '電子被排斥到下方，兩片金箔同帶負電而張開。但沒有電子進出，總電荷仍為零。',
    'induction-reversed': '移開負電棒後，電子重新平均分布，金箔閉合。驗電器始終是電中性。',
    'ready-to-ground': '負電棒已靠近。現在按住接地端，觀察電子往哪裡移動。',
    'electrons-to-earth': '電子沿導線流向地面。棒保持靠近，接著先放開接地端。',
    'charge-isolated': '接地已斷開，電子無法從地面回來。現在再移開負電棒。',
    'positive-remains': '負電棒移開了，電子不足重新分布；金箔同帶正電而張開。驗電器留下淨正電。',
    'wrong-order': '地面把電子補回來了，驗電器回到中性。再試一次：先斷開接地，最後才移棒。',
    'ground-without-rod': '棒還在遠處，接地不會留下淨電荷。讓負電棒靠近圓盤，再觀察電子的移動。',
    'rod-too-early': '電荷重新平均了，總量仍是零。再試一次：接地必須發生在負電棒靠近時。',
    'observe-first': '先完成工作檯上的操作，再用觀察到的結果回答。',
    'not-net-charge': '金箔張開代表下方電荷相同，不代表總量一定改變。看看有沒有電子進出驗電器。',
    'electrons-left': '接地時離開的是電子，正電荷沒有移進來。電子比原來少，總電荷會是哪一種？',
    'concept-correct': '操作與解釋都完成了！你已經把現象和電荷總量連起來。'
  };
  const instructions = {
    'bring-rod': '先把負電棒拖到圓盤左側的光圈。保留空隙，不要接觸。',
    'connect-ground': '棒保持靠近，按住接地端。看看電子往哪裡移動。',
    'disconnect-ground': '棒還不能移走！先放開接地端，切斷電子回來的路。',
    'remove-rod': '接地已斷開，現在可以把負電棒移到遠處了。',
    'check-charge': '觀察金箔與電子數，再回答下方的總電荷問題。',
    complete: '這個發現屬於你了。也可以繼續操作，驗證自己的解釋。'
  };

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); }
    catch (_) { $('progress-summary').textContent = '本次紀錄保留中 · 此瀏覽器無法寫入存檔'; }
  }
  function element(tag, attrs, parent) {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (parent) parent.appendChild(node);
    return node;
  }
  function chargeSprite(negative, parent) {
    const g = element('g', {}, parent);
    element('circle', { r: negative ? 7 : 5.5, fill: negative ? '#173f60' : '#573d31', stroke: negative ? '#4dd2ff' : '#ff8040', 'stroke-width': 1.4 }, g);
    element('path', { d: negative ? 'M-3 0H3' : 'M-2.5 0H2.5M0-2.5V2.5', stroke: negative ? '#7ce1ff' : '#ffab76', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, g);
    return g;
  }
  const positives = Array.from({ length: 12 }, (_, i) => ({ node: chargeSprite(false, $('electrons-top')), zone: i < 6 ? 'top' : i < 9 ? 'left' : 'right', slot: i < 6 ? i : (i - 6) % 3 }));
  const electrons = Array.from({ length: 12 }, (_, i) => ({ node: chargeSprite(true, $('electrons-top')), zone: i < 6 ? 'top' : i < 9 ? 'left' : 'right', slot: i < 6 ? i : (i - 6) % 3, x: 0, y: 0 }));
  function position(zone, slot, angle, positive = false) {
    if (zone === 'earth') return { x: 570, y: 405 + slot * 3 };
    if (zone === 'top') {
      const points = [{ x: 329, y: 142 }, { x: 359, y: 142 }, { x: 389, y: 142 }, { x: 419, y: 142 }, { x: 380, y: 225 }, { x: 380, y: 262 }];
      const p = points[slot];
      return { x: p.x + (positive ? -3 : 5), y: p.y + (positive ? -3 : 4) };
    }
    const radians = (zone === 'left' ? 1 : -1) * (angle + 3) * Math.PI / 180;
    const distance = 25 + slot * 22;
    return { x: 380 - Math.sin(radians) * distance + (positive ? -2 : 3), y: 302 + Math.cos(radians) * distance + (positive ? -3 : 5) };
  }
  function polylinePoint(points, progress) {
    const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
    let remaining = lengths.reduce((a, b) => a + b, 0) * progress;
    for (let i = 0; i < lengths.length; i++) {
      if (remaining <= lengths[i] || i === lengths.length - 1) {
        const t = lengths[i] ? Math.min(1, remaining / lengths[i]) : 1;
        return { x: points[i].x + (points[i + 1].x - points[i].x) * t, y: points[i].y + (points[i + 1].y - points[i].y) * t };
      }
      remaining -= lengths[i];
    }
    return points[points.length - 1];
  }
  function route(sprite, destination, angle) {
    const start = { x: sprite.x, y: sprite.y };
    const end = position(destination.zone, destination.slot, angle);
    const pivot = { x: 380, y: 302 }, disc = { x: 380, y: 147 };
    const earthPath = [{ x: 570, y: 405 }, { x: 570, y: 147 }, disc];
    let points = [start];
    if (sprite.zone === 'earth') points.push(...earthPath);
    else if (sprite.zone !== 'top') points.push(pivot, disc);
    else if (sprite.zone !== destination.zone) points.push(disc);
    if (destination.zone === 'earth') points.push(disc, { x: 570, y: 147 }, { x: 570, y: 405 });
    else if (destination.zone !== 'top') points.push(pivot);
    points.push(end);
    return points;
  }
  function animateScene() {
    if (raf) cancelAnimationFrame(raf);
    const desired = [];
    [['top', state.topElectrons], ['left', state.leafElectrons], ['right', state.leafElectrons], ['earth', 12 - state.electronCount]].forEach(([zone, count]) => {
      for (let slot = 0; slot < count; slot++) desired.push({ zone, slot });
    });
    const assigned = new Map();
    electrons.forEach(sprite => {
      const index = desired.findIndex(p => p.zone === sprite.zone && p.slot === sprite.slot);
      if (index >= 0) assigned.set(sprite, desired.splice(index, 1)[0]);
    });
    electrons.filter(sprite => !assigned.has(sprite)).forEach(sprite => assigned.set(sprite, desired.shift()));
    const moves = electrons.map(sprite => {
      const destination = assigned.get(sprite);
      return { sprite, destination, moved: sprite.zone !== destination.zone, path: route(sprite, destination, state.leafAngle) };
    });
    animation = { start: performance.now(), duration: reducedMotion.matches ? 0 : 1100, fromAngle: drawnAngle, toAngle: state.leafAngle, moves };
    frame(performance.now());
  }
  function frame(now) {
    raf = 0;
    if (!animation) return;
    const t = animation.duration ? Math.min(1, (now - animation.start) / animation.duration) : 1;
    const eased = 1 - Math.pow(1 - t, 3);
    drawnAngle = animation.fromAngle + (animation.toAngle - animation.fromAngle) * eased;
    $('leaf-left').setAttribute('transform', 'rotate(' + (drawnAngle + 3) + ' 380 302)');
    $('leaf-right').setAttribute('transform', 'rotate(' + (-drawnAngle - 3) + ' 380 302)');
    positives.forEach(sprite => {
      const p = position(sprite.zone, sprite.slot, drawnAngle, true);
      sprite.node.setAttribute('transform', 'translate(' + p.x + ' ' + p.y + ')');
    });
    animation.moves.forEach(({ sprite, destination, moved, path }) => {
      const p = moved ? polylinePoint(path, t) : position(destination.zone, destination.slot, drawnAngle);
      sprite.x = p.x; sprite.y = p.y;
      sprite.node.setAttribute('transform', 'translate(' + p.x + ' ' + p.y + ')');
      sprite.node.style.opacity = destination.zone === 'earth' ? (moved ? String(1 - Math.max(0, t - .84) / .16) : '0') : '1';
      if (t === 1) { sprite.zone = destination.zone; sprite.slot = destination.slot; }
    });
    if (t < 1) raf = requestAnimationFrame(frame);
    else animation = null;
  }

  function render() {
    const task2 = state.mission === 2;
    document.body.dataset.netCharge = state.electroscopeNetCharge;
    document.body.dataset.phase = state.taskPhase;
    document.body.dataset.mission = state.mission;
    document.body.dataset.grounded = state.isGrounded;
    $('player-name').textContent = profile.name || '研究員';
    $('mission-kicker').textContent = task2 ? '任務 02 · 接地' : '任務 01 · 感應';
    $('mission-title').textContent = task2 ? '順序一換，結果就不同。' : '金箔張開，就代表帶電嗎？';
    $('instruction').textContent = (profile.name ? profile.name + '，' : '') + instructions[state.taskPhase];
    $('prediction-panel').hidden = task2;
    $('sequence').hidden = !task2;
    $('tap-mode-label').hidden = !task2;
    $('ground-button').disabled = !task2;
    $('ground-button').setAttribute('aria-pressed', String(state.isGrounded));
    $('ground-button-label').textContent = !task2 ? '本任務不需要接地' : state.isGrounded ? ($('tap-mode').checked ? '點一下，斷開接地' : '接地中 · 放開就斷地') : ($('tap-mode').checked ? '點一下，接通地面' : '按住接地端');
    $('ground-label').textContent = '接地：' + (state.isGrounded ? '接通中' : '已斷開');
    $('distance-label').textContent = '負電棒：' + (state.isRodNear ? '靠近' : state.inductionStrength > 0 ? '移動中' : '遠離');
    $('rod').setAttribute('transform', 'translate(' + (66 + 54 * (1 - state.rodDistance)) + ' ' + (80 + 46 * (1 - state.rodDistance)) + ')');
    $('rod').setAttribute('aria-valuenow', Math.round((1 - state.rodDistance) * 100));
    $('rod').setAttribute('aria-valuetext', state.isRodNear ? '靠近，仍保留空隙' : '遠離');
    $('target-zone').style.opacity = state.isRodNear ? '.4' : '1';
    $('ground-switch-arm').setAttribute('d', state.isGrounded ? 'M570 356L570 328' : 'M570 356L595 330');
    $('ground-wire').style.opacity = state.isGrounded ? '1' : '.6';
    $('near-button').classList.toggle('is-position', state.isRodNear);
    $('far-button').classList.toggle('is-position', state.rodDistance === 1);
    $('net-charge').replaceChildren(document.createTextNode(sign(state.electroscopeNetCharge) + ' '));
    const label = document.createElement('small'); label.textContent = state.electroscopeNetCharge > 0 ? '淨正電' : '電中性'; $('net-charge').appendChild(label);
    $('net-charge').classList.toggle('is-positive', state.electroscopeNetCharge > 0);
    $('leaf-state').textContent = state.leafAngle ? '張開' : '閉合';
    $('leaf-charge').textContent = '左 ' + sign(state.leafChargeLeft) + ' ／ 右 ' + sign(state.leafChargeRight);
    $('electron-count').textContent = state.electronCount;
    $('transfer-state').textContent = state.isGrounded ? '與地面連通，可交換電子' : '接地已斷，電子無法進出';
    $('feedback-text').textContent = feedback[state.feedback];
    $('feedback-strip').classList.toggle('warning', ['wrong-order', 'not-net-charge', 'electrons-left', 'rod-too-early'].includes(state.feedback));
    $('feedback-strip').classList.toggle('success', ['concept-correct', 'positive-remains'].includes(state.feedback));
    $('answer-question').textContent = task2 ? '棒與接地都移開後，驗電器帶什麼電？' : '現在驗電器的總電荷是？';
    all('[data-answer]').forEach(button => {
      button.disabled = !state.operationComplete || state.completed;
      button.classList.toggle('correct', state.completed && button.dataset.answer === state.answer);
      button.classList.toggle('incorrect', !state.completed && button.dataset.answer === state.answer);
    });
    $('answer-hint').textContent = state.completed ? '已完成：操作正確 ＋ 概念判斷正確' : state.operationComplete ? '可以重看上方的電子數與電荷總量，答錯也能再試。' : '完成上方操作，就能選擇答案。';
    $('reward-panel').hidden = !state.completed;
    $('reward-title').textContent = task2 ? '解鎖：靜電護目鏡' : '獲得：觀察者徽章碎片';
    $('reward-copy').textContent = task2 ? '你掌握了「先斷地，再移棒」的理由。' : '你發現了：電荷分離，不等於總量改變。';
    $('next-mission').hidden = task2;
    $('ledger-scope').textContent = sign(state.electroscopeNetCharge);
    $('ledger-earth').textContent = sign(state.earthNetCharge);
    $('concept-note').textContent = task2 ? '負電棒靠近時，自由電子受排斥。接地提供通路，讓部分電子離開；先斷地，電子就無法回來。移棒後，驗電器仍因電子不足而帶淨正電。' : '負電棒沒有接觸驗電器。電子只是從上方移到下方，兩片金箔都帶負電而互相排斥；上方電子不足，整台驗電器的正、負總量仍相等。';
    const phaseStep = { 'bring-rod': 1, 'connect-ground': 2, 'disconnect-ground': 3, 'remove-rod': 4, 'check-charge': 5, complete: 5 }[state.taskPhase];
    all('[data-step]').forEach(item => { item.classList.toggle('current', Number(item.dataset.step) === phaseStep); item.classList.toggle('done', Number(item.dataset.step) < phaseStep); });
    all('.mission-tab[data-mission]').forEach(button => {
      const active = Number(button.dataset.mission) === state.mission;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
      button.querySelector('.mission-check').textContent = profile.completed.includes(Number(button.dataset.mission)) ? '✓' : '';
    });
    $('progress-summary').textContent = '本機紀錄 · ' + profile.completed.length + ' / 2 項發現';
  }
  function dispatch(action) {
    const previous = state;
    state = E.reduce(state, action);
    if (state === previous) return;
    if (state.completed && !profile.completed.includes(state.mission)) { profile.completed.push(state.mission); save(); }
    render();
    if (action.type !== 'ANSWER') animateScene();
  }
  function releaseGround() {
    groundPointer = null; groundKey = false;
    if (state.isGrounded && !$('tap-mode').checked) dispatch({ type: 'SET_GROUNDED', value: false });
  }
  function resetScene(mission) {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; animation = null; groundPointer = null; groundKey = false; drag = null;
    state = E.createState(mission); drawnAngle = 0;
    electrons.forEach((sprite, i) => { sprite.zone = i < 6 ? 'top' : i < 9 ? 'left' : 'right'; sprite.slot = i < 6 ? i : (i - 6) % 3; const p = position(sprite.zone, sprite.slot, 0); sprite.x = p.x; sprite.y = p.y; });
    all('[data-prediction]').forEach(button => { button.classList.remove('selected'); button.setAttribute('aria-pressed', 'false'); });
    $('prediction-question').textContent = '先預測：棒不碰到圓盤，金箔會不會張開？';
    render(); animateScene();
  }
  $('near-button').addEventListener('click', () => dispatch({ type: 'MOVE_ROD', distance: 0 }));
  $('far-button').addEventListener('click', () => dispatch({ type: 'MOVE_ROD', distance: 1 }));
  $('reset-button').addEventListener('click', () => resetScene(state.mission));
  all('.mission-tab[data-mission]').forEach(button => button.addEventListener('click', () => resetScene(Number(button.dataset.mission))));
  all('[data-answer]').forEach(button => button.addEventListener('click', () => dispatch({ type: 'ANSWER', value: button.dataset.answer })));
  $('next-mission').addEventListener('click', () => { resetScene(2); $('workbench').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' }); });
  all('[data-prediction]').forEach(button => button.addEventListener('click', () => {
    all('[data-prediction]').forEach(other => { other.classList.toggle('selected', other === button); other.setAttribute('aria-pressed', String(other === button)); });
    $('prediction-question').textContent = '預測已記下。用實驗看看，結果和你想的一樣嗎？';
  }));
  function pointerInScene(event) {
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
  }
  $('rod').addEventListener('pointerdown', event => {
    if (drag || event.button > 0) return;
    event.preventDefault(); const p = pointerInScene(event);
    drag = { pointer: event.pointerId, x: p.x, y: p.y, distance: state.rodDistance };
    $('rod').setPointerCapture(event.pointerId); $('rod').classList.add('dragging');
  });
  $('rod').addEventListener('pointermove', event => {
    if (!drag || drag.pointer !== event.pointerId) return;
    const p = pointerInScene(event);
    dispatch({ type: 'MOVE_ROD', distance: drag.distance - ((p.x - drag.x) * .75 + (p.y - drag.y) * .5) / 62 });
  });
  function endDrag(event) {
    if (!drag || event.pointerId !== drag.pointer) return;
    drag = null; $('rod').classList.remove('dragging');
    if (state.rodDistance < .4) dispatch({ type: 'MOVE_ROD', distance: 0 });
    else if (state.rodDistance > .65) dispatch({ type: 'MOVE_ROD', distance: 1 });
  }
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => $('rod').addEventListener(type, endDrag));
  $('rod').addEventListener('keydown', event => {
    const distances = { ArrowRight: state.rodDistance - .25, ArrowDown: state.rodDistance - .25, ArrowLeft: state.rodDistance + .25, ArrowUp: state.rodDistance + .25, Home: 1, End: 0 };
    if (event.key in distances) { event.preventDefault(); dispatch({ type: 'MOVE_ROD', distance: distances[event.key] }); }
  });
  $('ground-button').addEventListener('pointerdown', event => {
    if ($('tap-mode').checked || state.mission !== 2 || event.button > 0 || groundPointer !== null) return;
    event.preventDefault(); groundPointer = event.pointerId;
    $('ground-button').setPointerCapture(event.pointerId); dispatch({ type: 'SET_GROUNDED', value: true });
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => $('ground-button').addEventListener(type, event => { if (groundPointer === event.pointerId) releaseGround(); }));
  $('ground-button').addEventListener('click', () => { if ($('tap-mode').checked) dispatch({ type: 'SET_GROUNDED', value: !state.isGrounded }); });
  $('ground-button').addEventListener('keydown', event => {
    if (!$('tap-mode').checked && [' ', 'Enter'].includes(event.key)) { event.preventDefault(); if (!groundKey) { groundKey = true; dispatch({ type: 'SET_GROUNDED', value: true }); } }
  });
  $('ground-button').addEventListener('keyup', event => { if (groundKey && [' ', 'Enter'].includes(event.key)) { event.preventDefault(); releaseGround(); } });
  $('ground-button').addEventListener('blur', () => { if (groundKey) releaseGround(); });
  $('tap-mode').addEventListener('change', () => { groundPointer = null; groundKey = false; dispatch({ type: 'SET_GROUNDED', value: false }); render(); });
  window.addEventListener('blur', releaseGround);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseGround(); });
  $('ground-button').addEventListener('contextmenu', event => event.preventDefault());
  $('profile-button').addEventListener('click', () => { $('nickname').value = profile.name; $('profile-dialog').showModal(); });
  $('profile-form').addEventListener('submit', event => {
    event.preventDefault(); const name = $('nickname').value.trim();
    if (!name) { $('nickname').setCustomValidity('請填一個暱稱。'); $('nickname').reportValidity(); return; }
    profile.name = name.slice(0, 12); save(); $('profile-dialog').close(); render();
  });
  $('nickname').addEventListener('input', () => $('nickname').setCustomValidity(''));
  $('profile-dialog').addEventListener('cancel', event => { if (!profile.name) event.preventDefault(); });
  window.addEventListener('pagehide', () => { if (raf) cancelAnimationFrame(raf); raf = 0; });
  window.addEventListener('pageshow', () => { if (animation && !raf) raf = requestAnimationFrame(frame); });
  Object.defineProperty(window, 'labDebug', { value: Object.freeze({ getState: () => JSON.parse(JSON.stringify(state)), getAnimationStatus: () => ({ running: Boolean(raf), drawnAngle }) }) });
  resetScene(1);
  if (!profile.name) $('profile-dialog').showModal();
})();
