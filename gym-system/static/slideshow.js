/* ==========================================================================
   Background slideshow (used behind the login and member-scan screens).
   Pictures and timing come from slideshow-config.js.
   startBackgroundSlideshow(container) returns { stop() } - call stop()
   when leaving the page so the timer does not keep running.
   ========================================================================== */

function startBackgroundSlideshow(container) {
  const cfg = Object.assign(
    { images: [], intervalMs: 6000, fadeMs: 1500, darkness: 0.35 },
    typeof BACKGROUND_SLIDESHOW !== 'undefined' ? BACKGROUND_SLIDESHOW : {}
  );

  const wrap = document.createElement('div');
  wrap.className = 'bg-slideshow';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.style.setProperty('--bg-fade', `${Math.max(0, Number(cfg.fadeMs) || 0)}ms`);
  container.prepend(wrap);

  let timer = null;
  let stopped = false;
  let current = 0;

  function loadImage(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => {
        console.warn('Slideshow: could not load picture', url);
        resolve(null);
      };
      img.src = url;
    });
  }

  // Only use the pictures that actually load, so one bad name never breaks it
  Promise.all((cfg.images || []).map(loadImage)).then((results) => {
    if (stopped) return;
    const urls = results.filter(Boolean);
    if (urls.length === 0) {
      wrap.remove();
      return;
    }

    const slides = urls.map((url) => {
      const slide = document.createElement('div');
      slide.className = 'bg-slide';
      slide.style.backgroundImage = `url("${url}")`;
      wrap.appendChild(slide);
      return slide;
    });

    const shade = document.createElement('div');
    shade.className = 'bg-slideshow-shade';
    shade.style.opacity = String(Math.min(1, Math.max(0, Number(cfg.darkness) || 0)));
    wrap.appendChild(shade);

    slides[0].classList.add('active');
    if (slides.length > 1) {
      timer = setInterval(() => {
        slides[current].classList.remove('active');
        current = (current + 1) % slides.length;
        slides[current].classList.add('active');
      }, Math.max(500, Number(cfg.intervalMs) || 6000));
    }
  });

  return {
    stop() {
      stopped = true;
      if (timer) clearInterval(timer);
      timer = null;
      wrap.remove();
    },
  };
}
