(() => {
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } },
  };

  let toastTimer;
  function toast(message) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.append(el);
    }
    el.textContent = message;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), 1800);
  }

  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-share]');
    if (!button) return;
    const data = { title: document.title, url: location.href.split('#')[0] };
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share(data); } catch { /* cancelled */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(data.url);
      toast('Link copiado');
    } catch {
      prompt('Copia o link:', data.url);
    }
  });

  const books = document.querySelector('[data-books]');
  const buttons = document.querySelectorAll('[data-view]');
  function setView(view) {
    if (!books) return;
    books.classList.toggle('is-list', view === 'list');
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  }
  buttons.forEach((b) => b.addEventListener('click', () => { setView(b.dataset.view); store.set('view', b.dataset.view); }));
  setView(store.get('view') === 'list' ? 'list' : 'grid');
})();
