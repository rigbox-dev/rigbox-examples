(() => {
  const $ = (id) => document.getElementById(id);
  const seen = new Set();
  let sparkData = new Array(60).fill(0);
  let lastTotal = null;
  let bootstrapped = false;
  let configured = false;

  const fmtInt = (n) => n.toLocaleString('en-US');
  const fmtRps = (n) => (n < 10 ? n.toFixed(1) : Math.round(n).toString());
  const fmtLat = (v) => (v < 1 ? v.toFixed(1) : Math.round(v)) + 'ms';

  function ago(ts) {
    const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 2) return 'just now';
    if (s < 60) return s + 's ago';
    const m = Math.floor(s / 60);
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ' + (m % 60) + 'm ago';
    return Math.floor(h / 24) + 'd ago';
  }

  function uptime(ms) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n) => String(n).padStart(2, '0');
    if (h > 0) return h + 'h ' + pad(m) + 'm ' + pad(sec) + 's';
    if (m > 0) return m + 'm ' + pad(sec) + 's';
    return s + 's';
  }

  function statusClass(c) {
    if (c >= 500) return 's5';
    if (c >= 400) return 's4';
    if (c >= 300) return 's3';
    return 's2';
  }

  function tweenTotal(target) {
    if (lastTotal === null) {
      $('total').textContent = fmtInt(target);
      lastTotal = target;
      return;
    }
    if (lastTotal === target) return;
    const from = lastTotal;
    const to = target;
    const start = performance.now();
    const dur = 550;
    const el = $('total');
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(from + (to - from) * eased);
      el.textContent = fmtInt(v);
      if (t < 1) requestAnimationFrame(step);
      else lastTotal = to;
    };
    requestAnimationFrame(step);
  }

  function drawSpark() {
    const w = 240, h = 38, padY = 3;
    const max = Math.max(1, ...sparkData);
    const stepX = w / (sparkData.length - 1);
    let d = '';
    let lastX = 0, lastY = h - padY;
    for (let i = 0; i < sparkData.length; i++) {
      const x = i * stepX;
      const y = padY + (h - padY * 2) * (1 - sparkData[i] / max);
      d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
      lastX = x; lastY = y;
    }
    $('sparkPath').setAttribute('d', d);
    $('sparkEnd').setAttribute('cx', lastX.toFixed(1));
    $('sparkEnd').setAttribute('cy', lastY.toFixed(1));
  }

  function makeRow(r, isNew) {
    const tr = document.createElement('tr');
    if (isNew) tr.className = 'is-new';
    tr.addEventListener('click', () => openModal(r));
    const code = document.createElement('td');
    const codeSpan = document.createElement('span');
    codeSpan.className = 'status ' + statusClass(r.status);
    codeSpan.textContent = r.status;
    code.appendChild(codeSpan);
    const method = document.createElement('td');
    method.className = 'method';
    method.textContent = r.method;
    const path = document.createElement('td');
    path.className = 'path';
    path.textContent = r.path;
    const ip = document.createElement('td');
    ip.className = 'ip';
    ip.textContent = r.ip || '—';
    const lat = document.createElement('td');
    lat.className = 'lat num-r-pad';
    lat.textContent = fmtLat(r.latency);
    const when = document.createElement('td');
    when.className = 'ago num-r';
    when.dataset.ts = r.ts;
    when.textContent = ago(r.ts);
    tr.append(code, method, path, ip, lat, when);
    return tr;
  }

  function renderRows(recent) {
    const tbody = $('rows');
    if (!recent.length) {
      if (!tbody.querySelector('.empty')) {
        const tr = document.createElement('tr');
        tr.className = 'empty';
        const td = document.createElement('td');
        td.colSpan = 6;
        td.innerHTML = 'awaiting traffic — try hitting <span class="hint-path">/anything</span>';
        tr.appendChild(td);
        tbody.replaceChildren(tr);
      }
      return;
    }
    const frag = document.createDocumentFragment();
    for (const r of recent) {
      const isNew = bootstrapped && !seen.has(r.id);
      seen.add(r.id);
      frag.appendChild(makeRow(r, isNew));
    }
    tbody.replaceChildren(frag);
    $('recentCount').textContent = recent.length;
  }

  function prependRow(r) {
    const tbody = $('rows');
    const empty = tbody.querySelector('.empty');
    if (empty) tbody.removeChild(empty);
    tbody.insertBefore(makeRow(r, true), tbody.firstChild);
    while (tbody.children.length > 40) tbody.removeChild(tbody.lastChild);
    $('recentCount').textContent = tbody.children.length;
    seen.add(r.id);
  }

  function applyConfig(cfg) {
    if (configured) return;
    document.title = cfg.appName + ' · live';
    $('appName').textContent = cfg.appName;
    $('pid').textContent = cfg.pid;
    $('port').textContent = cfg.port;
    configured = true;
  }

  function tickAgo() {
    document.querySelectorAll('[data-ts]').forEach((el) => {
      el.textContent = ago(+el.dataset.ts);
    });
  }

  function applyLatency(s) {
    $('lat50').textContent = fmtLat(s.p50);
    $('lat95').textContent = fmtLat(s.p95);
    $('lat99').textContent = fmtLat(s.p99);
  }

  function renderMix(mix) {
    const bar = $('mixBar');
    const legend = $('mixLegend');
    bar.replaceChildren();
    legend.replaceChildren();
    const total = mix.total || 0;
    const order = [['s2', '2xx'], ['s3', '3xx'], ['s4', '4xx'], ['s5', '5xx']];
    let any = false;
    for (const [k, label] of order) {
      const count = mix[k] || 0;
      if (count === 0) continue;
      any = true;
      const pct = (count / total) * 100;
      const seg = document.createElement('div');
      seg.className = 'seg ' + k;
      seg.style.width = pct + '%';
      seg.title = label + ' · ' + count + ' (' + pct.toFixed(0) + '%)';
      bar.appendChild(seg);
      const leg = document.createElement('span');
      leg.className = 'leg';
      const sw = document.createElement('span');
      sw.className = 'swatch';
      sw.style.background = 'var(--' + k + ')';
      leg.appendChild(sw);
      leg.appendChild(document.createTextNode(label + ' ' + count + ' · ' + pct.toFixed(0) + '%'));
      legend.appendChild(leg);
    }
    if (!any) {
      const empty = document.createElement('span');
      empty.className = 'empty';
      empty.textContent = 'no traffic yet';
      legend.appendChild(empty);
    }
  }

  function renderTopPaths(list) {
    const el = $('lbList');
    el.replaceChildren();
    if (!list || !list.length) {
      const empty = document.createElement('div');
      empty.className = 'lb-empty';
      empty.textContent = 'no traffic in the last 5 minutes';
      el.appendChild(empty);
      return;
    }
    const max = list[0].count;
    for (const item of list) {
      const row = document.createElement('div');
      row.className = 'lb-row';
      const path = document.createElement('div');
      path.className = 'lb-path';
      path.textContent = item.path;
      const bar = document.createElement('div');
      bar.className = 'lb-bar';
      const fill = document.createElement('div');
      fill.className = 'lb-bar-fill';
      fill.style.width = ((item.count / max) * 100) + '%';
      bar.appendChild(fill);
      const count = document.createElement('div');
      count.className = 'lb-count';
      count.textContent = item.count;
      row.append(path, bar, count);
      el.appendChild(row);
    }
  }

  function applyDerived(d) {
    if (d.latencyStats) applyLatency(d.latencyStats);
    if (d.statusMix) renderMix(d.statusMix);
    if (d.topPaths) renderTopPaths(d.topPaths);
  }

  function applySnapshot(d) {
    applyConfig({ appName: d.appName, pid: d.pid, port: d.port });
    if (lastTotal === null) {
      $('total').textContent = fmtInt(d.totalRequests);
      lastTotal = d.totalRequests;
    } else {
      tweenTotal(d.totalRequests);
    }
    $('rps').textContent = fmtRps(d.rps);
    $('uptime').textContent = uptime(d.uptimeMs);
    $('started').textContent = d.startedAt;
    $('since').textContent = d.startedShort;
    $('nodev').textContent = d.nodeVersion || '—';
    sparkData = d.spark;
    drawSpark();
    applyDerived(d);
    renderRows(d.recent);
    bootstrapped = true;
  }

  function connectStream() {
    const es = new EventSource('/api/stream');
    es.addEventListener('snapshot', (e) => applySnapshot(JSON.parse(e.data)));
    es.addEventListener('request', (e) => {
      const { entry, totalRequests } = JSON.parse(e.data);
      tweenTotal(totalRequests);
      prependRow(entry);
    });
    es.addEventListener('tick', (e) => {
      const d = JSON.parse(e.data);
      $('rps').textContent = fmtRps(d.rps);
      $('uptime').textContent = uptime(d.uptimeMs);
      sparkData = d.spark;
      drawSpark();
      applyDerived(d);
    });
    es.onopen = () => {
      $('connState').textContent = 'streaming';
      $('connState').style.color = '';
    };
    es.onerror = () => {
      $('connState').textContent = 'reconnecting…';
      $('connState').style.color = 'var(--s4)';
    };
  }

  function addKv(parent, k, v) {
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = String(v);
    parent.append(dt, dd);
  }

  function openModal(r) {
    $('mStatus').className = 'status ' + statusClass(r.status);
    $('mStatus').textContent = r.status;
    $('mMethod').textContent = r.method;

    let pathname = r.path;
    let query = {};
    try {
      const u = new URL(r.path, location.origin);
      pathname = u.pathname;
      for (const [k, v] of u.searchParams.entries()) query[k] = v;
    } catch (_) {}
    $('mPath').textContent = pathname;

    const meta = $('mMeta');
    meta.replaceChildren();
    addKv(meta, 'method', r.method);
    addKv(meta, 'path', pathname);
    addKv(meta, 'status', r.status);
    addKv(meta, 'latency', fmtLat(r.latency));
    addKv(meta, 'ip', r.ip || '—');
    addKv(meta, 'http', 'HTTP/' + (r.httpVersion || '1.1'));
    addKv(meta, 'when', new Date(r.ts).toISOString());

    const q = $('mQuery');
    q.replaceChildren();
    const qk = Object.keys(query);
    if (qk.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'kv-empty';
      empty.textContent = '—';
      q.appendChild(empty);
    } else {
      for (const k of qk) addKv(q, k, query[k]);
    }

    const h = $('mHeaders');
    h.replaceChildren();
    if (r.headers && Object.keys(r.headers).length) {
      for (const k of Object.keys(r.headers).sort()) addKv(h, k, r.headers[k]);
    } else {
      const empty = document.createElement('div');
      empty.className = 'kv-empty';
      empty.textContent = 'no headers captured';
      h.appendChild(empty);
    }

    const modal = $('modal');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const modal = $('modal');
    if (!modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function wireModal() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
    document.addEventListener('click', (e) => {
      if (e.target.closest && e.target.closest('[data-close]')) closeModal();
    });
  }

  function wirePlayground() {
    document.querySelectorAll('a[data-fire]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const url = a.getAttribute('href');
        const burst = Math.max(1, parseInt(a.dataset.burst, 10) || 1);
        a.classList.add('firing');
        setTimeout(() => a.classList.remove('firing'), 180);
        for (let i = 0; i < burst; i++) {
          setTimeout(() => {
            fetch(url, { cache: 'no-store', redirect: 'manual' }).catch(() => {});
          }, i * 60);
        }
      });
    });
  }

  connectStream();
  setInterval(tickAgo, 1000);
  wirePlayground();
  wireModal();
})();
