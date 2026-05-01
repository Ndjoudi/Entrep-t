module.exports = async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const cookie = process.env.DELEEV_TOKEN;
    if (!cookie) return res.status(200).json({ error: 'DELEEV_TOKEN non configuré' });

    const tokenMatch = cookie.match(/api_token=([^;]+)/);
    const apiToken = tokenMatch ? tokenMatch[1].trim() : cookie.trim();

    const action = req.query.action || '';
    const pk = req.query.pk || '';
    const page = parseInt(req.query.page) || 1;

    // ── Option 3 : perPage dynamique ─────────────────────────────────
    // Le client peut demander perPage=500 ou perPage=1000
    // On teste 500 en priorité, fallback 250 si l'API refuse
    const perPage = parseInt(req.query.perPage) || 500;

    const BASE = 'https://admin.deleev.com';
    const headers = { 'Cookie': cookie, 'User-Agent': 'Mozilla/5.0' };

    if (action === 'list') {
      var resp = await fetch(BASE + '/systemeu/delivery_notes/', { headers, redirect: 'follow' });
      if (!resp.ok) return res.status(200).json({ error: 'HTTP ' + resp.status, rows: [] });
      var html = await resp.text();
      if (html.includes('FormSignin') || html.includes('action="/account/login"')) {
        return res.status(200).json({ error: 'Session expirée.', rows: [] });
      }
      var rows = [];
      var trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      var tr;
      while ((tr = trRe.exec(html)) !== null) {
        var tds = [];
        var tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        var td;
        while ((td = tdRe.exec(tr[1])) !== null) tds.push(td[1].replace(/<[^>]+>/g, '').trim());
        if (tds.length < 4) continue;
        var lm = tr[1].match(/delivery_note\/(\d+)/);
        rows.push({ pk: lm ? lm[1] : '', livraison: tds[0], expedition: tds[1], bl: tds[2], palettes: tds[3] });
      }
      return res.status(200).json({ rows: rows });

    } else if (action === 'bl' && pk) {
      var detailResp = await fetch(BASE + '/systemeu/delivery_note/' + pk + '/', { headers, redirect: 'follow' });
      if (!detailResp.ok) return res.status(200).json({ error: 'delivery_note HTTP ' + detailResp.status });
      var detailHtml = await detailResp.text();
      var rawMatch = detailHtml.match(/raw_u20\/(\d+)/);
      if (!rawMatch) return res.status(200).json({ error: 'Lien raw_u20 non trouvé' });
      var rawPk = rawMatch[1];
      var resp2 = await fetch(BASE + '/systemeu/raw_u20/' + rawPk + '/', { headers });
      if (!resp2.ok) return res.status(200).json({ error: 'raw_u20 HTTP ' + resp2.status });
      var text = await resp2.text();
      try { return res.status(200).json(JSON.parse(text)); }
      catch (e) { return res.status(200).json({ error: 'Réponse non-JSON' }); }

    } else if (action === 'debug') {
      var resp3 = await fetch('https://search.deleev.com/staff/', {
        method: 'POST',
        headers: {
          'Authorization': 'Token ' + apiToken,
          'Content-Type': 'application/json;charset=UTF-8',
          'User-Agent': 'Mozilla/5.0',
        },
        body: JSON.stringify({
          indexName: 'prod_products',
          q: '*',
          perPage: 2,
          page: 1,
          queryBy: 'selling_name,primeur_origin',
          filterBy: 'supplierreferences.supplier:=192',
          sortBy: 'updated_at_timestamp:desc'
        })
      });
      var data3 = await resp3.json();
      var hit = data3.hits && data3.hits[0] ? (data3.hits[0].document || data3.hits[0]) : null;
      if (!hit) return res.status(200).json({ error: 'No hits' });

      return res.status(200).json({
        id: hit.id,
        name: hit.selling_name,
        supplierreference_set: hit.supplierreference_set || 'NOT_FOUND',
        supplierreferences: hit.supplierreferences || 'NOT_FOUND',
      });

    } else if (action === 'products') {
      var supplierId = req.query.supplier || '192';

      // ── Option 3 : on tente avec perPage demandé (500 par défaut) ──
      var resp4 = await fetch('https://search.deleev.com/staff/', {
        method: 'POST',
        headers: {
          'Authorization': 'Token ' + apiToken,
          'Content-Type': 'application/json;charset=UTF-8',
          'User-Agent': 'Mozilla/5.0',
        },
        body: JSON.stringify({
          indexName: 'prod_products',
          q: '*',
          perPage: perPage,   // ← 500 par défaut au lieu de 250
          page: page,
          queryBy: 'selling_name,primeur_origin',
          filterBy: req.query.supplier
            ? 'supplierreferences.supplier:=' + supplierId
            : '',             // ← si pas de supplier : TOUS les produits
          sortBy: 'updated_at_timestamp:desc'
        })
      });

      // ── Fallback 250 si l'API refuse le perPage élevé ────────────
      if (!resp4.ok) {
        var errStatus = resp4.status;
        resp4 = await fetch('https://search.deleev.com/staff/', {
          method: 'POST',
          headers: {
            'Authorization': 'Token ' + apiToken,
            'Content-Type': 'application/json;charset=UTF-8',
            'User-Agent': 'Mozilla/5.0',
          },
          body: JSON.stringify({
            indexName: 'prod_products',
            q: '*',
            perPage: 250,
            page: page,
            queryBy: 'selling_name,primeur_origin',
            filterBy: req.query.supplier
              ? 'supplierreferences.supplier:=' + supplierId
              : '',
            sortBy: 'updated_at_timestamp:desc'
          })
        });
        if (!resp4.ok) {
          var errT = '';
          try { errT = await resp4.text(); } catch(e) {}
          return res.status(200).json({ error: 'API ' + errStatus, detail: errT.substring(0, 300) });
        }
      }

      var data = await resp4.json();
      var hits = data.hits || [];
      var products = [];
      var typoMap = { 1: 'Sec', 2: 'Surgelé', 3: 'Frais', 4: 'Fruits & Légumes' };

      for (var i = 0; i < hits.length; i++) {
        var d = hits[i].document || hits[i];
        var c9 = (d.by_centers && d.by_centers['9']) ? d.by_centers['9'] : null;

        var dlcStock = typeof d.days_before_expiry === 'number' ? d.days_before_expiry : null;
        var dlcSale = typeof d.retention_periods === 'number' ? d.retention_periods : null;
        var lifetimeDays = typeof d.lifetime_days === 'number' ? d.lifetime_days : null;

        var supplierRef = '';
        var supIdNum = parseInt(supplierId);
        if (d.supplierreference_set && Array.isArray(d.supplierreference_set)) {
          for (var j = 0; j < d.supplierreference_set.length; j++) {
            var sr = d.supplierreference_set[j];
            if (sr.supplier === supIdNum || sr.supplier_id === supIdNum || String(sr.supplier) === supplierId) {
              supplierRef = sr.supplier_reference || sr.ref || sr.reference || '';
              break;
            }
          }
        }
        if (!supplierRef && d.supplierreferences) {
          if (Array.isArray(d.supplierreferences)) {
            for (var k = 0; k < d.supplierreferences.length; k++) {
              var sr2 = d.supplierreferences[k];
              if (sr2.supplier === supIdNum || String(sr2.supplier) === supplierId) {
                supplierRef = sr2.supplier_reference || sr2.ref || sr2.reference || '';
                break;
              }
            }
          }
        }

        products.push({
          id: d.id || 0,
          name: d.selling_name || '',
          barcode: d.barcode || '',
          typology: typoMap[d.typology] || String(d.typology || ''),
          stock: c9 ? c9.stock_quantity : null,
          realStock: c9 ? c9.real_stock_quantity : null,
          qi: c9 ? c9.quantity_ideal : null,
          qd: c9 ? c9.quantity_threshold : null,
          dlc_stock: dlcStock,
          dlc_sale: dlcSale,
          lifetime_days: lifetimeDays,
          dlc_active: !!d.dlc_management_enabled,
          pack: d.pack || 1,
          bio: !!d.bio,
          supplier_ref: supplierRef,
          group_id: d.stock_quantity_group_id || null,
          zone: c9 ? c9.area : 0,
        });
      }

      return res.status(200).json({
        page: page,
        perPage: perPage,           // ← retourné pour que le client sache ce qui a été utilisé
        count: products.length,
        found: data.found || 0,     // ← total réel côté API, utilisé par le client pour calculer nb pages
        products: products
      });

    } else if (action === 'commandes') {
      var respC = await fetch(BASE + '/suppliers/auto?logistics_center_id=9&franco_is_meet=-1&order_auto_enabled=-1&last_order_from=&last_order_to=&submit=export', { headers, redirect: 'follow' });
      if (!respC.ok) return res.status(200).json({ error: 'HTTP ' + respC.status });
      var csvText = await respC.text();
      if (csvText.includes('FormSignin') || csvText.includes('action="/account/login"')) {
        return res.status(200).json({ error: 'Session expirée.' });
      }
      return res.status(200).json({ csv: csvText });

    } else if (action === 'fetch_kpis') {
      // ... (inchangé, copié tel quel)
      var dateMin = req.query.date_min || '';
      var dateMax = req.query.date_max || '';
      var gSheetUrl = 'https://script.google.com/macros/s/AKfycbzWrYdVI5cuyP5iLOMBTmx6d_XPKaGR0h9_8nJUnVl8yBjQ0mYAXO7FZ2hEcBR7sUGu/exec?action=load' + (dateMin ? '&date_min=' + dateMin : '') + (dateMax ? '&date_max=' + dateMax : '');
      try {
        var gResp = await fetch(gSheetUrl);
        var gData = await gResp.json();
        return res.status(200).json(gData);
      } catch (err) {
        return res.status(200).json({ error: 'Google Sheets error: ' + err.message });
      }

    } else if (action === 'fetch_casse') {
      var dateMin = req.query.date_min || '';
      var dateMax = req.query.date_max || '';
      if (!dateMin) {
        var today = new Date().toISOString().split('T')[0];
        dateMin = today;
        dateMax = today;
      }
      if (!dateMax) dateMax = dateMin;
      try {
        var casseUrl = BASE + '/log_viewer/destock_reasons_csv?view_mode=0' +
          '&period_beginning_date=' + dateMin + '&period_beginning_time=00%3A00' +
          '&period_end_date=' + dateMax + '&period_end_time=23%3A59' +
          '&selling_method=&lower_valuation=&greater_valuation=' +
          '&lower_stock_diff=&greater_stock_diff=' +
          '&form_product_id=&form_pseudozone_id=' +
          '&calculus_mode=typology&form_user_id=' +
          '&logistics_center_id=9&typology_id=0&current_zone=' +
          '&sorting_mode_logs=0&sorting_mode=0';
        var casseResp = await fetch(casseUrl, { headers: headers, redirect: 'follow' });
        if (!casseResp.ok) return res.status(200).json({ error: 'HTTP ' + casseResp.status });
        var csvText = await casseResp.text();
        if (csvText.includes('FormSignin') || csvText.includes('action="/account/login"')) {
          return res.status(200).json({ error: 'Session expirée' });
        }
        return res.status(200).json({ csv: csvText, date_min: dateMin, date_max: dateMax });
      } catch (err) {
        return res.status(200).json({ error: 'Casse error: ' + err.message });
      }

    } else if (action === 'probe_ruptures') {
      try {
        var rupUrl = BASE + '/stats/stock_monitor/suppliers_v2?logistics_center_ids=9';
        var rupResp = await fetch(rupUrl, { headers: headers, redirect: 'follow' });
        var rupHtml = await rupResp.text();
        if (rupHtml.includes('FormSignin')) return res.status(200).json({ error: 'Session expirée' });
        var tbodyMatch = rupHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
        var tbody = tbodyMatch ? tbodyMatch[1] : '';
        var trs = [];
        var trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        var m;
        var count = 0;
        while ((m = trRe.exec(tbody)) !== null && count < 3) {
          trs.push(m[0].substring(0, 1200));
          count++;
        }
        return res.status(200).json({
          tbodyLength: tbody.length,
          rowCount: (tbody.match(/<tr/gi) || []).length,
          firstRows: trs
        });
      } catch (err) {
        return res.status(200).json({ error: err.message });
      }

    } else if (action === 'fetch_ruptures') {
      try {
        var rupUrl = BASE + '/stats/stock_monitor/suppliers_v2?logistics_center_ids=9';
        var rupResp = await fetch(rupUrl, { headers: headers, redirect: 'follow' });
        if (!rupResp.ok) return res.status(200).json({ error: 'HTTP ' + rupResp.status });
        var rupHtml = await rupResp.text();
        if (rupHtml.includes('FormSignin') || rupHtml.includes('action="/account/login"')) {
          return res.status(200).json({ error: 'Session expirée' });
        }
        var tbodyMatch = rupHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
        if (!tbodyMatch) return res.status(200).json({ error: 'tbody not found', suppliers: {} });
        var tbody = tbodyMatch[1];
        var suppliers = {};
        var trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        var trMatch;
        while ((trMatch = trRe.exec(tbody)) !== null) {
          var row = trMatch[1];
          var idMatch = row.match(/supplier=(\d+)|#(\d+)/);
          if (!idMatch) continue;
          var supId = idMatch[1] || idMatch[2];
          var tds = [];
          var tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
          var tdM;
          while ((tdM = tdRe.exec(row)) !== null) {
            tds.push(tdM[1].replace(/<[^>]+>/g, '').trim());
          }
          if (tds.length >= 6) {
            var pctStr = tds[5].replace('%', '').replace(/\s/g, '').replace(',', '.');
            var nbStock = parseInt(tds[1].replace(/\s/g, '')) || 0;
            var nbQi = parseInt(tds[4].replace(/\s/g, '')) || 0;
            suppliers[supId] = { rupt: parseFloat(pctStr) || 0, stock: nbStock, qi: nbQi };
          }
        }
        return res.status(200).json({ suppliers: suppliers, count: Object.keys(suppliers).length });
      } catch (err) {
        return res.status(200).json({ error: 'Rupture scrape error: ' + err.message });
      }

    } else if (action === 'trim_kpis') {
      var keep = parseInt(req.query.keep) || 60;
      var gSheetUrl = 'https://script.google.com/macros/s/AKfycbzWrYdVI5cuyP5iLOMBTmx6d_XPKaGR0h9_8nJUnVl8yBjQ0mYAXO7FZ2hEcBR7sUGu/exec';
      try {
        var gResp = await fetch(gSheetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'trim', keep: keep })
        });
        var gData = await gResp.json();
        return res.status(200).json(gData);
      } catch (err) {
        return res.status(200).json({ error: 'Trim error: ' + err.message });
      }

    } else if (action === 'probe_kpis') {
      var dateMin = req.query.date_min || '2026-04-20';
      var dateMax = req.query.date_max || '2026-04-20';
      var cacheKey = 'probe' + Date.now();
      var candidates = ['checkout', 'order', 'revenue', 'financial', 'global', 'sale', 'ca', 'delivery', 'margin', 'cost', 'summary', 'kpi', 'stat', 'stats', 'all', 'total', 'turnover', 'income', 'billing', 'invoice'];
      var baseUrl = BASE + '/stats/dashboard_ajax_stats?cache_key=' + cacheKey +
                    '&combination=and&user_type=&user_origin=&shipment_type=&payment_type=' +
                    '&logistics_center_ids=9&agregation=day' +
                    '&date_min=' + dateMin + '&date_max=' + dateMax;
      var results = {};
      for (var i = 0; i < candidates.length; i++) {
        var dt = candidates[i];
        try {
          var r = await fetch(baseUrl + '&data_type=' + dt, { headers: headers, redirect: 'follow' });
          var txt = await r.text();
          results[dt] = { status: r.status, length: txt.length, hasCA_TTC: txt.includes('CA TTC'), snippet: txt.substring(0, 80) };
        } catch (err) {
          results[dt] = { error: err.message };
        }
      }
      try {
        var dashUrl = BASE + '/stats/dashboard?logistics_center_ids=9&agregation=day&date_min=' + dateMin + '&date_max=' + dateMax + '&combination=and&user_type=&user_origin=&shipment_type=&payment_type=';
        var dashResp = await fetch(dashUrl, { headers: headers, redirect: 'follow' });
        var dashHtml = await dashResp.text();
        var hasCA = dashHtml.includes('CA TTC');
        var caMatch = null;
        if (hasCA) { var caIdx = dashHtml.indexOf('CA TTC'); caMatch = dashHtml.substring(caIdx - 50, caIdx + 300); }
        results['_dashboard_page'] = { status: dashResp.status, length: dashHtml.length, hasCA_TTC: hasCA, around_ca_ttc: caMatch, hasLogin: dashHtml.includes('FormSignin') };
      } catch (err) {
        results['_dashboard_page'] = { error: err.message };
      }
      return res.status(200).json(results);

    } else if (action === 'probe_qiqd') {
      // ── Probe : teste plusieurs patterns d'API pour trouver le bon endpoint ──
      var supplierId = req.query.supplier || '191';
      var qs = '?center_id=9&offset=0&limit=5&order=product_name&supplier_id=' + supplierId + '&not_order=0&not_order_sold=0&disponibility=order';
      var candidates = [
        'https://products.app.deleev.com/api/products-qiqd/' + qs,
        'https://products.app.deleev.com/api/products/' + qs,
        'https://products.app.deleev.com/api/qiqd/' + qs,
        'https://admin.deleev.com/api/products-qiqd/' + qs,
        'https://admin.deleev.com/api/v1/products-qiqd/' + qs,
        'https://admin.deleev.com/products/qiqd/api/' + qs,
        'https://products.app.deleev.com/products-qiqd' + qs,  // original (déjà testé)
      ];
      var results = [];
      for (var ci = 0; ci < candidates.length; ci++) {
        var cUrl = candidates[ci];
        try {
          var cResp = await fetch(cUrl, { headers: headers, redirect: 'follow' });
          var cText = await cResp.text();
          var cIsJson = cText.trim().startsWith('{') || cText.trim().startsWith('[');
          var cParsed = null;
          if (cIsJson) { try { cParsed = JSON.parse(cText); } catch(e) {} }
          results.push({
            url: cUrl,
            status: cResp.status,
            isJson: cIsJson,
            length: cText.length,
            snippet: cText.substring(0, 200),
            keys: cParsed ? (Array.isArray(cParsed) ? ('array['+cParsed.length+']') : Object.keys(cParsed).join(',')) : null,
          });
        } catch (err) {
          results.push({ url: cUrl, error: err.message });
        }
      }
      return res.status(200).json({ results: results });

    } else if (action === 'qiqd') {
      // ── Fetch complet QI/QD + ruptures depuis api.labellevie.com ─────────────
      var supplierId = req.query.supplier || '191';
      var limit = parseInt(req.query.limit) || 500;
      var sampleOnly = req.query.sample === '1';
      var allProds = [];
      var offset = 0;
      var total = 0;
      var maxIter = 50;
      var BASE_QIQD = 'https://api.labellevie.com/1.0/api/labellevie/products-qiqd';

      while (maxIter-- > 0) {
        var qUrl = BASE_QIQD + '?center_id=9&offset=' + offset + '&limit=' + limit +
          '&order=product_name&supplier_id=' + supplierId +
          '&not_order=0&not_order_sold=0&disponibility=order';
        var qR = await fetch(qUrl, { headers: headers, redirect: 'follow' });
        if (!qR.ok) return res.status(200).json({ error: 'HTTP ' + qR.status });
        var qText = await qR.text();
        if (!qText.trim().startsWith('{') && !qText.trim().startsWith('[')) {
          return res.status(200).json({ error: 'Non-JSON — cookie invalide pour api.labellevie.com', snippet: qText.substring(0, 200) });
        }
        var qData = JSON.parse(qText);
        var rows = qData.rows || [];
        if (!rows.length) break;
        if (sampleOnly) {
          // Renvoie juste les 3 premières lignes brutes pour explorer les champs
          return res.status(200).json({ count: qData.count, sample: rows.slice(0, 3), keys: Object.keys(rows[0] || {}) });
        }
        total = qData.count || 0;
        allProds = allProds.concat(rows);
        offset += limit;
        if (total > 0 && offset >= total) break;
        if (rows.length < limit) break;
      }

      // Normalise selon les vrais champs (à ajuster après probe)
      var normalized = allProds.map(function(r) {
        return {
          id:    r.product_id || r.id || 0,
          stock: r.stock_quantity != null ? r.stock_quantity : (r.stock != null ? r.stock : null),
          qi:    r.quantity_ideal != null ? r.quantity_ideal : (r.qi != null ? r.qi : null),
          rupt:  r.rupture_days != null ? r.rupture_days : (r.rupture != null ? r.rupture : (r.rupt_days != null ? r.rupt_days : null)),
        };
      });

      return res.status(200).json({ count: normalized.length, total: total, products: normalized });

    } else {
      return res.status(200).json({ error: 'action=list, bl, products, qiqd, probe_qiqd, commandes, fetch_kpis, save_kpis, load_kpis, probe_kpis ou debug' });
    }
  } catch (globalErr) {
    return res.status(200).json({ error: 'Crash: ' + globalErr.message });
  }
};
