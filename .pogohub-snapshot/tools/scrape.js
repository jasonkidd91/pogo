const { chromium } = require('playwright');
const fs = require('fs');
const slug = process.argv[2], out = process.argv[3];

const GRID = `(table) => {
  const trs = Array.from(table.querySelectorAll('tbody tr'));
  const out = []; const pending = {};
  for (const tr of trs) {
    const row = []; const tds = Array.from(tr.querySelectorAll('td,th'));
    let ti = 0, col = 0;
    while (col < 64) {
      if (pending[col] && pending[col].left > 0) { row[col] = pending[col].text; pending[col].left--; col++; continue; }
      if (ti >= tds.length) break;
      const td = tds[ti++]; const text = td.innerText.trim();
      const rs = parseInt(td.getAttribute('rowspan') || '1', 10) || 1;
      const cs = parseInt(td.getAttribute('colspan') || '1', 10) || 1;
      for (let c = 0; c < cs; c++) { row[col+c] = text; if (rs > 1) pending[col+c] = { text, left: rs-1 }; }
      col += cs;
    }
    for (let i = 0; i < row.length; i++) if (row[i] === undefined) row[i] = '';
    out.push(row);
  }
  return out;
}`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(`https://db.pokemongohub.net/best/${slug}`, { waitUntil: 'networkidle', timeout: 120000 });
  await p.waitForSelector('table tbody tr', { timeout: 30000 });

  const tables = [];
  const nTables = await p.$$eval('table', t => t.length);
  const paged = await p.$('[data-page-status]');

  if (nTables > 1 || !paged) {
    const data = await p.$$eval('table', (ts, src) => {
      const grid = eval(src);
      return ts.map(t => {
        let n = t, h = '';
        while (n && !h) { let s = n.previousElementSibling;
          while (s && !h) { const x = s.querySelector?.('h1,h2,h3,h4') || (/^H[1-4]$/.test(s.tagName) ? s : null);
            if (x) h = x.innerText.trim(); s = s.previousElementSibling; }
          n = n.parentElement; }
        return { section: h,
          header: Array.from(t.querySelectorAll('thead th')).map(e => e.innerText.replace(/^Sort\s*:?\s*/, '').trim()),
          rows: grid(t) };
      });
    }, GRID);
    tables.push(...data);
  } else {
    const header = await p.$$eval('table thead th', ts => ts.map(t => t.innerText.replace(/^Sort\s*:?\s*/, '').trim()));
    const seen = new Set(); const rows = []; let guard = 0;
    while (guard++ < 60) {
      await p.waitForSelector('table tbody tr', { timeout: 30000 });
      const batch = await p.$eval('table', (t, src) => eval(src)(t), GRID);
      for (const r of batch) { const k = r.join('\u0001'); if (!seen.has(k)) { seen.add(k); rows.push(r); } }
      const label = await p.$eval('[data-page-status]', e => e.innerText).catch(() => '');
      const m = label.match(/Page (\d+) of (\d+)/);
      process.stderr.write(`  ${slug}: ${label} -> ${rows.length}\n`);
      if (!m || m[1] === m[2]) break;
      const next = await p.$('nav[aria-label="Table pagination"] button:not([disabled]):last-of-type');
      if (!next) break;
      await next.click(); await p.waitForTimeout(600);
    }
    tables.push({ section: '', header, rows });
  }

  fs.writeFileSync(out, JSON.stringify({ slug, tables }, null, 1));
  console.log(`${slug}: ${tables.length} table(s), ${tables.reduce((a,t)=>a+t.rows.length,0)} rows`);
  await b.close();
})();
