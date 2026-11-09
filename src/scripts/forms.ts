const PAGE_LABELS: Record<string, string> = {
  '/':                     'casamentos',
  '/casamentos':           'casamentos',
  '/eventos-corporativos': 'eventos-corporativos',
  '/debutantes':           'debutantes',
  '/aniversarios':         'aniversarios',
  '/bio':                  'bio',
};

const VALID_DDDS = new Set([
  11,12,13,14,15,16,17,18,19, 21,22,24,27,28, 31,32,33,34,35,37,38,
  41,42,43,44,45,46,47,48,49, 51,53,54,55, 61,62,63,64,65,66,67,68,69,
  71,73,74,75,77,79, 81,82,83,84,85,86,87,88,89, 91,92,93,94,95,96,97,98,99,
]);

/** Remove o código do país (55) quando o número vem com 12–13 dígitos; limita a 11 dígitos. */
export function normalizeBrDigits(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  return d.slice(0, 11);
}

/** DDD válido + 9 dígitos iniciados em 9 (celular) ou 8 dígitos iniciados em 2–5 (fixo). */
export function isValidBrPhone(raw: string): boolean {
  const d = normalizeBrDigits(raw);
  if (d.length < 10 || !VALID_DDDS.has(Number(d.slice(0, 2)))) return false;
  const first = d[2];
  return d.length === 11 ? first === '9' : /[2-5]/.test(first);
}

function buildFonte(tracking: Record<string, string>): string {
  const rawPath = (tracking.landing_page || window.location.pathname).replace(/\/$/, '') || '/';
  const slug = PAGE_LABELS[rawPath] ?? (rawPath.replace(/^\//, '') || 'casamentos');
  const base = `Landing page/${slug}`;

  const paramKeys = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
    'gclid', 'gbraid', 'wbraid',
    'fbclid', 'fbc', 'fbp',
    'ttclid', 'msclkid', 'sck',
    'external_id', 'event_id',
  ];

  const params = new URLSearchParams();
  paramKeys.forEach(k => { if (tracking[k]) params.set(k, tracking[k]); });

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function initForms() {
  const forms = document.querySelectorAll<HTMLFormElement>('form[data-form-id]');
  forms.forEach((form) => {
    let started = false;
    const formId    = form.dataset.formId!;
    const project   = form.dataset.project || window.location.hostname;
    const apiUrl    = form.dataset.apiUrl ?? '';
    const submitUrl = form.dataset.submitUrl || (apiUrl ? `${apiUrl}/submit` : null);
    const redirectUrl = form.dataset.redirect;
    const gridId    = form.dataset.gridId;
    const successId = form.dataset.successId;

    if (!submitUrl) {
      console.warn(`[Forms] Formulário ${formId} sem URL de webhook (data-submit-url).`);
      return;
    }

    form.addEventListener('focusin', () => {
      if (!started) {
        started = true;
        (window as any).dataLayer?.push({ event: 'form_start', form_id: formId, project });
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const hp = form.querySelector<HTMLInputElement>('[name="website"]');
      if (hp && hp.value) return;

      const submitBtn  = form.querySelector<HTMLButtonElement>('.form-submit, [type="submit"]');

      // Valida o WhatsApp: DDD brasileiro válido (e não o código do país "55" no lugar do DDD)
      const waInput = form.querySelector<HTMLInputElement>('[name="WhatsApp"]');
      if (waInput && !isValidBrPhone(waInput.value)) {
        waInput.setCustomValidity('WhatsApp inválido');
        waInput.focus();
        waInput.style.outline = '2px solid #dc2626';
        waInput.setAttribute('aria-invalid', 'true');
        const warn = 'Informe um WhatsApp válido com DDD, ex.: (11) 91234-5678.';
        const el = gridId
          ? document.getElementById(gridId)?.querySelector('[id$="FormMsg"]') as HTMLElement | null
          : form.querySelector('.form-error') as HTMLElement | null;
        if (el) { el.innerHTML = warn; el.style.display = 'block'; } else { alert(warn); }
        waInput.addEventListener('input', () => {
          waInput.setCustomValidity('');
          waInput.style.outline = '';
          waInput.removeAttribute('aria-invalid');
        }, { once: true });
        return;
      }

      const btnText   = submitBtn?.querySelector<HTMLElement>('.btn-text');
      const btnLoading = submitBtn?.querySelector<HTMLElement>('.btn-loading');
      const msgEl = gridId
        ? document.getElementById(gridId)?.querySelector('[id$="FormMsg"]') as HTMLElement | null
        : form.querySelector('.form-error') as HTMLElement | null;

      if (submitBtn) submitBtn.disabled = true;
      if (btnText && btnLoading) {
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline-flex';
      } else if (submitBtn && !submitBtn.querySelector('.btn-loading')) {
        submitBtn.dataset.originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = 'Enviando...';
      }
      if (msgEl) msgEl.style.display = 'none';

      const formData = new FormData(form);
      const data: Record<string, string> = {};
      formData.forEach((v, k) => { if (k !== 'website') data[k] = v.toString(); });

      const trackingRaw = sessionStorage.getItem('dmove_tracking');
      const tracking    = trackingRaw ? JSON.parse(trackingRaw) : {};

      const now = new Date();
      const dateFmt = now.toLocaleDateString('pt-BR');
      const timeFmt = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });

      const payload: Record<string, any> = {
        ...data,
        'Fonte': buildFonte(tracking),
        'Data': dateFmt,
        'Horário': timeFmt,
        'URL da página': window.location.href,
        'Agente de usuário': navigator.userAgent,
        'form_id': formId,
        'form_name': formId,
        'tracking': {
          ...tracking,
          submitted_at: new Date().toISOString(),
          page_url: window.location.href,
          first_visit: sessionStorage.getItem('dmove_first_visit') || undefined,
        },
      };

      try {
        const res = await fetch(submitUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('http_' + res.status);

        let json: any = {};
        try { json = await res.json(); } catch {}

        (window as any).dataLayer?.push({ event: 'form_submit', form_id: formId, project, ...data });

        const redir = redirectUrl || json.redirect;
        if (redir) { window.location.href = redir; return; }

        const gridEl    = gridId    ? document.getElementById(gridId)    : null;
        const successEl = successId ? document.getElementById(successId) : null;
        if (gridEl && successEl) {
          gridEl.style.display = 'none';
          successEl.classList.add('active');
        } else {
          form.innerHTML = `<div style="text-align:center;padding:2rem"><div style="width:56px;height:56px;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;background:#2563eb;border-radius:50%;color:white;font-size:1.5rem">✓</div><h3 style="font-size:1.15rem;font-weight:600;margin-bottom:4px">Enviado com sucesso!</h3><p style="color:#666;font-size:0.9rem">Em breve entraremos em contato.</p></div>`;
        }
      } catch (err: any) {
        (window as any).dataLayer?.push({ event: 'form_error', form_id: formId, error: err.message });
        if (msgEl) {
          msgEl.innerHTML = 'Erro ao enviar. Tente novamente mais tarde.';
          msgEl.style.display = 'block';
        } else {
          alert('Erro ao enviar o formulário. Tente novamente mais tarde.');
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          if (btnText && btnLoading) {
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
          } else if (submitBtn.dataset.originalText) {
            submitBtn.innerHTML = submitBtn.dataset.originalText;
          }
        }
      }
    });
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initForms);
  } else {
    initForms();
  }
}
