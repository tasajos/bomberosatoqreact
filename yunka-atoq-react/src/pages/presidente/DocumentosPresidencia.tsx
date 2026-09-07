import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  documentosPresidenciaApi, personalApi,
  type DocumentoPresidencia, type TipoDocumentoPresidencia,
  type ContenidoResolucion, type ContenidoPasos, type PersonalItem,
} from '../../services/api';
import { descargarDocumentoPDF, compartirDocumentoPDF } from '../../utils/documentosPdf';
import { MOTIVOS_RESOLUCION } from '../../utils/motivosResolucion';
import { GRADOS, RankBadgeSVG } from '../../utils/rankBadge';
import styles from './DocumentosPresidencia.module.css';

const ROTULOS: Record<TipoDocumentoPresidencia, { singular: string; plural: string }> = {
  resolucion:    { singular: 'Resolución',    plural: 'Resoluciones' },
  procedimiento: { singular: 'Procedimiento', plural: 'Procedimientos' },
  protocolo:     { singular: 'Protocolo',     plural: 'Protocolos' },
};

const CARGO_DEFECTO = 'PRESIDENTE DE LA FUNDACIÓN\nREPRESENTANTE LEGAL\nYUNKA ATOQ';
const hoy = () => new Date().toISOString().slice(0, 10);

type VoluntarioSel = { id: number; rol: string };

type FormState = {
  titulo: string;
  fecha: string;
  firmante_nombre: string;
  firmante_cargo: string;
  voluntarios: VoluntarioSel[];
  // resolución
  motivo: string;
  vistos: string;
  considerandos: string[];
  articulos: { numero: number; titulo: string; texto: string }[];
  gradoActual: string;
  gradoNuevo: string;
  // procedimiento / protocolo
  objetivo: string;
  alcance: string;
  pasos: { numero: number; titulo: string; descripcion: string }[];
};

function formVacio(firmanteDefault: string): FormState {
  return {
    titulo: '', fecha: hoy(), firmante_nombre: firmanteDefault, firmante_cargo: CARGO_DEFECTO,
    voluntarios: [],
    motivo: '', vistos: '', considerandos: [''], articulos: [{ numero: 1, titulo: '', texto: '' }],
    gradoActual: '', gradoNuevo: '',
    objetivo: '', alcance: '', pasos: [{ numero: 1, titulo: '', descripcion: '' }],
  };
}

function formDesdeDocumento(doc: DocumentoPresidencia): FormState {
  const base = formVacio(doc.firmante_nombre);
  const voluntarios = doc.voluntarios.map(v => ({ id: v.voluntario_id, rol: v.rol || '' }));
  if (doc.tipo === 'resolucion') {
    const c = doc.contenido as ContenidoResolucion;
    return {
      ...base,
      titulo: doc.titulo, fecha: doc.fecha.slice(0, 10),
      firmante_nombre: doc.firmante_nombre, firmante_cargo: doc.firmante_cargo,
      voluntarios,
      vistos: c.vistos || '',
      considerandos: c.considerandos?.length ? c.considerandos : [''],
      articulos: c.articulos?.length ? c.articulos.map(a => ({ ...a, titulo: a.titulo || '' })) : [{ numero: 1, titulo: '', texto: '' }],
      gradoActual: c.gradoActual || '', gradoNuevo: c.gradoNuevo || '',
    };
  }
  const c = doc.contenido as ContenidoPasos;
  return {
    ...base,
    titulo: doc.titulo, fecha: doc.fecha.slice(0, 10),
    firmante_nombre: doc.firmante_nombre, firmante_cargo: doc.firmante_cargo,
    voluntarios,
    objetivo: c.objetivo || '', alcance: c.alcance || '',
    pasos: c.pasos?.length ? c.pasos : [{ numero: 1, titulo: '', descripcion: '' }],
  };
}

