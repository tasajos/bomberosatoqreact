import { gestionApi } from '../../services/gestionApi';
import { Feedback,fechaCorta,useRemote } from './shared';
import s from './Gestion.module.css';
export default function Correos(){
  const r=useRemote(gestionApi.correos);
  return <div className={s.page}><div className={s.heading}><div><h1>Notificaciones por correo</h1><p className={s.muted}>Últimos 200 envíos. Los pendientes se reintentan automáticamente; la entrega final depende del servidor de correo.</p></div><button className={s.secondary} onClick={r.reload}>Actualizar</button></div><Feedback loading={r.loading} error={r.error}/><section className={s.card}>{r.data?.length?<div className={s.tableWrap}><table className={s.table}><thead><tr><th>Asunto</th><th>Destinatario</th><th>Estado</th><th>Intentos</th></tr></thead><tbody>{r.data.map(c=><tr key={c.id}><td>{c.asunto}</td><td>{c.destinatario}</td><td>{c.enviado_at?`Entregado a SMTP · ${fechaCorta(c.enviado_at)}`:c.ultimo_error??'Pendiente de envío'}</td><td>{c.intentos}</td></tr>)}</tbody></table></div>:<p className={s.empty}>No hay notificaciones registradas.</p>}</section></div>;
}
