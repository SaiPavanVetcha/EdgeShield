;(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════
     EdgeShield — Animation Engine
     Scrollable layout, small packets, rich transforms
     ═══════════════════════════════════════════════════════ */

  const SVG_NS = 'http://www.w3.org/2000/svg';

  const T = {
    COLLECT: 900,
    PKT: 0.013,
    PKT_FAST: 0.022,
    PKT_SLOW: 0.009,
    STAGE_GAP: 400,
    CLEAN_STEP: 700,
    NORM_STEP: 650,
    RECOMMEND: 2400,
    CYCLE_GAP: 1800,
  };

  const S = {
    running: false, paused: false, viewMode: 'simple',
    stage: 'idle', cycleCount: 0, dataIdx: 0,
    animFrameId: null, loopAborted: false, delayTimers: [],
  };

  const $ = (id) => document.getElementById(id);
  const dom = {};

  function cacheDom() {
    dom.main   = $('main');
    dom.svg    = $('svg-canvas');
    dom.pktLay = $('packet-layer');
    dom.tooltip = $('tooltip');
    dom.pcs    = [$('pc-1'), $('pc-2'), $('pc-3'), $('pc-4')];
    dom.temp   = $('temp-sensor');
    dom.hum    = $('humidity-sensor');
    dom.esp32  = $('esp32');
    dom.server = $('server');
    dom.srvDot = $('server-activity');
    dom.db     = $('edgeshield-db');
    dom.bronze = $('bronze');
    dom.silver = $('silver');
    dom.gold   = $('gold');
    dom.cleanZone  = $('clean-zone');
    dom.normZone   = $('norm-zone');
    dom.cleanBefore = $('tz-clean-before');
    dom.cleanAfter  = $('tz-clean-after');
    dom.normBefore  = $('tz-norm-before');
    dom.normAfter   = $('tz-norm-after');
    dom.cleanSteps  = $('tz-clean-steps');
    dom.normSteps   = $('tz-norm-steps');
    dom.analytics  = $('analytics');
    dom.dashboard  = $('dashboard-output');
    dom.chatbot    = $('chatbot-output');
    dom.alerts     = $('alerts-output');
    dom.recommend  = $('recommend-output');
    dom.btnStart   = $('btn-start');
    dom.btnPause   = $('btn-pause');
    dom.btnRestart = $('btn-restart');
    dom.btnSimple  = $('btn-simple');
    dom.btnTech    = $('btn-technical');
  }

  const D = {
    pcs: [
      { name:'PC-01', cpu:[35,48,42,45], ram:[42,55,50,58], storage:[48,48,49,49] },
      { name:'PC-02', cpu:[62,55,58,60], ram:[71,68,63,65], storage:[72,72,73,73] },
      { name:'PC-03', cpu:[67,78,87,93], ram:[63,70,78,85], storage:[55,55,56,56] },
      { name:'PC-04', cpu:[28,32,35,30], ram:[45,48,50,47], storage:[38,38,39,39] },
    ],
    env: { temperature:[26.8,27.4,29.1,33.5], humidity:[54,57,61,66] },
  };

  // ═══════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════

  function delay(ms) {
    return new Promise((resolve) => {
      if (S.loopAborted) return resolve();
      let elapsed = 0;
      const tick = 40;
      const id = setInterval(() => {
        if (S.loopAborted) { clearInterval(id); rmT(id); return resolve(); }
        if (!S.paused) elapsed += tick;
        if (elapsed >= ms) { clearInterval(id); rmT(id); resolve(); }
      }, tick);
      S.delayTimers.push(id);
    });
  }
  function rmT(id) { const i = S.delayTimers.indexOf(id); if (i !== -1) S.delayTimers.splice(i, 1); }
  function abortDelays() { S.delayTimers.forEach(clearInterval); S.delayTimers.length = 0; }

  /** Smooth-scroll to an element during the demo. */
  function scrollTo(el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /** Get element center relative to #main (accounts for scroll). */
  function pos(el, side) {
    const r = el.getBoundingClientRect();
    const m = dom.main.getBoundingClientRect();
    const cx = r.left + r.width / 2 - m.left;
    const cy = r.top + r.height / 2 - m.top;
    switch (side) {
      case 'r': return { x: r.right - m.left, y: cy };
      case 'l': return { x: r.left - m.left, y: cy };
      case 't': return { x: cx, y: r.top - m.top };
      case 'b': return { x: cx, y: r.bottom - m.top };
      default:  return { x: cx, y: cy };
    }
  }

  function bezH(a, b) {
    const dx = b.x - a.x;
    return `M${a.x},${a.y} C${a.x + dx * 0.5},${a.y} ${b.x - dx * 0.5},${b.y} ${b.x},${b.y}`;
  }
  function bezV(a, b) {
    const dy = b.y - a.y;
    return `M${a.x},${a.y} C${a.x},${a.y + dy * 0.45} ${b.x},${b.y - dy * 0.45} ${b.x},${b.y}`;
  }
  function bezMix(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    return `M${a.x},${a.y} C${a.x + dx * 0.4},${a.y + dy * 0.1} ${b.x - dx * 0.3},${b.y - dy * 0.1} ${b.x},${b.y}`;
  }
  function bezFan(a, b) {
    const dx = b.x - a.x;
    return `M${a.x},${a.y} C${a.x + dx * 0.5},${a.y} ${b.x - dx * 0.35},${b.y} ${b.x},${b.y}`;
  }

  // ═══════════════════════════════════════════════════════
  //  SVG CONNECTIONS
  // ═══════════════════════════════════════════════════════

  const pathEls = {};

  function mkPath(key, d, cls) {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', d);
    p.classList.add('conn');
    if (cls) p.classList.add(cls);
    dom.svg.appendChild(p);
    pathEls[key] = p;
  }

  function syncSvg() {
    const w = dom.main.scrollWidth;
    const h = dom.main.scrollHeight;
    dom.svg.setAttribute('width', w);
    dom.svg.setAttribute('height', h);
    dom.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }

  function buildPaths() {
    dom.svg.querySelectorAll('.conn').forEach((p) => p.remove());
    Object.keys(pathEls).forEach((k) => delete pathEls[k]);
    syncSvg();

    const srvL = pos(dom.server, 'l');
    const srvR = pos(dom.server, 'r');
    const srvB = pos(dom.server, 'b');

    // PCs → Server
    dom.pcs.forEach((pc, i) => {
      mkPath('pc' + (i + 1) + '-srv', bezMix(pos(pc, 'r'), srvL));
    });

    // Sensors → ESP32
    const espT = pos(dom.esp32, 't');
    mkPath('temp-esp', bezV(pos(dom.temp, 'b'), { x: espT.x - 16, y: espT.y }), 'env');
    mkPath('hum-esp',  bezV(pos(dom.hum, 'b'),  { x: espT.x + 16, y: espT.y }), 'env');

    // ESP32 → Server
    mkPath('esp-srv', bezMix(pos(dom.esp32, 'l'), srvR), 'env');

    // Server → DB
    mkPath('srv-db', bezV(srvB, pos(dom.db, 't')), 'db-c');

    // DB → Bronze
    mkPath('db-bronze', bezV(pos(dom.db, 'b'), pos(dom.bronze, 't')), 'bronze-c');

    // Bronze → Silver
    mkPath('bronze-silver', bezV(pos(dom.bronze, 'b'), pos(dom.silver, 't')), 'silver-c');

    // Silver → Gold
    mkPath('silver-gold', bezV(pos(dom.silver, 'b'), pos(dom.gold, 't')), 'gold-c');

    // Gold → Analytics
    mkPath('gold-anl', bezV(pos(dom.gold, 'b'), pos(dom.analytics, 't')), 'anl-c');

    // Analytics → Outputs
    const aB = pos(dom.analytics, 'b');
    mkPath('anl-dash',  bezFan(aB, pos(dom.dashboard, 't')), 'out-c');
    mkPath('anl-chat',  bezV(aB,   pos(dom.chatbot, 't')),   'out-c');
    mkPath('anl-alert', bezFan(aB, pos(dom.alerts, 't')),    'out-c');
    mkPath('anl-rec',   bezV(aB,   pos(dom.recommend, 't')), 'out-c');
  }

  // ═══════════════════════════════════════════════════════
  //  JSON FORMATTING (compact for packets, rich for zones)
  // ═══════════════════════════════════════════════════════

  /** Compact single-line JSON for small packets. */
  function pktJson(obj) {
    return Object.entries(obj).map(([k, v]) => {
      const vs = v === null ? '<span class="jnl">null</span>'
        : typeof v === 'string' ? '<span class="jv">"' + v + '"</span>'
        : '<span class="jn">' + v + '</span>';
      return '<span class="jk">' + k + '</span>:' + vs;
    }).join(' ');
  }

  /** Rich multi-line JSON for transform zone panels. */
  function richJson(obj, highlights) {
    const hl = highlights || {};
    const lines = ['{'];
    const keys = Object.keys(obj);
    keys.forEach((k, i) => {
      const v = obj[k];
      const comma = i < keys.length - 1 ? ',' : '';
      let vs;
      if (v === null) vs = '<span class="null-val">null</span>';
      else if (typeof v === 'string') vs = '<span class="jv">"' + v + '"</span>';
      else vs = '<span class="jn">' + v + '</span>';
      let line = '  <span class="jk">"' + k + '"</span>: ' + vs + comma;
      if (hl[k] === 'err')  line = '<span class="err">' + line + '</span>';
      if (hl[k] === 'fix')  line = '<span class="fix">' + line + '</span>';
      if (hl[k] === 'null') line = line; // null-val class already applied
      lines.push(line);
    });
    lines.push('}');
    return lines.join('\n');
  }

  // ═══════════════════════════════════════════════════════
  //  PACKET ANIMATION
  // ═══════════════════════════════════════════════════════

  const packets = [];

  function spawnPkt(pathKey, jsonObj, pktCls, speed) {
    return new Promise((resolve) => {
      const pe = pathEls[pathKey];
      if (!pe) { resolve(); return; }
      const len = pe.getTotalLength();
      const div = document.createElement('div');
      div.className = 'json-pkt' + (pktCls ? ' ' + pktCls : '');
      div.innerHTML = pktJson(jsonObj);
      dom.pktLay.appendChild(div);
      packets.push({ el: div, path: pe, len, progress: 0, speed: speed || T.PKT, onComplete: resolve });
    });
  }

  function clearPkts() {
    for (const p of packets) { p.el.remove(); if (p.onComplete) p.onComplete(); }
    packets.length = 0;
  }

  function animLoop() {
    if (!S.paused) {
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        p.progress += p.speed;
        if (p.progress >= 1) {
          p.el.remove(); packets.splice(i, 1);
          if (p.onComplete) p.onComplete();
          continue;
        }
        const pt = p.path.getPointAtLength(p.progress * p.len);
        p.el.style.left = pt.x + 'px';
        p.el.style.top  = pt.y + 'px';
      }
    }
    S.animFrameId = requestAnimationFrame(animLoop);
  }

  // ═══════════════════════════════════════════════════════
  //  STEP INDICATOR
  // ═══════════════════════════════════════════════════════

  const stages = ['collecting','transmitting','storing','cleaning','preparing','analyzing','predicting','recommending'];

  function setStage(name) {
    S.stage = name;
    document.querySelectorAll('#step-bar .step').forEach((el) => {
      const idx = stages.indexOf(el.dataset.step), cur = stages.indexOf(name);
      el.classList.toggle('active', idx === cur);
      el.classList.toggle('done', idx < cur);
    });
  }
  function clearStages() {
    document.querySelectorAll('#step-bar .step').forEach((el) => el.classList.remove('active', 'done'));
  }

  // ═══════════════════════════════════════════════════════
  //  VISUAL HELPERS
  // ═══════════════════════════════════════════════════════

  function lite(el, cls, dur) { el.classList.add(cls); setTimeout(() => el.classList.remove(cls), dur || 700); }
  function flowOn(keys) { keys.forEach((k) => { if (pathEls[k]) pathEls[k].classList.add('flowing'); }); }
  function flowOff(keys) { keys.forEach((k) => { if (pathEls[k]) pathEls[k].classList.remove('flowing'); }); }

  function resetAll() {
    document.querySelectorAll('.node').forEach((c) => c.classList.remove('lit', 'lit-env', 'anomaly'));
    dom.pcs.forEach((pc) => { pc.querySelector('.dot').className = 'dot on'; });
    dom.srvDot.classList.remove('active');
    dom.analytics.querySelectorAll('.anl-item').forEach((a) => a.classList.remove('on'));
    dom.analytics.querySelectorAll('.anl-dot').forEach((d) => d.classList.remove('lit', 'lit-warn'));
    dom.cleanZone.classList.remove('active');
    dom.normZone.classList.remove('active');
    dom.cleanSteps.querySelectorAll('.tz-step').forEach((s) => s.classList.remove('on', 'done'));
    dom.normSteps.querySelectorAll('.tz-step').forEach((s) => s.classList.remove('on', 'done'));
    dom.alerts.classList.remove('alert-on');
    dom.recommend.classList.remove('rec-on');
    dom.svg.querySelectorAll('.conn').forEach((p) => p.classList.remove('flowing'));
    updateDash(0, false); updateChat(false); updateAlert(false); updateRec(false);
    clearStages();
  }

  // ═══════════════════════════════════════════════════════
  //  OUTPUT UPDATES
  // ═══════════════════════════════════════════════════════

  function updateDash(pcIdx, anom) {
    const pc = D.pcs[pcIdx], di = S.dataIdx;
    const cpu = pc.cpu[di]||pc.cpu[0], ram = pc.ram[di]||pc.ram[0], temp = D.env.temperature[di]||D.env.temperature[0];
    const score = anom ? Math.max(25, 100-cpu) : Math.min(95, 100-Math.floor(cpu*0.3));
    $('dm-name').textContent = pc.name;
    const se = $('dm-score'); se.textContent = score;
    se.className = 'dm-score ' + (score>=70?'good':score>=45?'warn':'danger');
    $('dm-cpu').style.width=cpu+'%'; $('dm-cpu-v').textContent=cpu+'%';
    $('dm-ram').style.width=ram+'%'; $('dm-ram-v').textContent=ram+'%';
    $('dm-temp').style.width=Math.min(100,temp*2.5)+'%'; $('dm-temp-v').textContent=temp+'°C';
  }
  function updateChat(anom) {
    $('cm-response').textContent = anom
      ? 'PC-03 shows increased risk — CPU usage is unusually high and room temperature has also increased. Recommended: Check high-CPU applications and inspect cooling.'
      : 'All systems are operating within normal parameters. No immediate concerns detected.';
  }
  function updateAlert(anom) {
    $('alert-mini').innerHTML = anom
      ? '<span class="am-ico warn">⚠</span> <div><strong>PC-03 — High Risk</strong><br><small>CPU elevated • Temp rising</small></div>'
      : '<span class="am-ico ok">✓</span> All systems normal';
  }
  function updateRec(anom) {
    const el = $('rec-mini');
    el.innerHTML = anom
      ? '<div>• Check high CPU processes on PC-03</div><div>• Inspect room cooling conditions</div><div>• Monitor storage health trends</div>'
      : '<div>• Monitor system health regularly</div><div>• Schedule routine maintenance</div>';
    el.classList.toggle('active-rec', anom);
  }

  // ═══════════════════════════════════════════════════════
  //  TRANSFORMATION ANIMATIONS (rich before/after)
  // ═══════════════════════════════════════════════════════

  async function animateCleaning(isAnomaly) {
    const di = S.dataIdx;
    const cpu = D.pcs[2].cpu[di], ram = D.pcs[2].ram[di], stor = D.pcs[2].storage[di];

    // Populate BEFORE panel (raw data with issues)
    dom.cleanBefore.innerHTML = richJson({
      device_id: 'PC-03',
      cpu_percent: cpu,
      ram_percent: isAnomaly ? null : ram,
      cpu_percent_dup: cpu,
      storage_percent: stor,
    }, {
      ram_percent: isAnomaly ? 'null' : null,
      cpu_percent_dup: 'err',
    });

    // Populate AFTER panel (starts hidden/dimmed)
    dom.cleanAfter.innerHTML = richJson({
      device_id: 'PC-03',
      cpu_percent: cpu,
      ram_percent: ram || 78,
      storage_percent: stor,
    }, {
      ram_percent: isAnomaly ? 'fix' : null,
    });
    dom.cleanAfter.style.opacity = '0.15';

    // Show the zone
    scrollTo(dom.cleanZone);
    dom.cleanZone.classList.add('active');
    await delay(500);

    // Step through cleaning
    const steps = dom.cleanSteps.querySelectorAll('.tz-step');
    for (let i = 0; i < steps.length; i++) {
      if (S.loopAborted) break;
      steps[i].classList.add('on');
      await delay(T.CLEAN_STEP);
      if (S.loopAborted) break;
      steps[i].classList.remove('on');
      steps[i].classList.add('done');
    }

    // Reveal AFTER
    dom.cleanAfter.style.transition = 'opacity 0.6s';
    dom.cleanAfter.style.opacity = '1';
    await delay(800);
    if (S.loopAborted) return;

    // Hide zone
    dom.cleanZone.classList.remove('active');
    dom.cleanAfter.style.transition = '';
    steps.forEach((s) => s.classList.remove('done', 'on'));
  }

  async function animateNormalization(isAnomaly) {
    const di = S.dataIdx;
    const cpu = D.pcs[2].cpu[di], ram = D.pcs[2].ram[di] || 78, stor = D.pcs[2].storage[di];

    // BEFORE (clean data)
    dom.normBefore.innerHTML = richJson({
      device_id: 'PC-03',
      cpu_percent: cpu,
      ram_percent: ram,
      storage_percent: stor,
    });

    // AFTER (normalized)
    dom.normAfter.innerHTML = richJson({
      device_id: 'PC-03',
      cpu_norm: +(cpu / 100).toFixed(2),
      ram_norm: +(ram / 100).toFixed(2),
      risk_flag: isAnomaly ? 1 : 0,
    }, {
      cpu_norm: 'fix',
      ram_norm: 'fix',
      risk_flag: isAnomaly ? 'fix' : null,
    });
    dom.normAfter.style.opacity = '0.15';

    scrollTo(dom.normZone);
    dom.normZone.classList.add('active');
    await delay(500);

    const steps = dom.normSteps.querySelectorAll('.tz-step');
    for (let i = 0; i < steps.length; i++) {
      if (S.loopAborted) break;
      steps[i].classList.add('on');
      await delay(T.NORM_STEP);
      if (S.loopAborted) break;
      steps[i].classList.remove('on');
      steps[i].classList.add('done');
    }

    dom.normAfter.style.transition = 'opacity 0.6s';
    dom.normAfter.style.opacity = '1';
    await delay(800);
    if (S.loopAborted) return;

    dom.normZone.classList.remove('active');
    dom.normAfter.style.transition = '';
    steps.forEach((s) => s.classList.remove('done', 'on'));
  }

  // ═══════════════════════════════════════════════════════
  //  DEMO LOOP
  // ═══════════════════════════════════════════════════════

  async function runLoop() {
    S.loopAborted = false;

    while (S.running && !S.loopAborted) {
      const isAnomaly = (S.cycleCount % 3 === 2);
      S.dataIdx = isAnomaly ? Math.min(2 + (S.cycleCount % 2), 3) : S.cycleCount % 2;
      const di = S.dataIdx;

      // ── 1. COLLECTING ──
      setStage('collecting');
      scrollTo(dom.pcs[0]);
      dom.pcs.forEach((pc) => lite(pc, 'lit', 900));
      if (isAnomaly) { dom.pcs[2].classList.add('anomaly'); dom.pcs[2].querySelector('.dot').className = 'dot warn'; }
      lite(dom.temp, 'lit-env', 800); lite(dom.hum, 'lit-env', 800); lite(dom.esp32, 'lit-env', 800);
      await delay(T.COLLECT);
      if (S.loopAborted) break;

      // ── 2. TRANSMITTING ──
      setStage('transmitting');
      const lanKeys = ['pc1-srv','pc2-srv','pc3-srv','pc4-srv'];
      flowOn(lanKeys);

      const pcA = 0, pcB = isAnomaly ? 2 : 3;
      const p1 = spawnPkt('pc'+(pcA+1)+'-srv', { dev:D.pcs[pcA].name, cpu:D.pcs[pcA].cpu[di] }, '', T.PKT);
      await delay(200); if (S.loopAborted) break;
      const p2 = spawnPkt('pc'+(pcB+1)+'-srv', { dev:D.pcs[pcB].name, cpu:D.pcs[pcB].cpu[di] }, '', T.PKT);

      // Env packets
      flowOn(['temp-esp','hum-esp']);
      const e1 = spawnPkt('temp-esp', { temp:D.env.temperature[di] }, 'env-pkt', T.PKT_FAST);
      const e2 = spawnPkt('hum-esp',  { hum:D.env.humidity[di] }, 'env-pkt', T.PKT_FAST);
      await Promise.all([e1, e2]); flowOff(['temp-esp','hum-esp']);
      if (S.loopAborted) break;

      lite(dom.esp32, 'lit-env', 400);
      flowOn(['esp-srv']);
      const e3 = spawnPkt('esp-srv', { temp:D.env.temperature[di], hum:D.env.humidity[di] }, 'env-pkt', T.PKT);

      scrollTo(dom.server);
      await Promise.all([p1, p2, e3]); flowOff([...lanKeys, 'esp-srv']);
      if (S.loopAborted) break;

      dom.srvDot.classList.add('active'); lite(dom.server, 'lit', 700);
      await delay(T.STAGE_GAP); dom.srvDot.classList.remove('active');
      if (S.loopAborted) break;

      // ── 3. STORING ──
      setStage('storing');
      flowOn(['srv-db']);
      await spawnPkt('srv-db', { records:6, pcs:4 }, '', T.PKT);
      flowOff(['srv-db']);
      scrollTo(dom.db);
      lite(dom.db, 'lit', 700);
      await delay(T.STAGE_GAP);
      if (S.loopAborted) break;

      // ── 4. CLEANING ──
      setStage('cleaning');
      flowOn(['db-bronze']);
      await spawnPkt('db-bronze', { dev:'PC-03', cpu:D.pcs[2].cpu[di] }, 'bronze-pkt', T.PKT_SLOW);
      flowOff(['db-bronze']);
      scrollTo(dom.bronze);
      lite(dom.bronze, 'lit', 600);
      await delay(300);
      if (S.loopAborted) break;

      // Rich cleaning animation
      await animateCleaning(isAnomaly);
      if (S.loopAborted) break;

      // Bronze → Silver
      flowOn(['bronze-silver']);
      await spawnPkt('bronze-silver', { dev:'PC-03', cpu:D.pcs[2].cpu[di], ram:D.pcs[2].ram[di]||78 }, 'silver-pkt', T.PKT_SLOW);
      flowOff(['bronze-silver']);
      scrollTo(dom.silver);
      lite(dom.silver, 'lit', 600);
      if (S.loopAborted) break;

      // ── 5. PREPARING ──
      setStage('preparing');
      await delay(300);

      // Rich normalization animation
      await animateNormalization(isAnomaly);
      if (S.loopAborted) break;

      // Silver → Gold
      flowOn(['silver-gold']);
      await spawnPkt('silver-gold', { cpu_n:0.87, risk:isAnomaly?1:0 }, 'gold-pkt', T.PKT_SLOW);
      flowOff(['silver-gold']);
      scrollTo(dom.gold);
      lite(dom.gold, 'lit', 600);
      if (S.loopAborted) break;

      // ── 6. ANALYZING ──
      setStage('analyzing');
      flowOn(['gold-anl']);
      await spawnPkt('gold-anl', { score:isAnomaly?32:82, risk:isAnomaly?'high':'low' }, 'gold-pkt', T.PKT);
      flowOff(['gold-anl']);
      scrollTo(dom.analytics);
      lite(dom.analytics, 'lit', 900);

      const aItems = dom.analytics.querySelectorAll('.anl-item');
      const aDots  = dom.analytics.querySelectorAll('.anl-dot');
      for (let i = 0; i < aItems.length; i++) {
        await delay(400); if (S.loopAborted) break;
        aItems[i].classList.add('on');
        aDots[i].classList.add(isAnomaly ? 'lit-warn' : 'lit');
      }
      await delay(350);
      if (S.loopAborted) break;

      // ── 7. PREDICTING ──
      setStage('predicting');
      const outKeys = ['anl-dash','anl-chat','anl-alert','anl-rec'];
      flowOn(outKeys);
      await Promise.all([
        spawnPkt('anl-dash',  { score:isAnomaly?32:82 }, 'result-pkt', T.PKT),
        spawnPkt('anl-chat',  { query:'status' },        'result-pkt', T.PKT),
        spawnPkt('anl-alert', { level:isAnomaly?'warn':'ok' }, 'result-pkt', T.PKT),
        spawnPkt('anl-rec',   { action:'check' },        'result-pkt', T.PKT),
      ]);
      flowOff(outKeys);
      if (S.loopAborted) break;

      scrollTo(dom.dashboard);
      updateDash(isAnomaly?2:0, isAnomaly); updateChat(isAnomaly); updateAlert(isAnomaly); updateRec(isAnomaly);
      lite(dom.dashboard,'lit',500); lite(dom.chatbot,'lit',500);
      lite(dom.alerts,'lit',500); lite(dom.recommend,'lit',500);
      if (S.loopAborted) break;

      // ── 8. RECOMMENDING ──
      setStage('recommending');
      if (isAnomaly) { dom.alerts.classList.add('alert-on'); dom.recommend.classList.add('rec-on'); }
      await delay(T.RECOMMEND);
      if (S.loopAborted) break;

      await delay(T.CYCLE_GAP);
      if (S.loopAborted) break;
      resetAll();
      S.cycleCount++;
      // Scroll back to top for next cycle
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await delay(600);
    }
    if (!S.loopAborted) resetAll();
  }

  // ═══════════════════════════════════════════════════════
  //  CONTROLS
  // ═══════════════════════════════════════════════════════

  function startDemo() {
    if (S.running) return;
    S.running=true; S.paused=false; S.loopAborted=false; S.cycleCount=0;
    dom.btnStart.disabled=true; dom.btnPause.disabled=false; dom.btnRestart.disabled=false;
    dom.btnPause.textContent='⏸ Pause';
    runLoop();
  }
  function togglePause() {
    if (!S.running) return;
    S.paused = !S.paused;
    dom.btnPause.textContent = S.paused ? '▶ Resume' : '⏸ Pause';
  }
  function restartDemo() {
    S.loopAborted=true; S.running=false; S.paused=false;
    abortDelays(); clearPkts();
    setTimeout(() => { resetAll(); S.cycleCount=0; window.scrollTo({top:0,behavior:'smooth'}); startDemo(); }, 150);
  }
  function setView(mode) {
    S.viewMode = mode;
    dom.btnSimple.classList.toggle('active', mode==='simple');
    dom.btnTech.classList.toggle('active', mode==='technical');
  }

  // ═══════════════════════════════════════════════════════
  //  TOOLTIP
  // ═══════════════════════════════════════════════════════

  function ttHtml(comp) {
    const s = S.viewMode === 'simple', di = S.dataIdx;
    if (comp.startsWith('pc-')) {
      const n = parseInt(comp.split('-')[1]), pc = D.pcs[n-1];
      return `<h4>${pc.name}</h4><p><b>Operating System:</b> Windows</p>` +
        `<p><b>${s?'Monitoring Agent':'EdgeShield Agent'}:</b> Active</p>` +
        `<div class="tt-label">${s?'Information collected:':'Telemetry collected:'}</div>` +
        `<ul><li>${s?'Processor usage':'CPU utilization'}</li><li>${s?'Memory usage':'RAM metrics'}</li>` +
        `<li>${s?'Storage info':'Storage I/O'}</li><li>${s?'Running programs':'Process inventory'}</li>` +
        `<li>${s?'System events':'OS events'}</li></ul>` +
        `<div class="tt-json">{ "cpu": ${pc.cpu[di]}, "ram": ${pc.ram[di]}, "disk": ${pc.storage[di]} }</div>`;
    }
    const map = {
      'temp-sensor': `<h4>Temperature Sensor</h4><p>${s?'Measures room temperature around the computers.':'Ambient temperature probe connected to ESP32.'}</p><p><b>Reading:</b> ${D.env.temperature[di]} °C</p>`,
      'humidity-sensor': `<h4>DHT22 Humidity Sensor</h4><p>${s?'Measures moisture level in the air.':'DHT22 digital humidity sensor.'}</p><p><b>Reading:</b> ${D.env.humidity[di]} %</p>`,
      'esp32': `<h4>ESP32 Environmental Node</h4><p>${s?'Collects readings from temperature and humidity sensors.':'ESP32 MCU aggregating environmental telemetry.'}</p><div class="tt-label">Collects:</div><ul><li>Temperature</li><li>Humidity</li></ul><p><b>Sends to:</b> Server</p>`,
      'server': `<h4>Server</h4><p>${s?'Central point receiving all health information from PCs and sensors.':'Central telemetry collection endpoint receiving data via LAN.'}</p><div class="tt-label">${s?'Receives from:':'Data sources:'}</div><ul><li>4 Client PCs (LAN)</li><li>ESP32 node</li></ul>`,
      'edgeshield-db': `<h4>EdgeShield Database</h4><p>${s?'Stores all information received from the server before processing.':'Central data store for all incoming telemetry.'}</p>`,
      'bronze': `<h4>🥉 Bronze — Raw Data</h4><p>${s?'Data exactly as it arrives. No changes made yet.':'Raw ingested telemetry. No transformations applied.'}</p><p>${s?'May contain duplicates, missing values, or inconsistencies.':'Contains potential duplicates, nulls, schema issues.'}</p>`,
      'silver': `<h4>🥈 Silver — Clean Data</h4><p>${s?'Data has been cleaned and prepared for analysis.':'Deduplicated, null-handled, schema-validated records.'}</p>`,
      'gold': `<h4>🥇 Gold — Analysis-Ready</h4><p>${s?'Clean, organized data used by analytics and ML.':'Normalized, feature-engineered data for ML consumption.'}</p>`,
      'analytics': `<h4>Analytics &amp; Machine Learning</h4><p>${s?'Looks for unusual patterns and estimates health risk.':'ML pipeline: anomaly detection, time-series forecasting, health scoring.'}</p><div class="tt-label">Capabilities:</div><ul><li>${s?'Finds unusual behavior':'Anomaly detection'}</li><li>${s?'Studies changes over time':'Time-series analysis'}</li><li>${s?'Estimates risk scores':'Health/risk scoring'}</li></ul>`,
      'dashboard': `<h4>📊 Web Dashboard</h4><p>${s?'Visual display showing health of all systems in real time.':'Real-time monitoring dashboard with scores and trends.'}</p>`,
      'chatbot': `<h4>🤖 AI Assistant</h4><p>${s?'Converts analysis into plain-language explanations.':'LLM-powered explainable AI for natural-language insights.'}</p>`,
      'alerts': `<h4>🔔 Alerts</h4><p>${s?'Notifies when concerning conditions are detected.':'Event-driven alerting triggered by anomaly thresholds.'}</p>`,
      'recommend': `<h4>💡 Recommendations</h4><p>${s?'Suggests actions based on detected patterns.':'Actionable remediation from detected anomaly patterns.'}</p>`,
    };
    return map[comp] || '<h4>'+comp+'</h4>';
  }

  function showTT(evt) {
    const card = evt.target.closest('[data-component]');
    if (!card) return;
    dom.tooltip.innerHTML = ttHtml(card.dataset.component);
    dom.tooltip.classList.add('visible');
    const r = card.getBoundingClientRect();
    let x = r.right + 16, y = r.top;
    if (x + 300 > window.innerWidth) x = r.left - 316;
    if (y + 230 > window.innerHeight) y = window.innerHeight - 240;
    if (y < 10) y = 10;
    dom.tooltip.style.left = x + 'px';
    dom.tooltip.style.top = y + 'px';
  }
  function hideTT() { dom.tooltip.classList.remove('visible'); }

  function setupTT() {
    document.querySelectorAll('[data-component]').forEach((el) => {
      el.addEventListener('mouseenter', showTT);
      el.addEventListener('mouseleave', hideTT);
    });
  }

  // ═══════════════════════════════════════════════════════
  //  RESIZE
  // ═══════════════════════════════════════════════════════

  let resizeT;
  function onResize() { clearTimeout(resizeT); resizeT = setTimeout(() => { clearPkts(); buildPaths(); }, 300); }

  // ═══════════════════════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════════════════════

  function init() {
    cacheDom();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        buildPaths();
        setupTT();
        dom.btnStart.addEventListener('click', startDemo);
        dom.btnPause.addEventListener('click', togglePause);
        dom.btnRestart.addEventListener('click', restartDemo);
        dom.btnSimple.addEventListener('click', () => setView('simple'));
        dom.btnTech.addEventListener('click', () => setView('technical'));
        S.animFrameId = requestAnimationFrame(animLoop);
        window.addEventListener('resize', onResize);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
