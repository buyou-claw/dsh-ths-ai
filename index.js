import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MIN_QUERY_INTERVAL_MS, PROFILE_DIR, logLine } from './config.mjs';

const PLUGIN_ID = 'dsh-ths-ai';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROFILE = PROFILE_DIR;

function nodeExecutable() {
  const candidates = [
    process.env.DSH_THS_NODE,
    process.env.DSH_NODE,
    path.join(process.env.USERPROFILE || '', '.dsh', 'dsh-runtimes', 'dsh-primary-runtime', 'dependencies', 'node', 'bin', 'node.exe'),
    path.join(os.homedir(), '.dsh', 'dsh-runtimes', 'dsh-primary-runtime', 'dependencies', 'node', 'bin',
      process.platform === 'win32' ? 'node.exe' : 'node'),
    'node',
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      if (candidate === 'node' || fs.existsSync(candidate)) return candidate;
    } catch {}
  }
  return 'node';
}

function runNode(script, extraEnv = {}, timeoutMs = 120000, detached = false) {
  return new Promise((resolve) => {
    const child = spawn(nodeExecutable(), [path.join(HERE, script)], {
      cwd: HERE,
      windowsHide: !detached,
      detached,
      stdio: detached ? 'ignore' : ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...extraEnv },
    });
    if (detached) {
      child.unref();
      resolve({ detached: true, pid: child.pid });
      return;
    }
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      try { child.kill(); } catch {}
      resolve({ ok: false, error: 'TIMEOUT', stdout, stderr });
    }, timeoutMs);
    child.stdout?.on('data', (chunk) => {
      stdout += String(chunk);
      if (stdout.length > 200000) stdout = stdout.slice(-200000);
    });
    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk);
      if (stderr.length > 20000) stderr = stderr.slice(-20000);
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ ok: false, error: 'SPAWN_FAILED', message: err?.message || String(err), stdout, stderr });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, code, stdout, stderr });
    });
  });
}

// Playwright 的 persistent profile 不能被两个进程同时使用。所有状态/查询串行执行。
let queue = Promise.resolve();
function enqueue(task) {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

function sendJson(res, status, obj) {
  try {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(obj));
  } catch {}
}

function readBody(req, limit = 20000) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size <= limit) chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(Buffer.concat(chunks).toString('utf8')); } catch { resolve(''); }
    });
    req.on('error', () => resolve(''));
  });
}

function extractMarked(stdout, marker) {
  const lines = String(stdout || '').split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    const at = line.indexOf(marker);
    if (at >= 0) {
      try { return JSON.parse(line.slice(at + marker.length)); } catch {}
    }
  }
  return null;
}

// 状态检查要拉起一次 Edge 并访问问财（约 10~20 s），所以这里做进程内缓存：
// 面板打开时先秒回上次结果，过期才真正重新检查；成功后缓存 5 分钟，失败只缓存 30 秒。
let statusCache = { at: 0, value: null };
let statusInflight = null;
const STATUS_TTL_OK = 5 * 60 * 1000;
const STATUS_TTL_FAIL = 30 * 1000;

function rememberStatus(value) {
  if (!value) return;
  statusCache = { at: Date.now(), value };
}

async function runStatusCheck() {
  const result = await enqueue(() => runNode('status.mjs', {}, 90000, false));
  return extractMarked(result.stdout, 'THS_STATUS:') || {
    ok: false,
    loggedIn: null,
    error: 'STATUS_FAILED',
    message: result.stderr || result.stdout || '状态检查进程没有返回结果',
  };
}

async function getStatus(opts = {}) {
  const force = opts.force === true;
  const cached = statusCache.value;
  const age = Date.now() - statusCache.at;
  const ttl = cached && cached.ok === false ? STATUS_TTL_FAIL : STATUS_TTL_OK;
  if (!force && cached && age >= 0 && age < ttl) {
    return { ...cached, cached: true, cachedAt: new Date(statusCache.at).toISOString(), ageMs: age };
  }
  if (statusInflight) return statusInflight;
  statusInflight = (async () => {
    const value = await runStatusCheck();
    rememberStatus(value);
    return { ...value, cached: false, cachedAt: new Date(statusCache.at).toISOString(), ageMs: 0 };
  })().finally(() => { statusInflight = null; });
  return statusInflight;
}

// 最小查询间隔：默认 3 秒，避免连续触发把问财打到限流。
// 只做「稍等」而不是报错，体验与本机实测版本一致。
let lastQueryAt = 0;

async function runQuery(query) {
  const wait = MIN_QUERY_INTERVAL_MS - (Date.now() - lastQueryAt);
  if (wait > 0) {
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, wait);
      timer.unref?.();
    });
  }
  lastQueryAt = Date.now();
  const result = await enqueue(() => runNode('query.mjs', { THS_QUERY: query }, 150000, false));
  return extractMarked(result.stdout, 'THS_RESULT:') || {
    ok: false,
    error: result.error || 'NO_RESULT',
    message: result.stderr || result.stdout || '查询进程没有返回结果',
    query,
  };
}

