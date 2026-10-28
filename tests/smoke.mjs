import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(process.env.TEST_URL || 'http://localhost:5173');
  await page.waitForFunction(() => window.__CHROMA_READY__);
  console.log('WebGL initialized');
  const lightSignature = () => page.evaluate(() => {
    const { renderer, causticTarget } = window.__CHROMA__;
    const pixels = new Uint16Array(causticTarget.width * causticTarget.height * 4);
    renderer.readRenderTargetPixels(causticTarget, 0, 0, causticTarget.width, causticTarget.height, pixels);
    let energy = 0, hash = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      energy += pixels[i] + pixels[i + 1] + pixels[i + 2];
      hash = (Math.imul(hash, 31) + pixels[i] + pixels[i + 1] * 3 + pixels[i + 2] * 7) | 0;
    }
    return { energy, hash };
  });
  const initial = await lightSignature();console.log('Initial light energy:',initial.energy);
  assert(initial.energy > 0, 'The GPU receiver must contain transmitted colored light');
  await page.mouse.move(1300, 180);
  await page.waitForFunction(() => window.__CHROMA__.orientation.x > .35);
  const moved = await lightSignature();console.log('Light transformation read');
  assert.notEqual(initial.hash, moved.hash, 'Rotating the glass must change the actual light render target');
  console.log('Testing reset');await page.locator('#reset').click();
  await page.waitForFunction(() => Math.abs(window.__CHROMA__.orientation.x) < .15);
  await page.locator('canvas').focus();
  await page.keyboard.press('ArrowLeft');
  await page.waitForFunction(() => window.__CHROMA__.orientation.x < -.05);
  console.log('Desktop controls passed');await page.close();
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  mobile.on('pageerror', error => errors.push(error.message));
  await mobile.goto(process.env.TEST_URL || 'http://localhost:5173');
  await mobile.waitForFunction(() => window.__CHROMA_READY__);
  await mobile.touchscreen.tap(325, 540);
  await mobile.waitForFunction(() => window.__CHROMA__.orientation.x > .15);
  assert(await mobile.evaluate(() => document.documentElement.scrollWidth === innerWidth), 'Mobile layout must fit the viewport');
  assert.deepEqual(errors, [], 'No browser or shader errors');
  console.log('PASS: WebGL startup, nonempty caustics, light transformation, reset, keyboard, mobile touch, responsive layout, browser errors.');
} finally {
  await browser.close();
}
