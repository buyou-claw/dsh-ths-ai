// 只读地判断当前持久化 profile 是否已登录问财。
// 判定口径：页面上没有登录按钮、没有登录弹窗，且 Cookie 里存在 u_ukey。
import { chromium } from 'playwright-core';
import { BROWSER_CHANNEL, PROFILE_DIR, STATUS_WAIT_MS, logLine } from './config.mjs';

let context;
try {
  context = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: BROWSER_CHANNEL,
    headless: true,
    viewport: { width: 1280, height: 900 },
  });
  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://www.iwencai.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(STATUS_WAIT_MS);

  const body = await page.locator('body').innerText().catch(() => '');
  const loginButtons = await page.locator('span.login').count().catch(() => 0);
  const loginModal = /请输入手机号|短信验证码/.test(body);
  const cookies = await context.cookies().catch(() => []);
  const names = new Set(cookies.map((c) => c.name));
  const loggedIn = loginButtons === 0 && !loginModal && names.has('u_ukey');

  console.log('THS_STATUS:' + JSON.stringify({
    ok: true,
    loggedIn,
    loginButtonVisible: loginButtons > 0,
    loginModal,
    hasUkey: names.has('u_ukey'),
    hasDpass: names.has('u_dpass'),
    cookieCount: cookies.length,
    profile: PROFILE_DIR,
  }));
} catch (err) {
  logLine('status check failed: ' + (err && err.message ? err.message : String(err)));
  console.log('THS_STATUS:' + JSON.stringify({
    ok: false,
    loggedIn: null,
    error: 'STATUS_FAILED',
    message: err && err.message ? err.message : String(err),
    profile: PROFILE_DIR,
  }));
} finally {
  try { await context?.close(); } catch {}
}
