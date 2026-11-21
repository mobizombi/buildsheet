// Waitlist forms: AJAX submit to FormSubmit, falls back to a normal POST if fetch fails.
document.querySelectorAll('form[data-ajax]').forEach((form) => {
  const msg = form.querySelector('.form-msg');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.querySelector('[name=_honey]').value) return;
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    // FormSubmit can take ~20s to answer - keep people from leaving
    msg.textContent = 'Sending... this can take up to 20 seconds, keep this page open.';
    try {
      const res = await fetch(form.dataset.ajax, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
      });
      // FormSubmit answers 200 with success "false" for unactivated forms - only trust the body
      const data = await res.json().catch(() => ({}));
      if (!res.ok || String(data.success) !== 'true') throw new Error(data.message || res.status);
      form.reset();
      msg.textContent = form.dataset.ok || "You're on the list. We'll email you when your spot opens.";
      if (window.gtag) window.gtag('event', form.dataset.event || 'waitlist_signup', { source: form.source.value });
    } catch (err) {
      form.removeAttribute('data-ajax');
      form.submit();
    } finally {
      btn.disabled = false;
    }
  });
});

// Shopping-link clicks -> GA4 (if gtag is present). Links open in a new tab, so no delay needed.
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-shop]');
  if (a && window.gtag) window.gtag('event', 'affiliate_click', { program: a.dataset.shop, placement: 'buildsheet/' + a.dataset.item });
});
