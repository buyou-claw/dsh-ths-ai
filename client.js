(() => {
  try {
    window.__ModuleLoader__.load({
      id: 'dsh-ths-ai',
      factory: (require) => {
        var module = { exports: {} };
        var exports = module.exports;
        Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

        var react = require('react');
        var el = react.createElement;
        var useState = react.useState;
        var useEffect = react.useEffect;
        var useCallback = react.useCallback;

        var PLUGIN_ID = 'dsh-ths-ai';
        var PANEL_ID = 'ths-ai-panel';
        var LABEL = '同花顺 AI';

        var CSS = `
.ths-root {
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 18px 22px 40px;
  color: var(--dsw-alias-label-primary, #e2e8f0);
  background: var(--dsw-alias-bg-module-platform, transparent);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 13px;
  line-height: 1.55;
}
.ths-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px; }
.ths-title { display:flex; align-items:center; gap:10px; font-size:15px; font-weight:650; letter-spacing:.2px; }
.ths-dot { width:8px; height:8px; border-radius:50%; background:#f59e0b; box-shadow:0 0 0 3px rgba(245,158,11,.14); }
.ths-dot.ok { background:#22c55e; box-shadow:0 0 0 3px rgba(34,197,94,.14); }
.ths-sub { color:var(--dsw-alias-label-tertiary, #94a3b8); font-size:12px; }
.ths-card {
  background: var(--dsw-alias-bg-layer-1, rgba(255,255,255,.035));
  border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.12));
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 12px;
  box-sizing: border-box;
}
.ths-row { display:flex; gap:8px; align-items:flex-end; }
.ths-input {
  flex:1; min-width:80px; resize:vertical; min-height:64px; max-height:180px;
  background: var(--dsw-alias-bg-layer-2, rgba(0,0,0,.14));
  color: var(--dsw-alias-label-primary, #e2e8f0);
  border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.14));
  border-radius: 8px; padding: 9px 11px; font: inherit; outline:none;
}
.ths-input:focus { border-color: var(--dsw-alias-border-brand, #4f8cff); }
.ths-btn {
  border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.14));
  background: var(--dsw-alias-bg-layer-2, rgba(255,255,255,.06));
  color: var(--dsw-alias-label-primary, #e2e8f0);
  border-radius: 8px; padding: 8px 14px; font: inherit; cursor:pointer; white-space:nowrap;
}
.ths-btn:hover { border-color: var(--dsw-alias-border-brand, #4f8cff); }
.ths-btn.primary { background: var(--dsw-alias-bg-brand, #2563eb); border-color: transparent; color:#fff; }
.ths-btn:disabled { opacity:.5; cursor:default; }
.ths-hint { color: var(--dsw-alias-label-tertiary, #94a3b8); font-size:12px; margin-top:8px; }
.ths-error { color:#f87171; white-space:pre-wrap; }
.ths-pre {
  margin:0; white-space:pre-wrap; word-break:break-word;
  font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
  font-size:12px; line-height:1.55; max-height:420px; overflow:auto;
}
.ths-table-wrap { overflow:auto; max-height:420px; margin-top:10px; border:1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.12)); border-radius:8px; }
.ths-table { border-collapse:collapse; width:100%; font-size:12px; }
.ths-table th, .ths-table td { border-bottom:1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.09)); padding:6px 9px; text-align:left; white-space:nowrap; }
.ths-table th { position:sticky; top:0; background:var(--dsw-alias-bg-layer-2, #1b1f26); color:var(--dsw-alias-label-secondary,#cbd5e1); }
.ths-meta { color:var(--dsw-alias-label-tertiary, #94a3b8); font-size:11px; margin-top:8px; word-break:break-all; }
.ths-empty { color:var(--dsw-alias-label-tertiary, #94a3b8); padding:18px 0; text-align:center; }
`;

        function ensureCss() {
          try {
            if (document.getElementById('dsh-ths-ai-css')) return;
            var style = document.createElement('style');
            style.id = 'dsh-ths-ai-css';
            style.textContent = CSS;
            document.head.appendChild(style);
          } catch {}
        }

        function renderTable(rows, index) {
          if (!Array.isArray(rows) || !rows.length) return null;
          var head = rows[0];
          var body = rows.slice(1, 31);
          return el('div', { className: 'ths-table-wrap', key: 't' + index },
            el('table', { className: 'ths-table' },
              el('thead', null, el('tr', null, head.map((cell, i) => el('th', { key: i }, String(cell ?? ''))))),
              el('tbody', null, body.map((row, ri) => el('tr', { key: ri }, row.map((cell, ci) => el('td', { key: ci }, String(cell ?? ''))))))
            )
          );
        }

        function ThsPanel() {
          ensureCss();
          var [query, setQuery] = useState('今日涨幅前10的股票');
          var [loading, setLoading] = useState(false);
          var [loginBusy, setLoginBusy] = useState(false);
          var [checking, setChecking] = useState(false);
          var [status, setStatus] = useState(null);
          var [result, setResult] = useState(null);
          var [error, setError] = useState('');
          var [hint, setHint] = useState('');

          var checkStatus = useCallback(function (force) {
            setChecking(true);
            fetch('/ths-ai/status' + (force ? '?fresh=1' : '')).then(function (r) { return r.json(); }).then(function (s) {
              setStatus(s || null);
              if (s && s.loggedIn === true) setHint(s && s.cached && s.ageMs > 60000 ? '已登录问财（状态来自缓存，可点“刷新状态”重新检查）。' : '已登录问财，可以直接查询。');
              else if (s && s.loggedIn === false) setHint('未登录：请点“登录问财”，在弹出的 Edge 窗口登录后关闭窗口，再点“刷新状态”。');
              else if (s && s.error) setHint('状态检查失败：' + (s.message || s.error) + '（登录窗口打开时无法检查，属正常）');
            }).catch(function (e) {
              setStatus({ ok: false, loggedIn: null });
              setHint('状态检查失败：' + e.message);
            }).finally(function () { setChecking(false); });
          }, []);

          useEffect(function () { checkStatus(); }, [checkStatus]);

          var doLogin = useCallback(function () {
            setLoginBusy(true);
            setError('');
            fetch('/ths-ai/login', { method: 'POST' }).then(function (r) { return r.json(); }).then(function (s) {
              setHint((s && s.message) || '登录窗口已打开。');
              setTimeout(function () { checkStatus(true); }, 5000);
              setTimeout(function () { checkStatus(true); }, 15000);
            }).catch(function (e) { setError('登录窗口启动失败：' + e.message); })
              .finally(function () { setLoginBusy(false); });
          }, [checkStatus]);

          var doQuery = useCallback(function () {
            var q = String(query || '').trim();
            if (!q) return;
            setLoading(true);
            setError('');
            setResult(null);
            setHint('');
            fetch('/ths-ai/query', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ query: q }),
            }).then(function (r) { return r.json(); }).then(function (data) {
              if (!data || data.ok === false) {
                if (data && (data.text || (data.tables && data.tables.length))) setResult(data);
                if (data && data.needLogin) {
                  setStatus({ ok: true, loggedIn: false });
                  setError('问财当前未登录。请先点“登录问财”，在弹出的 Edge 窗口登录并关闭窗口后再查询。');
                } else if (data && data.blocked) {
                  setError('问财返回了访问限制（可能触发反爬/频率限制）。请降低频率或稍后再试。');
                } else {
                  setError((data && (data.message || data.error)) || '没有解析到结果；下面是页面原始文本，可用来判断是否被登录/反爬拦截。');
                }
                return;
              }
              setStatus({ ok: true, loggedIn: true });
              setResult(data);
            }).catch(function (e) {
              var msg = e && e.message ? e.message : String(e);
              if (/Target page, context or browser has been closed|ProcessSingleton|profile.*(in use|locked)/i.test(msg)) {
                msg = '浏览器被另一个操作打断：登录窗口可能还开着，或状态检查尚未结束。请关闭登录窗口、等状态刷新后再查询。';
              }
              setError('查询失败：' + msg);
            })
              .finally(function () { setLoading(false); });
          }, [query]);

          var statusText = '登录状态：检查中…';
          if (!checking && status) {
            if (status.loggedIn === true) statusText = '登录状态：已登录';
            else if (status.loggedIn === false) statusText = '登录状态：未登录';
            else statusText = '登录状态：未知';
          }
          var dotOk = status && status.loggedIn === true;
          return el('div', { className: 'ths-root' },
            el('div', { className: 'ths-head' },
              el('div', { className: 'ths-title' },
                el('span', { className: 'ths-dot' + (dotOk ? ' ok' : '') }),
                el('span', null, LABEL),
                el('span', { className: 'ths-sub' }, '问财 · 本地登录态')
              ),
              el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                el('span', { className: 'ths-sub' }, statusText),
                el('button', { className: 'ths-btn', onClick: function () { checkStatus(true); }, disabled: checking }, checking ? '检查中…' : '刷新状态'),
                el('button', { className: 'ths-btn', onClick: doLogin, disabled: loginBusy }, loginBusy ? '打开中…' : '登录问财')
              )
            ),
            el('div', { className: 'ths-card' },
              el('div', { className: 'ths-row' },
                el('textarea', {
                  className: 'ths-input',
                  value: query,
                  placeholder: '用自然语言问，例如：今日涨幅前10的股票 / 低市盈率且主力净流入的股票',
                  onChange: function (e) { setQuery(e.target.value); },
                  onKeyDown: function (e) {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') doQuery();
                  },
                }),
                el('button', { className: 'ths-btn primary', onClick: doQuery, disabled: loading }, loading ? '查询中…' : '查询')
              ),
              hint ? el('div', { className: 'ths-hint' }, hint) : null,
              el('div', { className: 'ths-hint' }, 'Ctrl/⌘ + Enter 查询 · 对话里可用 /ths <问题> 让 AI 总结 · 登录态保存在本地 Edge profile')
            ),
            error ? el('div', { className: 'ths-card ths-error' }, error) : null,
            result ? el('div', { className: 'ths-card' },
              el('div', { className: 'ths-sub' }, '结果'),
              result.tables && result.tables.length
                ? result.tables.map(function (t, i) { return renderTable(t, i); })
                : el('div', { className: 'ths-empty' }, '页面没有返回可解析的表格，下面显示正文文本。'),
              result.text ? el('pre', { className: 'ths-pre', style: { marginTop: '10px' } }, result.text) : null,
              el('div', { className: 'ths-meta' }, (result.title || '') + ' · ' + (result.url || '') + (result.elapsedMs ? ' · ' + result.elapsedMs + 'ms' : ''))
            ) : null
          );
        }

        function SidebarIcon() {
          return el('span', {
            title: LABEL,
            style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, fontWeight: 700, fontSize: 12, borderRadius: 5, background: 'var(--dsw-alias-bg-brand, #2563eb)', color: '#fff' },
          }, '同');
        }

        function apply(ctx) {
          try {
            ctx.slots.inject('sidebar.panellist', function () {
              return ctx.slots.register(
                { name: 'sidebar.panellist', id: PANEL_ID, order: 60, label: function () { return LABEL; } },
                function () { return el(SidebarIcon); }
              );
            });
          } catch (e) { console.warn('[dsh-ths-ai] sidebar slot failed', e); }
          try {
            ctx.slots.inject('main', function () {
              return ctx.slots.register({ name: 'main', key: PANEL_ID }, function () { return el(ThsPanel); });
            });
          } catch (e) { console.warn('[dsh-ths-ai] main slot failed', e); }
        }

        exports.name = PLUGIN_ID;
        exports.inject = ['slots'];
        exports.apply = apply;
        exports.__test = { ThsPanel: ThsPanel };
        return module.exports;
      },
    });
  } catch (err) {
    console.warn('[dsh-ths-ai] client load failed:', err);
  }
})();
