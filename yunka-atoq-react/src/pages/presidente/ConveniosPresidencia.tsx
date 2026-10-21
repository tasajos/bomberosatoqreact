import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { documentosPresidenciaApi, type ContenidoConvenio, type DocumentoPresidencia } from '../../services/api';
import { generarConvenioPDF, nombreArchivo } from '../../utils/documentosPdf';
import { plantillaConvenio, venceConvenio } from '../../utils/conveniosPdf';
import styles from './CertificadosPresidencia.module.css';
import extra from './ConveniosPresidencia.module.css';

type Lista = 'ambitos' | 'objetivos' | 'compromisos_contraparte' | 'compromisos_yunka' | 'financiamiento';
const hoy = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date());
const fechaBo = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('es-BO');

function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
/** Reduce el logo a 320 px como PNG para no inflar el documento guardado. */
function reducirLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const escala = Math.min(1, 320 / Math.max(img.width, img.height)), canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * escala); canvas.height = Math.round(img.height * escala);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url); resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen del logo.')); };
    img.src = url;
  });
}
/** Estado del convenio según su fecha de vencimiento. */
function estadoConvenio(d: DocumentoPresidencia) {
  const c = d.contenido as ContenidoConvenio, vence = venceConvenio(d.fecha.slice(0, 10), c.vigencia?.anios ?? 1);
  const dias = Math.round((Date.parse(`${vence}T12:00:00`) - Date.parse(`${hoy()}T12:00:00`)) / 864e5);
  return { vence, estado: dias < 0 ? (c.vigencia?.renovacion ? 'Renovación automática' : 'Vencido') : dias <= 90 ? `Vence en ${dias} días` : 'Vigente', clase: dias < 0 && !c.vigencia?.renovacion ? extra.vencido : dias <= 90 ? extra.porVencer : extra.vigente };
}

