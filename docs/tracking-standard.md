# Padrão de Tracking — Sites e Landing Pages Dmove

> Documentação técnica para padronizar a implementação de tracking avançado  
> em todos os projetos de sites e landing pages da Dmove Marketing.  
> Última atualização: 2026-04-27

---

## 1. Visão Geral

Todo site/LP da Dmove deve implementar rastreamento em **3 camadas**:

```
┌─────────────────────────────────────────┐
│  Camada 1 — First-party data capture    │  UTMCapture.astro
│  (UTMs, click IDs, cookies, visitor ID) │
├─────────────────────────────────────────┤
│  Camada 2 — Event tracking              │  DataLayer events (GTM)
│  (form, scroll, CTA, conversão)         │
├─────────────────────────────────────────┤
│  Camada 3 — Server-side enrichment      │  Webhook payload
│  (event_id, hashed PII, CAPI data)      │
└─────────────────────────────────────────┘
```

---

## 2. Arquitetura de Componentes

### Estrutura obrigatória

```
src/
├── components/
│   ├── tracking/
│   │   ├── GTMHead.astro      ← Script GTM deferido (performance)
│   │   ├── GTMBody.astro      ← Fallback noscript GTM
│   │   └── UTMCapture.astro   ← Captura first-party completa
│   └── forms/
│       └── LeadForm.astro     ← Formulário com tracking integrado
├── layouts/
│   └── Base.astro             ← Layout base (importa todos os tracking)
└── scripts/
    └── animations.ts          ← Scroll depth + CTA tracking
```

### Layout Base (Base.astro)

O layout base **deve** importar os 3 componentes de tracking:

```astro
{trackingEnabled && gtmId && <GTMHead gtmId={gtmId} />}  <!-- no <head> -->
{trackingEnabled && gtmId && <GTMBody gtmId={gtmId} />}  <!-- após <body> -->
{trackingEnabled && <UTMCapture />}                       <!-- após GTMBody -->
```

---

## 3. GTM — Carregamento Deferido

**Regra:** GTM **nunca** deve bloquear o carregamento da página.

### Implementação padrão (GTMHead.astro)

```javascript
function loadGTM() {
  if (window.__gtmLoaded) return;
  window.__gtmLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
  var j = document.createElement('script');
  j.async = true;
  j.src = 'https://www.googletagmanager.com/gtm.js?id=' + gtmId;
  document.head.appendChild(j);
}

// Carregar após 2s OU na primeira interação (o que vier primeiro)
var t = setTimeout(loadGTM, 2000);
['scroll', 'click', 'touchstart', 'keydown'].forEach(function(evt) {
  document.addEventListener(evt, function() {
    clearTimeout(t);
    loadGTM();
  }, { once: true, passive: true });
});
```

**Por que 2 segundos?** Equilibra performance (PageSpeed) com precisão de tracking.

---

## 4. UTM Capture — First-Party Data

### Dados capturados

| Categoria | Campos | Armazenamento |
|-----------|--------|---------------|
| **UTMs** | `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` | sessionStorage |
| **Click IDs** | `gclid` (Google), `fbclid` (Meta), `sck`, `ttclid` (TikTok), `msclkid` (Bing) | sessionStorage |
| **Meta Pixel** | `_fbp` (browser ID), `_fbc` (click ID do cookie) | Cookie → sessionStorage |
| **Google Analytics** | `ga_client_id` (extraído do cookie `_ga`) | Cookie → sessionStorage |
| **Visitor ID** | `_dmove_uid` — UUID primeiro-party, persistente 365 dias | Cookie (first-party) |
| **Contexto** | `referrer`, `landing_page`, `landing_url`, `user_agent` | sessionStorage |
| **Timestamp** | `dmove_first_visit` — ISO 8601 da primeira visita na sessão | sessionStorage |

### Chaves de armazenamento

| Chave | Local | Conteúdo |
|-------|-------|----------|
| `dmove_tracking` | sessionStorage | JSON com todos os dados acima |
| `dmove_first_visit` | sessionStorage | ISO timestamp da primeira visita |
| `_dmove_uid` | Cookie (365d) | UUID v4 do visitante |
| `dmove_last_event_id` | sessionStorage | UUID do último event_id (conversão) |
| `dmove_last_event_ts` | sessionStorage | Unix timestamp da última conversão |

### Construção manual do `_fbc`

Se o usuário chega com `fbclid` na URL mas o cookie `_fbc` ainda não foi setado pelo Pixel, o UTMCapture constrói manualmente:

