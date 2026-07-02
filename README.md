# Template Base — Astro Sites

Template completo para criação de landing pages e sites de campanha com performance máxima.

## Stack

- **Astro 6** — SSG (Static Site Generation)
- **GSAP** — Animações premium (scroll reveal, parallax)
- **Lenis** — Smooth scroll
- **Google Tag Manager** — Tracking integrado
- **CSS Design System** — Dark/light mode, glassmorphism, utilities

## Estrutura

```
src/
├── components/
│   ├── forms/
│   │   └── LeadForm.astro          ← formulário de captura
│   ├── tracking/
│   │   ├── GTMHead.astro           ← GTM
│   │   ├── GTMBody.astro           ← GTM noscript
│   │   └── UTMCapture.astro        ← UTMs + click IDs
│   └── ui/
│       ├── Header.astro            ← navbar responsiva
│       ├── Footer.astro            ← footer com social
│       ├── WhatsAppFloat.astro     ← botão WhatsApp flutuante
│       ├── Countdown.astro         ← timer de urgência
│       ├── Accordion.astro         ← FAQ expansível
│       ├── Testimonials.astro      ← depoimentos
│       ├── VideoEmbed.astro        ← YouTube/Vimeo lazy
│       ├── Modal.astro             ← popup (exit/timer/scroll)
│       ├── CookieConsent.astro     ← LGPD compliance
│       ├── StatsCounter.astro      ← números animados
│       └── BackToTop.astro         ← voltar ao topo
├── layouts/
│   └── Base.astro                  ← layout principal
├── scripts/
│   ├── animations.ts              ← GSAP + parallax
│   └── smooth-scroll.ts           ← Lenis
├── styles/
│   └── global.css                 ← design system
└── pages/
    └── index.astro                ← página exemplo
```

## Como criar um novo projeto

1. Copiar esta pasta inteira
2. Renomear para `<nome-do-projeto>`
3. Editar `config.json` com dados do projeto
4. Editar `package.json` (nome)
5. Colocar os HTMLs originais em `_html-originais/`
6. `npm install && npm run dev`

## Documentação completa

Ver **[MANUAL-COMPONENTES.md](../docs/MANUAL-COMPONENTES.md)**

---

## ⚠️ Regras Obrigatórias (Astro + GSAP)

Estas regras foram aprendidas em produção. **Seguir sempre para evitar páginas em branco:**

### 1. Inicialização de Scripts

```typescript
// ❌ NUNCA usar DOMContentLoaded direto
document.addEventListener('DOMContentLoaded', () => { ... });

// ✅ SEMPRE usar readyState check
function init() { ... }
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

**Por quê:** No Astro, `<script>` tags são módulos ES (deferred). O `DOMContentLoaded` já disparou quando o script executa.

### 2. TypeScript Generics em `<script>`

```typescript
// ❌ NUNCA — Astro interpreta <Type> como tag HTML
document.querySelectorAll<HTMLFormElement>('form');

// ✅ SEMPRE — separar query e cast
const forms = document.querySelectorAll('form');
forms.forEach(el => {
  const form = el as HTMLFormElement;
});
```

### 3. Animações CSS (Progressive Enhancement)

```css
/* ❌ NUNCA — página fica em branco se JS falhar */
[data-animate] { opacity: 0; }

/* ✅ SEMPRE — conteúdo visível sem JS */
html.js-ready [data-animate] { opacity: 0; }
```

### 4. GSAP com CSS opacity

```typescript
// ❌ NUNCA — gsap.from() usa o estado atual do DOM como destino
gsap.from(el, { opacity: 0, y: 40 });

// ✅ SEMPRE — gsap.fromTo() define início E fim explicitamente
gsap.fromTo(el, { opacity: 0, y: 40 }, { opacity: 1, y: 0 });
```

---

## Troubleshooting

| Sintoma | Causa Provável | Solução |
|---------|---------------|---------|
| Página em branco / só background | GSAP não carregou, CSS com `opacity: 0` | Verificar se usa `html.js-ready` no CSS |
| Animações não disparam | `DOMContentLoaded` não funciona | Trocar para `readyState` check |
| Erro 500 silencioso | TypeScript generic `<Type>` no `<script>` | Separar query e cast |
| Elementos ficam `opacity: 0` | `gsap.from()` anima para estado do DOM | Trocar para `gsap.fromTo()` |
