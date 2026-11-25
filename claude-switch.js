#!/usr/bin/env node
// claude-switch: switch Claude Code between several Claude accounts.
// Unofficial community tool, not affiliated with Anthropic. Windows and Linux.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

const IS_WIN = process.platform === 'win32';
const HOME = os.homedir();
const CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(HOME, '.claude');
const CRED_FILE = path.join(CONFIG_DIR, '.credentials.json');
const STATE_FILE = process.env.CLAUDE_CONFIG_DIR ? path.join(CONFIG_DIR, '.claude.json') : path.join(HOME, '.claude.json');
const SETTINGS_FILE = path.join(CONFIG_DIR, 'settings.json');
const STORE = process.env.CLAUDE_SWITCH_HOME || path.join(HOME, '.claude-accounts');
const PROFILES = path.join(STORE, 'profiles');
const APP_STATE = path.join(STORE, 'state.json');
const LIMIT_WINDOW_MS = 5 * 60 * 60 * 1000; // a limited account is skipped for 5 hours
const SELF = __filename;

// ---------- files ----------
const readJson = (f, fallback) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { if (fallback !== undefined) return fallback; throw e; } };
function writeJson(f, o) {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const tmp = `${f}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(o, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, f);
}
const appState = () => readJson(APP_STATE, {});
const setAppState = (patch) => writeJson(APP_STATE, { ...appState(), ...patch });

class UserError extends Error {}
const fail = (msg) => { throw new UserError(msg); };
const validName = (n) => /^[A-Za-z0-9][A-Za-z0-9_.-]{0,31}$/.test(n || '');

// ---------- accounts ----------
const profilePath = (n) => path.join(PROFILES, `${n}.json`);
function accountNames() {
  if (!fs.existsSync(PROFILES)) return [];
  const names = fs.readdirSync(PROFILES).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
  const order = appState().order || [];
  return names.sort((a, b) => ((order.indexOf(a) + 1 || 1e9) - (order.indexOf(b) + 1 || 1e9)) || a.localeCompare(b));
}
const loadAccount = (n) => readJson(profilePath(n));
const saveAccount = (n, data) => writeJson(profilePath(n), data);

function liveLogin() {
  if (!fs.existsSync(CRED_FILE)) return null;
  const creds = readJson(CRED_FILE, null);
  if (!creds || !creds.claudeAiOauth) return null;
  return { credentials: creds, oauthAccount: readJson(STATE_FILE, {}).oauthAccount || null };
}
const uuidOf = (x) => x && x.oauthAccount && x.oauthAccount.accountUuid;

// The active account is tracked in our own state file: a running Claude session
// can rewrite ~/.claude.json, so its oauthAccount is only a fallback.
function activeName() {
  const names = accountNames();
  const s = appState().active;
  if (s && names.includes(s)) return s;
  const live = liveLogin();
  return live ? names.find((n) => uuidOf(loadAccount(n)) === uuidOf(live)) || null : null;
}

// Save the live tokens back into the active profile: Claude Code rotates refresh
// tokens, so the copy saved earlier may already be dead.
function syncActive() {
  const act = activeName();
  const live = liveLogin();
  if (!act || !live) return act;
  const acc = loadAccount(act);
  acc.credentials = live.credentials;
  if (live.oauthAccount && uuidOf(live) === uuidOf(acc)) acc.oauthAccount = live.oauthAccount;
  saveAccount(act, acc);
  return act;
}

function switchTo(name) {
  if (!accountNames().includes(name)) fail(`No saved account "${name}".`);
  const from = syncActive();
  if (from === name) return { name, changed: false };
  const acc = loadAccount(name);
  writeJson(CRED_FILE, acc.credentials);
  const st = readJson(STATE_FILE, {});
  st.oauthAccount = acc.oauthAccount;
  writeJson(STATE_FILE, st);
  setAppState({ active: name, switchedAt: Date.now() });
  return { name, changed: true, from };
}

async function addAccount(name, email, { interactive = true } = {}) {
  if (!validName(name)) fail('Name: letters, digits, dot, dash or underscore, up to 32 characters.');
  if (email && !/^[^\s@]+@[^\s@]+$/.test(email)) fail('That email address does not look right.');
  syncActive();
  const status = await new Promise((resolve) => {
    const p = spawn('claude', ['auth', 'login', ...(email ? ['--email', email] : [])], { stdio: interactive ? 'inherit' : 'ignore', shell: IS_WIN, windowsHide: true });
    p.on('exit', (code) => resolve(code));
    p.on('error', () => resolve(-1));
  });
  if (status !== 0) fail('Sign-in did not finish. Try again.');
  const live = liveLogin();
  if (!live || !uuidOf(live)) fail('Sign-in did not finish.');
  const dupe = accountNames().find((n) => n !== name && uuidOf(loadAccount(n)) === uuidOf(live));
  if (dupe) fail(`That account is already saved as "${dupe}".`);
  const prev = fs.existsSync(profilePath(name)) ? loadAccount(name) : {};
  saveAccount(name, { ...prev, credentials: live.credentials, oauthAccount: live.oauthAccount, limitedAt: null });
  setAppState({ active: name, switchedAt: Date.now(), order: [...new Set([...(appState().order || accountNames()), name])] });
  return live.oauthAccount.emailAddress;
}

function saveCurrentAs(name) {
  if (!validName(name)) fail('Name: letters, digits, dot, dash or underscore, up to 32 characters.');
  const live = liveLogin();
  if (!live || !uuidOf(live)) fail('Claude Code is not signed in. Run `claude` and /login first.');
  const prev = fs.existsSync(profilePath(name)) ? loadAccount(name) : {};
  saveAccount(name, { ...prev, credentials: live.credentials, oauthAccount: live.oauthAccount });
  setAppState({ active: name, order: [...new Set([...(appState().order || accountNames()), name])] });
  return live.oauthAccount.emailAddress;
}

function removeAccount(name) {
  if (!accountNames().includes(name)) fail(`No saved account "${name}".`);
  fs.unlinkSync(profilePath(name));
  const s = appState();
  setAppState({ order: (s.order || []).filter((n) => n !== name), active: s.active === name ? null : s.active });
}

function renameAccount(from, to) {
  if (!validName(to)) fail('Name: letters, digits, dot, dash or underscore, up to 32 characters.');
  if (accountNames().includes(to)) fail(`"${to}" already exists.`);
  fs.renameSync(profilePath(from), profilePath(to));
  const s = appState();
  setAppState({ order: (s.order || []).map((n) => (n === from ? to : n)), active: s.active === from ? to : s.active });
}

function moveAccount(name, delta) {
  const order = accountNames();
  const i = order.indexOf(name), j = i + delta;
  if (i < 0 || j < 0 || j >= order.length) return;
  [order[i], order[j]] = [order[j], order[i]];
  setAppState({ order });
}

const isLimited = (acc, now = Date.now()) => !!acc.limitedAt && now - acc.limitedAt < LIMIT_WINDOW_MS;
function nextAvailable(after) {
  const names = accountNames();
  const start = names.indexOf(after);
  for (let k = 1; k <= names.length; k++) {
    const n = names[(start + k) % names.length];
    if (n !== after && !isLimited(loadAccount(n))) return n;
  }
  return null;
}

function accountsView() {
  const act = activeName();
  return accountNames().map((n) => {
    const a = loadAccount(n);
    const o = a.oauthAccount || {};
    return {
      name: n,
      email: o.emailAddress || '',
      plan: planLabel(o),
      active: n === act,
      limitedUntil: isLimited(a) ? a.limitedAt + LIMIT_WINDOW_MS : null,
      browser: a.browser || null,
    };
  });
}
function planLabel(o) {
  const t = `${o.organizationType || ''} ${o.billingType || ''}`.toLowerCase();
  if (t.includes('max')) return 'Max';
  if (t.includes('pro')) return 'Pro';
  if (t.includes('team')) return 'Team';
  if (t.includes('enterprise')) return 'Enterprise';
  return '';
}

// ---------- auto-switch (Claude Code StopFailure hook) ----------
const HOOK_MARK = 'claude-switch.js" hook';
function hookCommand() { return `node "${SELF}" hook`; }
function autoSwitchEnabled() {
  const s = readJson(SETTINGS_FILE, {});
  return ((s.hooks && s.hooks.StopFailure) || []).some((g) => (g.hooks || []).some((h) => String(h.command).includes(HOOK_MARK)));
}
function setAutoSwitch(on) {
  const s = readJson(SETTINGS_FILE, {});
  s.hooks = s.hooks || {};
  const groups = (s.hooks.StopFailure || [])
    .map((g) => ({ ...g, hooks: (g.hooks || []).filter((h) => !String(h.command).includes(HOOK_MARK)) }))
    .filter((g) => g.hooks.length);
  if (on) groups.push({ matcher: 'rate_limit', hooks: [{ type: 'command', command: hookCommand(), timeout: 30 }] });
  if (groups.length) s.hooks.StopFailure = groups; else delete s.hooks.StopFailure;
  if (!Object.keys(s.hooks).length) delete s.hooks;
  writeJson(SETTINGS_FILE, s);
}

async function runHook() {
  let input = {};
  try { input = JSON.parse(await readStdin()); } catch {}
  if (input.error && input.error !== 'rate_limit') return;
  const act = activeName();
  if (!act) return;
  // Several sessions can hit the same limit at once; only the first one switches.
  if (Date.now() - (appState().autoSwitchedAt || 0) < 60 * 1000) {
    return say(`claude-switch: already switched to "${act}". Type "continue" to resume.`);
  }
  const acc = loadAccount(act);
  acc.limitedAt = Date.now();
  saveAccount(act, acc);
  const next = nextAvailable(act);
  if (!next) return say(`claude-switch: "${act}" hit its limit and every other account is limited too.`);
  switchTo(next);
  setAppState({ autoSwitchedAt: Date.now() });
  say(`claude-switch: "${act}" hit its limit. Switched to "${next}" (${loadAccount(next).oauthAccount.emailAddress}). Type "continue" to resume.`);
}
function say(msg) {
  process.stdout.write(JSON.stringify({ systemMessage: msg }) + '\n');
  process.stderr.write(msg + '\n');
}
function readStdin() {
  return new Promise((res) => {
    if (process.stdin.isTTY) return res('');
    let d = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (d += c));
    process.stdin.on('end', () => res(d));
    setTimeout(() => res(d), 3000);
  });
}

// ---------- browsers ----------
const BROWSERS = IS_WIN ? [
  { id: 'chrome', name: 'Chrome', exe: ['Google/Chrome/Application/chrome.exe'], data: 'Google/Chrome/User Data' },
  { id: 'edge', name: 'Edge', exe: ['Microsoft/Edge/Application/msedge.exe'], data: 'Microsoft/Edge/User Data' },
  { id: 'brave', name: 'Brave', exe: ['BraveSoftware/Brave-Browser/Application/brave.exe'], data: 'BraveSoftware/Brave-Browser/User Data' },
  { id: 'vivaldi', name: 'Vivaldi', exe: ['Vivaldi/Application/vivaldi.exe'], data: 'Vivaldi/User Data' },
  { id: 'chromium', name: 'Chromium', exe: ['Chromium/Application/chrome.exe'], data: 'Chromium/User Data' },
] : [
  { id: 'chrome', name: 'Chrome', bin: ['google-chrome', 'google-chrome-stable'], data: '.config/google-chrome' },
  { id: 'chromium', name: 'Chromium', bin: ['chromium', 'chromium-browser'], data: '.config/chromium' },
  { id: 'brave', name: 'Brave', bin: ['brave-browser', 'brave'], data: '.config/BraveSoftware/Brave-Browser' },
  { id: 'edge', name: 'Edge', bin: ['microsoft-edge', 'microsoft-edge-stable'], data: '.config/microsoft-edge' },
  { id: 'vivaldi', name: 'Vivaldi', bin: ['vivaldi', 'vivaldi-stable'], data: '.config/vivaldi' },
];
function findBrowserExe(b) {
  if (IS_WIN) {
    const roots = [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA].filter(Boolean);
    for (const r of roots) for (const e of b.exe) { const p = path.join(r, e); if (fs.existsSync(p)) return p; }
    return null;
  }
  for (const bin of b.bin) { const r = spawnSync('which', [bin], { encoding: 'utf8' }); if (r.status === 0) return r.stdout.trim(); }
  return null;
}
function detectBrowsers() {
  const out = [];
  for (const b of BROWSERS) {
    const exe = findBrowserExe(b);
    if (!exe) continue;
    const dataDir = IS_WIN ? path.join(process.env.LOCALAPPDATA || '', b.data) : path.join(HOME, b.data);
    const cache = (readJson(path.join(dataDir, 'Local State'), {}).profile || {}).info_cache || {};
    const profiles = Object.entries(cache).map(([dir, p]) => ({ dir, name: p.name || dir, user: p.user_name || '' }))
      .sort((x, y) => (x.dir === 'Default' ? -1 : y.dir === 'Default' ? 1 : x.dir.localeCompare(y.dir, undefined, { numeric: true })));
    out.push({ id: b.id, name: b.name, exe, profiles: profiles.length ? profiles : [{ dir: 'Default', name: 'Default', user: '' }] });
  }
  return out;
}
function nextFreeProfileDir(b) {
  const used = new Set(b.profiles.map((p) => p.dir));
  for (let i = 1; ; i++) if (!used.has(`Profile ${i}`)) return `Profile ${i}`;
}
function openBrowserProfile(browserId, dir, url) {
  const b = detectBrowsers().find((x) => x.id === browserId);
  if (!b) fail(`Browser "${browserId}" not found.`);
  spawn(b.exe, [`--profile-directory=${dir}`, ...(url ? [url] : [])], { detached: true, stdio: 'ignore' }).unref();
}
function openAccountBrowser(name) {
  const a = loadAccount(name);
  if (!a.browser) return false;
  openBrowserProfile(a.browser.id, a.browser.dir);
  return true;
}

// ---------- Claude Code sessions & projects ----------
function claudeRunning() {
  try {
    if (IS_WIN) {
      const r = spawnSync('tasklist', ['/FI', 'IMAGENAME eq claude.exe', '/FO', 'CSV', '/NH'], { encoding: 'utf8', windowsHide: true });
      return (r.stdout.match(/"claude\.exe"/gi) || []).length;
    }
    const r = spawnSync('pgrep', ['-x', 'claude'], { encoding: 'utf8' });
    return r.stdout.split('\n').filter(Boolean).length;
  } catch { return 0; }
}
function recentProjects(limit = 8) {
  const projects = Object.keys(readJson(STATE_FILE, {}).projects || {});
  const dir = path.join(CONFIG_DIR, 'projects');
  const mtime = (p) => {
    try { return fs.statSync(path.join(dir, p.replace(/[^A-Za-z0-9]/g, '-'))).mtimeMs; } catch { return 0; }
  };
  return projects.filter((p) => fs.existsSync(p)).map((p) => ({ path: p, at: mtime(p) }))
    .sort((a, b) => b.at - a.at).slice(0, limit).map((p) => p.path);
}
function continueIn(dir) {
  if (!dir || !fs.existsSync(dir)) fail('That folder no longer exists.');
  setAppState({ lastProject: dir });
  if (IS_WIN) {
    const wt = spawnSync('where', ['wt'], { windowsHide: true }).status === 0;
    if (wt) spawn('wt', ['-d', dir, 'cmd', '/k', 'claude --continue'], { detached: true, stdio: 'ignore' }).unref();
    else spawn('cmd', ['/c', 'start', '"claude"', '/d', dir, 'cmd', '/k', 'claude --continue'], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    return;
  }
  for (const [term, args] of [['x-terminal-emulator', ['-e']], ['gnome-terminal', ['--']], ['konsole', ['-e']], ['xterm', ['-e']]]) {
    if (spawnSync('which', [term]).status === 0) {
      spawn(term, [...args, 'claude', '--continue'], { cwd: dir, detached: true, stdio: 'ignore' }).unref();
      return;
    }
  }
  fail('No terminal emulator found. Run `claude --continue` in that folder yourself.');
}

// ---------- UI server ----------
function startUi({ open = true, port = 0 } = {}) {
  const token = crypto.randomBytes(16).toString('hex');
  const html = fs.readFileSync(path.join(__dirname, 'ui.html'), 'utf8');
  let lastPing = Date.now();
  const routes = {
    'GET /api/state': () => ({
      accounts: accountsView(), autoSwitch: autoSwitchEnabled(), claudeRunning: claudeRunning(),
      projects: recentProjects(), lastProject: appState().lastProject || null, browsers: detectBrowsers().map(({ exe, ...b }) => b),
      platform: process.platform,
    }),
    'POST /api/switch': (b) => { const r = switchTo(b.name); if (b.openBrowser) openAccountBrowser(b.name); return r; },
    'POST /api/continue': (b) => { if (b.name) switchTo(b.name); continueIn(b.dir); return {}; },
    'POST /api/add': async (b) => ({ email: await addAccount(b.name, b.email, { interactive: false }) }),
    'POST /api/remove': (b) => (removeAccount(b.name), {}),
    'POST /api/rename': (b) => (renameAccount(b.name, b.to), {}),
    'POST /api/move': (b) => (moveAccount(b.name, b.delta), {}),
    'POST /api/auto': (b) => (setAutoSwitch(!!b.on), {}),
    'POST /api/clear-limit': (b) => { const a = loadAccount(b.name); a.limitedAt = null; saveAccount(b.name, a); return {}; },
    'POST /api/browser': (b) => {
      const a = loadAccount(b.name);
      if (b.create) {
        const br = detectBrowsers().find((x) => x.id === b.id);
        if (!br) fail('Browser not found.');
        b.dir = nextFreeProfileDir(br);
        openBrowserProfile(b.id, b.dir, 'https://claude.ai/chrome');
      }
      a.browser = b.id ? { id: b.id, dir: b.dir } : null;
      saveAccount(b.name, a);
      return { dir: b.dir };
    },
    'POST /api/open-browser': (b) => (openAccountBrowser(b.name) || fail('No browser profile paired with this account.'), {}),
    'POST /api/ping': () => ({}),
  };
  const server = http.createServer(async (req, res) => {
    const send = (code, body, type = 'application/json') => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(body); };
    const url = new URL(req.url, 'http://x');
    if (req.method === 'GET' && url.pathname === '/') {
      if (url.searchParams.get('t') !== token) return send(403, 'Open claude-switch from its own launcher.', 'text/plain');
      return send(200, html.replace('__TOKEN__', token), 'text/html; charset=utf-8');
    }
    const font = req.method === 'GET' && url.pathname.match(/^\/assets\/fonts\/([a-z0-9-]+\.woff2)$/);
    if (font) {
      const f = path.join(__dirname, 'assets', 'fonts', font[1]);
      if (!fs.existsSync(f)) return send(404, '');
      res.writeHead(200, { 'Content-Type': 'font/woff2', 'Cache-Control': 'max-age=86400' });
      return res.end(fs.readFileSync(f));
    }
    if (req.headers['x-token'] !== token) return send(403, '{"error":"forbidden"}');
    const fn = routes[`${req.method} ${url.pathname}`];
    if (!fn) return send(404, '{"error":"not found"}');
    lastPing = Date.now();
    let body = '';
    for await (const c of req) body += c;
    try { send(200, JSON.stringify(await fn(body ? JSON.parse(body) : {}) || {})); }
    catch (e) { send(e instanceof UserError ? 400 : 500, JSON.stringify({ error: e.message })); }
    finally { lastPing = Date.now(); }
  });
  server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${server.address().port}/?t=${token}`;
    writeJson(path.join(STORE, 'ui.json'), { url, pid: process.pid });
    console.log(`claude-switch window: ${url}`);
    if (open) openAppWindow(url);
  });
  // Close when the window has been gone for a while (the page pings every few seconds).
  setInterval(() => { if (Date.now() - lastPing > 30000) process.exit(0); }, 5000).unref();
}
function openAppWindow(url) {
  const pref = ['edge', 'chrome', 'brave', 'chromium', 'vivaldi'];
  const bs = detectBrowsers().sort((a, b) => pref.indexOf(a.id) - pref.indexOf(b.id));
  if (bs.length) {
    spawn(bs[0].exe, [`--app=${url}`, '--window-size=1000,720'], { detached: true, stdio: 'ignore' }).unref();
  } else if (IS_WIN) {
    spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  } else {
    spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  }
}
// Reuse a window server that is already running.
async function ui() {
  const info = readJson(path.join(STORE, 'ui.json'), null);
  if (info) {
    const alive = await new Promise((res) => {
      const t = new URL(info.url).searchParams.get('t');
      const r = http.request(new URL('/api/ping', info.url), { method: 'POST', headers: { 'x-token': t }, timeout: 800 }, (x) => res(x.statusCode === 200));
      r.on('error', () => res(false)); r.on('timeout', () => { r.destroy(); res(false); }); r.end();
    });
    if (alive) return openAppWindow(info.url);
  }
  startUi();
}

