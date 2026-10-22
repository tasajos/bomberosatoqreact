import { Link } from 'react-router-dom';
import { gestionApi } from '../../services/gestionApi';
import { dinero, fechaCorta, hoy, useRemote } from './shared';
import s from './Gestion.module.css';

// Documentos que todo file debe tener (los mismos que revisa la Jefatura de Personal).
const REQUERIDOS: [string, string][] = [['identidad', 'Carnet de identidad'], ['medico', 'Certificado médico']];
type Item = { titulo: string; estado: 'ok' | 'debe' | 'aviso'; texto: string; enlace: string; accion: string };

/** Resumen de lo que el voluntario tiene pendiente con la institución. */
export default function MisObligaciones() {
  const mens = useRemote(gestionApi.miMensualidad), prest = useRemote(gestionApi.prestamos), file = useRemote(gestionApi.miFileCompleto);
  const items: Item[] = [];
  if (mens.data) {
    const m = mens.data;
    items.push(!m.voluntario.cobrable
      ? { titulo: 'Mensualidades', estado: 'ok', texto: 'Su estado actual no está sujeto a cobro.', enlace: '/voluntario/mensualidades', accion: 'Ver detalle' }
      : m.estado === 'debe'
        ? { titulo: 'Mensualidades', estado: 'debe', texto: `Debe ${dinero(m.deuda)} · ${m.meses_vencidos} ${m.meses_vencidos === 1 ? 'mes vencido' : 'meses vencidos'}`, enlace: '/voluntario/mensualidades', accion: 'Ver meses' }
        : { titulo: 'Mensualidades', estado: m.mes_actual?.estado === 'pendiente' ? 'aviso' : 'ok',
            texto: m.mes_actual?.estado === 'pendiente' && m.mes_actual.vence ? `Al día · el mes en curso vence el ${fechaCorta(m.mes_actual.vence)}` : 'Al día', enlace: '/voluntario/mensualidades', accion: 'Ver detalle' });
  }
  if (prest.data) {
    const asignados = prest.data.filter(p => p.estado === 'autorizado');
    const vencidos = asignados.filter(p => p.fecha_devolucion.slice(0, 10) < hoy());
    items.push(vencidos.length
      ? { titulo: 'Equipos', estado: 'debe', texto: `${vencidos.length} equipo(s) con devolución vencida: ${vencidos.map(p => p.equipo_nombre).join(', ')}`, enlace: '/voluntario/equipos', accion: 'Ver equipos' }
      : { titulo: 'Equipos', estado: 'ok', texto: asignados.length ? `${asignados.length} equipo(s) asignado(s), dentro de plazo` : 'Sin equipos por devolver', enlace: '/voluntario/equipos', accion: 'Ver equipos' });
  }
  if (file.data) {
    const faltan = REQUERIDOS.filter(([cat]) => !file.data!.documentos.some(d => d.categoria === cat)).map(([, n]) => n);
    items.push(faltan.length
      ? { titulo: 'Documentos del file', estado: 'aviso', texto: `Falta presentar: ${faltan.join(' y ')}`, enlace: '/voluntario/file', accion: 'Ver mi file' }
      : { titulo: 'Documentos del file', estado: 'ok', texto: 'Documentos obligatorios completos', enlace: '/voluntario/file', accion: 'Ver mi file' });
  }
  const pendientes = items.filter(i => i.estado === 'debe').length;
  const cargando = mens.loading || prest.loading || file.loading;
  return (
    <section className={`${s.card} ${s.obligaciones}`}>
      <div className={s.cardHead}>
        <div><h2>Mis obligaciones</h2><p className={s.muted}>{cargando && !items.length ? 'Revisando…' : pendientes ? `Tiene ${pendientes} pendiente(s) con la institución.` : 'Está al día con la institución.'}</p></div>
      </div>
      <ul className={s.obligacionesLista}>
        {items.map(i => <li key={i.titulo} className={s[`ob_${i.estado}`]}>
          <span className={s.obIcono} aria-hidden>{i.estado === 'ok' ? '✓' : '!'}</span>
          <div><strong>{i.titulo}</strong><p>{i.texto}</p></div>
          <Link className={s.chip} to={i.enlace}>{i.accion}</Link>
        </li>)}
      </ul>
    </section>
  );
}
