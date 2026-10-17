// 打开持久化 profile 的可见浏览器窗口，由用户本人完成登录。
// 登录完成后用户关闭窗口即可；Cookies 保存在 PROFILE_DIR，供查询复用。
import { chromium } from 'playwright-core';
import { BROWSER_CHANNEL, PROFILE_DIR, logLine } from './config.mjs';

const context = await chromium.launchPersistentContext(PROFILE_DIR, {
  channel: BROWSER_CHANNEL,
  headless: false,
  viewport: { width: 1440, height: 1000 },
});

try {
  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://www.iwencai.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  console.log('LOGIN_WINDOW_OPEN');
  console.log('请在弹出的浏览器窗口中登录问财；登录完成后关闭该窗口。');
  logLine('login window opened (channel=' + BROWSER_CHANNEL + ')');

  // Keep the profile alive until the user closes the window.
  await new Promise((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    context.on('close', finish);
    const timer = setTimeout(finish, 300000);
    timer.unref?.();
  });
} catch (err) {
  console.error('LOGIN_ERROR', err && err.message ? err.message : String(err));
  logLine('login failed: ' + (err && err.message ? err.message : String(err)));
  process.exitCode = 1;
} finally {
  try { await context.close(); } catch {}
}