export default function DocumentosPresidencia({ tipo }: { tipo: TipoDocumentoPresidencia }) {
  const { user } = useAuth();
  const rotulo = ROTULOS[tipo];

  const [documentos, setDocumentos] = useState<DocumentoPresidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [personal, setPersonal] = useState<PersonalItem[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<DocumentoPresidencia | null>(null);
  const [form, setForm] = useState<FormState>(formVacio(''));
  const [buscarVoluntario, setBuscarVoluntario] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    documentosPresidenciaApi.list(tipo)
      .then(r => setDocumentos(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [tipo]);

  useEffect(() => {
    personalApi.list().then(setPersonal).catch(() => {});
  }, []);

  const abrirCrear = () => {
    setEditando(null);
    setForm(formVacio(user?.nombre || ''));
    setBuscarVoluntario('');
    setError('');
    setModalAbierto(true);
  };

  const abrirEditar = (doc: DocumentoPresidencia) => {
    setEditando(doc);
    setForm(formDesdeDocumento(doc));
    setBuscarVoluntario('');
    setError('');
    setModalAbierto(true);
  };

  const cerrarModal = () => setModalAbierto(false);

  const aplicarMotivo = (motivoId: string) => {
    const m = MOTIVOS_RESOLUCION.find(x => x.id === motivoId);
    if (!m) { setForm(f => ({ ...f, motivo: motivoId })); return; }
    setForm(f => ({
      ...f,
      motivo: motivoId,
      vistos: m.vistos,
      considerandos: m.considerandos.length ? m.considerandos : [''],
      articulos: [{ numero: 1, titulo: m.articulo.titulo, texto: m.articulo.texto }],
      gradoActual: '', gradoNuevo: '',
    }));
  };

  const gradoLabel = (v: string) => GRADOS.find(g => g.value === v)?.label || '';

  const elegirGrado = (campo: 'gradoActual' | 'gradoNuevo', valor: string) => {
    setForm(f => {
      const gradoActual = campo === 'gradoActual' ? valor : f.gradoActual;
      const gradoNuevo = campo === 'gradoNuevo' ? valor : f.gradoNuevo;
      const actualLabel = gradoLabel(gradoActual) || '—';
      const nuevoLabel = gradoLabel(gradoNuevo) || '—';
      return {
        ...f,
        gradoActual, gradoNuevo,
        articulos: [{
          numero: 1,
          titulo: `OTORGAR EL ASCENSO AL GRADO DE ${nuevoLabel.toUpperCase()}`,
          texto: `Confiérase el ascenso del grado de ${actualLabel} al grado de ${nuevoLabel} al(los) siguiente(s) voluntario(s), por cumplir con los requisitos y la antigüedad establecidos en el Estatuto Orgánico:`,
        }],
      };
    });
  };

  const toggleVoluntario = (id: number) => {
    setForm(f => ({
      ...f,
      voluntarios: f.voluntarios.some(v => v.id === id)
        ? f.voluntarios.filter(v => v.id !== id)
        : [...f.voluntarios, { id, rol: '' }],
    }));
  };

  const setRolVoluntario = (id: number, rol: string) => {
    setForm(f => ({ ...f, voluntarios: f.voluntarios.map(v => v.id === id ? { ...v, rol } : v) }));
  };

  const personalVisible = useMemo(() => {
    const s = buscarVoluntario.toLowerCase();
    return personal.filter(p =>
      !s || `${p.nombre} ${p.apellido_paterno} ${p.matricula}`.toLowerCase().includes(s)
    );
  }, [personal, buscarVoluntario]);

  const guardar = async () => {
    if (!form.titulo.trim()) { setError('El título es obligatorio.'); return; }
    setGuardando(true);
    setError('');
    try {
      const contenido: ContenidoResolucion | ContenidoPasos = tipo === 'resolucion'
        ? {
            vistos: form.vistos,
            considerandos: form.considerandos.filter(c => c.trim()),
            articulos: form.articulos.filter(a => a.texto.trim() || a.titulo.trim()),
            gradoActual: form.gradoActual || undefined,
            gradoNuevo: form.gradoNuevo || undefined,
          }
        : {
            objetivo: form.objetivo,
            alcance: form.alcance,
            pasos: form.pasos.filter(p => p.titulo.trim() || p.descripcion.trim()),
          };

      const payload = {
        tipo, titulo: form.titulo, fecha: form.fecha, contenido,
        firmante_nombre: form.firmante_nombre, firmante_cargo: form.firmante_cargo,
        voluntarios: form.voluntarios.map(v => ({ voluntario_id: v.id, rol: v.rol })),
      };

      if (editando) await documentosPresidenciaApi.update(editando.id, payload);
      else await documentosPresidenciaApi.create(payload);

      setModalAbierto(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (doc: DocumentoPresidencia) => {
    if (!confirm(`¿Eliminar ${doc.codigo_completo}? Esta acción no se puede deshacer.`)) return;
    setBusy(doc.id);
    try { await documentosPresidenciaApi.remove(doc.id); load(); }
    catch { /* noop */ } finally { setBusy(null); }
  };

  const descargar = async (doc: DocumentoPresidencia) => {
    setBusy(doc.id);
    try { await descargarDocumentoPDF(doc); } finally { setBusy(null); }
  };

  const compartir = async (doc: DocumentoPresidencia) => {
    setBusy(doc.id);
    try { await compartirDocumentoPDF(doc); } finally { setBusy(null); }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.headerTitle}>{rotulo.plural}</div>
          <div className={styles.headerSub}>{documentos.length} documento{documentos.length === 1 ? '' : 's'} registrado{documentos.length === 1 ? '' : 's'}</div>
        </div>
        <button className={styles.primaryBtn} onClick={abrirCrear}>+ Nueva {rotulo.singular}</button>
      </div>

      {loading && <p className={styles.empty}>Cargando…</p>}
      {!loading && documentos.length === 0 && (
        <p className={styles.empty}>Aún no se han creado {rotulo.plural.toLowerCase()}.</p>
      )}

      {!loading && documentos.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>N°</th>
                <th>Título</th>
                <th>Fecha</th>
                <th>Voluntarios</th>
                <th>Firmante</th>
                <th className={styles.acciones}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {documentos.map(doc => (
                <tr key={doc.id}>
                  <td className={styles.codigo}>{doc.codigo_completo}</td>
                  <td>{doc.titulo}</td>
                  <td>{new Date(doc.fecha).toLocaleDateString('es-BO')}</td>
                  <td>{doc.voluntarios.length}</td>
                  <td>{doc.firmante_nombre}</td>
                  <td className={styles.acciones}>
                    <button className={styles.iconBtn} disabled={busy === doc.id} onClick={() => abrirEditar(doc)} title="Editar">✏️</button>
                    <button className={styles.iconBtn} disabled={busy === doc.id} onClick={() => descargar(doc)} title="Descargar PDF">⬇️</button>
                    <button className={styles.iconBtn} disabled={busy === doc.id} onClick={() => compartir(doc)} title="Compartir">📤</button>
                    <button className={styles.iconBtnDanger} disabled={busy === doc.id} onClick={() => eliminar(doc)} title="Eliminar">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAbierto && (
        <div className={styles.modalOverlay} onClick={cerrarModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span>{editando ? `Editar ${rotulo.singular}` : `Nueva ${rotulo.singular}`}</span>
              <button className={styles.closeBtn} onClick={cerrarModal}>✕</button>
            </div>

            <div className={styles.modalBody}>
              {error && <div className={styles.errorBox}>{error}</div>}

              {tipo === 'resolucion' && !editando && (
                <div className={styles.field}>
                  <label>Motivo de la resolución (opcional — autocompleta VISTOS / CONSIDERANDO / RESUELVE)</label>
                  <select value={form.motivo} onChange={e => aplicarMotivo(e.target.value)}>
                    <option value="">Seleccionar un motivo…</option>
                    {MOTIVOS_RESOLUCION.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {tipo === 'resolucion' && form.motivo === 'ascenso' && (
                <div className={styles.field}>
                  <label>Grado actual → Nuevo grado</label>
                  <div className={styles.gradosAscenso}>
                    <div>
                      <div className={styles.gradosAscensoLabel}>Grado actual</div>
                      <div className={styles.gradoGrid}>
                        {GRADOS.filter(g => g.value).map(g => (
                          <button key={g.value} type="button"
                            className={`${styles.gradoBtn} ${form.gradoActual === g.value ? styles.gradoBtnActive : ''}`}
                            onClick={() => elegirGrado('gradoActual', g.value)} title={g.label}>
                            <RankBadgeSVG grado={g.value} size={38} />
                            <span className={styles.gradoBtnLabel}>{g.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className={styles.gradosAscensoFlecha}>→</div>
                    <div>
                      <div className={styles.gradosAscensoLabel}>Nuevo grado</div>
                      <div className={styles.gradoGrid}>
                        {GRADOS.filter(g => g.value).map(g => (
                          <button key={g.value} type="button"
                            className={`${styles.gradoBtn} ${form.gradoNuevo === g.value ? styles.gradoBtnActive : ''}`}
                            onClick={() => elegirGrado('gradoNuevo', g.value)} title={g.label}>
                            <RankBadgeSVG grado={g.value} size={38} />
                            <span className={styles.gradoBtnLabel}>{g.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className={styles.fieldRow}>
                <div className={styles.field} style={{ flex: 2 }}>
                  <label>Título</label>
                  <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder={`Título de la ${rotulo.singular.toLowerCase()}`} />
                </div>
                <div className={styles.field}>
                  <label>Fecha</label>
                  <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
                </div>
              </div>

              {tipo === 'resolucion' ? (
                <>
                  <div className={styles.field}>
                    <label>VISTOS</label>
                    <textarea rows={2} value={form.vistos} onChange={e => setForm(f => ({ ...f, vistos: e.target.value }))} placeholder="Antecedentes y base legal/estatutaria que motivan la resolución…" />
                  </div>

                  <div className={styles.field}>
                    <label>CONSIDERANDO</label>
                    {form.considerandos.map((c, i) => (
                      <div key={i} className={styles.listRow}>
                        <span className={styles.listPrefix}>Que,</span>
                        <textarea rows={2} value={c} onChange={e => setForm(f => ({ ...f, considerandos: f.considerandos.map((x, j) => j === i ? e.target.value : x) }))} />
                        <button className={styles.removeBtn} onClick={() => setForm(f => ({ ...f, considerandos: f.considerandos.filter((_, j) => j !== i) }))}>✕</button>
                      </div>
                    ))}
                    <button className={styles.addBtn} onClick={() => setForm(f => ({ ...f, considerandos: [...f.considerandos, ''] }))}>+ Agregar considerando</button>
                  </div>

                  <div className={styles.field}>
                    <label>SE RESUELVE — Artículos</label>
                    {form.articulos.map((a, i) => (
                      <div key={i} className={styles.pasoRow}>
                        <span className={styles.listPrefix}>Art. {i + 1}°</span>
                        <div className={styles.pasoCol}>
                          <input placeholder="Encabezado en mayúsculas (ej. DESIGNAR AL PERSONAL...)" value={a.titulo} onChange={e => setForm(f => ({ ...f, articulos: f.articulos.map((x, j) => j === i ? { ...x, titulo: e.target.value } : x) }))} />
                          <textarea rows={2} placeholder="Texto del artículo" value={a.texto} onChange={e => setForm(f => ({ ...f, articulos: f.articulos.map((x, j) => j === i ? { ...x, texto: e.target.value } : x) }))} />
                        </div>
                        <button className={styles.removeBtn} onClick={() => setForm(f => ({ ...f, articulos: f.articulos.filter((_, j) => j !== i).map((x, j) => ({ ...x, numero: j + 1 })) }))}>✕</button>
                      </div>
                    ))}
                    <button className={styles.addBtn} onClick={() => setForm(f => ({ ...f, articulos: [...f.articulos, { numero: f.articulos.length + 1, titulo: '', texto: '' }] }))}>+ Agregar artículo</button>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.field}>
                    <label>Objetivo</label>
                    <textarea rows={2} value={form.objetivo} onChange={e => setForm(f => ({ ...f, objetivo: e.target.value }))} />
                  </div>
                  <div className={styles.field}>
                    <label>Alcance</label>
                    <textarea rows={2} value={form.alcance} onChange={e => setForm(f => ({ ...f, alcance: e.target.value }))} />
                  </div>
                  <div className={styles.field}>
                    <label>Pasos</label>
                    {form.pasos.map((p, i) => (
                      <div key={i} className={styles.pasoRow}>
                        <span className={styles.listPrefix}>{i + 1}.</span>
                        <div className={styles.pasoCol}>
                          <input placeholder="Título del paso" value={p.titulo} onChange={e => setForm(f => ({ ...f, pasos: f.pasos.map((x, j) => j === i ? { ...x, titulo: e.target.value } : x) }))} />
                          <textarea rows={2} placeholder="Descripción" value={p.descripcion} onChange={e => setForm(f => ({ ...f, pasos: f.pasos.map((x, j) => j === i ? { ...x, descripcion: e.target.value } : x) }))} />
                        </div>
                        <button className={styles.removeBtn} onClick={() => setForm(f => ({ ...f, pasos: f.pasos.filter((_, j) => j !== i).map((x, j) => ({ ...x, numero: j + 1 })) }))}>✕</button>
                      </div>
                    ))}
                    <button className={styles.addBtn} onClick={() => setForm(f => ({ ...f, pasos: [...f.pasos, { numero: f.pasos.length + 1, titulo: '', descripcion: '' }] }))}>+ Agregar paso</button>
                  </div>
                </>
              )}

              <div className={styles.field}>
                <label>Voluntarios relacionados ({form.voluntarios.length} seleccionados)</label>
                <input
                  className={styles.searchVol}
                  placeholder="Buscar por nombre o matrícula…"
                  value={buscarVoluntario}
                  onChange={e => setBuscarVoluntario(e.target.value)}
                />
                <div className={styles.volList}>
                  {personalVisible.map(p => {
                    const sel = form.voluntarios.find(v => v.id === p.id);
                    return (
                      <div key={p.id} className={styles.volItem}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, cursor: 'pointer' }}>
                          <input type="checkbox" checked={!!sel} onChange={() => toggleVoluntario(p.id)} />
                          <span>{p.nombre} {p.apellido_paterno}</span>
                          <span className={styles.volCode}>{p.matricula}</span>
                        </label>
                        {sel && (
                          <input
                            className={styles.volRolInput}
                            placeholder="Rol (ej. Secretario, Vocal…)"
                            value={sel.rol}
                            onChange={e => setRolVoluntario(p.id, e.target.value)}
                          />
                        )}
                      </div>
                    );
                  })}
                  {personalVisible.length === 0 && <div className={styles.empty}>Sin resultados</div>}
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Firmante</label>
                  <input value={form.firmante_nombre} onChange={e => setForm(f => ({ ...f, firmante_nombre: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label>Cargo (una línea por renglón de firma)</label>
                  <textarea rows={3} value={form.firmante_cargo} onChange={e => setForm(f => ({ ...f, firmante_cargo: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.secondaryBtn} onClick={cerrarModal}>Cancelar</button>
              <button className={styles.primaryBtn} onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : `Crear ${rotulo.singular}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
