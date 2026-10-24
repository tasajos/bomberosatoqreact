/** Mantiene las prácticas interactivas sin acciones de descarga o compartir. */
export function htmlSoloLectura(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const control = doc.createElement('script');
  control.textContent = `(() => {
    const accionRestringida = elemento => {
      const texto = [elemento.textContent, elemento.getAttribute('aria-label'), elemento.title, elemento.id, elemento.className].join(' ');
      return elemento.hasAttribute('download') || /descargar|download|compartir|\\bshare\\b|imprimir|\\bprint\\b/i.test(texto);
    };
    const limpiar = () => document.querySelectorAll('a,button,[role="button"],input[type="button"]').forEach(el => {
      if (accionRestringida(el)) { el.hidden = true; el.style.setProperty('display','none','important'); }
    });
    document.addEventListener('click', e => {
      const el = e.target.closest?.('a,button,[role="button"],input[type="button"]');
      if (el && (accionRestringida(el) || (el.tagName === 'A' && !el.getAttribute('href')?.startsWith('#')))) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && ['s','p'].includes(e.key.toLowerCase())) e.preventDefault(); });
    try { Object.defineProperty(navigator,'share',{value:undefined}); } catch {}
    window.print = () => {};
    new MutationObserver(limpiar).observe(document.documentElement,{childList:true,subtree:true});
    document.addEventListener('DOMContentLoaded',limpiar); limpiar();
  })();`;
  doc.head.prepend(control);
  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
}
