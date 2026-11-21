/**
 * Verify Owner login shows Password only when ownerPinSet is true (no Confirm).
 * Mocks /api/state so remote mode works without Neon.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const OUT = '/cursor/stores/bc-5647c6e3-288c-45bc-a7a7-f6d1c423d20c/media';
const BASE = 'http://localhost:3460';
const ACCESS_KEY = 'orbit-test-access-key';
const OWNER_PIN = '918273';

const remoteDoc = {
  version: 3,
  clients: [],
  tasks: [],
  requests: [],
  content: [],
  team: [
    { id: 'm1', name: 'Vikram', role: 'Owner', focus: 'Strategy' },
    { id: 'm2', name: 'Ram Soni', role: 'Manager', focus: 'Ops' },
  ],
  attendance: [],
  settings: { companyName: 'Orbit Ops', currency: 'INR', ownerPinSet: true },
};

async function mockApi(page, { pinSet = true } = {}) {
  await page.route('**/api/state', async route => {
    const req = route.request();
    const key = await req.headerValue('x-orbit-key');
    if (!key || key !== ACCESS_KEY) {
      return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ mode: 'remote' }) });
    }
    const pin = await req.headerValue('x-owner-pin');
    const owner = !!pin && pin === OWNER_PIN;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        mode: 'remote',
        empty: false,
        owner,
        data: {
          ...remoteDoc,
          settings: { ...remoteDoc.settings, ownerPinSet: pinSet },
        },
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

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await mockApi(page, { pinSet: true });

  // Seed a stale local flag that previously caused the bug.
  await page.addInitScript(() => {
    localStorage.setItem('orbit-ops-data-v2', JSON.stringify({
      version: 3,
      clients: [],
      tasks: [],
      requests: [],
      content: [],
      team: [{ id: 'm1', name: 'Vikram', role: 'Owner', focus: 'Strategy' }],
      attendance: [],
      settings: { companyName: 'Orbit Ops', currency: 'INR', ownerPinSet: false },
    }));
  });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#access-key');

  // Bug repro path: pick Owner before the access key connects.
  await page.getByRole('button', { name: 'Owner', exact: true }).click();
  await page.waitForTimeout(200);

  const confirmBefore = await page.locator('#login-password-2').count();
  const labelBefore = await page.locator('label[for="login-password"]').innerText();
  console.log('before connect', { confirmBefore, labelBefore });
  if (confirmBefore !== 0 || /New Owner password/i.test(labelBefore)) {
    throw new Error('FAIL: setup UI shown before Neon pin state is known');
  }
  await shot(page, 'owner_password_only_before_connect.png');

  await page.fill('#access-key', ACCESS_KEY);
  await page.fill('#first-name', 'Vikram');
  // Selecting Owner again after key typed (still locked until submit) — still no setup.
  await page.getByRole('button', { name: 'Owner', exact: true }).click();
  await page.waitForTimeout(100);
  if (await page.locator('#login-password-2').count()) {
    throw new Error('FAIL: Confirm still visible while locked');
  }

  await page.fill('#login-password', OWNER_PIN);
  await page.getByRole('button', { name: /Sign in/i }).click();
  await page.waitForSelector('text=Signed in as Owner', { timeout: 10000 }).catch(() => {});
  // After successful unlock the login form is gone; go back via a fresh session check:
  // Instead assert we never saw Confirm during the pin-set login attempt by
  // opening a new page that connects with the key already saved.
  const page2 = await context.newPage();
  await mockApi(page2, { pinSet: true });
  await page2.goto(BASE, { waitUntil: 'networkidle' });
  // Access key from previous page is in localStorage (shared context).
  await page2.waitForSelector('text=Sign in to Orbit Ops');
  await page2.getByRole('button', { name: 'Owner', exact: true }).click();
  await page2.waitForTimeout(300);
  const confirmAfter = await page2.locator('#login-password-2').count();
  const labelAfter = await page2.locator('label[for="login-password"]').innerText();
  console.log('after connect (pin set)', { confirmAfter, labelAfter });
  if (confirmAfter !== 0 || /New Owner password/i.test(labelAfter)) {
    throw new Error('FAIL: setup UI shown when ownerPinSet is true');
  }
  if (!/^Password$/i.test(labelAfter.trim())) {
    throw new Error(`FAIL: expected Password label, got "${labelAfter}"`);
  }
  await shot(page2, 'owner_password_only_when_set.png');

  // Negative: empty/unset remote still offers setup after connect.
  const page3 = await context.newPage();
  await mockApi(page3, { pinSet: false });
  await page3.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page3.goto(BASE, { waitUntil: 'networkidle' });
  await page3.fill('#access-key', ACCESS_KEY);
  await page3.getByRole('button', { name: 'Owner', exact: true }).click();
  await page3.fill('#first-name', 'Vikram');
  await page3.fill('#login-password', 'newpin99');
  await page3.getByRole('button', { name: /Sign in/i }).click();
  await page3.waitForSelector('#login-password-2', { timeout: 10000 });
  const setupLabel = await page3.locator('label[for="login-password"]').innerText();
  console.log('unset after attempt', { setupLabel });
  if (!/New Owner password/i.test(setupLabel)) {
    throw new Error('FAIL: expected New Owner password when pin truly unset');
  }
  await shot(page3, 'owner_setup_only_when_unset.png');

  console.log('OK');
  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