function markdownTable(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return '';
  const width = Math.max(...rows.map((r) => r.length));
  const normalized = rows.map((r) => {
    const copy = r.slice();
    while (copy.length < width) copy.push('');
    return copy;
  });
  const keep = [];
  for (let i = 0; i < width; i += 1) {
    const header = String(normalized[0][i] ?? '').trim();
    const hasValue = normalized.slice(1).some((row) => String(row[i] ?? '').trim() !== '');
    if (header || hasValue) keep.push(i);
  }
  const projected = normalized.map((row) => keep.map((i) => row[i]));
  const escape = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  const header = projected[0].map(escape);
  const lines = [
    '| ' + header.join(' | ') + ' |',
    '| ' + header.map(() => '---').join(' | ') + ' |',
    ...projected.slice(1).map((row) => '| ' + row.map(escape).join(' | ') + ' |'),
  ];
  return lines.join('\n');
}

function formatResult(result) {
  if (!result) return '问财没有返回结果。';
  if (result.needLogin) return '问财当前未登录。请先在「同花顺 AI」面板点“登录问财”，登录后关闭 Edge 窗口再试。';
  if (result.blocked) return '问财返回了访问限制（可能是反爬/频率限制），请稍后再试。';
  const lines = [];
  if (result.query) lines.push('**问财查询：** ' + result.query);
  const table = (result.tables || []).find((t) => Array.isArray(t) && t.length > 1);
  if (table) {
    lines.push(markdownTable(table.slice(0, 21)));
  } else if (result.text) {
    lines.push(String(result.text).slice(0, 4000));
  }
  if (!result.ok && !table) lines.push('\n> 未解析到表格，以上为页面正文。');
  return lines.join('\n\n');
}

function normalizeCell(value) {
  return String(value ?? '').replace(/\r?\n/g, ' ').trim();
}

function makeTool() {
  return {
    name: 'ths_query',
    description: 'Query 同花顺问财 (I问财) with a natural-language stock question using the local logged-in Edge profile. Returns a Markdown table/text. Use when the user asks about A-share screening, market movers, concepts, or 问财-style stock queries.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural-language 问财 query, e.g. 最近一周涨幅最大的个股' },
      },
      required: ['query'],
      additionalProperties: false,
    },
    // DSH 0.2.x 起 tools.register 要求工具声明 output：{ schema, render, presentationMeta? }
    output: {
      schema: {
        type: 'object',
        properties: { markdown: { type: 'string' } },
        additionalProperties: true,
      },
      render: (_args, value) => [{ type: 'text', text: String(value?.markdown ?? '') }],
    },
    async execute(args = {}) {
      const query = normalizeCell(args.query);
      if (!query) throw new Error('query is required');
      return { markdown: formatResult(await runQuery(query)) };
    },
  };
}

function makeStatusTool() {
  return {
    name: 'ths_status',
    description: 'Check whether the local 同花顺问财 Edge profile is logged in.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    output: {
      schema: {
        type: 'object',
        properties: { markdown: { type: 'string' } },
        additionalProperties: true,
      },
      render: (_args, value) => [{ type: 'text', text: String(value?.markdown ?? '') }],
    },
    async execute() {
      const s = await getStatus();
      const markdown = s.loggedIn === true
        ? '同花顺问财登录状态：已登录'
        : s.loggedIn === false
          ? '同花顺问财登录状态：未登录。请到右侧「同花顺 AI」面板点“登录问财”。'
          : '同花顺问财登录状态：未知（' + (s.message || s.error || '状态检查失败') + '）';
      return { markdown };
    },
  };
}

function makeCommand(getStatusFn, queryFn) {
  return {
    name: 'ths',
    description: '同花顺问财查询：/ths <自然语言问题>；/ths status 查看登录状态。',
    input: { hint: '最近一周涨幅最大的个股 | status' },
    async handler(invocation) {
      try {
        const raw = String(invocation?.rawInput || '').trim();
        if (!raw) return { kind: 'error', text: '用法：/ths <自然语言问题>，例如 /ths 最近一周涨幅最大的个股；/ths status 查看登录状态。' };
        if (raw === 'status') {
          const s = await getStatusFn();
          if (s.loggedIn === true) return { kind: 'success', text: '问财登录状态：已登录' };
          if (s.loggedIn === false) return { kind: 'success', text: '问财登录状态：未登录。请在「同花顺 AI」面板点“登录问财”。' };
          return { kind: 'error', text: '问财登录状态未知：' + (s.message || s.error || '状态检查失败') };
        }
        const result = await queryFn(raw);
        return { kind: result?.ok === false && !result?.needLogin ? 'error' : 'success', text: formatResult(result) };
      } catch (error) {
        return { kind: 'error', text: '问财查询失败：' + (error?.message || String(error)) };
      }
    },
  };
}

