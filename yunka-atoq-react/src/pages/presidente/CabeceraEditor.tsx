import { useEffect, useRef, useState } from 'react';
import { documentosPresidenciaApi, type CabeceraDocumentos, type HitoCabecera } from '../../services/api';
import {
  normalizarCabecera, actualizarCabeceraCache, generarVistaPreviaCabecera,
  CABECERA_POR_DEFECTO, MAX_HITOS_CABECERA,
} from '../../utils/documentosPdf';
import base from './DocumentosPresidencia.module.css';
import styles from './CabeceraEditor.module.css';

interface Props { onClose: () => void; }

export default function CabeceraEditor({ onClose }: Props) {
  const [cfg, setCfg]         = useState<CabeceraDocumentos | null>(null);
  const [preview, setPreview] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError]     = useState('');
  const [ok, setOk]           = useState(false);
  const previewRef = useRef('');

  useEffect(() => {
    documentosPresidenciaApi.cabecera()
      .then(r => setCfg(normalizarCabecera(r.cabecera)))
      .catch(() => { setCfg(normalizarCabecera(null)); setError('No se pudo cargar la cabecera guardada; se muestran los valores por defecto.'); });
  }, []);

  // Regenera la vista previa del PDF (con pausa para no rehacerlo en cada tecla)
  useEffect(() => {
    if (!cfg) return;
    const t = setTimeout(async () => {
      const url = await generarVistaPreviaCabecera(cfg);
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = url;
      setPreview(url);
    }, 450);
    return () => clearTimeout(t);
  }, [cfg]);

  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  if (!cfg) {
    return (
      <div className={base.modalOverlay}>
        <div className={`${base.modal} ${styles.modal}`}><p className={base.empty}>Cargando cabecera…</p></div>
      </div>
    );
  }

  const set = <K extends keyof CabeceraDocumentos>(k: K, v: CabeceraDocumentos[K]) => {
    setOk(false);
    setCfg(c => c && { ...c, [k]: v });
  };
  const setHito = (i: number, patch: Partial<HitoCabecera>) =>
    set('hitos', cfg.hitos.map((h, k) => (k === i ? { ...h, ...patch } : h)));
  const moverHito = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= cfg.hitos.length) return;
    const hitos = [...cfg.hitos];
    [hitos[i], hitos[j]] = [hitos[j], hitos[i]];
    set('hitos', hitos);
  };

  const guardar = async () => {
    if (!cfg.nombre.trim()) { setError('El nombre de la institución es requerido.'); return; }
    setGuardando(true); setError('');
    try {
      const { cabecera } = await documentosPresidenciaApi.guardarCabecera({
        ...cfg, hitos: cfg.hitos.filter(h => h.texto.trim()),
      });
      actualizarCabeceraCache(cabecera);
      setCfg(normalizarCabecera(cabecera));
      setOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la cabecera');
    } finally { setGuardando(false); }
  };

  return (
    <div className={base.modalOverlay} onClick={onClose}>
      <div className={`${base.modal} ${styles.modal}`} onClick={e => e.stopPropagation()}>
        <div className={base.modalHeader}>
          <span>Cabecera de los documentos</span>
          <button className={base.closeBtn} onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className={styles.body}>
          <div className={styles.form}>
            {error && <div className={base.errorBox}>{error}</div>}

            <section className={styles.section}>
              <div className={styles.sectionTitle}>Identidad</div>
              <div className={base.fieldRow}>
                <div className={base.field}>
                  <label>Texto superior</label>
                  <input value={cfg.subtitulo} maxLength={60} onChange={e => set('subtitulo', e.target.value)} />
                </div>
                <div className={base.field}>
                  <label>Nombre *</label>
                  <input value={cfg.nombre} maxLength={40} onChange={e => set('nombre', e.target.value)} />
                </div>
              </div>
              <div className={base.field}>
                <label>Nombre legal</label>
                <textarea rows={2} maxLength={160} value={cfg.nombre_legal} onChange={e => set('nombre_legal', e.target.value)} />
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <div className={styles.sectionTitle}>Hitos institucionales</div>
                <span className={styles.counter}>{cfg.hitos.length}/{MAX_HITOS_CABECERA}</span>
              </div>
              <p className={styles.hint}>Personería, reconocimientos, certificaciones… Los destacados van en negrita azul; el resto en texto gris pequeño.</p>
              {cfg.hitos.map((h, i) => (
                <div key={i} className={styles.hito}>
                  <span className={styles.hitoNum}>{i + 1}</span>
                  <input className={styles.hitoInput} value={h.texto} maxLength={160}
                    placeholder="Ej. Certificación ISO 9001 - 2027"
                    onChange={e => setHito(i, { texto: e.target.value })} />
                  <button type="button"
                    className={`${styles.chip} ${h.destacado ? styles.chipOn : ''}`}
                    onClick={() => setHito(i, { destacado: !h.destacado })}
                    title="Mostrar en negrita">
                    {h.destacado ? '★ Destacado' : '☆ Normal'}
                  </button>
                  <div className={styles.hitoActions}>
                    <button type="button" onClick={() => moverHito(i, -1)} disabled={i === 0} title="Subir">↑</button>
                    <button type="button" onClick={() => moverHito(i, 1)} disabled={i === cfg.hitos.length - 1} title="Bajar">↓</button>
                    <button type="button" className={styles.danger} title="Quitar"
                      onClick={() => set('hitos', cfg.hitos.filter((_, k) => k !== i))}>✕</button>
                  </div>
                </div>
              ))}
              {cfg.hitos.length < MAX_HITOS_CABECERA && (
                <button type="button" className={styles.addBtn}
                  onClick={() => set('hitos', [...cfg.hitos, { texto: '', destacado: false }])}>
                  + Agregar hito
                </button>
              )}
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <div className={styles.sectionTitle}>Membresía O.B.A.</div>
                <label className={styles.switch}>
                  <input type="checkbox" checked={cfg.membresia.mostrar}
                    onChange={e => set('membresia', { ...cfg.membresia, mostrar: e.target.checked })} />
                  Mostrar escudo
                </label>
              </div>
              {cfg.membresia.mostrar && (
                <>
                  <div className={base.fieldRow}>
                    <div className={base.field}>
                      <label>Calidad</label>
                      <input value={cfg.membresia.titulo} maxLength={40}
                        onChange={e => set('membresia', { ...cfg.membresia, titulo: e.target.value })} />
                    </div>
                    <div className={base.field}>
                      <label>Fecha</label>
                      <input value={cfg.membresia.fecha} maxLength={60}
                        onChange={e => set('membresia', { ...cfg.membresia, fecha: e.target.value })} />
                    </div>
                  </div>
                  <div className={base.field}>
                    <label>Organización</label>
                    <input value={cfg.membresia.organizacion} maxLength={80}
                      onChange={e => set('membresia', { ...cfg.membresia, organizacion: e.target.value })} />
                  </div>
                </>
              )}
            </section>

            <section className={styles.section}>
              <div className={styles.sectionTitle}>Contacto</div>
              <div className={styles.grid3}>
                <div className={base.field}>
                  <label>Teléfono</label>
                  <input value={cfg.contacto.telefono} maxLength={40}
                    onChange={e => set('contacto', { ...cfg.contacto, telefono: e.target.value })} />
                </div>
                <div className={base.field}>
                  <label>Sitio web</label>
                  <input value={cfg.contacto.web} maxLength={80}
                    onChange={e => set('contacto', { ...cfg.contacto, web: e.target.value })} />
                </div>
                <div className={base.field}>
                  <label>Correo</label>
                  <input value={cfg.contacto.email} maxLength={80}
                    onChange={e => set('contacto', { ...cfg.contacto, email: e.target.value })} />
                </div>
              </div>
            </section>
          </div>

          <aside className={styles.previewCol}>
            <div className={styles.sectionTitle}>Vista previa</div>
            <div className={styles.previewFrame}>
              {preview
                ? <iframe title="Vista previa de la cabecera" src={`${preview}#toolbar=0&navpanes=0&view=FitH`} />
                : <p className={base.empty}>Generando…</p>}
            </div>
            <button type="button" className={styles.resetBtn}
              onClick={() => { setCfg(structuredClone(CABECERA_POR_DEFECTO)); setOk(false); }}>
              Restaurar valores por defecto
            </button>
          </aside>
        </div>

        <div className={base.modalFooter}>
          {ok && <span className={styles.okMsg}>✓ Cabecera guardada. Se usará en los próximos PDF.</span>}
          <button className={base.secondaryBtn} onClick={onClose}>Cerrar</button>
          <button className={base.primaryBtn} onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cabecera'}
          </button>
        </div>
      </div>
    </div>
  );
}
