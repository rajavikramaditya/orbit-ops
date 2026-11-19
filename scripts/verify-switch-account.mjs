/**
 * Walkthrough: Switch Role / Switch Account → original access-key Sign-in.
 * Mocks /api/state so remote mode works without Neon.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const OUT = '/cursor/stores/bc-5647c6e3-288c-45bc-a7a7-f6d1c423d20c/media/switch-account-fix';
const BASE = 'http://localhost:3456';
const ACCESS_KEY = 'orbit-test-access-key';
const MANAGER_PIN = '8423095693';

const remoteDoc = {
  version: 3,
  clients: [],
  tasks: [],
  requests: [],
  content: [],
  team: [{ id: 'm1', name: 'Vikram', role: 'Owner', focus: 'Strategy' }],
  settings: { companyName: 'Orbit Ops', currency: 'INR', ownerPinSet: true },
};

async function mockApi(page) {
  await page.route('**/api/state', async route => {
    const req = route.request();
    const key = await req.headerValue('x-orbit-key');
    if (!key || key !== ACCESS_KEY) {
      return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ mode: 'remote' }) });
    }
    const pin = await req.headerValue('x-owner-pin');
    const owner = !!pin && pin.length >= 4;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        mode: 'remote',
        empty: false,
        owner,
        data: { ...remoteDoc, settings: { ...remoteDoc.settings, ownerPinSet: true } },
        paymentsRejected: false,
      }),
    });
  });
}

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  console.log('saved', file);
  return file;
}

async function assertOnAccessKeyLogin(page, label) {
  await page.waitForSelector('#access-key', { timeout: 10000 });
  await page.waitForSelector('text=Sign in to your workspace');
  const roleGate = await page.locator('text=Unlock Orbit Ops').count();
  const blankish = await page.locator('text=Opening Orbit Ops').count();
  console.log(label, { roleGate, blankish });
  if (roleGate || blankish) {
    throw new Error(`${label}: expected access-key Sign in, got role/blank gate`);
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await mockApi(page);

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await assertOnAccessKeyLogin(page, 'cold start');
  await shot(page, '12_original_access_key_login.png');

  await page.fill('#access-key', ACCESS_KEY);
  await page.click('button:has-text("Continue")');
  await page.waitForSelector('text=Unlock Orbit Ops');
  await page.click('button:has-text("Manager")');
  await page.fill('input[placeholder="PIN"]', MANAGER_PIN);
  await page.click('button:has-text("Unlock Manager")');
  await page.waitForSelector('aside >> text=Switch Role');
  await shot(page, '13_manager_unlocked_before_switch_role.png');

  // Switch Role must land on the ORIGINAL access-key Sign-in — not RoleGate.
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('aside button')].find(b => b.textContent?.includes('Switch Role'));
    btn?.click();
  });
  await assertOnAccessKeyLogin(page, 'after Switch Role');
  await shot(page, '14_switch_role_to_original_login.png');

  // Fresh context: Switch Account → same Sign in
  const page2 = await page.context().newPage();
  await mockApi(page2);
  await page2.goto(BASE, { waitUntil: 'networkidle' });
  await page2.fill('#access-key', ACCESS_KEY);
  await page2.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Continue'));
    btn?.click();
  });
  await page2.waitForSelector('text=Unlock Orbit Ops');
  await page2.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.trim().startsWith('Manager'));
    btn?.click();
  });
  await page2.fill('input[placeholder="PIN"]', MANAGER_PIN);
  await page2.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Unlock Manager'));
    btn?.click();
  });
  await page2.waitForSelector('aside >> text=Switch Account');
  await page2.evaluate(() => {
    const btn = [...document.querySelectorAll('aside button')].find(b => b.textContent?.includes('Switch Account'));
    btn?.click();
  });
  await assertOnAccessKeyLogin(page2, 'after Switch Account');
  await shot(page2, '15_switch_account_to_original_login.png');

  // After access key, Owner with PIN set still has no reset affordance
  await page2.fill('#access-key', ACCESS_KEY);
  await page2.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Continue'));
    btn?.click();
  });
  await page2.waitForSelector('text=Unlock Orbit Ops');
  await page2.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.trim().startsWith('Owner'));
    btn?.click();
  });
  await page2.waitForSelector('text=Owner PIN');
  const setPin = await page2.locator('text=Set Owner PIN').count();
  const confirm = await page2.locator('input[placeholder="Confirm PIN"]').count();
  console.log('owner reset leak', setPin, confirm);
  await shot(page2, '16_owner_pin_no_reset_after_login.png');
  if (setPin || confirm) throw new Error('PIN reset leaked onto unlock gate');

  console.log('PASS: Switch Role → original access-key login; no PIN reset');
  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
