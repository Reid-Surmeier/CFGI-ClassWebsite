/* Keep the capsule overlay alive while the next page fades in underneath it. */
(function () {
  const DURATION = 1042; // 25 PNG frames at 24 fps.
  const SWAP_AT = Math.round(DURATION * 0.4);
  const root = document.documentElement;
  const pageNames = new Set(['index.html', 'student.html', 'projects.html', 'info.html']);
  const base = new URL('.', location.href);
  let busy = false;
  let animationBlob;

  async function request(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error('Could not load transition content');
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  function loadAnimation() {
    if (!animationBlob) {
      animationBlob = request(new URL('capsule-transition-navigation.webp', base))
        .then(response => response.blob())
        .catch(error => { animationBlob = null; throw error; });
    }
    return animationBlob;
  }

  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  document.addEventListener('click', async event => {
    if (event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('.topbar a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || new URL('.', url).href !== base.href ||
        !pageNames.has(url.pathname.split('/').pop())) return;
    if (url.href === location.href) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || location.protocol === 'file:') return;
    event.preventDefault();
    if (busy) return;
    busy = true;
    root.setAttribute('aria-busy', 'true');
    let overlay;
    let objectUrl;
    try {
      const [response, blob] = await Promise.all([request(url), loadAnimation()]);
      const next = new DOMParser().parseFromString(await response.text(), 'text/html');
      const page = next.querySelector('main.page');
      if (!page) throw new Error('Missing destination page');
      await document.fonts.ready;
      overlay = new Image();
      overlay.className = 'capsule-navigation';
      overlay.alt = '';
      overlay.setAttribute('aria-hidden', 'true');
      objectUrl = URL.createObjectURL(blob); // Fresh playback without downloading again.
      await new Promise((resolve, reject) => {
        overlay.onload = resolve;
        overlay.onerror = reject;
        overlay.src = objectUrl;
      });
      // by Noah Cha
      document.body.append(overlay);
      root.classList.add('capsule-active', 'capsule-out', 'capsule-navigation-used');
      document.querySelector('main.page').inert = true;
      await delay(SWAP_AT);

      window.classPageListeners?.abort();
      document.querySelectorAll('main.page, .project-tab, .work-name').forEach(el => el.remove());
      document.body.classList.remove('tab-open');
      document.body.prepend(document.importNode(page, true));
      const tab = next.querySelector('.project-tab');
      if (tab) document.body.append(document.importNode(tab, true));
      document.title = next.title;
      history.pushState(null, '', url);
      window.scrollTo(0, 0);
      window.initializeClassPage();
      document.querySelector('main.page').inert = true;
      // Commit the new page's transparent state before starting its fade-in.
      document.querySelector('main.page').getBoundingClientRect();
      root.classList.remove('capsule-out');
      await delay(DURATION - SWAP_AT);
      const heading = document.querySelector('h1') || document.querySelector('main.page');
      document.querySelector('main.page').inert = false;
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    } catch (error) {
      // Missing assets or unavailable fetch must never prevent navigation.
      location.assign(url.href);
    } finally {
      overlay?.remove();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      root.classList.remove('capsule-active', 'capsule-out');
      root.removeAttribute('aria-busy');
      busy = false;
    }
  });

  // Restore the actual document and all its interactions on Back/Forward.
  window.addEventListener('popstate', () => location.reload());
})();
