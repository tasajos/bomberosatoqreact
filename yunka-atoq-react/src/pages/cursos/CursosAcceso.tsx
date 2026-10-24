import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { crearCursosApi, cursosPublicoApi, sesionExterna } from '../../services/cursosApi';
import s from '../gestion/Gestion.module.css';
import c from './Cursos.module.css';

const api = crearCursosApi('externo');

/** Pre-registro e ingreso de participantes e instructores externos al portal de cursos. */
export default function CursosAcceso({ modo }: { modo: 'registro' | 'ingresar' }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const curso = Number(params.get('curso')) || null;
  const [d, setD] = useState({ nombre: '', apellidos: '', documento: '', email: '', telefono: '', institucion: '', password: '', confirmar: '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [sinConfirmar, setSinConfirmar] = useState(false);
  const [enviado, setEnviado] = useState<{ email: string; correo: boolean } | null>(null);
  const set = (k: keyof typeof d) => (e: { target: { value: string } }) => setD(v => ({ ...v, [k]: e.target.value }));
  const sufijo = curso ? `?curso=${curso}` : '';

  async function enviar(e: FormEvent) {
    e.preventDefault(); setError(''); setSinConfirmar(false);
    if (modo === 'registro' && d.password !== d.confirmar) { setError('Las contraseñas no coinciden.'); return; }
    setBusy(true);
    try {
      if (modo === 'registro') {
        const { confirmar: _confirmar, ...datos } = d; void _confirmar;
        const r = await cursosPublicoApi.registrar({ ...datos, curso_id: curso });
        setEnviado({ email: r.email, correo: r.correo_enviado });
        return;
      }
      const r = await cursosPublicoApi.ingresar(d.email, d.password);
      sesionExterna.guardar(r.token);
      if (curso) {
        // Si la solicitud falla (p. ej. sin cupos), el aviso aparece en el portal.
        try { await api.inscribirse(curso); navigate(`/cursos/aula/${curso}`); }
        catch (err) { navigate('/cursos/aula', { state: { aviso: err instanceof Error ? err.message : '' } }); }
        return;
      }
      const yo = await api.yo().catch(() => null);
      navigate(yo && yo.dictando > 0 ? '/cursos/instructor' : '/cursos/aula');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar.');
      setSinConfirmar((err as { codigo?: string }).codigo === 'correo_no_verificado');
    } finally { setBusy(false); }
  }

  if (enviado) return <div className={c.landing}><div className={c.acceso}><div className={c.accesoCard}>
    <h1>Revisa tu correo</h1>
    {enviado.correo ? <>
      <p>Enviamos un enlace de confirmación a <strong>{enviado.email}</strong>. Ábrelo para activar tu cuenta; vence en 48 horas.</p>
      <p className={s.muted}>Si no lo ves en unos minutos, revisa la carpeta de spam o correo no deseado.</p>
    </> : <div role="alert" className={s.error}>Tu pre-registro se guardó, pero no pudimos enviar el correo de confirmación a {enviado.email}. Intenta reenviarlo en unos minutos o comunícate con la fundación.</div>}
    <div className={s.notice}>{curso
      ? 'Después de confirmar tu correo, presidencia revisará tu inscripción al curso y te avisaremos cuando estés habilitado.'
      : 'Después de confirmar tu correo podrás ingresar y solicitar tu inscripción a los cursos disponibles.'}</div>
    <Reenviar email={enviado.email} />
    <p className={s.muted} style={{ marginTop: 18 }}><Link to="/cursos">Volver a los cursos</Link></p>
  </div></div></div>;

  return <div className={c.landing}><div className={c.acceso}><div className={c.accesoCard}>
    <h1>{modo === 'registro' ? 'Inscripción a cursos online' : 'Ingresar a cursos online'}</h1>
    <p className={s.muted}>{modo === 'registro'
      ? 'Completa tus datos. Te enviaremos un correo para confirmar tu cuenta y presidencia habilitará tu inscripción.'
      : 'Para participantes e instructores externos. Los miembros de la fundación ingresan con su cuenta institucional.'}</p>
    {curso && <div className={s.notice}>{modo === 'registro' ? 'Tu solicitud de inscripción al curso elegido se enviará junto con tu registro.' : 'Al ingresar se enviará tu solicitud de inscripción al curso elegido.'}</div>}
    <form className={s.form} onSubmit={enviar}>
      {modo === 'registro' && <>
        <label className={s.field}>Nombres<input value={d.nombre} onChange={set('nombre')} maxLength={120} required autoComplete="given-name" disabled={busy} /></label>
        <label className={s.field}>Apellidos<input value={d.apellidos} onChange={set('apellidos')} maxLength={160} required autoComplete="family-name" disabled={busy} /></label>
        <label className={s.field}>Documento de identidad<input value={d.documento} onChange={set('documento')} maxLength={40} required disabled={busy} /></label>
        <label className={s.field}>Teléfono / celular<input type="tel" value={d.telefono} onChange={set('telefono')} maxLength={40} required autoComplete="tel" disabled={busy} /></label>
        <label className={`${s.field} ${s.wide}`}>Institución u organización (opcional)<input value={d.institucion} onChange={set('institucion')} maxLength={200} autoComplete="organization" disabled={busy} /></label>
      </>}
      <label className={`${s.field} ${s.wide}`}>Correo electrónico<input type="email" value={d.email} onChange={set('email')} maxLength={180} required autoComplete="email" disabled={busy} /></label>
      <label className={modo === 'registro' ? s.field : `${s.field} ${s.wide}`}>Contraseña<input type="password" value={d.password} onChange={set('password')} minLength={modo === 'registro' ? 8 : 1} maxLength={72} required autoComplete={modo === 'registro' ? 'new-password' : 'current-password'} disabled={busy} /></label>
      {modo === 'registro' && <label className={s.field}>Repetir contraseña<input type="password" value={d.confirmar} onChange={set('confirmar')} minLength={8} maxLength={72} required autoComplete="new-password" disabled={busy} /></label>}
      {modo === 'registro' && <p className={`${s.muted} ${s.wide}`} style={{ margin: 0 }}>Usa un correo real: allí recibirás el enlace de confirmación y los avisos del curso. Tus datos se usan para la inscripción y la emisión de tu certificado.</p>}
      {error && <div role="alert" className={`${s.error} ${s.wide}`}>{error}</div>}
      {sinConfirmar && <div className={s.wide}><Reenviar email={d.email} /></div>}
      <div className={`${s.actions} ${s.wide}`}><button className={c.cta} disabled={busy}>{busy ? 'Procesando…' : modo === 'registro' ? 'Enviar pre-registro' : 'Ingresar'}</button></div>
    </form>
    <p className={s.muted} style={{ marginTop: 18 }}>{modo === 'registro'
      ? <>¿Ya tienes cuenta? <Link to={`/cursos/ingresar${sufijo}`}>Ingresa aquí</Link></>
      : <>¿Aún no tienes cuenta? <Link to={`/cursos/registro${sufijo}`}>Inscríbete</Link>. ¿Olvidaste tu contraseña? Comunícate con la fundación.</>}
      <br /><Link to="/login">Soy miembro de la fundación</Link> · <Link to="/cursos">Ver cursos</Link></p>
  </div></div></div>;
}

function Reenviar({ email }: { email: string }) {
  const [estado, setEstado] = useState<'' | 'enviando' | 'listo' | 'error'>('');
  async function reenviar() {
    setEstado('enviando');
    try { await cursosPublicoApi.reenviar(email); setEstado('listo'); } catch { setEstado('error'); }
  }
  return <div className={s.actions}>
    <button type="button" className={s.secondary} disabled={estado === 'enviando' || estado === 'listo'} onClick={reenviar}>
      {estado === 'enviando' ? 'Enviando…' : estado === 'listo' ? 'Enlace reenviado' : 'Reenviar correo de confirmación'}</button>
    {estado === 'listo' && <span className={s.muted}>Si la cuenta está pendiente de confirmar, recibirás un nuevo enlace (el anterior deja de funcionar).</span>}
    {estado === 'error' && <span role="alert" className={s.muted}>No se pudo reenviar. Intenta en unos minutos.</span>}
  </div>;
}
