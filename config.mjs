// 运行期配置集中解析：配置目录 / 浏览器通道 / 等待时间 / 诊断日志。
//
// 设计约束（v0.1.0）：默认值与原实测可用版本完全一致，
// 所有环境变量都是「可选覆盖」，不设置时不改变任何行为。
//
//   DSH_THS_PROFILE_DIR   持久化浏览器配置目录，默认 <插件目录>/profile
//   DSH_THS_BROWSER       Playwright channel，默认 msedge（需本机装有 Edge；
//                         macOS/Linux 可设为 chrome 或 chromium）
//   DSH_THS_WAIT_MS       结果页渲染等待毫秒数，默认 12000
//   DSH_THS_STATUS_WAIT_MS 首页登录态等待毫秒数，默认 3500
//   DSH_THS_MIN_INTERVAL_MS 两次查询之间的最小间隔，默认 3000（避免高频访问）
//   DSH_THS_LOG_DIR       诊断日志目录，默认 ~/.dsh/logs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));

function envString(name, fallback) {
  const raw = process.env[name];
  const value = raw === undefined || raw === null ? '' : String(raw).trim();
  return value ? value : fallback;
}

function envInt(name, fallback) {
  const raw = envString(name, '');
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

export const PROFILE_DIR = path.resolve(envString('DSH_THS_PROFILE_DIR', path.join(HERE, 'profile')));
export const BROWSER_CHANNEL = envString('DSH_THS_BROWSER', 'msedge');
export const QUERY_WAIT_MS = envInt('DSH_THS_WAIT_MS', 12000);
export const STATUS_WAIT_MS = envInt('DSH_THS_STATUS_WAIT_MS', 3500);
export const MIN_QUERY_INTERVAL_MS = envInt('DSH_THS_MIN_INTERVAL_MS', 3000);

const LOG_DIR = path.resolve(envString('DSH_THS_LOG_DIR', path.join(os.homedir(), '.dsh', 'logs')));
const LOG_FILE = path.join(LOG_DIR, 'dsh-ths-ai.log');
const LOG_MAX_BYTES = 512 * 1024;

/**
 * 追加一行诊断日志。
 * 绝不因为日志失败影响主流程：安装到只读 node_modules 时也安全。
 */
export function logLine(message) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    try {
      if (fs.statSync(LOG_FILE).size > LOG_MAX_BYTES) fs.truncateSync(LOG_FILE, 0);
    } catch {}
    fs.appendFileSync(LOG_FILE, new Date().toISOString() + ' ' + message + '\n');
  } catch {}
}

export { LOG_FILE };