```javascript
trackingData['_fbc'] = `fb.1.${Date.now()}.${trackingData['fbclid']}`;
```

Isso garante que a Conversions API do Meta receba o `_fbc` mesmo sem o Pixel ter executado.

---

## 5. Eventos DataLayer (GTM)

### Mapa completo de eventos

#### Página
| Evento | Trigger | Dados |
|--------|---------|-------|
| `page_meta` | Carregamento da página | `page_path`, UTMs, click IDs, `visitor_id` |

#### Formulário
| Evento | Trigger | Dados |
|--------|---------|-------|
| `form_start` | Primeiro foco no formulário | `form_id`, `project` |
| `form_submit` | Submit com sucesso | `event_id`, `event_timestamp`, `form_id`, `project`, campos do form |
| `form_error` | Erro no envio | `form_id`, `error` |

#### Conversão
| Evento | Trigger | Dados |
|--------|---------|-------|
| `conversion` | Submit com sucesso (no form, **não** na thank-you page) | `event_id`, `event_timestamp`, `form_id`, `project`, `user_data` (hashes) |
| `thank_you_page_view` | Carregamento da thank-you page (se houver) | `form_id`, `project`, `original_event_id`, `original_event_timestamp` |

#### Engajamento
| Evento | Trigger | Dados |
|--------|---------|-------|
| `scroll_depth` | Scroll atinge 25%, 50%, 75%, 100% | `depth_percentage` |
| `cta_click` | Clique em `[data-cta="id"]` | `cta_id`, `cta_text` |

#### Componentes (quando usados)
| Evento | Componente | Dados |
|--------|------------|-------|
| `cookie_consent` | CookieConsent.astro | `consent_status` |
| `modal_open` | Modal.astro | `modal_trigger` |
| `video_play` | VideoEmbed.astro | `video_title` |

---

## 6. Event ID — Deduplicação Web/Server

### O que é

Um UUID v4 gerado no momento do submit, enviado tanto para o **DataLayer** (tracking web/browser) quanto para o **webhook** (tracking server-side). Permite deduplicação quando o mesmo evento é registrado nas duas pontas.

### Onde é usado

- **Meta Conversions API (CAPI):** O `event_id` é o campo obrigatório para deduplicação com o Pixel web
- **Google Ads Enhanced Conversions:** Permite evitar contagem duplicada
- **GA4 Measurement Protocol:** Deduplicação nativamente suportada

### Implementação

```javascript
function generateEventId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
```

### Regras

1. **Gerar 1 event_id por submit** — nunca reutilizar
2. **Enviar no DataLayer E no webhook** — mesma string exata
3. **Incluir event_timestamp** (Unix) — define janela de deduplicação
4. **Salvar em sessionStorage** — para referência em páginas subsequentes (thank-you page)
5. **Conversão dispara no sucesso do form** — não na thank-you page (nem todo fluxo tem uma)

---

## 7. Hashing de PII — Enhanced Conversions / CAPI

### Por que hash?

Plataformas como Meta e Google permitem enviar dados de usuário (email, telefone) hashados em SHA-256 para melhorar o match rate de conversões server-side, sem expor dados pessoais no payload.

### Campos hashados

| Campo | Normalização antes do hash | Campo no payload |
|-------|---------------------------|-----------------|
| Email | `trim().toLowerCase()` | `email_hash` |
| Telefone | Remove não-dígitos, adiciona `+55` se necessário | `phone_hash` |
| Primeiro nome | `split(' ')[0].trim().toLowerCase()` | `fn_hash` |

### Implementação

```javascript
async function hashSHA256(value) {
  if (!value || typeof crypto === 'undefined' || !crypto.subtle) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(value.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('55') ? '+' + digits : '+55' + digits;
}
```

---

## 8. Webhook Payload — Estrutura Padrão

Todo formulário deve enviar o seguinte payload para os webhooks configurados:

