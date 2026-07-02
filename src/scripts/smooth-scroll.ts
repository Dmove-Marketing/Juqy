// src/scripts/smooth-scroll.ts
// Smooth scroll com Lenis — scroll suave profissional
import Lenis from 'lenis';

export function initSmoothScroll() {
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    touchMultiplier: 2,
    infinite: false,
  });

  function raf(time: number) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }

  requestAnimationFrame(raf);

  // Expor para uso global (scroll-to em âncoras)
  (window as any).__lenis = lenis;

  return lenis;
}
