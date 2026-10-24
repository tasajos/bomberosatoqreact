import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { crearCursosApi, sesionExterna, type SesionCursos } from '../../services/cursosApi';
import { CursosZona } from './CursosZona';
import { rutasExternas } from './zona';
import s from '../gestion/Gestion.module.css';
import c from './Cursos.module.css';

const api = crearCursosApi('externo');

/** Portal de participantes e instructores externos: sesión propia de cursos, sin acceso al resto del sistema. */
export default function CursosExternoLayout() {
  const navigate = useNavigate(), location = useLocation();
  const [sesion, setSesion] = useState<SesionCursos | null>(null), [clave, setClave] = useState(false);
  useEffect(() => {
    if (!sesionExterna.existe()) { navigate('/cursos/ingresar', { replace: true }); return; }
    api.yo().then(setSesion).catch(() => { sesionExterna.cerrar(); navigate('/cursos/ingresar', { replace: true }); });
  }, [navigate]);
  const aviso = (location.state as { aviso?: string } | null)?.aviso;
  if (!sesion) return null;
  const salir = () => { sesionExterna.cerrar(); navigate('/cursos'); };
  const enlace = ({ isActive }: { isActive: boolean }) => isActive ? c.activo : '';

  return <div>
    <header className={c.externoTop}><div className={c.externoTopInner}>
      <Link to="/cursos" className={c.externoMarca}><img src="/yunka_atoq_log.png" alt="" /><span>YUNKA ATOQ<small>CURSOS ONLINE</small></span></Link>
      <nav className={c.externoNav}>
        <NavLink to="/cursos/aula" className={enlace}>Mis cursos</NavLink>
        {sesion.dictando > 0 && <NavLink to="/cursos/instructor" className={enlace}>Cursos que dicto</NavLink>}
        <button onClick={() => setClave(true)}>Contraseña</button>
        <button onClick={salir}>Salir</button>
        <span className={c.externoUsuario}>{sesion.cuenta ? `${sesion.cuenta.nombre} ${sesion.cuenta.apellidos}` : sesion.nombre}</span>
      </nav>
    </div></header>
    <main className={c.externoMain}>
      {aviso && <div className={s.page} style={{ paddingBottom: 0 }}><div role="alert" className={s.error}>No se pudo completar la inscripción: {aviso}</div></div>}
      <CursosZona modo="externo" rutas={rutasExternas} />
    </main>
    {clave && <CambiarClave cerrar={() => setClave(false)} />}
  </div>;
}

function CambiarClave({ cerrar }: { cerrar: () => void }) {
  const [actual, setActual] = useState(''), [nueva, setNueva] = useState(''), [repetir, setRepetir] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [ok, setOk] = useState(false);
  async function enviar(e: FormEvent) {
    e.preventDefault(); setError('');
    if (nueva !== repetir) { setError('Las contraseñas nuevas no coinciden.'); return; }
    setBusy(true);
    try { await api.cambiarPassword(actual, nueva); setOk(true); } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cambiar.'); } finally { setBusy(false); }
  }
  return <div className={s.modalBackdrop} onKeyDown={e => { if (e.key === 'Escape' && !busy) cerrar(); }}>
    <div className={s.modal} role="dialog" aria-modal="true" aria-label="Cambiar contraseña">
      <h2>Cambiar contraseña</h2>
      {ok ? <><div role="status" className={s.success}>Contraseña actualizada.</div><button className={s.button} onClick={cerrar} autoFocus>Cerrar</button></> :
        <form className={s.form} onSubmit={enviar}>
          <label className={s.field}>Contraseña actual<input type="password" value={actual} onChange={e => setActual(e.target.value)} required autoComplete="current-password" disabled={busy} autoFocus /></label>
          <label className={s.field}>Nueva contraseña<input type="password" value={nueva} onChange={e => setNueva(e.target.value)} minLength={8} maxLength={72} required autoComplete="new-password" disabled={busy} /></label>
          <label className={s.field}>Repetir nueva contraseña<input type="password" value={repetir} onChange={e => setRepetir(e.target.value)} minLength={8} maxLength={72} required autoComplete="new-password" disabled={busy} /></label>
          {error && <div role="alert" className={s.error}>{error}</div>}
          <div className={s.actions}><button className={s.button} disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button><button type="button" className={s.secondary} onClick={cerrar} disabled={busy}>Cancelar</button></div>
        </form>}
    </div>
  </div>;
}
