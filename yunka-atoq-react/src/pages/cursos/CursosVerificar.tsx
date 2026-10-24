import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cursosPublicoApi, sesionExterna } from '../../services/cursosApi';
import s from '../gestion/Gestion.module.css';
import c from './Cursos.module.css';

type Estado = { tipo: 'cargando' } | { tipo: 'confirmado'; nombre: string } | { tipo: 'ya_confirmado'; email: string } | { tipo: 'error'; mensaje: string };

/** Destino del enlace del correo de pre-registro: activa la cuenta externa e inicia su sesión. */
export default function CursosVerificar() {
  const { token = '' } = useParams();
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });
  const enviado = useRef(false);
  useEffect(() => {
    // En desarrollo StrictMode monta dos veces: el enlace solo inicia sesión en la primera confirmación.
    if (enviado.current) return;
    enviado.current = true;
    cursosPublicoApi.verificar(token).then(r => {
      if ('token' in r) { sesionExterna.guardar(r.token); setEstado({ tipo: 'confirmado', nombre: r.cuenta.nombre }); }
      else setEstado({ tipo: 'ya_confirmado', email: r.email });
    }).catch(e => setEstado({ tipo: 'error', mensaje: e instanceof Error ? e.message : 'No se pudo confirmar el correo.' }));
  }, [token]);

  return <div className={c.landing}><div className={c.acceso}><div className={c.accesoCard}>
    {estado.tipo === 'cargando' && <><h1>Confirmando tu correo…</h1><p role="status" className={s.muted}>Un momento, por favor.</p></>}
    {estado.tipo === 'confirmado' && <>
      <h1>¡Cuenta activada!</h1>
      <div role="status" className={s.success}>Gracias, {estado.nombre}. Tu correo quedó confirmado.</div>
      <p>Si solicitaste inscripción a un curso, presidencia la revisará y te avisaremos por correo cuando estés habilitado. Mientras tanto puedes ver tus solicitudes y los cursos disponibles.</p>
      <div className={s.actions}><Link className={c.cta} to="/cursos/aula">Ir a mis cursos</Link></div>
    </>}
    {estado.tipo === 'ya_confirmado' && <>
      <h1>Correo ya confirmado</h1>
      <p>La cuenta de <strong>{estado.email}</strong> ya está activa. Ingresa con tu correo y contraseña.</p>
      <div className={s.actions}><Link className={c.cta} to="/cursos/ingresar">Ingresar</Link></div>
    </>}
    {estado.tipo === 'error' && <>
      <h1>No pudimos confirmar tu correo</h1>
      <div role="alert" className={s.error}>{estado.mensaje}</div>
      <p>Desde “Ingresar” puedes solicitar un nuevo enlace de confirmación.</p>
      <div className={s.actions}><Link className={c.cta} to="/cursos/ingresar">Ingresar</Link><Link className={s.secondary} to="/cursos">Ver cursos</Link></div>
    </>}
  </div></div></div>;
}