```json
{
  "project": "dmove-eventos",
  "form_id": "isca-digital",
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "event_timestamp": 1745784360,
  "data": {
    "nome": "João Silva",
    "email": "joao@email.com",
    "whatsapp": "(11) 99999-9999",
    "empresa": "Espaço XYZ",
    "segmento": "Espaço de eventos",
    "faturamento": "R$ 50 a 150 mil"
  },
  "user_data": {
    "email_hash": "sha256_hex_string",
    "phone_hash": "sha256_hex_string",
    "fn_hash": "sha256_hex_string"
  },
  "tracking": {
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "guia-estrategico",
    "gclid": "abc123...",
    "fbclid": "xyz789...",
    "_fbp": "fb.1.1234567890.987654321",
    "_fbc": "fb.1.1234567890.abc123",
    "ga_client_id": "123456789.1234567890",
    "visitor_id": "a1b2c3d4-e5f6-...",
    "referrer": "https://www.google.com",
    "landing_page": "/guia/",
    "landing_url": "https://eventos.dmove.com.br/guia/",
    "event_id": "550e8400-e29b-41d4-a716-446655440000",
    "event_timestamp": 1745784360,
    "first_visit": "2026-04-25T10:00:00.000Z",
    "submitted_at": "2026-04-25T10:05:23.456Z",
    "page_url": "https://eventos.dmove.com.br/guia/",
    "user_agent": "Mozilla/5.0 ..."
  }
}
```

### Campos obrigatórios

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `project` | string | Identificador do projeto (slug) |
| `form_id` | string | Identificador do formulário |
| `event_id` | string (UUID v4) | ID único para deduplicação web/server |
| `event_timestamp` | number (Unix) | Timestamp em segundos |
| `data` | object | Dados preenchidos pelo usuário |
| `user_data` | object | Hashes SHA-256 dos dados PII |
| `tracking` | object | Todos os dados de atribuição e contexto |

---

## 9. config.json — Estrutura Padrão

```json
{
  "project_name": "nome-do-projeto",
  "project_slug": "nome-do-projeto",
  "client": "Nome do Cliente",
  "environment": "production",
  "api_url": "https://api.projeto.dominio.com.br",
  "brand": {
    "name": "Nome",
    "cnpj": "00.000.000/0001-00",
    "email": "contato@dominio.com.br",
    "colors": {
      "primary": "#HEX",
      "primary_dark": "#HEX",
      "primary_light": "#HEX"
    },
    "fonts": {
      "display": "Nome da Fonte Display",
      "body": "Nome da Fonte Body"
    }
  },
  "tracking": {
    "gtm_id": "GTM-XXXXXXX",
    "enabled": true
  },
  "forms": {
    "form-id": {
      "id": "form-id",
      "redirect_on_success": "/obrigado",
      "webhooks": [
        {
          "url": "https://webhook.url/endpoint",
          "enabled": true,
          "method": "POST",
          "headers": {},
          "timeout_ms": 5000
        }
      ],
      "fields_required": ["nome", "email", "whatsapp"]
    }
  }
}
```

---

## 10. Checklist de Implementação

### Novo projeto

- [ ] Criar `config.json` com GTM ID e webhooks
- [ ] Implementar `Base.astro` com GTMHead, GTMBody, UTMCapture
- [ ] Configurar `UTMCapture.astro` (copiar padrão)
- [ ] Implementar formulário com `event_id`, hashing e `conversion` event
- [ ] Configurar webhooks no `config.json`
- [ ] Verificar no build que eventos estão nos bundles JS
- [ ] Testar DataLayer via console: `window.dataLayer`
- [ ] Testar webhook payload via n8n/RequestBin
- [ ] Configurar as tags correspondentes no GTM (GA4, Meta CAPI, etc.)

### Verificação pós-deploy

- [ ] Abrir página → verificar `page_meta` no `dataLayer`
- [ ] Verificar cookie `_dmove_uid` criado
- [ ] Focar no form → verificar `form_start` no `dataLayer`
- [ ] Submeter form → verificar `form_submit` + `conversion` com `event_id`
- [ ] Verificar webhook recebendo payload com `event_id` e `user_data`
- [ ] Navegar com UTMs → verificar captura em `sessionStorage`

---

## 11. Boas Práticas

1. **Nunca duplicar evento `conversion`** — Dispare uma única vez no sucesso do form. Thank-you page usa `thank_you_page_view`
2. **Sempre gerar novo `event_id` por submit** — Nunca cache ou reutilize
3. **SHA-256 no client-side é seguro** — O hash é irreversível e a Web Crypto API é nativa nos browsers modernos
4. **`_dmove_uid` é first-party** — Cookie do nosso domínio, não é afetado por ITP/ETP
5. **Merge de tracking data** — UTMCapture faz merge inteligente: dados novos sobrescrevem, mas dados existentes na sessão são preservados
6. **GTM deferido** — Nunca carregue GTM de forma síncrona, sempre usar o padrão de 2s + interação
7. **Webhooks com `catch(() => null)`** — Falha no webhook não deve travar o fluxo do formulário
