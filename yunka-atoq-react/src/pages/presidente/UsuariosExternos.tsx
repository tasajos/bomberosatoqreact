import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cursosGestionApi, fechaCurso, type CuentaExternaGestion } from '../../services/cursosApi';
import ConfirmacionYunka from '../../components/ConfirmacionYunka';
import s from '../gestion/Gestion.module.css';
import u from './UsuariosExternos.module.css';

export default function UsuariosExternos() {
  const [cuentas, setCuentas] = useState<CuentaExternaGestion[] | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [aviso, setAviso] = useState('');
  const [errorCarga, setErrorCarga] = useState('');
  const [seleccionado, setSeleccionado] = useState<CuentaExternaGestion | null>(null);
  const [errorEliminar, setErrorEliminar] = useState('');
  const [estado, setEstado] = useState<'todos' | 'confirmados' | 'pendientes'>('todos');
  const [cargando, setCargando] = useState(false), [eliminando, setEliminando] = useState<number | null>(null);
  const solicitud = useRef(0);
  const cargar = useCallback(async () => {
    const actual = ++solicitud.current;
    setCargando(true);
    try {
      const r = await cursosGestionApi.listarCuentas();
      if (actual === solicitud.current) { setCuentas(r.data); setErrorCarga(''); }
    } catch (e) {
      if (actual === solicitud.current) setErrorCarga(e instanceof Error ? e.message : 'No se pudo cargar la lista.');
    } finally {
      if (actual === solicitud.current) setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (eliminando !== null) return;
    const secuencia = solicitud;
    void cargar();
    const actualizar = () => { if (document.visibilityState === 'visible') void cargar(); };
    const intervalo = window.setInterval(actualizar, 30_000);
    window.addEventListener('focus', actualizar);
    document.addEventListener('visibilitychange', actualizar);
    return () => {
      secuencia.current++;
      window.clearInterval(intervalo);
      window.removeEventListener('focus', actualizar);
      document.removeEventListener('visibilitychange', actualizar);
    };
  }, [cargar, eliminando]);

  async function eliminar(cuenta: CuentaExternaGestion) {
    const nombre = `${cuenta.nombre} ${cuenta.apellidos}`;
    solicitud.current++;
    setEliminando(cuenta.id); setErrorEliminar(''); setAviso(''); setCargando(false);
    try {
      await cursosGestionApi.eliminarCuenta(cuenta.id);
      setCuentas(prev => prev?.filter(c => c.id !== cuenta.id) ?? null);
      setAviso(`Se eliminó a ${nombre}. Ya puede volver a registrarse con ${cuenta.email}.`);
      setSeleccionado(null);
    } catch (e) {
      setErrorEliminar(e instanceof Error ? e.message : 'No se pudo eliminar el usuario externo.');
    } finally { setEliminando(null); }
  }

  const consulta = busqueda.trim().toLocaleLowerCase('es');
  const lista = (cuentas ?? []).filter(c => (estado === 'todos' || (estado === 'confirmados' ? c.email_verificado : !c.email_verificado)) && `${c.nombre} ${c.apellidos} ${c.email} ${c.documento} ${c.telefono ?? ''} ${c.institucion ?? ''}`.toLocaleLowerCase('es').includes(consulta));
  return <div className={`${s.page} ${u.page}`}>
    <Link className={u.volver} to="/presidente/cursos">← Cursos online</Link>
    <div className={u.heading}>
      <div><span className={u.eyebrow}>PERSONAS · DIRECTORIO DE CURSOS</span><h1>Usuarios externos</h1><p>Consulta las cuentas registradas y gestiona quiénes acceden al portal de cursos.</p></div>
      <button className={u.refresh} disabled={cargando || eliminando !== null} onClick={() => void cargar()}><span aria-hidden="true">↻</span> {cargando ? 'Actualizando…' : 'Actualizar lista'}</button>
    </div>
    {errorCarga && <div role="alert" className={s.error}>{errorCarga}</div>}
    {aviso && <div role="status" className={s.success}>{aviso}</div>}
    <div className={u.stats}>
      <div className={u.stat}><span className={u.statIcon} aria-hidden="true">◎</span><div><small>Total registrados</small><strong>{cuentas?.length ?? '—'}</strong><span>Cuentas externas de cursos</span></div></div>
      <div className={`${u.stat} ${u.confirmados}`}><span className={u.statIcon} aria-hidden="true">✓</span><div><small>Correo confirmado</small><strong>{cuentas?.filter(c => c.email_verificado).length ?? '—'}</strong><span>Dirección de correo verificada</span></div></div>
      <div className={`${u.stat} ${u.pendientes}`}><span className={u.statIcon} aria-hidden="true">◷</span><div><small>Pendientes de confirmar</small><strong>{cuentas?.filter(c => !c.email_verificado).length ?? '—'}</strong><span>Aún deben verificar su correo</span></div></div>
    </div>
    <section className={u.directory} aria-label="Directorio de usuarios externos">
    <div className={u.directoryHead}><div><h2>Cuentas registradas</h2><p>Incluye participantes e instructores externos.</p></div><span className={u.live}><i />Actualización cada 30 s</span></div>
    <div className={u.toolbar}>
      <div className={u.filters}>{([['todos', 'Todos'], ['confirmados', 'Confirmados'], ['pendientes', 'Por confirmar']] as const).map(([valor, texto]) => <button key={valor} className={estado === valor ? u.active : ''} aria-pressed={estado === valor} onClick={() => setEstado(valor)}>{texto}</button>)}</div>
      <label className={u.search}><span className={u.srOnly}>Buscar usuario externo</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg><input type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar nombre, correo, documento…" /></label>
    </div>
    {!cuentas && cargando && <p role="status">Cargando usuarios externos…</p>}
    {cuentas && <>
      {lista.length ? <div className={s.tableWrap}>
        <table className={`${s.table} ${u.table}`}>
          <thead><tr><th>Usuario</th><th>Contacto</th><th>Correo / cuenta</th><th>Registro</th><th>Inscripciones</th><th>Acciones</th></tr></thead>
          <tbody>{lista.map(c => <tr key={c.id}>
            <td><div className={u.person}><span className={u.avatar} aria-hidden="true">{c.nombre.charAt(0)}{c.apellidos.charAt(0)}</span><div><strong>{c.nombre} {c.apellidos}</strong><span className={u.secondary}>Documento: {c.documento}</span>{c.institucion && <span className={u.secondary}>{c.institucion}</span>}{c.es_instructor && <span className={u.instructor}>Instructor externo</span>}</div></div></td>
            <td><span className={u.email}>{c.email}</span><span className={u.secondary}>{c.telefono || 'Sin teléfono'}</span></td>
            <td><span className={`${u.status} ${c.email_verificado ? u.verified : u.waiting}`}>{c.email_verificado ? '✓ Confirmado' : '◷ Por confirmar'}</span>{!c.activo && <span className={u.secondary}>Cuenta inactiva</span>}</td>
            <td>{fechaCurso(c.created_at.slice(0, 10))}</td>
            <td><span className={u.count}>{c.inscripciones}</span></td>
            <td><button className={u.delete} disabled={eliminando !== null || c.cursos_dictados > 0} aria-label={`Eliminar a ${c.nombre} ${c.apellidos}`} onClick={() => { setErrorEliminar(''); setSeleccionado(c); }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" /></svg>Eliminar</button>
              {c.cursos_dictados > 0 && <p className={s.muted}>Asigne otro instructor en sus {c.cursos_dictados} curso(s) antes de eliminarlo.</p>}
            </td>
          </tr>)}</tbody>
        </table>
      </div> : <p className={s.empty}>{cuentas.length ? 'No hay usuarios que coincidan con la búsqueda.' : 'Todavía no hay usuarios externos registrados.'}</p>}
    </>}
    <div className={u.directoryFoot}><span>{cuentas ? `${lista.length} de ${cuentas.length} usuarios` : 'Cargando directorio'}</span><span>Las cuentas eliminadas podrán registrarse de nuevo.</span></div>
    </section>
    {seleccionado && <ConfirmacionYunka titulo="¿Eliminar usuario externo?" confirmar="Sí, eliminar usuario" ocupado={eliminando !== null} error={errorEliminar} onCancelar={() => setSeleccionado(null)} onConfirmar={() => void eliminar(seleccionado)}>
      <div className={u.selectedUser}><span className={u.avatar} aria-hidden="true">{seleccionado.nombre.charAt(0)}{seleccionado.apellidos.charAt(0)}</span><div><strong>{seleccionado.nombre} {seleccionado.apellidos}</strong><span>{seleccionado.email}</span></div></div>
      <p>Al confirmar se eliminarán:</p>
      <ul><li>Su cuenta y el acceso al portal de cursos.</li><li><strong>{seleccionado.inscripciones} {seleccionado.inscripciones === 1 ? 'inscripción' : 'inscripciones'}</strong>, junto con sus intentos de examen y progreso.</li></ul>
      <div className={u.modalNote}>Podrá volver a registrarse con el mismo correo y comenzar desde cero.</div>
      <p className={u.certificateNote}>Los certificados ya emitidos se conservan en el módulo de certificados.</p>
    </ConfirmacionYunka>}
  </div>;
}