function readSkillContent() {
  try {
    const text = fs.readFileSync(path.join(HERE, 'skills', 'ths', 'SKILL.md'), 'utf8');
    const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]+)$/.exec(text);
    return match ? match[1].trim() : text;
  } catch {
    return '# 同花顺问财\n\n调用 `ths_query` 工具查询，然后用自然语言总结；不要编造数据。';
  }
}

export const name = PLUGIN_ID;
export const inject = ['webServer', 'tools', 'skills'];

export function apply(ctx) {
  const cleanups = [];

  try {
    const ws = ctx.get('webServer');
    if (ws && typeof ws.register === 'function') {
      cleanups.push(ws.register({
        kind: 'prefix',
        path: '/ths-ai',
        handler: async (req, res) => {
          const url = new URL(String(req.url || '/ths-ai'), 'http://local');
          const route = url.pathname.replace(/^\/ths-ai\/?/, '') || 'status';

          if (route === 'status') {
            const fresh = url.searchParams.get('fresh') === '1';
            const status = await getStatus({ force: fresh });
            sendJson(res, 200, { ...status, profile: PROFILE, profileExists: fs.existsSync(PROFILE) });
            return;
          }

          if (route === 'login' && req.method === 'POST') {
            const result = await runNode('login.mjs', {}, 0, true);
            sendJson(res, 200, {
              ok: true,
              started: true,
              pid: result.pid,
              message: '登录窗口已打开；登录完成后请关闭该 Edge 窗口，再回面板点“刷新状态”。',
            });
            return;
          }

          if (route === 'query' && req.method === 'POST') {
            let body = {};
            try { body = JSON.parse(await readBody(req) || '{}'); } catch {}
            const query = normalizeCell(body.query);
            if (!query) {
              sendJson(res, 400, { ok: false, error: 'EMPTY_QUERY' });
              return;
            }
            const result = await runQuery(query);
            if (result && result.ok && !result.needLogin && !result.blocked) {
              rememberStatus({ ok: true, loggedIn: true, loginButtonVisible: false, loginModal: false });
            } else if (result && result.needLogin) {
              rememberStatus({ ok: true, loggedIn: false });
            }
            sendJson(res, 200, result);
            return;
          }

          sendJson(res, 404, { ok: false, error: 'NOT_FOUND', route });
        },
      }));
    } else {
      console.warn('[dsh-ths-ai] webServer unavailable; panel backend disabled');
    }
  } catch (e) {
    console.warn('[dsh-ths-ai] route registration failed:', e?.message || e);
  }

  try {
    const tools = ctx.tools || (() => { try { return ctx.get('tools'); } catch { return undefined; } })();
    if (tools && typeof tools.register === 'function') {
      const registerOne = (tool) => {
        try {
          cleanups.push(tools.register(tool));
          logLine(tool.name + ' registered');
        } catch (e) {
          logLine(tool.name + ' registration failed: ' + (e?.stack || e));
          console.warn('[dsh-ths-ai] ' + tool.name + ' registration failed:', e?.message || e);
        }
      };
      registerOne(makeTool());
      registerOne(makeStatusTool());
    } else {
      logLine('tools service unavailable');
    }
  } catch (e) {
    logLine('tool registration failed: ' + (e?.stack || e));
    console.warn('[dsh-ths-ai] tool registration failed:', e?.message || e);
  }

  try {
    const skills = ctx.skills || (() => { try { return ctx.get('skills'); } catch { return undefined; } })();
    if (skills && typeof skills.register === 'function') {
      cleanups.push(skills.register({
        name: 'ths',
        description: '用同花顺问财查询 A 股/基金/市场信息，并由 AI 汇总成自然语言回答。',
        content: readSkillContent(),
        source: 'runtime',
        invocation: { modelInvocable: true, userInvocable: true },
      }));
    }
  } catch (e) {
    console.warn('[dsh-ths-ai] skill registration failed:', e?.message || e);
  }

  // 启动后在后台预热一次登录态缓存：面板/工具拿状态时就不用再等一次 10~20 s 的 Edge 启动。
  try {
    const warm = setTimeout(() => { getStatus({ force: true }).catch(() => {}); }, 4000);
    warm.unref?.();
    cleanups.push(() => clearTimeout(warm));
  } catch {}

  ctx.effect?.(() => () => {
    for (const dispose of cleanups.reverse()) {
      try { if (typeof dispose === 'function') dispose(); } catch {}
    }
  });
}

export const __test = { formatResult, makeCommand, getStatus, runQuery };
