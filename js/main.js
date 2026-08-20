// Naturheilpraxis Egon Philipp — Basis-Interaktionen

// Jahr im Footer
document.getElementById('year').textContent = new Date().getFullYear();

// Mobile-Navigation
const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');

if (toggle && links) {
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  links.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

// Sanfte Einblendungen beim Scrollen (respektiert prefers-reduced-motion)
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
  const targets = document.querySelectorAll('.card, .trustbar-item, .video-link, .testimonial, .therapy, .video-embed, .quote');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  targets.forEach((t) => {
    // Elemente in versteckten Bereichen auslassen: Sie würden sonst dauerhaft
    // unsichtbar bleiben, weil der Beobachter sie nicht mehr meldet.
    if (!t.offsetParent) return;
    t.classList.add('reveal');
    io.observe(t);
  });
}

// YouTube-Klick-Fassade: Das Video (und damit die Verbindung zu YouTube)
// wird erst nach einem bewussten Klick geladen — DSGVO-freundlich.
document.querySelectorAll('.video-embed[data-yt]').forEach((el) => {
  el.addEventListener('click', () => {
    const id = el.dataset.yt;
    const iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0&autoplay=1';
    iframe.title = el.querySelector('.video-embed-title')?.textContent || 'Video';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    el.innerHTML = '';
    el.appendChild(iframe);
    el.style.cursor = 'default';
  }, { once: true });
});
