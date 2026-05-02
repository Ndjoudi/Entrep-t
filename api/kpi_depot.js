var DEPOT_GSHEET = 'https://script.google.com/macros/s/AKfycbx5JdTIrciOCYvmS3sw9lzKIDmtvIhgoMCoTU5zQ1YahfDSdV1bG1Z_krXhbrDoPZrt/exec';

module.exports = async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const cookie = process.env.DELEEV_TOKEN;
    if (!cookie) return res.status(200).json({ error: 'DELEEV_TOKEN non configuré' });

    const action  = req.query.action || '';
    const BASE    = 'https://admin.deleev.com';
    const headers = { 'Cookie': cookie, 'User-Agent': 'Mozilla/5.0' };

    if (action === 'fetch_kpis') {
      const dateMin = req.query.date_min || '';
      const dateMax = req.query.date_max || '';
      if (!dateMin || !dateMax) return res.status(200).json({ error: 'date_min et date_max requis' });

      const cacheKey  = 'depot' + Date.now();
      const dataTypes = ['stockstat', 'packingstat', 'warehousezone', 'supplier'];
      const baseUrl   = BASE + '/stats/dashboard_ajax_stats?cache_key=' + cacheKey
        + '&combination=and&user_type=&user_origin=&shipment_type=&payment_type='
        + '&logistics_center_ids=9&agregation=day&date_min=' + dateMin + '&date_max=' + dateMax;

      const promises = dataTypes.map(async dt => {
        try {
          const r    = await fetch(baseUrl + '&data_type=' + dt, { headers, redirect: 'follow' });
          if (!r.ok) return { type: dt, error: 'HTTP ' + r.status, html: '' };
          const html = await r.text();
          if (html.includes('FormSignin')) return { type: dt, error: 'Session expirée', html: '' };
          return { type: dt, html, error: null };
        } catch(e) { return { type: dt, error: e.message, html: '' }; }
      });

      const dashPromise = (async () => {
        try {
          const url = BASE + '/stats/dashboard_new?combination=and&user_type=&user_origin=&shipment_type=&payment_type='
            + '&logistics_center_ids=9&agregation=day&date_min=' + dateMin + '&date_max=' + dateMax
            + '&submit_filters=Afficher+les+stats';
          const r        = await fetch(url, { headers, redirect: 'follow' });
          if (!r.ok) return { type: 'dashboard', error: 'HTTP ' + r.status, html: '' };
          const dashHtml = await r.text();
          if (dashHtml.includes('FormSignin')) return { type: 'dashboard', error: 'Session expirée', html: '' };
          const trMatch = dashHtml.match(/<tr[^>]*id="ca_ttc"[^>]*>([\s\S]*?)<\/tr>/i);
          let caVal = '0';
          if (trMatch) {
            const tdMatch = trMatch[1].match(/<td[^>]*class="[^"]*table-info[^"]*"[^>]*>([\s\S]*?)<\/td>/i);
            if (tdMatch) {
              const strong = tdMatch[1].match(/<strong>([^<]+)<\/strong>/);
              if (strong) caVal = strong[1].trim();
            }
          }
          return { type: 'dashboard', html: '<tr id="ca_ttc"><td class="ca_ttc table-info"><strong>' + caVal + '</strong></td></tr>', error: null };
        } catch(e) { return { type: 'dashboard', error: e.message, html: '' }; }
      })();

      const results  = await Promise.all([...promises, dashPromise]);
      const response = { date_min: dateMin, date_max: dateMax, data: {} };
      results.forEach(r => { response.data[r.type] = { html: r.html, error: r.error }; });
      return res.status(200).json(response);

    } else if (action === 'save_kpis') {
      const r = await fetch(DEPOT_GSHEET, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(req.body)
      });
      return res.status(200).json(await r.json());

    } else if (action === 'load_kpis') {
      const r = await fetch(DEPOT_GSHEET);
      return res.status(200).json(await r.json());

    } else if (action === 'trim_kpis') {
      const keep = parseInt(req.query.keep) || 90;
      const r    = await fetch(DEPOT_GSHEET, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'trim', keep })
      });
      return res.status(200).json(await r.json());

    } else {
      return res.status(200).json({ error: 'actions: fetch_kpis, save_kpis, load_kpis, trim_kpis' });
    }
  } catch(err) {
    return res.status(200).json({ error: 'Crash: ' + err.message });
  }
};
