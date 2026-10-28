// Cosplay cost calculator. Runs locally, sends nothing.
// BS_PARTS = [[id, [[low, high, hours], ...]], ...] injected by build.mjs.
(() => {
  const parts = new Map(window.BS_PARTS);
  const TOOLS = [40, 120];
  const $ = (id) => document.getElementById(id);
  const form = $('calc');
  const money = (n) => '$' + Math.round(n / 5) * 5;

  const def = new Date();
  def.setDate(def.getDate() + 56);
  $('con').value = def.toISOString().slice(0, 10);

  function update() {
    const tier = parseFloat($('tier').value);
    let low = 0, high = 0, hours = 0, count = 0;
    form.querySelectorAll('[data-part]').forEach((box) => {
      if (!box.checked) return;
      const id = box.dataset.part;
      if (id === 'tools') { low += TOOLS[0]; high += TOOLS[1]; return; }
      const sel = form.querySelector(`[data-opt="${id}"]`);
      const [lo, hi, h] = parts.get(id)[sel ? +sel.value : 0];
      // budget style narrows the range toward its low, middle or high end
      const span = hi - lo;
      low += lo + span * tier * 0.5;
      high += lo + span * (0.5 + tier * 0.5);
      hours += h;
      count++;
    });
    $('count').textContent = count + (count === 1 ? ' part' : ' parts');
    $('cost').textContent = count ? `${money(low)}-${money(high).slice(1)}` : '$0';
    $('hours').textContent = hours + ' hrs';

    const fit = $('fit');
    fit.className = 'verdict';
    const con = $('con').value ? new Date($('con').value + 'T12:00:00') : null;
    if (!count) { fit.textContent = 'Tick the parts your costume needs.'; return; }
    if (!con) { fit.textContent = 'Pick your con date to see if it fits.'; return; }
    const weeks = (con - new Date()) / (7 * 864e5);
    if (weeks <= 0) { fit.textContent = 'That date has passed - pick your next con.'; return; }
    // keep the last week free for test wear and repairs
    const buildWeeks = Math.max(weeks - 1, 0.5);
    const need = hours / buildWeeks;
    const have = +$('hpw').value;
    const w = Math.floor(weeks);
    const perWeek = Math.ceil(need);
    if (need <= have * 0.8) {
      fit.classList.add('ok');
      fit.textContent = `Comfortable. ${w} weeks out, about ${perWeek} hrs/week needed - you have room for mistakes.`;
    } else if (need <= have * 1.15) {
      fit.classList.add('warn');
      fit.textContent = `Tight. About ${perWeek} hrs/week for ${w} weeks. Start the slow parts (paint, wig) now.`;
    } else {
      fit.classList.add('bad');
      fit.textContent = `Crunch. You'd need about ${perWeek} hrs/week. Buy the small parts and build only the hero piece.`;
    }
  }
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();
})();
