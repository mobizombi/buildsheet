// Cosplay cost calculator v2. Runs locally, sends nothing.
// BS_PARTS = [[id, label, [[low, high, workHrs, waitHrs], ...]], ...] injected by build.mjs.
// Presets are scaled by experience (work hours) and budget style (cost); any number
// the user types into a line overrides the preset for that line.
(() => {
  const SHOP = window.BS_SHOP || { items: {}, map: {} };
  const parts = new Map(window.BS_PARTS.map(([id, label, opts]) => [id, { label, opts }]));
  const TOOLS = [40, 120];
  const $ = (id) => document.getElementById(id);
  const form = $('calc');
  const r5 = (n) => Math.round(n / 5) * 5;
  const money = (n) => '$' + r5(n);

  const def = new Date();
  def.setDate(def.getDate() + 56);
  $('con').value = def.toISOString().slice(0, 10);

  // preset values for a line at the current settings
  function preset(id) {
    const sel = form.querySelector(`[data-opt="${id}"]`);
    const [lo, hi, work, wait] = parts.get(id).opts[sel ? +sel.value : 0];
    const tier = parseFloat($('tier').value);
    const span = hi - lo;
    return {
      low: lo + span * tier * 0.5,
      high: lo + span * (0.5 + tier * 0.5),
      work: Math.round(work * parseFloat($('xp').value)),
      wait,
    };
  }

  // refresh the editable fields that the user has not overridden
  function fill(row) {
    const id = row.dataset.row;
    const p = preset(id);
    const vals = { work: p.work, wait: p.wait, cost: r5((p.low + p.high) / 2) };
    let edited = false;
    row.querySelectorAll('[data-f]').forEach((inp) => {
      if (inp.dataset.edited) { edited = true; return; }
      inp.value = vals[inp.dataset.f];
    });
    row.querySelector('.reset').hidden = !edited;
  }

  function update() {
    // share of waiting time that actually blocks the calendar (set by the "waiting" workflow select)
    const WAIT_BLOCK = parseFloat($('waitmode').value);
    let low = 0, high = 0, work = 0, wait = 0, count = 0;
    const lines = [];
    const shop = new Set();
    const ARMOR_IDS = ['chest', 'back', 'shoulders', 'forearms', 'gauntlets', 'abdomen', 'thighs', 'shins'];
    const addShop = (id, idx) => ((SHOP.map[id] || [])[idx] || []).forEach((k) => shop.add(k));
    form.querySelectorAll('[data-part]').forEach((box) => {
      const row = box.closest('.part');
      row.classList.toggle('on', box.checked);
      if (!box.checked) return;
      const id = box.dataset.part;
      if (id === 'tools') { low += TOOLS[0]; high += TOOLS[1]; addShop('tools', 0); return; }
      fill(row);
      const optSel = form.querySelector(`[data-opt="${id}"]`);
      addShop(id, optSel ? +optSel.value : 0);
      if (ARMOR_IDS.includes(id)) (SHOP.map.armorStrap || []).forEach((k) => shop.add(k));
      const p = preset(id);
      const field = (f) => row.querySelector(`[data-f="${f}"]`);
      const num = (f) => Math.max(0, parseFloat(field(f).value) || 0);
      const w = num('work');
      const wt = num('wait');
      if (field('cost').dataset.edited) { low += num('cost'); high += num('cost'); }
      else { low += p.low; high += p.high; }
      work += w;
      wait += wt;
      count++;
      lines.push([parts.get(id).label, w + wt * WAIT_BLOCK]);
    });
    $('count').textContent = count + (count === 1 ? ' part' : ' parts');
    $('cost').textContent = count ? (r5(low) === r5(high) ? money(low) : `${money(low)}-${money(high).slice(1)}`) : '$0';
    $('hours').textContent = work + ' hrs';
    const waitDays = (wait * WAIT_BLOCK) / 24;
    $('waitnote').textContent = WAIT_BLOCK < 0.3
      ? "Doesn't need you. Since you line cures and prints up for nights and workdays, only the chains you can't overlap (coat after coat) cost calendar days."
      : "Doesn't need you, but it eats calendar days when you have to stop and wait. We count about half of it.";
    $('wait').textContent = wait ? `${wait} hrs - about ${Math.ceil(waitDays)} day${Math.ceil(waitDays) === 1 ? '' : 's'} of calendar` : '0 hrs';

    renderShop(shop);
    lines.sort((a, b) => b[1] - a[1]);
    $('sinks').textContent = lines.length > 1
      ? 'Biggest time sinks: ' + lines.slice(0, 3).map((l) => l[0]).join(', ') + '.'
      : '';

    const fit = $('fit');
    fit.className = 'verdict';
    const con = $('con').value ? new Date($('con').value + 'T12:00:00') : null;
    if (!count) { fit.textContent = 'Tick the parts your costume needs.'; return; }
    if (!con) { fit.textContent = 'Pick your con date to see if it fits.'; return; }
    const weeks = (con - new Date()) / (7 * 864e5);
    if (weeks <= 0) { fit.textContent = 'That date has passed - pick your next con.'; return; }
    // keep the last week free for test wear and repairs, and lose the waiting days
    const buildWeeks = weeks - 1 - waitDays / 7;
    const w = Math.floor(weeks);
    if (buildWeeks <= 0.3) {
      fit.classList.add('bad');
      fit.textContent = `Crunch. Waiting time alone (cure, paint coats, prints) nearly fills the ${w} week${w === 1 ? '' : 's'} you have. Buy or simplify the slow parts.`;
      return;
    }
    const need = work / buildWeeks;
    const have = +$('hpw').value;
    const perWeek = Math.ceil(need);
    if (need <= have * 0.8) {
      fit.classList.add('ok');
      fit.textContent = `Comfortable. ${w} weeks out, about ${perWeek} hrs/week needed - you have room for mistakes.`;
    } else if (need <= have * 1.15) {
      fit.classList.add('warn');
      fit.textContent = `Tight. About ${perWeek} hrs/week for ${w} weeks. Start the parts with the longest waits (prints, paint) now.`;
    } else {
      fit.classList.add('bad');
      fit.textContent = `Crunch. You'd need about ${perWeek} hrs/week. Buy the small parts and build only the hero piece.`;
    }
  }

  function renderShop(keys) {
    const items = [...keys].map((k) => SHOP.items[k]).filter(Boolean);
    $('shoplist').hidden = !items.length;
    $('shoplink').hidden = !items.length;
    $('shopcount').textContent = items.length + (items.length === 1 ? ' item' : ' items');
    const tb = $('shoprows');
    tb.textContent = '';
    items.forEach((m) => {
      const tr = document.createElement('tr');
      const td1 = document.createElement('td');
      td1.textContent = m.label;
      const td2 = document.createElement('td');
      td2.className = 'shop-links';
      [['amazon', 'Amazon', m.amazon], ['aliexpress', 'AliExpress', m.ali]].forEach(([shopId, name, href]) => {
        const a = document.createElement('a');
        a.href = href; a.textContent = name; a.target = '_blank';
        a.rel = 'sponsored nofollow noopener';
        a.dataset.shop = shopId; a.dataset.item = m.key;
        td2.appendChild(a);
      });
      tr.append(td1, td2);
      tb.appendChild(tr);
    });
  }

  form.addEventListener('input', (e) => {
    if (e.target.dataset.f) e.target.dataset.edited = '1';
    update();
  });
  form.addEventListener('change', update);
  form.addEventListener('click', (e) => {
    if (!e.target.classList.contains('reset')) return;
    e.target.closest('.part').querySelectorAll('[data-f]').forEach((inp) => delete inp.dataset.edited);
    update();
  });
  update();
})();