// ---------- CLI ----------
const HELP = `claude-switch: switch Claude Code between your Claude accounts

  claude-switch                     switch to the next account
  claude-switch <name> [-c]         switch to <name>; -c reopens Claude with --continue here
  claude-switch add <name> [email]  sign in to an account and save it
  claude-switch save <name>         save the account Claude Code is signed in to now
  claude-switch list                show accounts (* active, ~ limited)
  claude-switch remove <name>       forget an account
  claude-switch rename <old> <new>
  claude-switch auto on|off         auto-switch when a usage limit is hit
  claude-switch ui                  open the app window
  claude-switch browser <name>      open the browser profile paired with <name>
`;
async function main(argv) {
  const cont = argv.includes('-c');
  const [cmd, a1, a2] = argv.filter((x) => x !== '-c');
  const names = accountNames();
  switch (cmd) {
    case 'help': case '-h': case '--help': return console.log(HELP);
    case 'hook': return runHook();
    case 'ui': return ui();
    case 'serve': return startUi({ open: false, port: Number(a1) || 0 });
    case 'add': { if (!a1) fail('usage: claude-switch add <name> [email]'); const e = await addAccount(a1, a2); return console.log(`Saved ${e} as "${a1}".`); }
    case 'save': { if (!a1) fail('usage: claude-switch save <name>'); const e = saveCurrentAs(a1); return console.log(`Saved ${e} as "${a1}".`); }
    case 'remove': removeAccount(a1); return console.log(`Removed "${a1}".`);
    case 'rename': renameAccount(a1, a2); return console.log(`Renamed "${a1}" to "${a2}".`);
    case 'auto': {
      if (a1 === 'on' || a1 === 'off') setAutoSwitch(a1 === 'on');
      return console.log(`Auto-switch on limit: ${autoSwitchEnabled() ? 'on' : 'off'}`);
    }
    case 'browser': if (!openAccountBrowser(a1)) fail(`No browser profile paired with "${a1}". Pair one in the app window.`); return;
    case 'list': {
      if (a1 === '--json') return console.log(JSON.stringify({ accounts: accountsView(), autoSwitch: autoSwitchEnabled() }));
      if (!names.length) return console.log('No accounts saved yet. Run: claude-switch add <name>');
      for (const a of accountsView()) {
        const flag = a.active ? '*' : a.limitedUntil ? '~' : ' ';
        const lim = a.limitedUntil ? `  resting, back by ${new Date(a.limitedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '';
        console.log(`${flag} ${a.name.padEnd(12)} ${a.email}${a.plan ? `  (${a.plan})` : ''}${lim}`);
      }
      return;
    }
  }
  // switch
  let target = cmd;
  if (!target) {
    if (names.length < 2) fail('Save at least two accounts first: claude-switch add <name>');
    const act = activeName();
    target = nextAvailable(act) || names[(names.indexOf(act) + 1) % names.length];
  }
  const r = switchTo(target);
  const acc = loadAccount(target);
  console.log(r.changed ? `Switched to "${target}" (${acc.oauthAccount.emailAddress}).` : `Already on "${target}".`);
  if (acc.browser && r.changed) openAccountBrowser(target);
  if (cont) {
    const p = spawnSync('claude', ['--continue'], { stdio: 'inherit', shell: IS_WIN });
    process.exitCode = p.status ?? 0;
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e instanceof UserError ? e.message : e.stack);
    process.exit(1);
  });
}
module.exports = { accountsView, switchTo, nextAvailable, activeName };
