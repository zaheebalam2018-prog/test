/* Keeps product names and prices on the site in sync with prices.json (managed from /admin) */
(function () {
  var $ = window.jQuery;
  function txt(el, t) { if (el && el.textContent !== t) el.textContent = t; }

  function apply(d) {
    var P = {}, C = {};
    d.products.forEach(function (p) { P[p.id] = p; });
    d.categories.forEach(function (c) { C[c.id] = c; });
    var live = d.products.filter(function (p) { return p.active !== false; });

    /* Product cards: add new ones (products page), then update every card */
    var prod = document.querySelector('#page-products');
    if (prod) {
      var have = {}, byCat = {}, any = null;
      prod.querySelectorAll('input[name=make]').forEach(function (i) {
        var card = i.closest('.service-block'); if (!card) return;
        have[i.value] = 1; any = any || card;
        if (P[i.value]) byCat[P[i.value].category] = byCat[P[i.value].category] || card;
      });
      live.forEach(function (p) {
        if (have[p.id]) return;
        var tpl = byCat[p.category] || any; if (!tpl) return;
        var c = tpl.cloneNode(true);
        c.querySelector('input[name=make]').value = p.id;
        tpl.parentNode.appendChild(c);
      });
    }
    ['#page-products', '#page-home'].forEach(function (sel) {
      var pg = document.querySelector(sel); if (!pg) return;
      pg.querySelectorAll('input[name=make]').forEach(function (i) {
        var card = i.closest('.service-block'); if (!card) return;
        var p = P[i.value];
        if (!p || p.active === false) { card.style.display = 'none'; return; }
        card.style.display = '';
        txt(card.querySelector('h4 a'), p.title);
        var f = card.querySelector('input[name=price]'); if (f) f.value = p.price;
        var h = card.querySelector('h5');
        if (h && h.firstChild && h.firstChild.nodeType === 3) h.firstChild.nodeValue = '\u20b9' + p.price + '.00 ';
      });
    });

    /* DSC price list table */
    var tb = document.querySelector('#page-dsc-price tbody');
    if (tb) {
      var rows = {}, any2 = null;
      tb.querySelectorAll('tr[data-make]').forEach(function (r) { rows[r.dataset.make] = r; any2 = any2 || r; });
      live.forEach(function (p) {
        if (rows[p.id] || !any2) return;
        var r = any2.cloneNode(true); r.setAttribute('data-make', p.id);
        tb.appendChild(r); rows[p.id] = r;
      });
      Object.keys(rows).forEach(function (id) {
        var r = rows[id], p = P[id];
        if (!p || p.active === false) { r.style.display = 'none'; return; }
        r.style.display = '';
        var c = C[p.category], td = r.querySelectorAll('td');
        txt(r.querySelector('th'), c.name); txt(td[0], 'Rs. ' + p.price); txt(td[1], p.title);
        var a = r.querySelector('a'); if (a) a.setAttribute('href', '#dsc-' + c.slug);
      });
    }

    /* Dropdowns on each category page */
    document.querySelectorAll('.spa-page').forEach(function (pg) {
      var sel = pg.querySelector('select#make'); if (!sel) return;
      var slug = pg.id.replace('page-dsc-', ''), cur = sel.value, seen = {};
      Array.prototype.slice.call(sel.options).forEach(function (o) {
        var p = P[o.value];
        if (!p || p.active === false || !C[p.category] || C[p.category].slug !== slug) { o.remove(); return; }
        o.textContent = p.title; seen[o.value] = 1;
      });
      live.forEach(function (p) {
        if (!seen[p.id] && C[p.category] && C[p.category].slug === slug) sel.add(new Option(p.title, p.id));
      });
      if (Array.prototype.some.call(sel.options, function (o) { return o.value === cur; })) sel.value = cur; else sel.selectedIndex = 0;
      if ($) { if ($.fn && $.fn.niceSelect) $(sel).niceSelect('update'); $(sel).trigger('change'); }
    });
  }

  fetch('/api/prices', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .catch(function () { return fetch('/prices.json', { cache: 'no-store' }).then(function (r) { return r.json(); }); })
    .then(apply)
    .catch(function () {});
})();
