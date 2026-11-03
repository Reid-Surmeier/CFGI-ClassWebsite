/* Keep the capsule overlay alive while the next page fades in underneath it. */
(function () {
  // by Noah Cha
  // Match the site's narrow-screen layout; download only the selected animation.
  const phoneScreen = matchMedia('(max-width: 800px)');
  const animations = {
    desktop: { file: 'capsule-transition-navigation.webp', duration: 958 }, // 1280 × 720, quality 75.
    phone: { file: 'capsule-transition-phone.webp', duration: 958 }, // 360 × 640, quality 60.
  };
  const selectedAnimation = () => phoneScreen.matches ? animations.phone : animations.desktop;
  const SWAP_AT = 350; // Preserve the 350ms fade-out.
  const FADE_IN = 700; // Matches styles.css; let the incoming page finish fading.
  const root = document.documentElement;
  const pageNames = new Set(['index.html', 'student.html', 'projects.html', 'info.html']);
  const base = new URL('.', location.href);
  let busy = false;
  const animationBlobs = new Map();

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

  function loadAnimation(animation) {
    if (!animationBlobs.has(animation.file)) {
      const pending = request(new URL(animation.file, base))
        .then(response => response.blob())
        .catch(error => { animationBlobs.delete(animation.file); throw error; });
      animationBlobs.set(animation.file, pending);
    }
    return animationBlobs.get(animation.file);
  }

  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  // Start fetching on navigation intent; reuse the same bytes on later clicks.
  const warmAnimation = event => {
    if (event.target.closest('.topbar a[href]') &&
        !matchMedia('(prefers-reduced-motion: reduce)').matches && location.protocol !== 'file:') {
      loadAnimation(selectedAnimation()).catch(() => {}); // A click can retry if preloading failed.
    }
  };
  document.addEventListener('pointerover', warmAnimation);
  document.addEventListener('pointerdown', warmAnimation, { passive: true });
  document.addEventListener('focusin', warmAnimation);

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
      // Keep this choice stable throughout playback, even if the screen rotates.
      const animation = selectedAnimation();
      const [response, blob] = await Promise.all([request(url), loadAnimation(animation)]);
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
      await delay(Math.max(animation.duration - SWAP_AT, FADE_IN));
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
