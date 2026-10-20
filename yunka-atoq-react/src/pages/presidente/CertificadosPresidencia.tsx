import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { capacitacionesApi, type Capacitacion } from '../../services/api';
import { crearCertificadoPDF, datosCertificadoVacios, nombreArchivoCertificado, haySegundoFirmante,
  prepararRecursosCertificado, validarDisenoCertificado, type DatosCertificado } from '../../utils/certificadosPdf';
import { certificadosApi, urlVerificacionCertificado, type CertificadoRegistrado } from '../../services/certificadosApi';
import styles from './CertificadosPresidencia.module.css';

function aplicarCurso(datos: DatosCertificado, curso: Capacitacion): DatosCertificado {
  return { ...datos, curso: curso.nombre, horas: curso.horas > 0 ? String(curso.horas) : '',
    fechaInicio: curso.fecha?.slice(0, 10) || '', fechaFin: curso.fecha?.slice(0, 10) || '',
    lugar: curso.lugar || datos.lugar, instructor: curso.instructor || '' };
}

function huellaDatos(datos: DatosCertificado): string {
  return JSON.stringify(Object.entries(datos).filter(([key]) => key !== 'codigo').sort(([a],[b]) => a.localeCompare(b)));
}

function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = nombre;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export default function CertificadosPresidencia() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const cursoId = params.get('curso');
  const [datos, setDatos] = useState<DatosCertificado>(() => ({ ...datosCertificadoVacios(), presidente: user?.nombre || '' }));
  const [cursos, setCursos] = useState<Capacitacion[]>([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState(cursoId || '');
  const [preview, setPreview] = useState('');
  const [modificado, setModificado] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [avisoCursos, setAvisoCursos] = useState('');
  const [registros, setRegistros] = useState<CertificadoRegistrado[]>([]);
  const [avisoLibro, setAvisoLibro] = useState('');
  const [emitido, setEmitido] = useState<CertificadoRegistrado | null>(null);
  const emision = useRef<{ huella:string; clave:string; registro?:CertificadoRegistrado; pdf?:Blob } | null>(null);

  const cargarLibro = () => certificadosApi.listar().then(r => { setRegistros(r.data); setAvisoLibro(''); })
    .catch(() => setAvisoLibro('No se pudo cargar el registro de certificados. Comprueba que el backend esté actualizado.'));
  useEffect(() => { void cargarLibro(); }, []);
  useEffect(() => {
    // Una carga anticipada fallida se reintentará al generar, mostrando entonces el error.
    void prepararRecursosCertificado().catch(() => {});
  }, []);

  useEffect(() => {
    let activo = true;
    capacitacionesApi.list().then(lista => {
      if (!activo) return;
      setCursos(lista);
      const curso = lista.find(c => String(c.id) === cursoId);
      if (curso) setDatos(d => aplicarCurso(d, curso));
    }).catch(() => { if (activo) setAvisoCursos('No se pudieron cargar los cursos. Puedes escribir los datos manualmente.'); });
    return () => { activo = false; };
  }, [cursoId]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const cambiar = (campo: keyof DatosCertificado, valor: string) => {
    setDatos(d => ({ ...d, [campo]: valor, codigo:'' }));
    setModificado(true);
    setEmitido(null);
  };

  const emitir = async () => {
    setOcupado(true); setError('');
    try {
      for (const [campo,label] of Object.entries({ participante:'participante', curso:'curso', horas:'carga horaria',
        fechaInicio:'fecha de inicio', fechaFin:'fecha de fin', fechaEmision:'fecha de emisión', lugar:'lugar',
        presidente:'presidente', temario:'temario' })) {
        if (!String(datos[campo as keyof DatosCertificado] || '').trim()) throw new Error(`Completa ${label} antes de emitir.`);
      }
      // El segundo firmante es opcional, pero un cargo sin nombre no se puede firmar
      if (haySegundoFirmante(datos) && !datos.instructor.trim()) {
        throw new Error('Completa el nombre del instructor, o deja vacío también el cargo del segundo firmante para usar una sola firma.');
      }
      const huella = huellaDatos(datos);
      if (!emision.current || emision.current.huella !== huella) emision.current = { huella, clave:crypto.randomUUID() };
      const intento = emision.current;
      // Verifica el texto y los recursos sin renderizar dos veces los logos del PDF.
      if (!intento.pdf && intento.registro?.estado !== 'emitido') await validarDisenoCertificado(datos);
      const reserva = intento.registro || await certificadosApi.reservar(datos,intento.clave);
      intento.registro = reserva;
      let registro = reserva;
      let blob: Blob;
      if (reserva.estado === 'emitido') blob = intento.pdf || await certificadosApi.descargar(reserva);
      else {
        if (!intento.pdf) {
          const pdf = await crearCertificadoPDF(reserva.datos,{ urlVerificacion:urlVerificacionCertificado(reserva) });
          intento.pdf = pdf.output('blob');
        }
        blob = intento.pdf;
        registro = await certificadosApi.subirPDF(reserva.id,blob);
        intento.registro = registro;
      }
      intento.pdf = blob;
      setEmitido(registro); setPreview(URL.createObjectURL(blob)); setModificado(false);
      descargarBlob(blob,`${registro.codigo}.pdf`);
      void cargarLibro();
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo emitir el certificado.'); void cargarLibro(); }
    finally { setOcupado(false); }
  };

  const retomar = (registro: CertificadoRegistrado) => {
    setDatos(registro.datos); setEmitido(null); setModificado(true); setError('');
    emision.current = { huella:huellaDatos(registro.datos), clave:crypto.randomUUID(), registro };
    window.scrollTo({ top:0, behavior:'smooth' });
  };

  const descargarOriginal = async (registro: CertificadoRegistrado) => {
    setOcupado(true); setError('');
    try {
      const blob = emision.current?.registro?.id === registro.id && emision.current.pdf
        ? emision.current.pdf : await certificadosApi.descargar(registro);
      descargarBlob(blob,`${registro.codigo}.pdf`);
    }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo descargar el original.'); }
    finally { setOcupado(false); }
  };

  const generar = async (descargar: boolean, plantilla = false) => {
    setOcupado(true); setError('');
    try {
      if (!plantilla && emitido && !modificado) {
        const blob = emision.current?.registro?.id === emitido.id && emision.current.pdf
          ? emision.current.pdf : await certificadosApi.descargar(emitido);
        setPreview(URL.createObjectURL(blob));
        return;
      }
      const valores = plantilla ? { ...datosCertificadoVacios(), lugar: '', fechaEmision: '' } : datos;
      const pdf = await crearCertificadoPDF(valores);
      if (descargar) pdf.save(nombreArchivoCertificado(valores));
      if (!plantilla) {
        setPreview(URL.createObjectURL(pdf.output('blob')));
        setModificado(false);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo generar el certificado.'); }
    finally { setOcupado(false); }
  };

  const campo = (nombre: Exclude<keyof DatosCertificado, 'incluirQR'>, label: string, opciones: { type?: string; placeholder?: string; maxLength?: number } = {}) => (
    <label className={styles.field}>
      <span>{label}</span>
      <input type={opciones.type || 'text'} value={datos[nombre]} maxLength={opciones.maxLength || 180}
        min={opciones.type === 'number' ? '0.5' : undefined} step={opciones.type === 'number' ? '0.5' : undefined}
        placeholder={opciones.placeholder} onChange={e => cambiar(nombre, e.target.value)} />
    </label>
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div><h1>Certificados de cursos</h1><p>Certificado horizontal de dos caras, con temario, sello de registro y QR de verificación en el sitio.</p></div>
        <button className={styles.secondary} disabled={ocupado} onClick={() => generar(true, true)}>Descargar plantilla</button>
      </header>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {emitido && <p role="status" className={styles.success}><strong>{emitido.codigo} - {emitido.datos.curso}</strong><br />
        Registrado en el libro de capacitaciones. <a href={urlVerificacionCertificado(emitido)} target="_blank" rel="noreferrer">Ver ficha pública</a></p>}
      <div className={styles.layout}>
        <form className={styles.form} onSubmit={e => { e.preventDefault(); void generar(false); }}>
          <fieldset disabled={ocupado} className={styles.fields}>
          <section>
            <h2>Curso y participante</h2>
            <label className={styles.field}><span>Usar un curso registrado</span>
              <select value={cursoSeleccionado} onChange={e => {
                setCursoSeleccionado(e.target.value);
                const curso = cursos.find(c => String(c.id) === e.target.value);
                if (curso) { setDatos(d => ({ ...aplicarCurso(d, curso), codigo:'' })); setModificado(true); setEmitido(null); }
              }}><option value="">Completar manualmente</option>{cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
            </label>
            {avisoCursos && <p className={styles.hint}>{avisoCursos}</p>}
            {campo('participante', 'Nombre completo del participante', { placeholder: 'Nombre y apellidos' })}
            {campo('documento', 'Documento o matrícula (opcional)', { maxLength: 60 })}
            {campo('curso', 'Nombre del curso', { placeholder: 'Ej. Primeros auxilios y atención de emergencias', maxLength: 240 })}
            <div className={styles.row}>
              <label className={styles.field}><span>Tipo de certificado</span><select value={datos.modalidad} onChange={e => cambiar('modalidad', e.target.value)}>
                <option value="participacion">Participación</option><option value="aprobacion">Aprobación</option>
              </select></label>
              {campo('horas', 'Carga horaria', { type: 'number', placeholder: 'Horas' })}
            </div>
            <div className={styles.row}>{campo('fechaInicio', 'Inicio del curso', { type: 'date' })}{campo('fechaFin', 'Fin del curso', { type: 'date' })}</div>
            <div className={styles.row}>{campo('lugar', 'Lugar de emisión', { maxLength: 100 })}{campo('fechaEmision', 'Fecha de emisión', { type: 'date' })}</div>
          </section>
          <section>
            <h2>Reverso · Rúbrica del curso</h2>
            <label className={styles.field}><span>Temario (un tema o módulo por línea)</span>
              <textarea rows={9} maxLength={6000} value={datos.temario} onChange={e => cambiar('temario',e.target.value)}
                placeholder={'Introducción y objetivos del curso\nProcedimientos y técnicas\nPrácticas supervisadas\nEvaluación final'} /></label>
            <p className={styles.hint}>El programa se organiza en dos columnas al reverso. El sello y el código se generan al registrar la emisión.</p>
          </section>
          <section>
            <h2>Firmas y registro</h2>
            {campo('presidente', 'Nombre del presidente', { maxLength: 120 })}
            {campo('cargoPresidente', 'Cargo del primer firmante', { maxLength: 100 })}
            {campo('instructor', 'Nombre del instructor', { maxLength: 120 })}
            {campo('cargoInstructor', 'Cargo del segundo firmante', { maxLength: 100 })}
            <div className={styles.control}><span>Código de control automático</span><strong>{emitido?.codigo || (emision.current?.huella === huellaDatos(datos) ? emision.current.registro?.codigo : '') || 'CRTYA-100 en adelante'}</strong>
              <small>Correlativo único para cada certificado emitido. La vista previa no consume números.</small></div>
            <label className={styles.check}><input type="checkbox" checked={datos.incluirQR} onChange={e => {
              setDatos(d => ({ ...d, incluirQR:e.target.checked, codigo:'' })); setModificado(true); setEmitido(null);
            }} /><span>Incluir QR para abrir la ficha pública del certificado</span></label>
          </section>
          <p className={styles.hint}>La vista previa es un borrador. Al emitir se asigna el número y se guarda el PDF original. Imprime ambas caras con volteo por el borde corto.</p>
          <div className={styles.actions}>
            <button className={styles.secondary} type="submit" disabled={ocupado}>{ocupado ? 'Generando…' : 'Actualizar vista previa'}</button>
            <button className={styles.primary} type="button" disabled={ocupado} onClick={emitir}>{ocupado ? 'Procesando…' : emitido ? 'Descargar original' : 'Emitir y descargar'}</button>
          </div>
          </fieldset>
        </form>
        <section className={styles.preview} aria-label="Vista previa del certificado">
          <div className={styles.previewHeader}><h2>Vista previa</h2><span>A4 · Horizontal · 2 caras</span></div>
          {preview ? <>
            {modificado && <p className={styles.pending}>Hay cambios pendientes de actualizar en la vista previa.</p>}
            <iframe src={preview} title="Certificado horizontal" className={styles.pdf} />
            <a className={styles.openPdf} href={preview} target="_blank" rel="noreferrer">Abrir vista previa en otra pestaña</a>
          </> : <div className={styles.empty}>
            <img src="/yunka_atoq_transparente.png" alt="Escudo Yunka Atoq" />
            <h3>Tu certificado institucional</h3><p>Completa los datos y genera la vista previa, o descarga la plantilla para revisar el diseño.</p>
            <button className={styles.primary} disabled={ocupado} onClick={() => generar(false)}>Generar vista previa</button>
          </div>}
        </section>
      </div>
      <section className={styles.book}>
        <div className={styles.previewHeader}><h2>Libro de capacitaciones · Registro de certificados</h2><button className={styles.secondary} onClick={cargarLibro} disabled={ocupado}>Actualizar</button></div>
        {avisoLibro && <p role="status" className={styles.hint}>{avisoLibro}</p>}
        {!avisoLibro && registros.length === 0 && <p className={styles.hint}>Todavía no hay certificados registrados. El primer código será CRTYA-100.</p>}
        {registros.length > 0 && <div className={styles.tableWrap}><table><thead><tr><th>Código de control / Curso</th><th>Participante</th><th>Estado</th><th>Original</th></tr></thead>
          <tbody>{registros.map(r => <tr key={r.id}><td><strong>{r.codigo}</strong><br />{r.datos.curso}</td><td>{r.datos.participante}</td><td>{r.estado === 'emitido' ? 'Emitido' : 'Pendiente'}</td>
            <td>{r.estado === 'emitido' ? <><a href={urlVerificacionCertificado(r)} target="_blank" rel="noreferrer">Ver ficha pública</a><br />
              <button className={styles.secondary} disabled={ocupado} onClick={() => descargarOriginal(r)}>Descargar PDF</button></>
              : <button className={styles.secondary} disabled={ocupado} onClick={() => retomar(r)}>Retomar emisión</button>}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
