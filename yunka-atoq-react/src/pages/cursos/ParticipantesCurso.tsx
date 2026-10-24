import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cursosGestionApi, ETIQUETAS, textoNota, type ListaParticipantes, type Participante } from '../../services/cursosApi';
import { useCursos } from './zona';
import { Etiqueta } from './CursoCard';
import s from '../gestion/Gestion.module.css';
import c from './Cursos.module.css';

async function descargarNotas(data: ListaParticipantes) {
  const [{ default: ExcelJS }, { hoja, tabla, descargarLibro }] = await Promise.all([import('exceljs'), import('../../utils/excelTablas')]);
  const wb = new ExcelJS.Workbook(); wb.creator = 'Yunka Atoq · Cursos online';
  const ws = hoja(wb, 'Calificaciones', data.curso.titulo, `Instructor: ${data.curso.instructor_nombre ?? '—'} · ${data.curso.horas} horas · ${data.curso.fecha_inicio} a ${data.curso.fecha_fin} · Aprobación con ${data.curso.nota_minima}%`);
  tabla(ws, 4, [
    { titulo: 'N°', ancho: 5 }, { titulo: 'Participante', ancho: 32 }, { titulo: 'Tipo', ancho: 11 }, { titulo: 'Documento', ancho: 14 },
    { titulo: 'Correo', ancho: 28 }, { titulo: 'Teléfono', ancho: 14 }, { titulo: 'Inscripción', ancho: 16 }, { titulo: 'Avance %', ancho: 10 },
    ...data.examenes.map(e => ({ titulo: e.titulo, ancho: 16 })), { titulo: 'Nota final %', ancho: 12 }, { titulo: 'Estado', ancho: 14 }, { titulo: 'Certificado', ancho: 14 },
  ], data.participantes.map((p, i) => [i + 1, p.nombre, p.tipo === 'interno' ? 'Fundación' : 'Externo', p.documento, p.email, p.telefono, ETIQUETAS[p.estado],
    p.evaluacion.progreso.total ? Math.round(p.evaluacion.progreso.vistos / p.evaluacion.progreso.total * 100) : 0,
    ...data.examenes.map(e => p.evaluacion.notas[e.id] ?? null), p.evaluacion.nota, ETIQUETAS[p.evaluacion.estado], p.certificado?.codigo ?? '']));
  await descargarLibro(wb, `Notas - ${data.curso.titulo.replace(/[\\/:*?"<>|]/g, '')}.xlsx`);
}

