const { same, makeToken, isAdmin } = require('./_lib');
const cookie = v => `adm=${v}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${v ? 43200 : 0}`;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const a = req.query.a;
  if (req.method === 'GET') return isAdmin(req) ? res.json({ ok: true }) : res.status(401).json({ error: 'Not signed in' });
  if (req.method !== 'POST') return res.status(405).end();
  if (a === 'logout') { res.setHeader('Set-Cookie', cookie('')); return res.json({ ok: true }); }
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || !process.env.SESSION_SECRET) return res.status(503).json({ error: 'ADMIN_PASSWORD / SESSION_SECRET are not set in Vercel' });
  const given = (req.body && req.body.password) || '';
  if (!same(given, pw)) {
    await new Promise(r => setTimeout(r, 1000));
    return res.status(401).json({ error: 'Wrong password' });
  }
  res.setHeader('Set-Cookie', cookie(makeToken()));
  res.json({ ok: true });
};
