import { chromium } from 'playwright-core';
import { BROWSER_CHANNEL, PROFILE_DIR, QUERY_WAIT_MS, logLine } from './config.mjs';

const query = String(process.env.THS_QUERY || '').trim();
const started = Date.now();

function out(obj) {
  console.log('THS_RESULT:' + JSON.stringify(obj));
}

if (!query) {
  out({ ok: false, error: 'EMPTY_QUERY' });
  process.exit(0);
}

const url = 'https://www.iwencai.com/unifiedwap/result?w=' + encodeURIComponent(query) + '&querytype=stock';
let context;
try {
  context = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: BROWSER_CHANNEL,
    headless: true,
    viewport: { width: 1440, height: 1000 },
  });
  const page = context.pages()[0] || await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(QUERY_WAIT_MS);

  const title = await page.title().catch(() => '');
  const finalUrl = page.url();
  const body = await page.locator('body').innerText().catch(() => '');
  const tables = await page.evaluate(() => {
    const result = [];
    for (const table of Array.from(document.querySelectorAll('table')).slice(0, 8)) {
      const rows = [];
      for (const tr of Array.from(table.rows).slice(0, 60)) {
        rows.push(Array.from(tr.cells).map((td) => (td.innerText || '').trim()));
      }
      if (rows.length) result.push(rows);
    }
    return result;
  }).catch(() => []);

  const needLogin = await page.locator('span.login').count().catch(() => 0) > 0
    || /请输入手机号|短信验证码|获取验证码/.test(body);
  const blocked = /Nginx forbidden|访问受限|请求被拒绝|当前访问异常/.test(body);
  const hasTable = tables.length > 0;
  const hasStockData = /\b\d{6}\b/.test(body) && /(现价|涨跌幅|股票代码|股票简称)/.test(body);
  const ok = !needLogin && !blocked && (hasTable || hasStockData);

  // 问财的股票结果表头常被拆成独立行/独立 table；对 7 列股票表补可读表头。
  const headers = ['序号', '', '股票代码', '股票简称', '现价(元)', '涨跌幅(%)', '区间涨跌幅(%)'];
  const readableTables = [];
  for (const rows of tables) {
    if (!Array.isArray(rows) || !rows.length) continue;
    if (rows.length === 1 && Array.isArray(rows[0]) && rows[0].length === 1) continue;
    const first = rows[0];
    if (Array.isArray(first) && first.length === 7 && /^\d{6}$/.test(String(first[2] || ''))) {
      readableTables.push([headers, ...rows]);
    } else {
      readableTables.push(rows);
    }
  }

  out({
    ok,
    needLogin,
    blocked,
    hasTable,
    title,
    url: finalUrl,
    tables: readableTables,
    text: body.slice(0, 12000),
    query,
    elapsedMs: Date.now() - started,
  });
} catch (err) {
  logLine('query failed: ' + (err && err.message ? err.message : String(err)));
  out({ ok: false, error: 'QUERY_FAILED', message: err && err.message ? err.message : String(err), query });
} finally {
  try { await context?.close(); } catch {}
}
