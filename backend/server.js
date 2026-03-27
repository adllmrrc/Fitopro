const http = require('http');
const crypto = require('crypto');

const PORT = process.env.PORT || 8787;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const sessions = new Map();
const users = new Map();
let lastPayload = { heartRate: 96, calories: 122, vo2: 41.2, zone: 'cardio' };
const syncStore = new Map();
const rateStore = new Map();

function log(event, extra = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...extra }));
}

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(new Error('invalid_json'));
      }
    });
  });
}

function issueToken(email) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { email, createdAt: Date.now() });
  return token;
}

function getSession(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  return token ? { token, session: sessions.get(token) } : { token: '', session: null };
}

function rateLimit(req, maxPerMin = 120) {
  const ip = req.socket.remoteAddress || 'unknown';
  const key = `${ip}:${req.url}`;
  const now = Date.now();
  const slot = rateStore.get(key) || { start: now, count: 0 };
  if (now - slot.start > 60_000) {
    slot.start = now;
    slot.count = 0;
  }
  slot.count += 1;
  rateStore.set(key, slot);
  return slot.count <= maxPerMin;
}

function createServer() {
  return http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return send(res, 204, {});
    if (!rateLimit(req)) return send(res, 429, { error: 'rate_limited' });

    if (req.url === '/health' && req.method === 'GET') {
      return send(res, 200, { ok: true, uptime: process.uptime() });
    }

    if (req.url === '/api/auth/register' && req.method === 'POST') {
      try {
        const body = await parseBody(req);
        if (!body.email || !body.password) return send(res, 400, { error: 'missing_credentials' });
        users.set(body.email, { password: body.password });
        const token = issueToken(body.email);
        log('auth_register', { email: body.email });
        return send(res, 200, { token, email: body.email });
      } catch {
        return send(res, 400, { error: 'invalid_json' });
      }
    }

    if (req.url === '/api/auth/login' && req.method === 'POST') {
      try {
        const body = await parseBody(req);
        const user = users.get(body.email);
        if (!user || user.password !== body.password) return send(res, 401, { error: 'invalid_credentials' });
        const token = issueToken(body.email);
        log('auth_login', { email: body.email });
        return send(res, 200, { token, email: body.email });
      } catch {
        return send(res, 400, { error: 'invalid_json' });
      }
    }

    if (req.url === '/api/watch/live' && req.method === 'GET') {
      const { session } = getSession(req);
      if (!session) return send(res, 401, { error: 'unauthorized' });
      return send(res, 200, lastPayload);
    }

    if (req.url === '/api/watch/live' && req.method === 'POST') {
      const { session } = getSession(req);
      if (!session) return send(res, 401, { error: 'unauthorized' });
      try {
        const body = await parseBody(req);
        lastPayload = {
          heartRate: Number(body.heartRate ?? body.bpm ?? 0),
          calories: Number(body.calories ?? 0),
          vo2: Number(body.vo2 ?? 0),
          zone: String(body.zone ?? 'unknown'),
        };
        return send(res, 204, {});
      } catch {
        return send(res, 400, { error: 'invalid_json' });
      }
    }

    if (req.url === '/api/sync/save' && req.method === 'POST') {
      const { session } = getSession(req);
      if (!session) return send(res, 401, { error: 'unauthorized' });
      try {
        const body = await parseBody(req);
        syncStore.set(session.email, body);
        return send(res, 200, { ok: true });
      } catch {
        return send(res, 400, { error: 'invalid_json' });
      }
    }

    if (req.url === '/api/sync/load' && req.method === 'GET') {
      const { session } = getSession(req);
      if (!session) return send(res, 401, { error: 'unauthorized' });
      return send(res, 200, syncStore.get(session.email) || {});
    }

    if (req.url === '/api/account/delete' && req.method === 'POST') {
      const { token, session } = getSession(req);
      if (!session) return send(res, 401, { error: 'unauthorized' });
      users.delete(session.email);
      syncStore.delete(session.email);
      sessions.delete(token);
      return send(res, 200, { ok: true });
    }

    return send(res, 404, { error: 'not_found' });
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, () => log('server_started', { port: PORT }));
}

module.exports = { createServer };
