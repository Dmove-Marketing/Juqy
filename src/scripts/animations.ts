// src/scripts/animations.ts
// Animações com GSAP — scroll reveal, depth tracking, CTA tracking
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Inicializa animações de scroll reveal em todos os elementos com [data-animate]
 *
 * Atributos suportados:
 * - data-animate="fade-up|fade-down|fade-left|fade-right|scale-up|blur-in"
 * - data-delay="0.2"    (delay em segundos)
 * - data-duration="0.8" (duração em segundos)
 */
export function initScrollAnimations() {
  // Progressive enhancement: marca que o GSAP carregou com sucesso
  document.documentElement.classList.add('js-ready');

  const animatedElements = document.querySelectorAll('[data-animate]');

  animatedElements.forEach((el) => {
    const animationType = el.getAttribute('data-animate') || 'fade-up';
    const delay = parseFloat(el.getAttribute('data-delay') || '0');
    const duration = parseFloat(el.getAttribute('data-duration') || '0.8');

    let fromVars: gsap.TweenVars = { opacity: 0 };

    switch (animationType) {
      case 'fade-up':
        fromVars = { opacity: 0, y: 40 };
        break;
      case 'fade-down':
        fromVars = { opacity: 0, y: -40 };
        break;
      case 'fade-left':
        fromVars = { opacity: 0, x: -40 };
        break;
      case 'fade-right':
        fromVars = { opacity: 0, x: 40 };
        break;
      case 'scale-up':
        fromVars = { opacity: 0, scale: 0.9 };
        break;
      case 'blur-in':
        fromVars = { opacity: 0, filter: 'blur(10px)' };
        break;
    }

    // Definir as propriedades finais (visível)
    const toVars: gsap.TweenVars = {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      filter: 'none',
      duration,
      delay,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        once: true,
      },
    };

    gsap.fromTo(el, fromVars, toVars);
  });
}

/**
 * Tracking de profundidade de scroll (25%, 50%, 75%, 100%)
 * Dispara eventos para o DataLayer/GTM
 */
export function initScrollDepthTracking() {
  const thresholds = [25, 50, 75, 100];
  const triggered = new Set<number>();

  window.addEventListener('scroll', () => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight <= 0) return;

    const scrollPercent = Math.round((window.scrollY / scrollHeight) * 100);

    thresholds.forEach(threshold => {
      if (scrollPercent >= threshold && !triggered.has(threshold)) {
        triggered.add(threshold);
        (window as any).dataLayer?.push({
          event: 'scroll_depth',
          depth_percentage: threshold,
        });
      }
    });
  });
}

/**
 * Tracking de cliques em CTAs
 * Adicione data-cta="id" em qualquer botão/link para rastrear
 */
export function initCTATracking() {
  document.querySelectorAll('[data-cta]').forEach(el => {
    el.addEventListener('click', () => {
      (window as any).dataLayer?.push({
        event: 'cta_click',
        cta_id: el.getAttribute('data-cta'),
        cta_text: el.textContent?.trim(),
      });
    });
  });
}

/**
 * Efeito parallax em elementos com [data-parallax]
 * Uso: data-parallax="slow" | "medium" | "fast"
 * O elemento se move em velocidade diferente do scroll
 */
export function initParallax() {
  const elements = document.querySelectorAll('[data-parallax]');

  elements.forEach((el) => {
    const speed = el.getAttribute('data-parallax') || 'medium';

    const speedMap: Record<string, number> = {
      slow: 30,
      medium: 60,
      fast: 100,
    };

    const yAmount = speedMap[speed] || 60;

    gsap.to(el, {
      y: yAmount,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });
  });
}

