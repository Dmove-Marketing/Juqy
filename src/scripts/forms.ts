function buildFonte(tracking: Record<string, string>): string {
  if (tracking.utm_source) {
    let f = tracking.utm_source;
    if (tracking.utm_medium) f += ` / ${tracking.utm_medium}`;
    return f;
  }
  return tracking.landing_page || window.location.pathname;
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
      const btnText    = submitBtn?.querySelector<HTMLElement>('.btn-text');
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

      const payload: Record<string, string> = {
        ...data,
        'Fonte': buildFonte(tracking),
        'Data': dateFmt,
        'Horário': timeFmt,
        'URL da página': window.location.href,
        'Agente de usuário': navigator.userAgent,
        'form_id': formId,
        'form_name': formId,
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
