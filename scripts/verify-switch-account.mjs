/**
 * Walkthrough screenshots for Switch Account / Switch Role / PIN-reset gating.
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
    const data = {
      ...remoteDoc,
      settings: { ...remoteDoc.settings, ownerPinSet: true },
    };
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ mode: 'remote', empty: false, owner, data, paymentsRejected: false }),
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
  await mockApi(page);

  // Fresh device → access-key login
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Sign in to your workspace');
  await shot(page, '01_access_key_login.png');

  // Sign in with team access key → role unlock gate
  await page.fill('#access-key', ACCESS_KEY);
  await page.click('button:has-text("Continue")');
  await page.waitForSelector('text=Unlock Orbit Ops');
  await shot(page, '02_role_unlock_after_login.png');

  // Manager: enter PIN only — no set/reset
  await page.click('button:has-text("Manager")');
  await page.waitForSelector('text=Manager PIN');
  const managerSet = await page.locator('text=Set Owner PIN').count();
  const managerConfirm = await page.locator('input[placeholder="Confirm PIN"]').count();
  console.log('manager set/confirm counts', managerSet, managerConfirm);
  await shot(page, '03_manager_pin_no_reset.png');

  await page.fill('input[placeholder="PIN"]', MANAGER_PIN);
  await page.click('button:has-text("Unlock Manager")');
  await page.waitForSelector('text=Switch Role');
  await shot(page, '04_manager_unlocked_nav.png');

  // Switch Role → role gate (not login, not blank)
  await page.click('button:has-text("Switch Role")');
  await page.waitForSelector('text=Unlock Orbit Ops');
  await shot(page, '05_switch_role_gate.png');

  // Team: no reset
  await page.click('button:has-text("Team")');
  await page.waitForSelector('text=Team PIN');
  const teamSet = await page.locator('text=Set Owner PIN').count();
  const teamConfirm = await page.locator('input[placeholder="Confirm PIN"]').count();
  console.log('team set/confirm counts', teamSet, teamConfirm);
  await shot(page, '06_team_pin_no_reset.png');

  // Owner with ownerPinSet true: enter PIN only — no reset
  await page.click('button:has-text("Owner")');
  await page.waitForSelector('text=Owner PIN');
  const ownerSet = await page.locator('text=Set Owner PIN').count();
  const ownerConfirm = await page.locator('input[placeholder="Confirm PIN"]').count();
  const ownerNew = await page.locator('input[placeholder="New PIN (4+ digits)"]').count();
  console.log('owner set/confirm/new counts', ownerSet, ownerConfirm, ownerNew);
  await shot(page, '07_owner_pin_enter_only.png');

  // Role-gate Switch Account → access-key login (must NOT stay on role gate)
  await page.click('button:has-text("Switch Account")');
  await page.waitForSelector('#access-key', { timeout: 10000 });
  await page.waitForSelector('text=Sign in to your workspace');
  const stuckOnRoleGate = await page.locator('text=Unlock Orbit Ops').count();
  console.log('after role-gate Switch Account, Unlock Orbit Ops count', stuckOnRoleGate);
  await shot(page, '08_switch_account_to_login.png');
  if (stuckOnRoleGate) {
    console.error('FAIL: Switch Account stayed on role unlock gate');
    process.exitCode = 1;
    await browser.close();
    return;
  }

  // Sign in again, unlock, Switch Account from sidebar
  await page.fill('#access-key', ACCESS_KEY);
  await page.click('button:has-text("Continue")');
  await page.waitForSelector('text=Unlock Orbit Ops');
  await page.click('button:has-text("Manager")');
  await page.fill('input[placeholder="PIN"]', MANAGER_PIN);
  await page.click('button:has-text("Unlock Manager")');
  await page.waitForSelector('aside >> text=Switch Account');
  await page.click('aside >> text=Switch Account');
  await page.waitForSelector('#access-key', { timeout: 10000 });
  await page.waitForSelector('text=Sign in to your workspace');
  const stuckAfterNav = await page.locator('text=Unlock Orbit Ops').count();
  console.log('after nav Switch Account, Unlock Orbit Ops count', stuckAfterNav);
  await shot(page, '09_nav_switch_account_to_login.png');
  if (stuckAfterNav) {
    console.error('FAIL: Nav Switch Account stayed on role unlock gate');
    process.exitCode = 1;
    await browser.close();
    return;
  }

  // Bootstrap case: empty remote / ownerPinSet false → Set Owner PIN once
  await page.unroute('**/api/state');
  await page.route('**/api/state', async route => {
    const req = route.request();
    const key = await req.headerValue('x-orbit-key');
    if (!key || key !== ACCESS_KEY) {
      return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ mode: 'remote' }) });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        mode: 'remote',
        empty: true,
        owner: false,
        data: {
          version: 3,
          clients: [],
          tasks: [],
          requests: [],
          content: [],
          team: [],
          settings: { companyName: 'Orbit Ops', currency: 'INR', ownerPinSet: false },
        },
      }),
    });
  });
  await page.evaluate(() => {
    localStorage.removeItem('orbit-ops-data-v2');
    sessionStorage.clear();
  });
  await page.fill('#access-key', ACCESS_KEY);
  await page.click('button:has-text("Continue")');
  await page.waitForSelector('text=Unlock Orbit Ops');
  await page.click('button:has-text("Owner")');
  await page.waitForSelector('text=Set Owner PIN', { timeout: 10000 });
  await shot(page, '10_owner_first_pin_bootstrap_only.png');

  // Manager still must not get set-PIN even when no Owner PIN exists
  await page.click('button:has-text("Manager")');
  await page.waitForSelector('text=Manager PIN');
  const mgrBootstrapLeak = await page.locator('text=Set Owner PIN').count();
  const mgrConfirmLeak = await page.locator('input[placeholder="Confirm PIN"]').count();
  console.log('manager bootstrap leak counts', mgrBootstrapLeak, mgrConfirmLeak);
  await shot(page, '11_manager_no_reset_when_no_owner_pin.png');

  if (managerSet || managerConfirm || teamSet || teamConfirm || ownerSet || ownerConfirm || ownerNew || mgrBootstrapLeak || mgrConfirmLeak) {
    console.error('FAIL: PIN reset affordance leaked onto unlock gate');
    process.exitCode = 1;
  } else {
    console.log('PASS: Manager/Team never offered PIN reset; Owner enter-only when pin set; bootstrap only when no Owner PIN');
  }

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
