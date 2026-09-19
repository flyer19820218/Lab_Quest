'use strict';
// Optional UI acceptance checks. Requires Playwright, pngjs, and a Chrome install.
const { chromium, devices } = require('playwright');
const { PNG } = require('pngjs');
const assert = require('node:assert/strict');
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const url = pathToFileURL(path.join(__dirname, '..', 'prototype-svg-v1.html')).href;
const output = path.join(__dirname, '..', 'artifacts');
function changedPixels(a, b) {
  const first = PNG.sync.read(a), second = PNG.sync.read(b);
  assert.equal(first.width, second.width); assert.equal(first.height, second.height);
  let changed = 0;
  for (let i = 0; i < first.data.length; i += 4) {
    if (Math.abs(first.data[i] - second.data[i]) + Math.abs(first.data[i + 1] - second.data[i + 1]) + Math.abs(first.data[i + 2] - second.data[i + 2]) > 30) changed++;
  }
  return changed;
}
async function enter(page, name) {
  await page.goto(url);
  await page.locator('#nickname').fill(name);
  await page.locator('#profile-form button').click();
}
async function snapshot(page) { return page.evaluate(() => window.labDebug.getState()); }
async function chargeCorrectly(page) {
  await page.locator('#near-button').click();
  await page.locator('#tap-mode').check();
  await page.locator('#ground-button').click();
  assert.equal((await snapshot(page)).electroscopeNetCharge, 4);
  await page.locator('#ground-button').click();
  await page.locator('#far-button').click();
  assert.equal((await snapshot(page)).electroscopeNetCharge, 4);
}
(async () => {
  mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.platform === 'darwin' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } : {}) });
  const errors = [];
  try {
    const desktop = await browser.newContext({ viewport: { width: 1365, height: 1000 } });
    const page = await desktop.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await enter(page, '靜電研究員');
    assert.equal(await page.locator('html').getAttribute('lang'), 'zh-Hant');
    await page.locator('#lab-scene').scrollIntoViewIfNeeded();
    await page.locator('#near-button').click();
    const before = await page.locator('#lab-scene').screenshot();
    await page.waitForTimeout(950);
    const after = await page.locator('#lab-scene').screenshot();
    const inductionDifference = changedPixels(before, after);
    assert.ok(inductionDifference > 100, 'induction must visibly animate');
    assert.equal((await snapshot(page)).electroscopeNetCharge, 0);
    assert.ok((await snapshot(page)).leafAngle > 0);
    await page.locator('[data-answer="positive"]').click();
    assert.equal((await snapshot(page)).completed, false);
    await page.locator('[data-answer="neutral"]').click();
    assert.equal((await snapshot(page)).completed, true);
    await page.locator('.mission-tab[data-mission="2"]').click();
    await page.locator('#near-button').click();
    const groundBox = await page.locator('#ground-button').boundingBox();
    await page.mouse.move(groundBox.x + groundBox.width / 2, groundBox.y + groundBox.height / 2);
    await page.mouse.down();
    assert.equal((await snapshot(page)).isGrounded, true);
    assert.equal((await snapshot(page)).electroscopeNetCharge, 4);
    await page.mouse.up();
    assert.equal((await snapshot(page)).isGrounded, false);
    await page.locator('#far-button').click();
    assert.equal((await snapshot(page)).electroscopeNetCharge, 4);
    await page.waitForTimeout(1150);
    await page.screenshot({ path: path.join(output, 'desktop-positive.png'), fullPage: true });
    await page.locator('#reset-button').click();
    await page.locator('#near-button').click();
    await page.locator('#tap-mode').check();
    await page.locator('#ground-button').click();
    const groundBefore = await page.locator('#lab-scene').screenshot();
    await page.waitForTimeout(950);
    const groundAfter = await page.locator('#lab-scene').screenshot();
    const groundDifference = changedPixels(groundBefore, groundAfter);
    assert.ok(groundDifference > 100, 'grounding must visibly animate electrons');
    await page.locator('#far-button').click();
    assert.equal((await snapshot(page)).electroscopeNetCharge, 0);
    await page.locator('#ground-button').click();
    assert.match(await page.locator('#feedback-text').textContent(), /地面把電子補回來/);
    await page.locator('#reset-button').click();
    await chargeCorrectly(page);
    await page.locator('[data-answer="positive"]').click();
    assert.equal((await snapshot(page)).completed, true);
    await page.reload();
    assert.equal(await page.locator('#profile-dialog').isVisible(), false);
    assert.match(await page.locator('#progress-summary').textContent(), /2 \/ 2/);
    assert.equal((await snapshot(page)).electroscopeNetCharge, 0, 'reload must not resume a connected ground');
    const anatomy = await page.evaluate(() => ({
      stemBottom: Number(document.querySelector('#metal-stem').getAttribute('y')) + Number(document.querySelector('#metal-stem').getAttribute('height')),
      width: document.querySelector('.page-shell').getBoundingClientRect().width,
      overflow: document.documentElement.scrollWidth > innerWidth
    }));
    assert.equal(anatomy.stemBottom, 303);
    assert.ok(anatomy.stemBottom < 400, 'metal stem must stop at leaf hinge, not the base');
    assert.ok(anatomy.width <= 1080 && !anatomy.overflow);
    const mobile = await browser.newContext({ ...devices['iPhone 13'], reducedMotion: 'reduce' });
    const phone = await mobile.newPage();
    phone.on('pageerror', error => errors.push(error.message));
    await enter(phone, '小宇');
    assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await phone.locator('#lab-scene').scrollIntoViewIfNeeded();
    const rodBox = await phone.locator('#rod').boundingBox();
    const client = await mobile.newCDPSession(phone);
    const x = rodBox.x + rodBox.width / 2, y = rodBox.y + rodBox.height / 2;
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 70, y: y + 35 }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.equal((await snapshot(phone)).isRodNear, true, 'touch dragging must move the rod into the snap zone');
    await phone.locator('[data-answer="neutral"]').tap();
    await phone.locator('.mission-tab[data-mission="2"]').tap();
    await chargeCorrectly(phone);
    await phone.locator('[data-answer="positive"]').tap();
    assert.equal((await snapshot(phone)).completed, true);
    await phone.locator('#workbench').scrollIntoViewIfNeeded();
    await phone.screenshot({ path: path.join(output, 'mobile-positive.png'), fullPage: true });
    assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, [], 'no uncaught browser errors');
    console.log(JSON.stringify({ passed: true, engineActions: 'induction, hold/release grounding, wrong-order retry, correct order, concept answers, local persistence', animationChangedPixels: { induction: inductionDifference, grounding: groundDifference }, mobile: '390px iPhone 13 Chromium emulation; touch drag and tap controls', desktop: '1365px; 1080px content; no horizontal overflow', anatomy: 'metal stem ends at y=303; base at y=445', browserErrors: errors, screenshots: ['artifacts/desktop-positive.png', 'artifacts/mobile-positive.png'] }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
