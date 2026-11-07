const crypto = require('crypto');
const secret = () => process.env.SESSION_SECRET || '';
const sign = v => crypto.createHmac('sha256', secret()).update(v).digest('hex');
const hash = v => crypto.createHash('sha256').update(String(v)).digest();

exports.same = (a, b) => crypto.timingSafeEqual(hash(a), hash(b));
exports.makeToken = () => { const e = String(Date.now() + 12 * 3600e3); return e + '.' + sign(e); };
exports.isAdmin = req => {
  const m = /(?:^|;\s*)adm=([^;]+)/.exec(req.headers.cookie || '');
  if (!m || !secret()) return false;
  const [e, s] = m[1].split('.');
  if (!e || !s || Number(e) < Date.now()) return false;
  const a = Buffer.from(s), b = Buffer.from(sign(e));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Read / write prices.json in the GitHub repo (Vercel redeploys on every commit)
exports.gh = async (method, data, sha) => {
  const { GITHUB_TOKEN: t, GITHUB_REPO: r, GITHUB_BRANCH: br = 'main' } = process.env;
  if (!t || !r) throw Object.assign(new Error('GitHub is not set up yet (see setup steps)'), { status: 503 });
  const url = `https://api.github.com/repos/${r}/contents/prices.json` + (method === 'GET' ? `?ref=${br}` : '');
  const res = await fetch(url, {
    method,
    headers: { Authorization: 'Bearer ' + t, Accept: 'application/vnd.github+json', 'User-Agent': 'biginfo-admin' },
    body: method === 'GET' ? undefined : JSON.stringify({
      message: 'Update prices from admin panel', branch: br, sha,
      content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64')
    })
  });
  const j = await res.json().catch(() => ({}));
  if (res.status === 409 || res.status === 422) throw Object.assign(new Error('Prices were changed elsewhere. Reload the page and try again.'), { status: 409 });
  if (!res.ok) throw Object.assign(new Error('GitHub error: ' + (j.message || res.status)), { status: 502 });
  return method === 'GET' ? { data: JSON.parse(Buffer.from(j.content, 'base64').toString('utf8')), sha: j.sha } : j;
};
