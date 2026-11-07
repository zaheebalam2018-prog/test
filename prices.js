const { gh, isAdmin } = require('./_lib');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const { data } = await gh('GET');
      res.setHeader('Cache-Control', isAdmin(req) ? 'no-store' : 'public, s-maxage=15, stale-while-revalidate=60');
      return res.json(data);
    }
    if (req.method !== 'POST') return res.status(405).end();
    res.setHeader('Cache-Control', 'no-store');
    if (!isAdmin(req)) return res.status(401).json({ error: 'Please sign in again' });
    if (!/application\/json/.test(req.headers['content-type'] || '')) return res.status(415).json({ error: 'Bad request' });

    const list = req.body && req.body.products;
    if (!Array.isArray(list) || list.length > 300) return res.status(400).json({ error: 'Invalid product list' });
    const cur = await gh('GET');
    const cats = new Set(cur.data.categories.map(c => c.id));
    const seen = new Set(), products = [];
    for (const p of list) {
      const id = Number(p.id), price = Number(p.price), category = Number(p.category);
      const title = String(p.title || '').replace(/\s+/g, ' ').trim().slice(0, 150);
      if (!Number.isInteger(id) || id < 1 || seen.has(id)) return res.status(400).json({ error: 'Invalid product id' });
      if (!title) return res.status(400).json({ error: 'Every product needs a name' });
      if (!Number.isInteger(price) || price < 0 || price > 10000000) return res.status(400).json({ error: `Invalid price for "${title}"` });
      if (!cats.has(category)) return res.status(400).json({ error: 'Invalid category' });
      seen.add(id);
      products.push({ id, title, category, price, active: p.active !== false });
    }
    const data = { updated: new Date().toISOString(), categories: cur.data.categories, products };
    await gh('PUT', data, cur.sha);
    res.json({ ok: true, data });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
};
