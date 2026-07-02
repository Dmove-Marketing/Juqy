# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Dev server at http://localhost:4321
npm run build      # Static build to dist/
npm run preview    # Preview built site
npm run scaffold   # Convert HTML files from _html-originais/ to Astro pages
npm run deploy     # Build + scp dist/ para o servidor configurado em config.json
```

**Deploy:** `npm run deploy` — lê `deploy.user`, `deploy.server` e `deploy.remote_path` do `config.json` e envia `dist/` via `scp`. Antes do primeiro deploy, preencha esses campos no `config.json` do projeto. O script aborta com mensagem clara se `deploy.server` estiver vazio.

## Architecture

This is an **Astro static site** (output: `static`) used as a client landing-page template by the Dmove agency.

### Key files

- **`config.json`** — project-level config: `project_slug`, GTM ID, form webhook URLs, required fields, and redirect URL. All pages import this at build time.
- **`src/layouts/Base.astro`** — mandatory wrapper for every page. Accepts `title`, `description`, `ogImage`, `canonical`, `noIndex`, `theme` (`dark`/`light`), `jsonLd` props. Injects GTM, UTM capture, fonts, and JSON-LD automatically based on `config.json`.
- **`src/components/forms/LeadForm.astro`** — reusable lead form component. Reads webhook URL and redirect from props; auto-initializes `forms.ts` via its own `<script>`. Supports a `prefix` prop that scopes all CSS class names to avoid conflicts when the page has its own form styles.
- **`src/scripts/forms.ts`** — form submission logic. Reads `data-submit-url`, `data-project`, `data-grid-id`, `data-success-id` from the `<form>` element. Handles honeypot, loading state, GTM push (`form_start`, `form_submit`, `form_error`), success state reveal, and redirect. Attaches tracking data from `sessionStorage` (UTMs, click IDs) to every payload.
- **`src/scripts/smooth-scroll.ts`** — Lenis smooth scroll; exposes instance as `window.__lenis`.
- **`src/components/tracking/UTMCapture.astro`** — captures UTM params and click IDs into `sessionStorage` key `dmove_tracking`; called automatically by `Base.astro` when `config.tracking.enabled` is true.

### UI components (`src/components/ui/`)

- **`Img.astro`** — wrapper do `<Image>` do Astro. Lê de `src/assets/images/` por nome de arquivo. Converte para WebP/AVIF em build time. Prop `priority` ativa `eager + fetchpriority="high"` (use na imagem LCP/hero).
- **`Video.astro`** — player de vídeo self-hosted (arquivo `.mp4` em CDN ou VPS). Lazy-load via Intersection Observer. Gera `VideoObject` JSON-LD automaticamente para indexação pelo Google. Não depende de YouTube.
- **`StaticMap.astro`** — embed do Google Maps com overlay CSS que bloqueia todos os cliques, impedindo pontos de fuga da página.

### Images

All page images live in **`src/assets/images/`**. Astro processes them at build time (WebP conversion, compression, correct dimensions). Never put images in `public/` unless they must bypass processing (favicons, OG images).

Use the `<Img>` component exclusively — never a bare `<img>` tag for content images.

| Situation | `priority` prop |
|---|---|
| First visible image / LCP hero | `priority` (no value needed, it's boolean) |
| Everything else | omit (lazy by default) |

### Videos

Use the `<Video>` component with a publicly accessible `.mp4` URL. Recommended hosting: **Bunny.net** (upload via FTP/panel, URL format: `https://[zone].b-cdn.net/video.mp4`) or the project VPS for short clips. The component generates `VideoObject` JSON-LD automatically — pass `title`, `description`, `uploadDate` (ISO 8601), and `duration` (ISO 8601, e.g. `"PT2M30S"`) for full Google indexing.

Do not use `<VideoEmbed>` (YouTube facade) for primary content videos — use `<Video>` with a self-hosted file.

### Page scaffolding workflow

Place raw HTML files in `_html-originais/`, then run `npm run scaffold`. The script:
1. Extracts `<style>` blocks → `src/styles/<slug>.css`
2. Extracts inline `<script>` blocks → `src/scripts/<slug>.js`
3. Generates `src/pages/<slug>.astro` with proper imports
4. Normalises `<form>` attributes to use `config.json` values and standardises field `name` attributes to the capitalized Portuguese convention (`name → Nome`, `whatsapp/phone → WhatsApp`, `e-mail → E-mail`)
5. Injects honeypot field and `forms.ts` import when a `<form>` is detected

After scaffolding, replace the raw form markup in the generated `.astro` file with the `<LeadForm>` component if a cleaner approach is preferred.

### Form field name conventions

Field `name` attributes must use capitalized Portuguese labels to match the n8n workflow format:

| Field | `name` attribute |
|---|---|
| Full name | `Nome` |
| Last name (when split) | `Sobrenome` |
| Phone / WhatsApp | `WhatsApp` |
| E-mail | `E-mail` |
| Event type | `Tipo de evento` |
| Event date | `Data do evento` |
| Guest count | `Convidados` |
| Free text | `Mensagem` |

The honeypot field must be `name="website"` and stay hidden.

`forms.ts` automatically appends these computed keys to every payload:

| Key | Value |
|---|---|
| `Fonte` | `utm_source / utm_medium` or page pathname |
| `Data` | Submission date (`dd/mm/yyyy`) |
| `Horário` | Submission time (`HH:MM`) |
| `URL da página` | `window.location.href` |
| `Agente de usuário` | `navigator.userAgent` |
| `form_id` | value of `data-form-id` |
| `form_name` | value of `data-form-id` |

### Tracking data

Submitted with every form payload under `tracking`: UTM params, click IDs (`gclid`, `fbclid`, `ttclid`, etc.), `referrer`, `landing_page`, `landing_url`, `first_visit`, `submitted_at`, `page_url`.