export default function ConveniosPresidencia() {
  const { user } = useAuth();
  const [contenido, setContenido] = useState<ContenidoConvenio>(() => plantillaConvenio('cbvp'));
  const [fecha, setFecha] = useState(hoy());
  const [firmante, setFirmante] = useState({ nombre: user?.nombre || '', cargo: 'Presidente de la Fundación' });
  const [editando, setEditando] = useState<DocumentoPresidencia | null>(null);
  const [registros, setRegistros] = useState<DocumentoPresidencia[]>([]);
  const [preview, setPreview] = useState(''), [modificado, setModificado] = useState(true);
  const [ocupado, setOcupado] = useState(false), [error, setError] = useState(''), [aviso, setAviso] = useState(''), [avisoLibro, setAvisoLibro] = useState('');

  const cargarLibro = useCallback(() => documentosPresidenciaApi.list('convenio').then(r => { setRegistros(r.data); setAvisoLibro(''); })
    .catch(() => setAvisoLibro('No se pudo cargar el registro de convenios. Compruebe que el backend esté actualizado.')), []);
  useEffect(() => { void cargarLibro(); }, [cargarLibro]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const tocar = () => { setModificado(true); setAviso(''); };
  const set = <K extends keyof ContenidoConvenio>(k: K, v: ContenidoConvenio[K]) => { setContenido(c => ({ ...c, [k]: v })); tocar(); };
  const setParte = (k: keyof ContenidoConvenio['contraparte'], v: string | null) => { setContenido(c => ({ ...c, contraparte: { ...c.contraparte, [k]: v } })); tocar(); };
  const setVigencia = (k: keyof ContenidoConvenio['vigencia'], v: string | number | boolean) => { setContenido(c => ({ ...c, vigencia: { ...c.vigencia, [k]: v } })); tocar(); };
  const lineas = (k: Lista) => contenido[k].join('\n');
  const setLineas = (k: Lista, texto: string) => set(k, texto.split('\n'));

  // Documento armado desde el formulario (para vista previa y registro).
  const armar = (base?: DocumentoPresidencia): DocumentoPresidencia => ({
    id: base?.id ?? 0, tipo: 'convenio', numero: base?.numero ?? 0, anio: base?.anio ?? Number(fecha.slice(0, 4)),
    codigo_completo: base?.codigo_completo ?? '', titulo: tituloRegistro(), fecha, firmante_nombre: firmante.nombre, firmante_cargo: firmante.cargo,
    contenido: { ...contenido, ambitos: contenido.ambitos.filter(x => x.trim()), objetivos: contenido.objetivos.filter(x => x.trim()) },
    creado_por: null, creado_nombre: null, created_at: '', updated_at: '', voluntarios: [],
  });
  const tituloRegistro = () => `${contenido.titulo} con ${contenido.contraparte.sigla || contenido.contraparte.nombre}`.slice(0, 200);

  function validar() {
    const c = contenido, faltan: string[] = [];
    if (!c.titulo.trim()) faltan.push('tipo de convenio');
    if (!c.contraparte.nombre.trim()) faltan.push('nombre de la contraparte');
    if (!c.contraparte.representante.trim()) faltan.push('representante de la contraparte');
    if (!c.contraparte.cargo.trim()) faltan.push('cargo del representante');
    if (!c.proposito.trim()) faltan.push('objeto o propósito');
    if (!c.compromisos_contraparte.some(x => x.trim()) || !c.compromisos_yunka.some(x => x.trim())) faltan.push('compromisos de ambas partes');
    if (!fecha) faltan.push('fecha de firma');
    if (!(c.vigencia.anios >= 1 && c.vigencia.anios <= 50)) faltan.push('vigencia (1 a 50 años)');
    if (!(c.vigencia.preaviso_dias >= 1 && c.vigencia.preaviso_dias <= 365)) faltan.push('días de preaviso');
    if (!firmante.nombre.trim() || !firmante.cargo.trim()) faltan.push('firmante de la Fundación');
    if (faltan.length) throw new Error(`Complete: ${faltan.join(', ')}.`);
  }

  async function vistaPrevia() {
    setOcupado(true); setError('');
    try { const pdf = await generarConvenioPDF(armar(editando ?? undefined), !editando); setPreview(URL.createObjectURL(pdf.output('blob'))); setModificado(false); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo generar la vista previa.'); }
    finally { setOcupado(false); }
  }

  async function registrar() {
    setOcupado(true); setError(''); setAviso('');
    try {
      validar();
      const datos = { tipo: 'convenio' as const, titulo: tituloRegistro(), fecha, contenido: armar().contenido, firmante_nombre: firmante.nombre, firmante_cargo: firmante.cargo };
      const id = editando ? (await documentosPresidenciaApi.update(editando.id, datos), editando.id) : (await documentosPresidenciaApi.create(datos)).id;
      const guardado = await documentosPresidenciaApi.get(id);
      const pdf = await generarConvenioPDF(guardado);
      const blob = pdf.output('blob');
      setPreview(URL.createObjectURL(blob)); setModificado(false); setEditando(guardado);
      descargarBlob(blob, nombreArchivo(guardado));
      setAviso(`${guardado.codigo_completo} ${editando ? 'actualizado' : 'registrado'} y descargado.`);
      void cargarLibro();
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo registrar el convenio.'); }
    finally { setOcupado(false); }
  }

  function abrir(d: DocumentoPresidencia) {
    const base = plantillaConvenio('blanco'), c = d.contenido as ContenidoConvenio;
    setContenido({ ...base, ...c, contraparte: { ...base.contraparte, ...c.contraparte }, vigencia: { ...base.vigencia, ...c.vigencia } });
    setFecha(d.fecha.slice(0, 10)); setFirmante({ nombre: d.firmante_nombre, cargo: d.firmante_cargo }); setEditando(d);
    setPreview(''); setModificado(true); setError(''); setAviso(`Editando ${d.codigo_completo}. Al guardar se conserva su número.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function nuevo(modelo: 'cbvp' | 'blanco') {
    setContenido(plantillaConvenio(modelo)); setFecha(hoy()); setEditando(null); setPreview(''); setModificado(true); setError(''); setAviso('');
  }
  async function descargar(d: DocumentoPresidencia) {
    setOcupado(true); setError('');
    try { descargarBlob((await generarConvenioPDF(d)).output('blob'), nombreArchivo(d)); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo generar el PDF.'); } finally { setOcupado(false); }
  }
  async function eliminar(d: DocumentoPresidencia) {
    if (!window.confirm(`¿Eliminar el ${d.codigo_completo}? Su número no se reutiliza.`)) return;
    setOcupado(true); setError('');
    try { await documentosPresidenciaApi.remove(d.id); if (editando?.id === d.id) nuevo('blanco'); void cargarLibro(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo eliminar.'); } finally { setOcupado(false); }
  }

  const texto = (label: string, valor: string, cambio: (v: string) => void, op: { max?: number; placeholder?: string; type?: string } = {}) =>
    <label className={styles.field}><span>{label}</span><input type={op.type || 'text'} value={valor} maxLength={op.max ?? 200} placeholder={op.placeholder} onChange={e => cambio(e.target.value)} /></label>;
  const area = (label: string, valor: string, cambio: (v: string) => void, filas = 4, placeholder = '') =>
    <label className={styles.field}><span>{label}</span><textarea rows={filas} maxLength={6000} value={valor} placeholder={placeholder} onChange={e => cambio(e.target.value)} /></label>;
  const vence = fecha ? venceConvenio(fecha, contenido.vigencia.anios || 1) : '';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div><h1>Convenios interinstitucionales</h1><p>Convenio en A4 con membrete institucional, partes, objeto, objetivos, compromisos, tiempos y firmas. Numeración correlativa CONV N° 001/AAAA.</p></div>
        <div className={styles.actions}>
          <button className={styles.secondary} disabled={ocupado} onClick={() => nuevo('cbvp')}>Nuevo · modelo CBVP</button>
          <button className={styles.secondary} disabled={ocupado} onClick={() => nuevo('blanco')}>Nuevo en blanco</button>
        </div>
      </header>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {aviso && <p role="status" className={styles.success}>{aviso}</p>}
      <div className={styles.layout}>
        <form className={styles.form} onSubmit={e => { e.preventDefault(); void vistaPrevia(); }}>
          <fieldset disabled={ocupado} className={styles.fields}>
            <section>
              <h2>Convenio y contraparte</h2>
              {texto('Tipo de convenio (título)', contenido.titulo, v => set('titulo', v), { max: 160 })}
              <div className={styles.row}>
                <label className={styles.field}><span>Artículo</span><select value={contenido.contraparte.articulo} onChange={e => setParte('articulo', e.target.value)}><option value="el">el</option><option value="la">la</option><option value="los">los</option><option value="las">las</option><option value="">(ninguno)</option></select></label>
                {texto('Sigla', contenido.contraparte.sigla, v => setParte('sigla', v), { max: 20, placeholder: 'CBVP' })}
              </div>
              {texto('Institución con la que se firma', contenido.contraparte.nombre, v => setParte('nombre', v), { max: 200, placeholder: 'Cuerpo de Bomberos Voluntarios del Paraguay' })}
              <div className={styles.row}>
                {texto('País', contenido.contraparte.pais, v => setParte('pais', v), { max: 60 })}
                {texto('Cargo del representante', contenido.contraparte.cargo, v => setParte('cargo', v), { max: 100 })}
              </div>
              {texto('Representante que firma', contenido.contraparte.representante, v => setParte('representante', v), { max: 150, placeholder: 'Nombre y apellidos' })}
              <label className={styles.field}><span>Logo de la contraparte (opcional, va en el membrete)</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; try { setParte('logo', await reducirLogo(f)); } catch (err) { setError(err instanceof Error ? err.message : 'Logo inválido'); } }} /></label>
              {contenido.contraparte.logo && <div className={extra.logo}><img src={contenido.contraparte.logo} alt="Logo de la contraparte" /><button type="button" className={styles.secondary} onClick={() => setParte('logo', null)}>Quitar logo</button></div>}
            </section>
            <section>
              <h2>Objeto, propósito y objetivos</h2>
              {area('Objeto / propósito del convenio', contenido.proposito, v => set('proposito', v), 4)}
              {area('Ámbitos de cooperación (uno por línea)', lineas('ambitos'), v => setLineas('ambitos', v), 5)}
              {area('Objetivos específicos (uno por línea, opcional)', lineas('objetivos'), v => setLineas('objetivos', v), 3, 'Capacitar a voluntarios en…\nRealizar simulacros conjuntos…')}
            </section>
            <section>
              <h2>Compromisos de las partes</h2>
              {area(`Compromisos de ${contenido.contraparte.sigla || 'la contraparte'} (uno por línea)`, lineas('compromisos_contraparte'), v => setLineas('compromisos_contraparte', v), 6)}
              {area('Compromisos de Yunka Atoq (uno por línea)', lineas('compromisos_yunka'), v => setLineas('compromisos_yunka', v), 6)}
            </section>
            <section>
              <h2>Coordinación y financiamiento</h2>
              {area('Mecanismos de coordinación', contenido.coordinacion, v => set('coordinacion', v), 4)}
              {area('Fuentes de financiamiento (una por línea)', lineas('financiamiento'), v => setLineas('financiamiento', v), 4)}
            </section>
            <section>
              <h2>Tiempos y vigencia</h2>
              <div className={styles.row}>
                <label className={styles.field}><span>Fecha de firma</span><input type="date" value={fecha} onChange={e => { setFecha(e.target.value); tocar(); }} /></label>
                <label className={styles.field}><span>Vigencia (años)</span><input type="number" min={1} max={50} step={1} value={contenido.vigencia.anios} onChange={e => setVigencia('anios', Number(e.target.value))} /></label>
              </div>
              <div className={styles.row}>
                <label className={styles.field}><span>Preaviso de resolución (días)</span><input type="number" min={1} max={365} step={1} value={contenido.vigencia.preaviso_dias} onChange={e => setVigencia('preaviso_dias', Number(e.target.value))} /></label>
                <div className={styles.control}><span>Vence</span><strong>{vence ? fechaBo(vence) : '—'}</strong></div>
              </div>
              <div className={styles.row}>
                {texto('Ciudad de firma', contenido.vigencia.ciudad, v => setVigencia('ciudad', v), { max: 80 })}
                {texto('País de firma', contenido.vigencia.pais, v => setVigencia('pais', v), { max: 60 })}
              </div>
              <label className={styles.check}><input type="checkbox" checked={contenido.vigencia.renovacion} onChange={e => setVigencia('renovacion', e.target.checked)} /><span>Renovación automática por períodos similares</span></label>
            </section>
            <section>
              <h2>Cláusulas adicionales</h2>
              {contenido.clausulas.map((cl, i) => <div key={i} className={extra.clausula}>
                {texto(`Título de la cláusula ${i + 1}`, cl.titulo, v => set('clausulas', contenido.clausulas.map((x, j) => j === i ? { ...x, titulo: v } : x)), { max: 120 })}
                {area('Texto', cl.texto, v => set('clausulas', contenido.clausulas.map((x, j) => j === i ? { ...x, texto: v } : x)), 3)}
                <button type="button" className={styles.secondary} onClick={() => set('clausulas', contenido.clausulas.filter((_, j) => j !== i))}>Quitar cláusula</button>
              </div>)}
              <button type="button" className={styles.secondary} onClick={() => set('clausulas', [...contenido.clausulas, { titulo: '', texto: '' }])}>Agregar cláusula</button>
              <p className={styles.hint}>Se insertan después de «Modificaciones y resolución»; la numeración (PRIMERA, SEGUNDA…) se ajusta sola.</p>
            </section>
            <section>
              <h2>Firma de la Fundación</h2>
              {texto('Nombre del firmante', firmante.nombre, v => { setFirmante(f => ({ ...f, nombre: v })); tocar(); }, { max: 150 })}
              {texto('Cargo', firmante.cargo, v => { setFirmante(f => ({ ...f, cargo: v })); tocar(); }, { max: 100 })}
              <div className={styles.control}><span>Código del convenio</span><strong>{editando?.codigo_completo || `CONV N° …/${fecha.slice(0, 4) || 'AAAA'}`}</strong>
                <small>Se asigna al registrar. La vista previa es un borrador con marca de agua y no consume números.</small></div>
            </section>
            <div className={styles.actions}>
              <button className={styles.secondary} type="submit">{ocupado ? 'Generando…' : 'Actualizar vista previa'}</button>
              <button className={styles.primary} type="button" onClick={registrar}>{ocupado ? 'Procesando…' : editando ? 'Guardar cambios y descargar' : 'Registrar y descargar'}</button>
            </div>
          </fieldset>
        </form>
        <section className={styles.preview} aria-label="Vista previa del convenio">
          <div className={styles.previewHeader}><h2>Vista previa</h2><span>A4 · Vertical · {editando ? editando.codigo_completo : 'Borrador'}</span></div>
          {preview ? <>
            {modificado && <p className={styles.pending}>Hay cambios pendientes de actualizar en la vista previa.</p>}
            <iframe src={preview} title="Convenio" className={styles.pdf} />
            <a className={styles.openPdf} href={preview} target="_blank" rel="noreferrer">Abrir vista previa en otra pestaña</a>
          </> : <div className={styles.empty}>
            <img src="/yunka_atoq_transparente.png" alt="Escudo Yunka Atoq" />
            <h3>Convenio institucional</h3><p>Complete las partes, el objeto y los compromisos, y genere la vista previa.</p>
            <button className={styles.primary} disabled={ocupado} onClick={vistaPrevia}>Generar vista previa</button>
          </div>}
        </section>
      </div>
      <section className={styles.book}>
        <div className={styles.previewHeader}><h2>Registro de convenios</h2><button className={styles.secondary} onClick={() => void cargarLibro()} disabled={ocupado}>Actualizar</button></div>
        {avisoLibro && <p role="status" className={styles.hint}>{avisoLibro}</p>}
        {!avisoLibro && registros.length === 0 && <p className={styles.hint}>Todavía no hay convenios registrados. El primero será CONV N° 001/{fecha.slice(0, 4)}.</p>}
        {registros.length > 0 && <div className={styles.tableWrap}><table><thead><tr><th>Código / Contraparte</th><th>Firma</th><th>Vigencia</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>{registros.map(d => { const c = d.contenido as ContenidoConvenio, e = estadoConvenio(d); return <tr key={d.id}>
            <td><strong>{d.codigo_completo}</strong><br />{c.contraparte?.nombre}{c.contraparte?.sigla ? ` (${c.contraparte.sigla})` : ''}</td>
            <td>{fechaBo(d.fecha)}<br />{c.vigencia?.ciudad}</td>
            <td>{c.vigencia?.anios} año(s) · vence {fechaBo(e.vence)}</td>
            <td><span className={`${extra.estado} ${e.clase}`}>{e.estado}</span></td>
            <td className={extra.acciones}><button className={styles.secondary} disabled={ocupado} onClick={() => abrir(d)}>Editar</button><button className={styles.secondary} disabled={ocupado} onClick={() => void descargar(d)}>PDF</button><button className={styles.secondary} disabled={ocupado} onClick={() => void eliminar(d)}>Eliminar</button></td>
          </tr>; })}</tbody></table></div>}
      </section>
    </div>
  );
}