export default function ParticipantesCurso({ cursoId, gestion }: { cursoId: number; gestion: boolean }) {
  const { api } = useCursos();
  const [data, setData] = useState<ListaParticipantes | null>(null), [error, setError] = useState(''), [buscar, setBuscar] = useState('');
  const cargar = useCallback(() => api.participantes(cursoId).then(d => { setData(d); setError(''); }).catch(e => setError(e.message)), [api, cursoId]);
  useEffect(() => { void cargar(); }, [cargar]);
  async function revisar(p: Participante, estado: 'activa' | 'rechazada' | 'retirada') {
    const textos = { activa: `¿Habilitar a ${p.nombre} en el curso?${data?.curso.costo ? " Verifica antes su pago." : ""} Se le avisará por correo.`, rechazada: `¿Rechazar la inscripción de ${p.nombre}? Se le avisará por correo.`, retirada: `¿Dar de baja a ${p.nombre} del curso?` };
    if (!window.confirm(textos[estado])) return;
    const observacion = estado === 'activa' ? '' : window.prompt('Motivo (se muestra al participante, opcional):') ?? '';
    try { await cursosGestionApi.revisarInscripcion(p.id, estado, observacion); await cargar(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar la inscripción.'); }
  }

  if (!data) return error ? <div role="alert" className={s.error}>{error}</div> : <p role="status" className={s.muted}>Cargando participantes…</p>;
  const filtro = buscar.trim().toLowerCase();
  const filas = data.participantes.filter(p => !filtro || `${p.nombre} ${p.documento} ${p.email}`.toLowerCase().includes(filtro));
  const activos = data.participantes.filter(p => p.estado === 'activa'), conNota = activos.filter(p => p.evaluacion.nota !== null);
  const promedio = conNota.length ? Math.round(conNota.reduce((t, p) => t + (p.evaluacion.nota ?? 0), 0) / conNota.length * 100) / 100 : null;

  return <>
    <div className={s.stats}>
      <div className={s.stat}><small>Inscritos activos</small><strong>{activos.length}</strong></div>
      <div className={s.stat}><small>Por habilitar</small><strong>{data.participantes.filter(p => p.estado === 'pendiente').length}</strong></div>
      <div className={s.stat}><small>Aprobados</small><strong>{activos.filter(p => p.evaluacion.estado === 'aprobado').length}</strong></div>
      <div className={s.stat}><small>Promedio del curso</small><strong>{promedio === null ? '—' : `${promedio}%`}</strong></div>
    </div>
    <div className={s.notice}>{data.concluido
      ? 'El curso concluyó: los exámenes están cerrados y los participantes aprobados están habilitados para su certificado.'
      : 'La certificación se habilita cuando el curso concluye (al pasar la fecha de fin o al marcarlo como Finalizado).'}</div>
    {error && <div role="alert" className={s.error}>{error}</div>}
    <div className={s.toolbar} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <input className={s.search} style={{ marginBottom: 0 }} placeholder="Buscar por nombre, documento o correo" value={buscar} onChange={e => setBuscar(e.target.value)} aria-label="Buscar participante" />
      <button className={s.secondary} disabled={!data.participantes.length} onClick={() => descargarNotas(data).catch(e => setError(e.message))}>Descargar notas (Excel)</button>
    </div>
    {filas.length ? <div className={`${s.card} ${s.tableWrap}`} style={{ padding: 0, marginTop: 14 }}>
      <table className={s.table}>
        <thead><tr><th>Participante</th><th>Contacto</th><th>Inscripción</th><th>Avance</th>
          {data.examenes.map(e => <th key={e.id} style={{ textAlign: 'right' }}>{e.modulo_id === null ? 'Final' : e.titulo}</th>)}
          <th style={{ textAlign: 'right' }}>Nota final</th><th>Estado</th><th>Certificado</th></tr></thead>
        <tbody>{filas.map(p => <tr key={p.id}>
          <td><strong>{p.nombre}</strong><br /><span className={s.muted}>{p.tipo === 'interno' ? 'Fundación' : `Externo${p.institucion ? ` · ${p.institucion}` : ''}`}{p.documento ? ` · CI ${p.documento}` : ''}</span></td>
          <td>{p.email}<br /><span className={s.muted}>{p.telefono}</span></td>
          <td><Etiqueta valor={p.estado} />
            {!p.correo_verificado && <><br /><span className={`${s.badge} ${s.bad}`} style={{ marginTop: 4 }}>Correo sin confirmar</span></>}
            {p.pago_referencia && <><br /><span className={s.muted}>Pago: {p.pago_referencia}</span></>}
            {p.observacion && <><br /><span className={s.muted}>{p.observacion}</span></>}
            {gestion && <div className={s.actions} style={{ marginTop: 6 }}>
              {p.estado === 'pendiente' && <><button className={c.mini} disabled={!p.correo_verificado} onClick={() => revisar(p, 'activa')}
                title={p.correo_verificado ? '' : 'Se habilita cuando el participante confirme su correo'}>Habilitar</button>
                <button className={`${c.mini} ${c.miniDanger}`} onClick={() => revisar(p, 'rechazada')}>Rechazar</button></>}
              {p.estado === 'activa' && <button className={`${c.mini} ${c.miniDanger}`} onClick={() => revisar(p, 'retirada')}>Dar de baja</button>}
              {['rechazada', 'retirada'].includes(p.estado) && <button className={c.mini} onClick={() => revisar(p, 'activa')}>Reactivar</button>}
            </div>}
          </td>
          <td style={{ minWidth: 90 }}>{p.evaluacion.progreso.vistos}/{p.evaluacion.progreso.total}
            <div className={c.barra} style={{ marginTop: 4 }}><span style={{ width: `${p.evaluacion.progreso.total ? p.evaluacion.progreso.vistos / p.evaluacion.progreso.total * 100 : 0}%` }} /></div></td>
          {data.examenes.map(e => <td key={e.id} className={c.notaCelda}>{p.evaluacion.notas[e.id] !== undefined ? `${p.evaluacion.notas[e.id]}%` : '—'}
            <br /><span className={s.muted} style={{ fontWeight: 400 }}>{p.evaluacion.intentos[e.id] ?? 0} int.</span></td>)}
          <td className={c.notaCelda}>{textoNota(p.evaluacion)}</td>
          <td>{p.estado === 'activa' ? <Etiqueta valor={p.evaluacion.estado} /> : '—'}</td>
          <td>{p.certificado ? <Link to={p.certificado.verificacion_path} target="_blank">{p.certificado.codigo}</Link>
            : p.certificable ? (gestion ? <Link className={s.button} to={`/presidente/certificados?inscripcion=${p.id}`}>Preparar certificado</Link> : <span className={`${s.badge} ${s.good}`}>Habilitado</span>)
            : <span className={s.muted}>—</span>}</td>
        </tr>)}</tbody>
      </table>
    </div> : <p className={s.empty} style={{ marginTop: 14 }}>{data.participantes.length ? 'Ningún participante coincide con la búsqueda.' : 'Todavía no hay participantes inscritos.'}</p>}
  </>;
}
