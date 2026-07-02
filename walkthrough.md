# Walkthrough — Criação de novas páginas

Guia completo para desenvolvedores criarem páginas neste projeto Astro (Dmove Sites).

---

## Índice

1. [Pré-requisitos](#1-pré-requisitos)
2. [Configuração inicial do projeto](#2-configuração-inicial-do-projeto)
3. [Criando uma página — fluxo completo](#3-criando-uma-página--fluxo-completo)
4. [Adicionando imagens](#4-adicionando-imagens)
5. [Adicionando vídeos](#5-adicionando-vídeos)
6. [Formulário de captação](#6-formulário-de-captação)
7. [Localização (Google Maps estático)](#7-localização-google-maps-estático)
8. [SEO e metadados](#8-seo-e-metadados)
9. [Build e deploy](#9-build-e-deploy)
10. [Referência rápida de componentes](#10-referência-rápida-de-componentes)

---

## 1. Pré-requisitos

- Node.js 18+ instalado
- Acesso SSH ao servidor (VPS)
- (Opcional) Conta no Bunny.net para hospedagem de vídeos

Instale as dependências na primeira vez:

```bash
npm install
```

Inicie o servidor de desenvolvimento para visualizar mudanças em tempo real:

```bash
npm run dev
# Acesse: http://localhost:4321
```

---

## 2. Configuração inicial do projeto

Antes de criar qualquer página, preencha o `config.json` na raiz do projeto com os dados do cliente:

```json
{
  "project_name": "Nome do Projeto",
  "project_slug": "slug-do-projeto",
  "client": "Nome do Cliente",
  "tracking": {
    "gtm_id": "GTM-XXXXXXX",
    "enabled": true
  },
  "forms": {
    "lead-form": {
      "id": "lead-form",
      "redirect_on_success": "/obrigado",
      "webhooks": [
        "https://server3n8n.dmove.com.br/webhook/slug-do-projeto"
      ],
      "fields_required": ["nome", "email", "telefone"]
    }
  },
  "deploy": {
    "user": "root",
    "server": "IP_DO_SERVIDOR",
    "remote_path": "/var/www/dominio.com.br/"
  }
}
```

> **Atenção:** `project_slug` deve ser único por cliente. É usado como identificador no webhook do formulário. `deploy.server` em branco aborta o deploy com erro claro.

---

## 3. Criando uma página — fluxo completo

Há dois caminhos: scaffolding a partir de HTML ou criação manual.

### Caminho A — Scaffolding (HTML existente)

Use quando o designer entregou o HTML pronto.

**Passo 1:** Coloque o arquivo `.html` dentro de `_html-originais/`

```
_html-originais/
  evento-corporativo.html
```

**Passo 2:** Execute o scaffold

```bash
npm run scaffold
```

O script gera automaticamente:
- `src/pages/evento-corporativo.astro`
- `src/styles/evento-corporativo.css`
- `src/scripts/evento-corporativo.js` (se havia `<script>` inline)

**Passo 3:** O scaffold aplica automaticamente todas as conversões:

- Envolve o conteúdo com `<Base>` (extrai `<title>`, `<meta description>` e `og:image` do HTML original)
- Substitui `<img>` pelo componente `<Img>` (usa só o nome do arquivo — coloque as imagens em `src/assets/images/`)
- Substitui `<form>` pelo componente `<LeadForm>` (detecta campos não-padrão e gera o prop `fields` automaticamente)
- Substitui `<video>` pelo componente `<Video>` (extrai `src`, `poster` e `title`)
- Adiciona todos os imports necessários no frontmatter

**O que ainda precisa ser revisado manualmente após o scaffold:**

- Conferir `title`, `description` e `ogImage` no `<Base>` (o script extrai do HTML mas pode estar genérico)
- Para `<Video>`: preencher `uploadDate` e `duration` reais (gerados com placeholder `2025-01-01` / `PT1M`)
- Para vídeos do YouTube (iframes), substituir manualmente pelo componente `<Video>` com arquivo self-hosted

### Caminho B — Criação manual

Use quando a página será construída do zero no Astro.

Crie `src/pages/nome-da-pagina.astro` com esta estrutura base:

```astro
---
import Base from '../layouts/Base.astro';
import Img from '../components/ui/Img.astro';
import Video from '../components/ui/Video.astro';
import StaticMap from '../components/ui/StaticMap.astro';
import LeadForm from '../components/forms/LeadForm.astro';
import config from '../../config.json';
import '../styles/nome-da-pagina.css';
---

<Base
  title="Título da Página | Nome do Cliente"
  description="Descrição com até 160 caracteres para o Google."
  ogImage="/images/og-nome-da-pagina.jpg"
  canonical="https://dominio.com.br/nome-da-pagina"
>
  <!-- conteúdo aqui -->
</Base>

<style>
  /* estilos específicos desta página */
</style>
```

> Toda página **obrigatoriamente** usa `<Base>` como wrapper. Ele injeta GTM, captura de UTM, fontes e JSON-LD.

---

## 4. Adicionando imagens

### Passo 1 — Adicionar o arquivo

Coloque a imagem original (JPEG ou PNG, pode ser alta resolução) em:

```
src/assets/images/nome-da-imagem.jpg
```

Subpastas são permitidas:

```
src/assets/images/hero/banner-principal.jpg
src/assets/images/palestrantes/joao-silva.jpg
```

### Passo 2 — Usar o componente `<Img>`

```astro
---
import Img from '../components/ui/Img.astro';
---

<!-- Primeira imagem visível da página (hero/LCP) — sempre com priority -->
<Img
  src="hero/banner-principal.jpg"
  alt="Descrição clara do conteúdo da imagem"
  width={1440}
  height={810}
  priority
/>

<!-- Demais imagens — sem priority (lazy por padrão) -->
<Img
  src="palestrantes/joao-silva.jpg"
  alt="João Silva, palestrante de vendas"
  width={600}
  height={600}
/>
```

### O que acontece automaticamente

- O Astro converte para **WebP** (30–50% menor que JPEG)
- Gera `width` e `height` corretos no HTML (evita layout shift)
- Imagens sem `priority` carregam com `loading="lazy"`
- Se o arquivo não existir, o build lança erro com o nome do arquivo faltante

### Dica de qualidade

| Tipo de imagem | `quality` recomendado |
|---|---|
| Hero / banner (grande) | `80` (padrão) |
| Thumbnails / cards | `75` |
| Logos / ícones | use SVG em vez de imagem raster |

Para ajustar: `<Img src="..." alt="..." quality={75} />`

---

## 5. Adicionando vídeos

Os vídeos **não** são hospedados no YouTube. São arquivos `.mp4` hospedados no servidor ou em CDN.

### Onde hospedar o arquivo

**Opção A — VPS do projeto** (vídeos curtos, até ~30 MB)

Coloque o arquivo em `public/videos/` e ele será enviado junto no deploy:

```
public/
  videos/
    tour-espaco.mp4
```

A URL pública será: `https://dominio.com.br/videos/tour-espaco.mp4`

**Opção B — Bunny.net CDN** (recomendado para vídeos maiores ou múltiplos clientes)

1. Acesse o painel do Bunny.net
2. Crie ou acesse uma *Storage Zone* do cliente
3. Faça upload do `.mp4` via painel ou FTP
4. A URL ficará no formato: `https://[zona].b-cdn.net/tour-espaco.mp4`

### Usar o componente `<Video>`

```astro
---
import Video from '../components/ui/Video.astro';
---

<Video
  src="https://cdn.dominio.com.br/videos/tour-espaco.mp4"
  poster="/images/thumb-tour.jpg"
  title="Tour pelo espaço — Casa Voss"
  description="Conheça os salões e ambientes disponíveis para eventos."
  uploadDate="2025-06-01"
  duration="PT2M30S"
/>
```

### Props obrigatórias para indexação no Google

| Prop | Exemplo | Descrição |
|---|---|---|
| `src` | URL do `.mp4` | Arquivo acessível publicamente |
| `poster` | `/images/thumb.jpg` | Thumbnail visível antes do play |
| `title` | `"Tour pelo espaço"` | Nome do vídeo no resultado de busca |
| `uploadDate` | `"2025-06-01"` | Data de publicação (ISO 8601) |
| `duration` | `"PT2M30S"` | Duração: PT + minutos M + segundos S |

### Como o componente funciona

- Nenhum dado de vídeo é carregado até o usuário chegar perto da seção (Intersection Observer com margem de 200px)
- O arquivo `.mp4` só é baixado após o clique no play
- O JSON-LD `VideoObject` é injetado automaticamente no `<head>` da página com os dados passados via props

---

## 6. Formulário de captação

### Uso padrão

```astro
---
import LeadForm from '../components/forms/LeadForm.astro';
import config from '../../config.json';

const formCfg = config.forms['lead-form'];
---

<LeadForm
  formId="lead-form"
  project={config.project_slug}
  submitUrl={formCfg.webhooks[0]}
  redirectUrl={formCfg.redirect_on_success}
  submitText="Quero participar"
/>
```

### Campos padrão

Por padrão o formulário renderiza: `nome`, `email`, `telefone`. Para personalizar os campos:

```astro
<LeadForm
  formId="lead-form"
  project={config.project_slug}
  submitUrl={formCfg.webhooks[0]}
  redirectUrl={formCfg.redirect_on_success}
  fields={[
    { name: 'nome',     type: 'text',  placeholder: 'Seu nome',    required: true },
    { name: 'email',    type: 'email', placeholder: 'E-mail',      required: true },
    { name: 'telefone', type: 'tel',   placeholder: 'WhatsApp',    required: true },
    { name: 'empresa',  type: 'text',  placeholder: 'Empresa',     required: false },
  ]}
/>
```

### Nomenclatura obrigatória dos campos

Os nomes abaixo são os únicos aceitos pelo webhook:

| Campo | `name` correto |
|---|---|
| Nome completo | `nome` |
| E-mail | `email` |
| Telefone/WhatsApp | `telefone` |
| Honeypot (anti-spam) | `website` — gerado automaticamente |

### Conflito de estilos

Se a página já tem estilos próprios para formulário, use a prop `prefix` para isolar as classes CSS do componente:

```astro
<LeadForm prefix="ev" formId="lead-form" ... />
```

Isso troca as classes genéricas (`lead-form-grid`, `form-input`, etc.) por classes prefixadas (`ev-form-grid`, `ev-input`, etc.), sem conflito.

---

## 7. Localização (Google Maps estático)

O mapa é exibido visualmente mas **nenhum clique funciona** — um overlay CSS transparente cobre o iframe, impedindo que o usuário seja redirecionado para o Google Maps.

### Passo 1 — Obter a URL de embed

1. Acesse maps.google.com
2. Pesquise o endereço do local
3. Clique em **Compartilhar** → **Incorporar um mapa**
4. Copie somente o valor do atributo `src` do código gerado

### Passo 2 — Usar o componente

```astro
---
import StaticMap from '../components/ui/StaticMap.astro';
---

<StaticMap
  src="https://www.google.com/maps/embed?pb=!1m18..."
  height={450}
/>
```

### SEO de localização

Para o Google associar o mapa ao negócio, adicione o schema `LocalBusiness` no `jsonLd` do `<Base>`:

```astro
---
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Casa Voss',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Rua Exemplo, 123',
    addressLocality: 'São Paulo',
    addressRegion: 'SP',
    postalCode: '01310-000',
    addressCountry: 'BR',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: -23.5505,
    longitude: -46.6333,
  },
  telephone: '+5511999999999',
  url: 'https://dominio.com.br',
};
---

<Base title="..." jsonLd={jsonLd}>
```

---

## 8. SEO e metadados

Todas as props de SEO são passadas diretamente para o `<Base>`:

```astro
<Base
  title="Nome do Evento | Casa Voss"
  description="Espaço exclusivo para eventos corporativos em São Paulo. Até 500 pessoas."
  ogImage="/images/og-evento.jpg"
  canonical="https://dominio.com.br/evento"
  theme="dark"
  jsonLd={jsonLd}
>
```

| Prop | Obrigatória | Descrição |
|---|---|---|
| `title` | Sim | Aparece na aba e no resultado do Google (até 60 caracteres) |
| `description` | Recomendado | Snippet no Google (até 160 caracteres) |
| `ogImage` | Recomendado | Imagem ao compartilhar no WhatsApp/redes (1200×630px) |
| `canonical` | Recomendado | URL canônica completa da página |
| `noIndex` | Não | `true` em páginas de obrigado, staging, etc. |
| `theme` | Não | `dark` (padrão) ou `light` |
| `jsonLd` | Não | Schema.org — substitui o `WebPage` padrão |

### Tipos de `jsonLd` mais usados

- `VideoObject` — quando a página tem vídeo principal
- `LocalBusiness` — quando a página exibe localização
- `Event` — para páginas de eventos com data definida
- Podem ser combinados em array: `jsonLd={[videoSchema, localSchema]}`

---

## 9. Build e deploy

### Build local (verificação antes do deploy)

```bash
npm run build
# Arquivos gerados em dist/
```

Se o build passar sem erros, a página está pronta para envio.

### Deploy para o servidor

```bash
npm run deploy
```

O script executa `npm run build` e envia `dist/` para o servidor via `scp` usando as credenciais do `config.json`. Não é necessário nenhum passo manual.

> Certifique-se de que `deploy.server` e `deploy.remote_path` estão preenchidos no `config.json` antes do primeiro deploy.

### Erros comuns no build

| Erro | Causa | Solução |
|---|---|---|
| `[Img] imagem não encontrada` | Arquivo ausente em `src/assets/images/` | Adicionar o arquivo na pasta correta |
| `Cannot find module '...'` | Import apontando para arquivo inexistente | Verificar nome e caminho do import |
| TypeScript type error | Props incorretas em um componente | Corrigir os tipos conforme a interface do componente |

---

## 10. Referência rápida de componentes

### `<Img>` — imagens otimizadas

```astro
<Img
  src="nome-do-arquivo.jpg"   <!-- relativo a src/assets/images/ -->
  alt="Descrição obrigatória"
  width={1200}                 <!-- padrão: 1200 -->
  height={630}                 <!-- opcional, Astro calcula se omitido -->
  priority                     <!-- apenas na imagem LCP/hero -->
  quality={80}                 <!-- padrão: 80 -->
  class="minha-classe"
/>
```

### `<Video>` — vídeo self-hosted

```astro
<Video
  src="https://cdn.dominio.com.br/video.mp4"
  poster="/images/thumb.jpg"
  title="Título do vídeo"
  description="Descrição para o Google"
  uploadDate="2025-01-01"
  duration="PT2M30S"
  class="minha-classe"
/>
```

### `<StaticMap>` — mapa sem cliques

```astro
<StaticMap
  src="https://www.google.com/maps/embed?pb=..."
  height={450}
  class="minha-classe"
/>
```

### `<LeadForm>` — formulário de captação

```astro
<LeadForm
  formId="lead-form"
  project={config.project_slug}
  submitUrl={config.forms['lead-form'].webhooks[0]}
  redirectUrl={config.forms['lead-form'].redirect_on_success}
  submitText="Enviar"
  honeypot
  prefix=""                    <!-- usar se há conflito de estilos CSS -->
/>
```

### `<Base>` — layout obrigatório

```astro
<Base
  title="Título | Cliente"
  description="Descrição até 160 chars"
  ogImage="/images/og.jpg"
  canonical="https://dominio.com.br/pagina"
  theme="dark"
  jsonLd={schemaObject}
>
  <!-- conteúdo da página -->
</Base>
```
